// Explicit post-deployment smoke check. Uses temporary guest identities and
// never joins Daily media or changes a real player's save.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const site = 'https://pride-humility.pages.dev';
const healthResponse = await fetch('https://pride-humility-multiplayer.mark-abella.workers.dev/health');
assert.equal(healthResponse.status, 200);
const health = await healthResponse.json();
assert.equal(health.ok, true);
console.log(`PASS  deployed Worker responds; Daily configured: ${health.videoConfigured}`);
const world = `deploy-check-${Date.now()}`;
const browser = await chromium.launch();
try {
  const first = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  const second = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  const errors = [];
  for (const [page, name] of [[first, 'Deployment check A'], [second, 'Deployment check B']]) {
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${site}/?world=${world}`);
    await page.getByRole('button', { name: 'F · Fellowship', exact: true }).click();
    await page.getByLabel('Your name').fill(name);
    await page.getByRole('button', { name: 'Join gathering', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.fellowship-status')?.textContent.includes('here'));
  }
  await first.getByText('Deployment check B', { exact: true }).waitFor();
  await second.getByText('Deployment check A', { exact: true }).waitFor();
  console.log('PASS  two isolated browsers meet through the production Worker');
  await first.getByRole('button', { name: 'Wave', exact: true }).click();
  await second.locator('.fellowship-message').filter({ hasText: 'Deployment check A waves to you.' }).waitFor();
  console.log('PASS  waves travel between production game sessions');
  if (!health.videoConfigured) {
    assert.equal(await first.getByRole('button', { name: 'Invite · audio', exact: true }).isEnabled(), false);
    assert.equal(await first.getByRole('button', { name: 'Invite · video', exact: true }).isEnabled(), false);
    console.log('PASS  audio/video stays unavailable until a real Daily API key is configured');
  }
  if (process.env.MULTIPLAYER_SCREENSHOT) await first.screenshot({ path: process.env.MULTIPLAYER_SCREENSHOT });
  if (health.videoConfigured && process.env.VERIFY_DAILY === '1') {
    await first.getByRole('button', { name: 'Invite · audio', exact: true }).click();
    await second.getByRole('button', { name: 'Accept invitation', exact: true }).click();
    await Promise.all([first, second].map(page => page.getByRole('button', { name: 'Join conversation', exact: true }).waitFor()));
    const credentials = await Promise.all([first, second].map(page => page.evaluate(() => {
      const call = window.__game.fellowship.call;
      return { url: call.roomUrl, token: call.token };
    })));
    assert.equal(credentials[0].url, credentials[1].url);
    assert.match(credentials[0].url, /^https:\/\/[^/]+\.daily\.co\//);
    assert.ok(credentials[0].token && credentials[0].token !== credentials[1].token);
    console.log('PASS  real Daily private room and separate participant credentials are prepared');
    // Merely preparing a room never opens a device or joins a media session.
    assert.equal(await first.locator('.daily-stage iframe').count(), 0);
    await first.getByRole('button', { name: 'End conversation', exact: true }).click();
    await second.getByRole('button', { name: 'Return to the street · F / Escape', exact: true }).waitFor();
    await second.waitForFunction(() => !window.__game.fellowship.call);
    console.log('PASS  ending the real Daily invitation releases both participants');
  }
  await second.getByRole('button', { name: 'Leave gathering', exact: true }).click();
  await first.getByText('Deployment check B', { exact: true }).waitFor({ state: 'detached' });
  await first.getByRole('button', { name: 'Leave gathering', exact: true }).click();
  assert.deepEqual(errors, []);
  console.log('PASS  guest connections clean up; no browser errors');
  console.log('LIVE MULTIPLAYER CHECK PASSED');
} finally { await browser.close(); }
