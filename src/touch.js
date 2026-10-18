// Phone and tablet controls for walking the city and Hagia Sophia.
//
// The game is built for keyboard and mouse. On a touch screen this adds:
//   - a thumb stick on the left of the screen (drag to walk, like W A S D)
//   - drag anywhere else to look around
//   - an E button that appears whenever there is something to do (the prompt is showing)
//   - a "turn your phone sideways" hint while the phone is held upright
// It only drives the walking states (explore and sophia); battles and the race
// still expect a keyboard.

export const IS_TOUCH = typeof window !== 'undefined'
  && (window.matchMedia?.('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && !window.matchMedia?.('(pointer: fine)').matches));

const LOOK = 0.0065;      // radians per pixel of drag
const DEAD = 12;          // pixels before the stick moves the pilgrim

export function installTouch({ player, camera, walking, prompt }) {
  if (!IS_TOUCH) return null;
  document.body.classList.add('touch');
  const stage = document.getElementById('stage');

  const layer = document.createElement('div');
  layer.id = 'touch-layer';
  const stick = document.createElement('div'); stick.id = 'touch-stick';
  const knob = document.createElement('div'); knob.id = 'touch-knob'; stick.appendChild(knob);
  const action = document.createElement('button'); action.id = 'touch-action'; action.textContent = 'E';
  layer.append(stick, action);
  stage.appendChild(layer);
  const rotate = document.createElement('div');
  rotate.id = 'touch-rotate';
  rotate.textContent = 'Turn your phone sideways for the best view. Tap to close.';
  rotate.addEventListener('click', () => rotate.classList.add('closed'));
  document.body.appendChild(rotate);

  let move = null, look = null;   // the active touch for each role: { id, x, y }
  const setKeys = (dx, dy) => {
    player.keys.KeyW = dy < -DEAD; player.keys.KeyS = dy > DEAD;
    player.keys.KeyA = dx < -DEAD; player.keys.KeyD = dx > DEAD;
    const r = Math.min(1, Math.hypot(dx, dy) / 46), a = Math.atan2(dy, dx);
    knob.style.transform = `translate(${Math.cos(a) * r * 34}px, ${Math.sin(a) * r * 34}px)`;
  };
  const release = () => { setKeys(0, 0); knob.style.transform = ''; };

  layer.addEventListener('touchstart', (e) => {
    if (e.target === action) return;
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
        camera.rotation.y -= (t.clientX - look.x) * LOOK;
        camera.rotation.x = Math.max(-1.5, Math.min(1.5, camera.rotation.x - (t.clientY - look.y) * LOOK));
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
  action.addEventListener('touchstart', (e) => {
    e.preventDefault();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' }));
  }, { passive: false });

  return {
    /** Called every frame: the controls show only while the pilgrim can walk. */
    update() {
      const on = walking();
      layer.style.display = on ? 'block' : 'none';
      if (!on && (move || look)) { move = look = null; release(); }
      action.style.display = on && prompt() ? 'block' : 'none';
    },
  };
}
