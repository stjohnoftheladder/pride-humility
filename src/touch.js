// Phone and tablet controls.
//
// The game is built for keyboard and mouse. On a touch screen this adds:
//   - a thumb stick on the left of the screen (drag to walk, like W A S D)
//   - drag anywhere else to look around
//   - an E button that appears whenever there is something to do (the prompt is showing)
//   - a column of buttons for whatever the pilgrim is doing: the keys a landmark
//     activity, the grain cart or the chariot ask for, and a way to LEAVE
//   - a "turn your phone sideways" hint while the phone is held upright
// Everything here speaks to the game as a keyboard would (key events on the
// window), so each state handles a touch exactly as it handles a key. The old
// monastery's battles still expect a keyboard.

export const IS_TOUCH = typeof window !== 'undefined'
  && (window.matchMedia?.('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && !window.matchMedia?.('(pointer: fine)').matches));

const LOOK = 0.0065;      // radians per pixel of drag
const DEAD = 12;          // pixels before the stick moves the pilgrim

/**
 * playing(): is the pilgrim in a state the controls drive?
 * prompt():  is the E prompt showing?
 * look(dx, dy): turn the view by these radians.
 * buttons(): the extra keys for the current state, as [{ code, label, wide }].
 */
export function installTouch({ playing, prompt, look: turn, buttons }) {
  if (!IS_TOUCH) return null;
  document.body.classList.add('touch');
  const stage = document.getElementById('stage');

  const layer = document.createElement('div');
  layer.id = 'touch-layer';
  const stick = document.createElement('div'); stick.id = 'touch-stick';
  const knob = document.createElement('div'); knob.id = 'touch-knob'; stick.appendChild(knob);
  const action = document.createElement('button'); action.id = 'touch-action'; action.textContent = 'E';
  const bar = document.createElement('div'); bar.id = 'touch-buttons';
  layer.append(stick, action, bar);
  stage.appendChild(layer);
  const rotate = document.createElement('div');
  rotate.id = 'touch-rotate';
  rotate.textContent = 'Turn your phone sideways for the best view. Tap to close.';
  rotate.addEventListener('click', () => rotate.classList.add('closed'));
  document.body.appendChild(rotate);

  const send = (type, code, repeat = false) => window.dispatchEvent(new KeyboardEvent(type, { code, repeat }));
  const tap = (code) => { send('keydown', code); send('keyup', code); };

  // The stick holds W A S D down like fingers on the keys. A key still held is
  // sent again as a repeat on every move, so a state that forgot its keys (a
  // card closed, an activity begun) picks the walk back up.
  const held = new Set();
  const hold = (code, down) => {
    if (down) { send('keydown', code, held.has(code)); held.add(code); }
    else if (held.delete(code)) send('keyup', code);
  };
  let move = null, look = null;   // the active touch for each role: { id, x, y }
  const setKeys = (dx, dy) => {
    hold('KeyW', dy < -DEAD); hold('KeyS', dy > DEAD);
    hold('KeyA', dx < -DEAD); hold('KeyD', dx > DEAD);
    const r = Math.min(1, Math.hypot(dx, dy) / 46), a = Math.atan2(dy, dx);
    knob.style.transform = `translate(${Math.cos(a) * r * 34}px, ${Math.sin(a) * r * 34}px)`;
  };
  const release = () => { setKeys(0, 0); knob.style.transform = ''; };

  layer.addEventListener('touchstart', (e) => {
    if (e.target.closest?.('button')) return;
    e.preventDefault();
    const box = layer.getBoundingClientRect();
    for (const t of e.changedTouches) {
      const leftThird = t.clientX - box.left < box.width * 0.4 && t.clientY - box.top > box.height * 0.35;
      if (leftThird && !move) move = { id: t.identifier, x: t.clientX, y: t.clientY };
      else if (!look) look = { id: t.identifier, x: t.clientX, y: t.clientY };
    }
  }, { passive: false });
  layer.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (move?.id === t.identifier) setKeys(t.clientX - move.x, t.clientY - move.y);
      if (look?.id === t.identifier) {
        turn((t.clientX - look.x) * LOOK, (t.clientY - look.y) * LOOK);
        look.x = t.clientX; look.y = t.clientY;
      }
    }
  }, { passive: false });
  const end = (e) => {
    for (const t of e.changedTouches) {
      if (move?.id === t.identifier) { move = null; release(); }
      if (look?.id === t.identifier) look = null;
    }
  };
  layer.addEventListener('touchend', end);
  layer.addEventListener('touchcancel', end);
  action.addEventListener('touchstart', (e) => { e.preventDefault(); tap('KeyE'); }, { passive: false });

  // The state's own keys. A button is a key: down while the finger is on it,
  // so "hold Space" works as written in the prompts.
  let shown = '';
  const pressed = new Set();
  const letGo = () => { for (const code of pressed) send('keyup', code); pressed.clear(); };
  const showButtons = (list) => {
    const signature = list.map((b) => b.code).join(' ');
    if (signature === shown) return;
    shown = signature;
    letGo();
    bar.replaceChildren(...list.map(({ code, label, wide }) => {
      const b = document.createElement('button');
      b.textContent = label; b.dataset.code = code;
      if (wide) b.className = 'wide';
      b.addEventListener('touchstart', (e) => { e.preventDefault(); pressed.add(code); send('keydown', code); }, { passive: false });
      const up = (e) => { e.preventDefault(); if (pressed.delete(code)) send('keyup', code); };
      b.addEventListener('touchend', up); b.addEventListener('touchcancel', up);
      return b;
    }));
  };

  return {
    /** Called every frame: the controls show only while the pilgrim is at play. */
    update() {
      const on = playing();
      layer.style.display = on ? 'block' : 'none';
      if (!on && (move || look)) { move = look = null; release(); }
      const e = on && prompt();
      action.style.display = e ? 'block' : 'none';
      // the E button already stands for E wherever the prompt is showing
      showButtons(on ? buttons().filter((b) => !(e && b.code === 'KeyE')) : []);
    },
  };
}
