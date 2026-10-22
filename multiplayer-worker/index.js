import { DurableObject } from 'cloudflare:workers';
import { allowedOrigin, cleanName, worldName, position, nearby, publicPeer, CALL_LENGTH_MS } from './protocol.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health') return Response.json({ ok: true, videoConfigured: !!env.DAILY_API_KEY }, { headers: { 'cache-control': 'no-store' } });
    if (url.pathname !== '/ws') return new Response('Not found', { status: 404 });
    if (!allowedOrigin(request, env)) return new Response('Origin not allowed', { status: 403 });
    if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') return new Response('WebSocket required', { status: 426 });
    const world = worldName(url.searchParams.get('world'));
    if (!world) return new Response('Invalid gathering name', { status: 400 });
    return env.GATHERINGS.getByName(`city-v1:${world}`).fetch(request);
  },
};

// One hibernating Durable Object per gathering. Attachments hold ephemeral
// presence; SQLite holds invite/call deadlines across object eviction.
export class Gathering extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY, kind TEXT NOT NULL, data TEXT NOT NULL, deadline INTEGER NOT NULL
    )`);
  }
  save(record) {
    this.ctx.storage.sql.exec('INSERT OR REPLACE INTO records VALUES (?, ?, ?, ?)', record.id, record.kind, JSON.stringify(record), record.deadline);
  }
  get(id) {
    const row = this.ctx.storage.sql.exec('SELECT data FROM records WHERE id = ?', id).toArray()[0];
    return row ? JSON.parse(row.data) : null;
  }
  sockets() { return this.ctx.getWebSockets(); }
  state(socket) { return socket?.deserializeAttachment(); }
  socket(id) { return this.sockets().find(ws => this.state(ws)?.id === id && this.state(ws)?.ready); }
  send(ws, message) { try { ws?.send(JSON.stringify(message)); } catch { /* close handler removes presence */ } }
  sendTo(id, message) { this.send(this.socket(id), message); }
  broadcast(message, except) { for (const ws of this.sockets()) if (ws !== except && this.state(ws)?.ready) this.send(ws, message); }
  announce(state) { if (state.ready) this.broadcast({ type: 'peer', peer: publicPeer(state) }); }
  error(ws, message) { this.send(ws, { type: 'notice', message }); }
  async schedule() {
    const row = this.ctx.storage.sql.exec('SELECT MIN(deadline) AS deadline FROM records').one();
    const deadline = Math.min(row.deadline ?? Infinity, this.sockets().length ? Date.now() + 30_000 : Infinity);
    if (Number.isFinite(deadline)) await this.ctx.storage.setAlarm(Math.max(Date.now() + 250, deadline));
    else await this.ctx.storage.deleteAlarm();
  }
  async fetch() {
    if (this.sockets().length >= 32) return new Response('Gathering is full', { status: 503 });
    const [client, server] = Object.values(new WebSocketPair());
    const state = { id: crypto.randomUUID(), name: 'Pilgrim', x: 51, z: 12, yaw: 0,
      ready: false, available: false, lastSeen: Date.now(), lastMove: 0, lastInvite: 0, lastWave: 0,
      inviteId: null, callId: null, blocked: [], cooldowns: {} };
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment(state);
    this.send(server, { type: 'welcome', selfId: state.id, videoEnabled: !!this.env.DAILY_API_KEY,
      peers: this.sockets().filter(ws => ws !== server && this.state(ws)?.ready).map(ws => publicPeer(this.state(ws))) });
    await this.schedule();
    return new Response(null, { status: 101, webSocket: client });
  }
  async webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > 2048) return;
    let input;
    try { input = JSON.parse(raw); } catch { return; }
    if (!input || typeof input.type !== 'string') return;
    const state = this.state(ws), now = Date.now();
    if (!state) return;
    if (input.type === 'hello' || input.type === 'move') {
      if (input.type === 'move' && (!state.ready || now - state.lastMove < 80)) return;
      if (input.type === 'hello' && state.ready) return;
      state.x = position(input.x, 102, state.x); state.z = position(input.z, 384, state.z);
      state.yaw = position(input.yaw, Math.PI * 2, 0);
      state.available = input.available === true;
      state.lastSeen = now; state.lastMove = now;
      if (input.type === 'hello') { state.name = cleanName(input.name); state.ready = true; }
      ws.serializeAttachment(state); this.announce(state);
      return;
    }
    if (!state.ready) return;
    state.lastSeen = now; ws.serializeAttachment(state);
    if (input.type === 'heartbeat') return;
    if (input.type === 'wave') {
      const target = this.state(this.socket(input.peerId));
      if (!target || !nearby(state, target) || now - state.lastWave < 3000 || this.blocked(state, target)) return;
      state.lastWave = now; ws.serializeAttachment(state);
      this.sendTo(target.id, { type: 'wave', name: state.name });
      this.send(ws, { type: 'notice', message: `You wave to ${target.name}.` }); return;
    }
    if (input.type === 'invite') return this.invite(ws, state, input, now);
    if (input.type === 'respond') return this.respond(ws, state, input, now);
    if (input.type === 'cancel') {
      const record = this.get(state.inviteId ?? '');
      if (record) await this.endInvite(record, 'The invitation was cancelled.'); return;
    }
    if (input.type === 'joined') return this.joined(state, input.callId, now);
    if (input.type === 'leave-call') {
      const call = this.get(state.callId ?? '');
      if (call) await this.endCall(call, 'The conversation ended.'); return;
    }
    if (input.type === 'block') {
      const target = this.state(this.socket(input.peerId));
      if (!target || state.id === target.id) return;
      if (!state.blocked.includes(target.id)) state.blocked = [...state.blocked, target.id].slice(-32);
      ws.serializeAttachment(state);
      const invite = this.get(state.inviteId ?? '');
      if (invite && [invite.a, invite.b].includes(target.id)) await this.endInvite(invite, 'The invitation was closed.');
      const call = this.get(state.callId ?? '');
      if (call && [call.a, call.b].includes(target.id)) await this.endCall(call, 'The conversation ended.');
      this.error(ws, 'This player is blocked for this connection.');
    }
  }
  blocked(a, b) { return a.blocked.includes(b.id) || b.blocked.includes(a.id); }
  async invite(ws, state, input, now) {
    if (!this.env.DAILY_API_KEY) return this.error(ws, 'Audio and video are not configured for this gathering yet.');
    const targetSocket = this.socket(input.peerId), target = this.state(targetSocket);
    if (!target || target.id === state.id || !nearby(state, target)) return this.error(ws, 'Walk closer to that player to invite them.');
    if (!state.available || !target.available || state.inviteId || target.inviteId || state.callId || target.callId) return this.error(ws, 'One of you is busy. Try again when you are both on the street.');
    if (this.blocked(state, target)) return this.error(ws, 'This conversation is unavailable.');
    if (now - state.lastInvite < 10_000 || (state.cooldowns[target.id] ?? 0) > now) return this.error(ws, 'Please wait before inviting this player again.');
    const invite = { id: crypto.randomUUID(), kind: 'invite', a: state.id, b: target.id,
      aName: state.name, bName: target.name, mode: input.mode === 'audio' ? 'audio' : 'video', deadline: now + 30_000 };
    this.save(invite);
    state.lastInvite = now; state.inviteId = invite.id; target.inviteId = invite.id;
    ws.serializeAttachment(state); targetSocket.serializeAttachment(target);
    this.announce(state); this.announce(target);
    this.sendTo(state.id, { type: 'invitation', invite, incoming: false });
    this.sendTo(target.id, { type: 'invitation', invite, incoming: true });
    await this.schedule();
  }
  async endInvite(invite, message) {
    this.ctx.storage.sql.exec('DELETE FROM records WHERE id = ?', invite.id);
    this.clear(invite, 'inviteId');
    for (const id of [invite.a, invite.b]) this.sendTo(id, { type: 'invite-ended', inviteId: invite.id, message });
    await this.schedule();
  }
  clear(record, field) {
    for (const id of [record.a, record.b]) {
      const ws = this.socket(id), state = this.state(ws);
      if (state?.[field] === record.id) {
        state[field] = null;
        state.cooldowns[id === record.a ? record.b : record.a] = Date.now() + 30_000;
        state.cooldowns = Object.fromEntries(Object.entries(state.cooldowns).filter(([, until]) => until > Date.now()));
        ws.serializeAttachment(state); this.announce(state);
      }
    }
  }
  async respond(ws, state, input, now) {
    const invite = this.get(state.inviteId ?? '');
    if (!invite || invite.kind !== 'invite' || invite.id !== input.inviteId || invite.b !== state.id) return;
    const sender = this.state(this.socket(invite.a));
    if (invite.deadline <= now || !sender || !sender.available || !state.available || !nearby(sender, state) || this.blocked(sender, state)) return this.endInvite(invite, 'The invitation is no longer available.');
    if (input.accept !== true) return this.endInvite(invite, 'The invitation was declined.');
    const call = { ...invite, id: crypto.randomUUID(), kind: 'call', room: `pilgrims-${crypto.randomUUID().replaceAll('-', '')}`,
      status: 'provisioning', joined: [], deadline: now + 45_000 };
    this.ctx.storage.sql.exec('DELETE FROM records WHERE id = ?', invite.id);
    this.save(call);
    for (const id of [call.a, call.b]) {
      const socket = this.socket(id), member = this.state(socket);
      member.inviteId = null; member.callId = call.id; socket.serializeAttachment(member); this.announce(member);
      this.sendTo(id, { type: 'preparing', callId: call.id });
    }
    await this.schedule();
    try {
      const credentials = await this.provision(call);
      // External I/O may race a disconnect, timeout, or cancellation. Never
      // revive an ended call or disclose its tokens after that race.
      const current = this.get(call.id);
      if (!current || current.status !== 'provisioning' || current.deadline <= Date.now() || !this.socket(call.a) || !this.socket(call.b)) {
        this.ctx.waitUntil(this.expireRoom(call.room, Date.now())); return;
      }
      current.status = 'ready'; this.save(current);
      for (const [id, token] of [[call.a, credentials.a], [call.b, credentials.b]]) this.sendTo(id, {
        type: 'call-ready', callId: call.id, mode: call.mode, roomUrl: credentials.url, token,
        peerName: id === call.a ? call.bName : call.aName, deadline: call.deadline,
      });
    } catch {
      if (this.get(call.id)) await this.endCall(call, 'The private room could not be prepared. Try again later.');
    }
  }
  async joined(state, callId, now) {
    const call = this.get(state.callId ?? '');
    if (!call || call.id !== callId || call.kind !== 'call' || call.status !== 'ready') return;
    if (call.deadline <= now) return this.endCall(call, 'The conversation did not start in time.');
    if (!call.joined.includes(state.id)) call.joined.push(state.id);
    if (call.joined.length === 2) {
      call.status = 'active'; call.deadline = now + CALL_LENGTH_MS;
      for (const id of [call.a, call.b]) this.sendTo(id, { type: 'call-start', callId: call.id, endsAt: call.deadline });
      this.ctx.waitUntil(this.expireRoom(call.room, call.deadline));
    }
    this.save(call); await this.schedule();
  }
  async endCall(call, message) {
    // Delete first so neither reentrant close handlers nor provisioning can
    // re-open this conversation after the awaited work.
    this.ctx.storage.sql.exec('DELETE FROM records WHERE id = ?', call.id);
    this.clear(call, 'callId');
    for (const id of [call.a, call.b]) this.sendTo(id, { type: 'call-ended', callId: call.id, message });
    this.ctx.waitUntil(this.expireRoom(call.room, Date.now()));
    await this.schedule();
  }
  async remove(ws) {
    const state = this.state(ws);
    if (!state) return;
    const invite = this.get(state.inviteId ?? ''), call = this.get(state.callId ?? '');
    state.ready = false; state.inviteId = null; state.callId = null; ws.serializeAttachment(state);
    this.broadcast({ type: 'leave', id: state.id }, ws);
    if (invite) await this.endInvite(invite, 'The other player disconnected.');
    if (call) await this.endCall(call, 'The other player disconnected.');
    await this.schedule();
  }
  async webSocketClose(ws) { await this.remove(ws); try { ws.close(1000, 'Goodbye'); } catch { /* already closed */ } }
  async webSocketError(ws) { await this.remove(ws); try { ws.close(1011, 'Connection error'); } catch { /* already closed */ } }
  async alarm() {
    const now = Date.now();
    const records = this.ctx.storage.sql.exec('SELECT data FROM records WHERE deadline <= ?', now).toArray();
    for (const row of records) {
      const record = JSON.parse(row.data);
      if (record.kind === 'invite') await this.endInvite(record, 'The invitation expired.');
      else await this.endCall(record, record.status === 'active' ? 'Your 90-second conversation is complete.' : 'The conversation did not start in time.');
    }
    for (const ws of this.sockets()) if (now - this.state(ws).lastSeen > 60_000) {
      const call = this.get(this.state(ws).callId ?? '');
      // Background tabs may throttle their heartbeat during a valid media call.
      if (call?.kind === 'call' && call.deadline > now) continue;
      await this.remove(ws); try { ws.close(1001, 'Presence timed out'); } catch { /* closed */ }
    }
    await this.schedule();
  }
  async daily(path, body) {
    const response = await fetch(`https://api.daily.co/v1${path}`, {
      method: 'POST', headers: { authorization: `Bearer ${this.env.DAILY_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) { await response.body?.cancel(); throw new Error('Daily request failed'); }
    // Bound even a successful upstream response before parsing it.
    const reader = response.body.getReader(); let text = '', size = 0; const decoder = new TextDecoder();
    try {
      while (true) { const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength; if (size > 65536) throw new Error('Oversized Daily response'); text += decoder.decode(value, { stream: true }); }
      text += decoder.decode(); return JSON.parse(text);
    } finally { await reader.cancel().catch(() => {}); }
  }
  async provision(call) {
    const exp = Math.floor(Date.now() / 1000) + 300;
    const room = await this.daily('/rooms', { name: call.room, privacy: 'private', properties: {
      exp, eject_at_room_exp: true, max_participants: 2, enable_prejoin_ui: true,
      enable_chat: false, enable_screenshare: false, start_video_off: true, start_audio_off: true, enforce_unique_user_ids: true,
    } });
    const url = new URL(room.url);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.daily.co') || url.pathname !== `/${call.room}`) throw new Error('Invalid room URL');
    const token = (id, name) => this.daily('/meeting-tokens', { properties: {
      room_name: call.room, user_id: id, user_name: name, exp, eject_at_token_exp: true,
      is_owner: false, enable_screenshare: false, enable_prejoin_ui: true, start_audio_off: true, start_video_off: true,
      permissions: { hasPresence: true, canSend: call.mode === 'audio' ? ['audio'] : ['audio', 'video'], canReceive: { base: true }, canAdmin: false },
    } });
    const [a, b] = await Promise.all([token(call.a, call.aName), token(call.b, call.bName)]);
    if (typeof a.token !== 'string' || typeof b.token !== 'string') throw new Error('Missing tokens');
    return { url: url.href, a: a.token, b: b.token };
  }
  async expireRoom(room, deadline) {
    if (!this.env.DAILY_API_KEY) return;
    try { await this.daily(`/rooms/${encodeURIComponent(room)}`, { properties: { exp: Math.max(1, Math.floor(deadline / 1000)), eject_at_room_exp: true } }); }
    catch { console.warn('Daily room expiry update failed; original expiry remains active.'); }
  }
}
