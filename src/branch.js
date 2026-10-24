// Branch state: the pride / grace meters and journey flags that persist across
// encounters and decide the ending. Persisted to localStorage.
import { PRIDE_MAX, GRACE_MAX, PLAYER_HP_MAX, MONASTERY } from './config.js';
import { InventoryRegistry } from './inventory.js';

// The monastery test area keeps its own save, apart from the city's.
const SAVE_KEY = MONASTERY ? 'pride-humility-monastery-save-v1' : 'pride-humility-save-v1';

export class Branch {
  constructor() {
    this.pride = 0;
    this.grace = 0;
    this.hp = PLAYER_HP_MAX;
    this.flags = {};          // 'tookGold', 'forgave', 'struck', 'prayed3x'...
    this.inventories = new InventoryRegistry();
    this.provisions = 3;
    this.defeats = 0;         // times the pilgrim fell
    this.confessions = 0;
    this.confessionGraceReceived = false;
    this.encountersDone = {}; // id -> 'spared' | 'defeated'
    this.prayerUses = 0;
  }

  static load() {
    const b = new Branch();
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        const { inventories, provisions, ...rest } = data;
        Object.assign(b, rest);
        b.inventories = new InventoryRegistry(inventories);
        if (!inventories) {
          b.provisions = Number.isSafeInteger(provisions) ? provisions
            : Math.min(3, (data.items?.bread ?? 0) + (data.items?.water ?? 0));
          b.inventory.set('gold', b.flags.morning?.gold ?? 0);
          b.inventory.set('swiftShoes', b.flags.morning?.boots ? 1 : 0);
          for (const id of ['bread', 'cups', 'fruit']) {
            if (b.flags[`errand:${id}`] === 'carrying') b.inventory.set(`parcel:${id}`, 1);
          }
        }
      }
    } catch { /* fresh start */ }
    // Migrate v1 saves that stored separate bread and water inventories.
    if (!Number.isFinite(b.provisions)) {
      b.provisions = Math.min(3, (b.items?.bread ?? 0) + (b.items?.water ?? 0));
    }
    delete b.items;
    return b;
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        pride: this.pride, grace: this.grace, hp: this.hp, flags: this.flags,
        inventories: this.inventories, provisions: this.provisions, defeats: this.defeats, confessions: this.confessions,
        confessionGraceReceived: this.confessionGraceReceived,
        encountersDone: this.encountersDone, prayerUses: this.prayerUses,
      }));
    } catch { /* private mode */ }
  }

  get inventory() { return this.inventories.get('player:local'); }
  get provisions() { return this.inventory.count('provision'); }
  set provisions(value) { this.inventory.set('provision', value); }

  clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  }

  addPride(n) { this.pride = Math.max(0, Math.min(PRIDE_MAX, this.pride + n)); }
  addGrace(n) { this.grace = Math.max(0, Math.min(GRACE_MAX, this.grace + n)); }
  setFlag(k, v = true) { this.flags[k] = v; }
  flag(k) { return !!this.flags[k]; }

  /** Final disposition of the heart. */
  disposition() {
    if (this.grace >= 60) return 'humble';
    if (this.pride >= 70 && this.grace < 30) return 'proud';
    return 'mixed';
  }
}
