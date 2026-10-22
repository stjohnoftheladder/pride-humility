import { pictogram } from './pictograms.js';

export class InventoryPanel {
  constructor(parent, close) {
    this.close = close;
    this.el = document.createElement('section');
    this.el.id = 'inventory-screen';
    this.el.className = 'screen';
    this.el.hidden = true;
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-modal', 'true');
    this.el.setAttribute('aria-labelledby', 'inventory-title');
    parent.appendChild(this.el);
  }
  show(inventory, npc) {
    this.previousFocus = document.activeElement;
    this.el.replaceChildren();
    const heading = document.createElement('h2');
    heading.id = 'inventory-title'; heading.textContent = 'THE TRAVELLER’S SATCHEL';
    const subtitle = document.createElement('p');
    subtitle.className = 'inventory-note';
    subtitle.textContent = 'What you carry along the road';
    const columns = document.createElement('div'); columns.className = 'inventory-columns';
    this.column(columns, 'Your belongings', inventory);
    if (npc) this.column(columns, npc.name, npc.inventory);
    const note = document.createElement('p'); note.className = 'inventory-note';
    note.textContent = npc ? 'Others’ belongings are shown for inspection. Deliver parcels through conversation.' : 'Share provisions with ALMS in encounters. Deliver parcels through conversation.';
    const close = document.createElement('button'); close.className = 'btn';
    close.textContent = 'Return · I / Escape'; close.onclick = this.close;
    this.el.append(heading, subtitle, columns, note, close);
    this.el.hidden = false;
    close.focus();
  }
  column(parent, name, inventory) {
    const section = document.createElement('section'); section.className = 'inventory-owner';
    const title = document.createElement('h3'); title.textContent = name; section.appendChild(title);
    const entries = inventory?.entries() ?? [];
    const list = document.createElement('ul');
    for (const item of entries) {
      const row = document.createElement('li');
      const icon = document.createElement('span'); icon.className = 'inventory-icon'; icon.appendChild(pictogram(item.id));
      const label = document.createElement('strong'); label.textContent = item.name;
      const count = document.createElement('span'); count.className = 'inventory-count'; count.textContent = `×${item.quantity}`;
      const description = document.createElement('small'); description.textContent = item.description;
      row.append(icon, label, count, description); list.appendChild(row);
    }
    if (!entries.length) { const empty = document.createElement('li'); empty.className = 'inventory-empty'; empty.append(pictogram('basket'), document.createTextNode('Nothing carried.')); list.appendChild(empty); }
    section.appendChild(list); parent.appendChild(section);
  }
  hide() { this.el.hidden = true; this.previousFocus?.focus(); }
  key(e) {
    if (['KeyI', 'Escape'].includes(e.code)) { e.preventDefault(); if (!e.repeat) this.close(); }
    // The dialog currently has one focusable control; retain keyboard focus.
    if (e.code === 'Tab') { e.preventDefault(); this.el.querySelector('button').focus(); }
  }
}
