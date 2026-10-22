import assert from 'node:assert/strict';
import { Inventory, InventoryRegistry } from '../src/inventory.js';
import { Branch } from '../src/branch.js';

const registry = new InventoryRegistry();
const a = registry.get('player:alice', { provision: 3 });
const b = registry.get('player:bob');
assert.equal(a.transferTo(b, 'provision', 2), true);
assert.equal(a.count('provision'), 1);
assert.equal(b.count('provision'), 2);
for (const n of [-1, 0, 0.5, NaN, Infinity, 4]) assert.equal(a.transferTo(b, 'provision', n), false);
assert.equal(a.transferTo(a, 'provision'), false);
assert.equal(a.add('unknown'), false);
assert.equal(a.transferTo(new Inventory(a.ownerId), 'provision'), false);
assert.deepEqual(JSON.parse(JSON.stringify(new InventoryRegistry(JSON.parse(JSON.stringify(registry))))), JSON.parse(JSON.stringify(registry)));
let saved;
globalThis.localStorage = { getItem: () => saved, setItem: (_, value) => { saved = value; } };
for (const outcome of ['carrying', 'quiet', 'praise']) {
  saved = JSON.stringify({ provisions: 2, flags: { morning: { gold: 23, boots: true }, 'errand:bread': outcome } });
  const migrated = Branch.load();
  assert.equal(migrated.provisions, 2);
  assert.equal(migrated.inventory.count('gold'), 23);
  assert.equal(migrated.inventory.count('swiftShoes'), 1);
  assert.equal(migrated.inventory.count('parcel:bread'), outcome === 'carrying' ? 1 : 0);
  migrated.provisions--; migrated.save();
  assert.equal(Branch.load().provisions, 1);
}
saved = JSON.stringify({ items: { bread: 1, water: 1 }, flags: {} });
assert.equal(Branch.load().provisions, 2);
delete globalThis.localStorage;

export async function testInventory(browser, newPage, check) {
  const { page, errors } = await newPage(browser);
  await page.evaluate(() => {
    const g = window.__game; g.setState('explore'); g.hud.showExplore(); g.morning.begin();
    const npc = g.market.npcs.find(n => n.id === 'vendor-4--1');
    g.teleport(npc.x, npc.z); g.player.keys.KeyW = true;
  });
  await page.keyboard.press('i');
  check('inventory: I shows player and nearby NPC belongings', await page.evaluate(() => {
    const g = window.__game, el = document.getElementById('inventory-screen');
    return g.state() === 'inventory' && !el.hidden && el.textContent.includes('Basket of bread')
      && el.querySelectorAll('.inventory-owner').length === 2 && !g.player.keys.KeyW;
  }));
  check('inventory: reading pauses clock and blocks movement', await page.evaluate(() => {
    const g = window.__game, time = g.morning.run.elapsed;
    g.morning.update(30, g.state()); g.key('KeyW');
    return g.morning.run.elapsed === time && !g.player.keys.KeyW;
  }));
  await page.keyboard.press('Tab');
  check('inventory: focus stays in dialog', await page.evaluate(() => document.activeElement === document.querySelector('#inventory-screen button')));
  await page.keyboard.press('Escape');
  check('inventory: Escape closes dialog', await page.evaluate(() => document.getElementById('inventory-screen').hidden));
  check('inventory: parcel transfers to recipient once', await page.evaluate(() => {
    const g = window.__game, target = g.market.npcs.find(n => n.id === 'vendor-5-1');
    return g.market.errandAction(target, 'deliverQuietly', g.branch)
      && g.player.inventory.count('parcel:bread') === 0 && target.inventory.count('parcel:bread') === 1
      && !g.market.errandAction(target, 'deliverQuietly', g.branch);
  }));
  await page.reload(); await page.waitForFunction(() => window.__game);
  check('inventory: NPC handoff survives reload', await page.evaluate(() => {
    const g = window.__game;
    return g.player.inventory.count('parcel:bread') === 0
      && g.market.npcs.find(n => n.id === 'vendor-5-1').inventory.count('parcel:bread') === 1;
  }));
  check('inventory: no console errors', errors.length === 0, JSON.stringify(errors));
  await page.close();
}
