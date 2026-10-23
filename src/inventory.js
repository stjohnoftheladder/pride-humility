// Owner IDs are independent of controllers: NPCs and future remote players use
// the same data model. A multiplayer server must authorize all mutations.
// Keepsakes: the first resolution at a landmark leaves something in the satchel.
// A humble outcome brings a token from the person you stood beside; a proud one,
// a mark of the standing you took. [site, token, note, honor, note]
export const KEEPSAKES = Object.freeze({
  aqueduct: ['Eudokia’s clay token', 'Pressed by the water keeper: every household had its share.', 'The patron’s bronze medal', 'For filling his fountain first.'],
  pantokrator: ['Theophano’s folded dressing', 'She showed you how to fold it.', 'Andronikos’s silver coin', 'For serving the patron first.'],
  forumConstantine: ['A fig from Anna’s stall', 'Given when the purse came back without a scene.', 'The magistrate’s notice', 'Your name, read out for an accusation.'],
  stoudios: ['Your repaired page', 'The copy keeps its honest scraped patch.', 'Your gilded page', 'Flawless from a step away.'],
  mosaicPeristyle: ['Melania’s gold tessera', 'A stone from the border she set.', 'Kosmas’s commendation', 'Praise for a floor you did not make alone.'],
  hippodrome: ['The Blue driver’s ribbon', 'From the rival you stopped for.', 'The victor’s wreath', 'The Greens’ side chanted your name.'],
  cistern: ['Pelagia’s lamp wick', 'Trimmed from the lamp she carried down.', 'The survey entry', 'Ioannes wrote that you explored alone.'],
  zeuxippus: ['Anastasia’s flask of oil', 'Pressed into your hand at the basin.', 'A warm towel', 'From the basin you kept.'],
  milion: ['Zosimos’s chalk', 'For marking the arm that wore smooth.', 'A traveler’s coin', 'Paid for directions given on a guess.'],
  augustaion: ['A procession candle', 'Carried at the pace of the slowest walkers.', 'A front-rank sash', 'Worn at the head of the procession.'],
  chalke: ['A copy of the joint petition', 'Photeine’s mark beside your seal.', 'The Magistros’s seal', 'Proof of a connection you claimed.'],
  hagiaEirene: ['Kassia’s psalter leaf', 'The phrase you sang together.', 'A listener’s ribbon', 'Thrown by those who turned to hear you.'],
  harbour: ['Gregorios’s knotted cord', 'His thanks for steadying the load.', 'The foreman’s tally chit', 'Praise for a fast delivery.'],
});
const keepsakeItems = Object.entries(KEEPSAKES).flatMap(([site, [token, tokenNote, honor, honorNote]]) => [
  [`token:${site}`, token, `Keepsake · ${tokenNote}`], [`honor:${site}`, honor, `Keepsake · ${honorNote}`]]);

export const ITEMS = Object.freeze(Object.fromEntries([
  ['provision', 'Provisions', 'Food to share through ALMS in an encounter.'],
  ['gold', 'Gold', 'Spend at market stalls.'],
  ['swiftShoes', 'Swift shoes', 'Worn · walking speed +15%.'],
  ['parcel:bread', 'Basket of bread', 'Delivery · for the water carrier and stable hands.'],
  ['parcel:cups', 'Crate of cups', 'Delivery · for the soup cook.'],
  ['parcel:fruit', 'Basket of fruit', 'Delivery · for the fishmonger.'],
  ...['bread', 'silk', 'pots', 'olives', 'wreaths', 'perfume', 'shoes', 'ink', 'grain', 'fruit', 'iron', 'water', 'fish', 'lanterns', 'glass', 'rope', 'soup', 'herbs', 'pigments', 'books', 'work'].map(id => [id, id === 'work' ? 'Work supplies' : id[0].toUpperCase() + id.slice(1), 'Carried goods.']),
  ...keepsakeItems,
].map(([id, name, description]) => [id, Object.freeze({ id, name, description })])));

/** Give the keepsake for a site's first humble or proud outcome; returns its name. */
export function grantKeepsake(inventory, site, outcome) {
  const id = `${outcome === 'humble' ? 'token' : 'honor'}:${site}`;
  if (!Object.hasOwn(ITEMS, id) || outcome === 'unfinished' || inventory.count(id)) return null;
  inventory.add(id);
  return ITEMS[id].name;
}

const validQuantity = n => Number.isSafeInteger(n) && n >= 0;
export class Inventory {
  constructor(ownerId, contents = {}) {
    if (typeof ownerId !== 'string' || !ownerId) throw new Error('Inventory needs an owner ID');
    this.ownerId = ownerId;
    this.items = new Map();
    for (const [id, quantity] of Object.entries(contents ?? {})) {
      if (Object.hasOwn(ITEMS, id) && validQuantity(quantity) && quantity) this.items.set(id, quantity);
    }
  }
  count(id) { return this.items.get(id) ?? 0; }
  set(id, quantity) {
    if (!Object.hasOwn(ITEMS, id) || !validQuantity(quantity)) return false;
    if (quantity) this.items.set(id, quantity); else this.items.delete(id);
    return true;
  }
  add(id, quantity = 1) {
    return validQuantity(quantity) && quantity > 0 && this.set(id, this.count(id) + quantity);
  }
  remove(id, quantity = 1) {
    return validQuantity(quantity) && quantity > 0 && this.count(id) >= quantity && this.set(id, this.count(id) - quantity);
  }
  transferTo(target, id, quantity = 1) {
    if (!(target instanceof Inventory) || target === this || target.ownerId === this.ownerId
      || !validQuantity(quantity) || quantity < 1 || this.count(id) < quantity
      || !Number.isSafeInteger(target.count(id) + quantity)) return false;
    if (!target.add(id, quantity)) return false;
    this.remove(id, quantity);
    return true;
  }
  entries() { return [...this.items].map(([id, quantity]) => ({ ...ITEMS[id], quantity })); }
  toJSON() { return Object.fromEntries(this.items); }
}

export class InventoryRegistry {
  constructor(saved = {}) {
    this.owners = new Map();
    for (const [id, items] of Object.entries(saved ?? {})) this.owners.set(id, new Inventory(id, items));
  }
  get(ownerId, initial = {}) {
    if (!this.owners.has(ownerId)) this.owners.set(ownerId, new Inventory(ownerId, initial));
    return this.owners.get(ownerId);
  }
  toJSON() { return Object.fromEntries(this.owners); }
}
