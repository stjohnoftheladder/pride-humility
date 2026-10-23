// Real Worker + SQLite + WebSockets + two isolated game sessions. Daily's REST
// API and media SDK are simulated: no paid rooms or devices are used in tests.
import assert from 'node:assert/strict';
import * as runtime from 'miniflare';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { allowedOrigin, cleanName, worldName, nearby } from '../multiplayer-worker/protocol.js';

const root = fileURLToPath(new URL('../', import.meta.url));
let checks = 0;
function check(name, value) { assert.ok(value, name); console.log(`PASS  ${name}`); checks++; }
async function until(fn, message = 'Condition timed out') { for (let i = 0; i < 100; i++) { if (await fn()) return; await sleep(100); } throw new Error(message); }
const origin = 'http://127.0.0.1:5312';
const calls = [];
let failDaily = false, holdDaily = null;
const options = {
  name: 'city-test', host: '127.0.0.1', port: 0,
  modules: [
    { type: 'ESModule', path: path.join(root, 'tests/multiplayerHarness.js') },
    ...['index.js', 'protocol.js'].map(file => ({ type: 'ESModule', path: path.join(root, 'multiplayer-worker', file) })),
  ],
  compatibilityDate: '2026-08-15',
  durableObjects: { GATHERINGS: { className: 'TestGathering', useSQLite: true } },
  bindings: { ALLOWED_ORIGINS: origin, DAILY_API_KEY: 'test-only-not-a-real-key' },
  outboundService: async request => {
    const url = new URL(request.url), body = await request.json();
    calls.push({ path: url.pathname, body });
    if (url.hostname !== 'api.daily.co') return new Response('Unexpected upstream', { status: 500 });
    if (failDaily) return new Response('Simulated outage', { status: 503 });
    if (url.pathname === '/v1/rooms') {
      if (holdDaily) await holdDaily;
      return Response.json({ url: `https://test.daily.co/${body.name}` });
    }
    if (url.pathname === '/v1/meeting-tokens') return Response.json({ token: `token-for-${body.properties.user_id}` });
    return Response.json({ ok: true });
  },
};
const mf = new runtime.Miniflare(runtime.convertV4MiniflareOptions ? runtime.convertV4MiniflareOptions(options) : options);
const sockets = [];
async function connect(world, name, x = 51, z = 12) {
  const response = await mf.dispatchFetch(`http://local/ws?world=${world}`, { headers: { Upgrade: 'websocket', Origin: origin } });
  assert.equal(response.status, 101);
  const ws = response.webSocket, messages = []; ws.addEventListener('message', e => messages.push(JSON.parse(e.data))); ws.accept(); sockets.push(ws);
  await until(() => messages.some(m => m.type === 'welcome'));
  const selfId = messages.find(m => m.type === 'welcome').selfId;
  const send = message => ws.send(JSON.stringify(message));
  send({ type: 'hello', name, x, z, yaw: 0, available: true });
  return { ws, messages, selfId, send, has: type => messages.some(m => m.type === type) };
}
let server, browser;
try {
  await mf.ready;
  check('protocol: names, room codes and proximity are bounded', cleanName('<Anna>\u0000') === 'Anna' && !worldName('../other') && !nearby({ x: 0, z: 0 }, { x: 9, z: 0 }));
  check('protocol: untrusted origins are rejected', !allowedOrigin(new Request('http://test', { headers: { Origin: 'https://evil.example' } }), options.bindings));
  check('worker: denies websocket requests from other sites', (await mf.dispatchFetch('http://local/ws?world=test', { headers: { Upgrade: 'websocket', Origin: 'https://evil.example' } })).status === 403);
  const a = await connect('test', 'Anna'), b = await connect('test', 'Basil'), other = await connect('other', 'Other');
  await until(() => a.has('peer'));
  check('worker: same gathering shares server-issued identities', a.messages.some(m => m.type === 'peer' && m.peer.name === 'Basil') && a.selfId !== b.selfId);
  check('worker: separate gatherings are isolated', !other.messages.some(m => m.type === 'peer'));
  check('worker: presence excludes inventories and story state', a.messages.filter(m => m.peer).every(m => !('inventory' in m.peer) && !('flags' in m.peer)));
  a.send({ type: 'wave', peerId: b.selfId }); await until(() => b.has('wave'));
  check('worker: nearby wave arrives', b.messages.find(m => m.type === 'wave').name === 'Anna');
  a.send({ type: 'invite', peerId: b.selfId, mode: 'audio' }); await until(() => b.has('invitation'));
  check('worker: invitations do not provision a Daily room', calls.length === 0);
  const invitation = b.messages.find(m => m.type === 'invitation').invite;
  other.send({ type: 'respond', inviteId: invitation.id, accept: true }); await sleep(150);
  check('worker: outsiders cannot accept another pair’s invitation', calls.length === 0);
  b.send({ type: 'respond', inviteId: invitation.id, accept: true });
  await until(() => a.has('call-ready') && b.has('call-ready'));
  const ca = a.messages.find(m => m.type === 'call-ready'), cb = b.messages.find(m => m.type === 'call-ready');
  check('Daily: separate scoped credentials go only to the intended players', ca.token !== cb.token && !other.has('call-ready'));
  check('Daily: room is private, capped at two, starts muted and expires', calls[0].body.privacy === 'private' && calls[0].body.properties.max_participants === 2 && calls[0].body.properties.start_audio_off && calls[0].body.properties.eject_at_room_exp);
  check('Daily: audio invitation cannot publish video or administer the room', calls.filter(c => c.path.endsWith('meeting-tokens')).every(c => c.body.properties.room_name && c.body.properties.exp && c.body.properties.permissions.canAdmin === false && c.body.properties.permissions.canSend.join() === 'audio'));
  a.send({ type: 'joined', callId: ca.callId }); await sleep(150);
  check('worker: timer waits for both participants', !a.has('call-start'));
  b.send({ type: 'joined', callId: cb.callId }); await until(() => a.has('call-start'));
  check('worker: server starts a 90-second timer', Math.abs(a.messages.find(m => m.type === 'call-start').endsAt - Date.now() - 90_000) < 3000);
  b.send({ type: 'leave-call' }); await until(() => a.has('call-ended'));
  check('worker: leaving ends the conversation for both players', b.has('call-ended'));

  const far = await connect('test', 'Far', 90, 300);
  far.send({ type: 'invite', peerId: a.selfId, mode: 'video' }); await until(() => far.has('notice'));
  check('worker: distant invitations are rejected', !far.has('invitation'));
  const c = await connect('decline', 'C'), d = await connect('decline', 'D'); await sleep(150);
  c.send({ type: 'invite', peerId: d.selfId }); await until(() => d.has('invitation'));
  d.send({ type: 'respond', inviteId: d.messages.find(m => m.type === 'invitation').invite.id, accept: false });
  await until(() => c.has('invite-ended')); check('worker: declining releases both participants without a room', !c.has('preparing'));
  const e = await connect('blocked', 'E'), f = await connect('blocked', 'F'); await sleep(150);
  f.send({ type: 'block', peerId: e.selfId }); await sleep(150); e.send({ type: 'invite', peerId: f.selfId }); await until(() => e.has('notice'));
  check('worker: session block prevents unwanted invitations', !f.has('invitation'));
  const g = await connect('failure', 'G'), h = await connect('failure', 'H'); await sleep(150);
  failDaily = true; g.send({ type: 'invite', peerId: h.selfId }); await until(() => h.has('invitation'));
  h.send({ type: 'respond', inviteId: h.messages.find(m => m.type === 'invitation').invite.id, accept: true });
  await until(() => g.has('call-ended')); check('worker: Daily failure clears the busy state', !g.has('call-ready')); failDaily = false;
  const i = await connect('race', 'I'), j = await connect('race', 'J'); await sleep(150);
  let release; holdDaily = new Promise(resolve => { release = resolve; });
  i.send({ type: 'invite', peerId: j.selfId }); await until(() => j.has('invitation'));
  j.send({ type: 'respond', inviteId: j.messages.find(m => m.type === 'invitation').invite.id, accept: true }); await until(() => i.has('preparing'));
  i.send({ type: 'leave-call' }); await until(() => j.has('call-ended')); release(); holdDaily = null; await sleep(300);
  check('worker: cancellation during provisioning cannot revive a call', !i.has('call-ready') && !j.has('call-ready'));
  const k = await connect('expiry', 'K'), l = await connect('expiry', 'L'); await sleep(150);
  k.send({ type: 'invite', peerId: l.selfId }); await until(() => l.has('invitation'));
  const bindings = await mf.getBindings();
  await bindings.GATHERINGS.getByName('city-v1:expiry').expireRecords('invite');
  await until(() => k.has('invite-ended'));
  check('worker: alarm expires unanswered invitations', !k.has('preparing'));
  const m = await connect('call-expiry', 'M'), n = await connect('call-expiry', 'N'); await sleep(150);
  m.send({ type: 'invite', peerId: n.selfId }); await until(() => n.has('invitation'));
  n.send({ type: 'respond', inviteId: n.messages.find(msg => msg.type === 'invitation').invite.id, accept: true });
  await until(() => m.has('call-ready'));
  const mc = m.messages.find(msg => msg.type === 'call-ready');
  m.send({ type: 'joined', callId: mc.callId }); n.send({ type: 'joined', callId: mc.callId }); await until(() => m.has('call-start'));
  await bindings.GATHERINGS.getByName('city-v1:call-expiry').expireRecords('call');
  await until(() => m.has('call-ended') && n.has('call-ended'));
  check('worker: alarm ends timed conversations for both players', m.messages.find(msg => msg.type === 'call-ended').message.includes('90-second'));
  for (const ws of sockets) ws.close();

  const backendUrl = await mf.ready;
  server = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5312', '--strictPort'], {
    cwd: root, stdio: 'pipe', env: { ...process.env, VITE_MULTIPLAYER_URL: `ws://127.0.0.1:${backendUrl.port}/ws` },
  });
  let serverLog = ''; server.stderr.on('data', data => { serverLog += data; });
  await until(async () => { try { return (await fetch(origin)).ok; } catch { return false; } }, `Vite did not start: ${serverLog}`);
  browser = await chromium.launch();
  const alice = await browser.newPage(), basil = await browser.newPage();
  const errors = [];
  for (const page of [alice, basil]) { page.on('pageerror', error => errors.push(error.message)); await page.goto(`${origin}/?debug&world=browser-test`); await page.waitForFunction(() => window.__game); }
  for (const [page, name] of [[alice, 'Alice'], [basil, 'Basil']]) {
    await page.evaluate(() => { const g = window.__game; g.setState('explore'); g.hud.showExplore(); g.morning.begin(); g.teleport(51, 12); });
    await page.keyboard.press('f'); await page.getByLabel('Your name').fill(name); await page.getByRole('button', { name: 'Join gathering', exact: true }).click();
    await page.waitForFunction(() => window.__game.fellowship.status === 'connected');
  }
  await alice.waitForFunction(() => window.__game.fellowship.client.peers.size === 1);
  await basil.waitForFunction(() => window.__game.fellowship.client.peers.size === 1);
  check('browser: two game sessions see each other', await alice.locator('.fellowship-peer strong').textContent() === 'Basil');
  check('browser: remote player has a visible 3D character', await alice.evaluate(() => window.__game.fellowship.avatars.actors.size === 1));
  await alice.evaluate(() => window.__game.teleport(51, 18));
  await basil.waitForFunction(() => [...window.__game.fellowship.client.peers.values()].some(peer => peer.z === 18));
  check('browser: movement crosses the real WebSocket connection', true);
  await alice.evaluate(() => window.__game.teleport(51, 12));
  check('browser: names and room fields do not trigger movement hotkeys', await alice.evaluate(() => window.__game.state() === 'fellowship' && !window.__game.player.keys.KeyW));
  await alice.getByRole('button', { name: 'Invite · audio', exact: true }).click();
  await basil.getByRole('button', { name: 'Accept invitation', exact: true }).click();
  await alice.getByRole('button', { name: 'Join conversation', exact: true }).waitFor();
  await basil.getByRole('button', { name: 'Join conversation', exact: true }).waitFor();
  check('browser: accepting an invitation never starts media automatically', await alice.evaluate(() => !window.__game.fellowship.frame));
  for (const page of [alice, basil]) await page.evaluate(() => {
    window.__dailyTrace = [];
    window.__game.fellowship.loadDaily = async () => ({ default: {
      supportedBrowser: () => ({ supported: true }),
      createFrame: () => {
        const handlers = {};
        return {
          on: (event, cb) => { handlers[event] = cb; },
          join: async options => { window.__dailyTrace.push(['join', options.startVideoOff, options.startAudioOff]); handlers['joined-meeting'](); },
          setLocalAudio: async on => window.__dailyTrace.push(['audio', on]),
          setLocalVideo: async on => window.__dailyTrace.push(['video', on]),
          leave: async () => window.__dailyTrace.push(['leave']),
          destroy: async () => window.__dailyTrace.push(['destroy']),
        };
      },
    } });
  });
  await alice.getByRole('button', { name: 'Join conversation', exact: true }).click();
  await basil.getByRole('button', { name: 'Join conversation', exact: true }).click();
  await alice.waitForFunction(() => window.__game.fellowship.endsAt > Date.now());
  check('browser: explicit Join opens Daily with devices off', await alice.evaluate(() => window.__dailyTrace.some(row => row[0] === 'join' && row[1] && row[2])));
  await alice.getByRole('button', { name: 'End conversation', exact: true }).click();
  await basil.waitForFunction(() => !window.__game.fellowship.call && !window.__game.fellowship.frame);
  check('browser: leaving stops media and destroys Daily for both players', await basil.evaluate(() => ['audio', 'video', 'leave', 'destroy'].every(event => window.__dailyTrace.some(row => row[0] === event))));
  await basil.evaluate(() => { window.__previousPlayerId = window.__game.fellowship.client.selfId; window.__game.fellowship.client.socket.close(); });
  await basil.waitForFunction(() => window.__game.fellowship.status === 'connected' && window.__game.fellowship.client.selfId !== window.__previousPlayerId);
  await alice.waitForFunction(() => window.__game.fellowship.client.peers.size === 1 && window.__game.fellowship.avatars.actors.size === 1);
  check('browser: reconnect restores presence without duplicate characters', true);
  await alice.keyboard.press('Escape');
  check('browser: closing fellowship returns to exploration', await alice.evaluate(() => window.__game.state() === 'explore'));
  await basil.getByRole('button', { name: 'Leave gathering', exact: true }).click();
  await alice.waitForFunction(() => window.__game.fellowship.client.peers.size === 0 && window.__game.fellowship.avatars.actors.size === 0);
  check('browser: disconnect removes the remote character', true);
  check('browser: inventory remains local', await alice.evaluate(() => window.__game.player.inventory.count('provision') === 3 && [...window.__game.fellowship.client.peers.values()].every(peer => !peer.inventory)));
  check('browser: no page errors', errors.length === 0);
  console.log(`\nMULTIPLAYER TESTS PASSED (${checks} checks)`);
} finally {
  for (const ws of sockets) { try { ws.close(); } catch { /* closed */ } }
  await browser?.close(); server?.kill(); await mf.dispose();
}
