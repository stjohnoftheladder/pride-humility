// Owner IDs are independent of controllers: NPCs and future remote players use
// the same data model. A multiplayer server must authorize all mutations.
export const ITEMS = Object.freeze(Object.fromEntries([
  ['provision', 'Provisions', 'Food to share through ALMS in an encounter.'],
  ['gold', 'Gold', 'Spend at market stalls.'],
  ['swiftShoes', 'Swift shoes', 'Worn · walking speed +15%.'],
  ['parcel:bread', 'Basket of bread', 'Delivery · for the water carrier and stable hands.'],
  ['parcel:cups', 'Crate of cups', 'Delivery · for the soup cook.'],
  ['parcel:fruit', 'Basket of fruit', 'Delivery · for the fishmonger.'],
  ...['bread', 'silk', 'pots', 'olives', 'wreaths', 'perfume', 'shoes', 'ink', 'grain', 'fruit', 'iron', 'water', 'fish', 'lanterns', 'glass', 'rope', 'soup', 'herbs', 'pigments', 'books', 'work'].map(id => [id, id === 'work' ? 'Work supplies' : id[0].toUpperCase() + id.slice(1), 'Carried goods.']),
].map(([id, name, description]) => [id, Object.freeze({ id, name, description })])));

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
