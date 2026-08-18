# Pride & Humility — a pilgrimage

An Undertale-style **pride vs. humility** prototype rooted in Eastern Orthodox
teaching, built as a **hybrid**: 3D first-person pilgrimage exploration
(three.js) with turn-based **2D battle screens** (heart-in-the-box dodging,
FIGHT / PRAY / ALMS / MERCY).

Built on the wizard-castle pipeline: retro 640×360 pixelated renderer,
pink-chroma-keyed spritesheets, procedural PBR textures, WebAudio synthesis —
restyled with the **byzantine "Byzantine Parchment Pixel" palette**
(gold `#f3d276` on near-black warm brown `#120d07`, candle light, pixel fonts
from `byzantine/public/assets/fonts/`).

## Run it

```bash
npm install
npm run dev        # -> http://localhost:5173
```

Build + preview (static-host ready):

```bash
npm run build && npm run preview
```

Test suite (builds, serves, plays both journeys with keyboard-only input):

```bash
npm test
```

## The game

You are a pilgrim at a monastery gate. Three thresholds stand between you and
the Ladder — **the Tempter** (greed), **the Wounded Brother** (anger), and
**the Demon of Pride** (the last rung). Each encounter asks the same question
*by whose strength do you climb?* — and answers it through play:

| Action | Effect | Theology |
|---|---|---|
| **FIGHT** | a clean strike restores 1 HP and shortens the next assault, but raises **PRIDE** and strengthens the final adversary | violence offers immediate relief while feeding the passion (Climacus, Ladder 23) |
| **PRAY** | Jesus-Prayer action (+GRACE) that spends some shield stamina; hold `Space` in dodging to raise the shield | the prayer of the heart as defense and costly stillness |
| **ALMS** | share bread & water (heal) | almsgiving loosens possessions (Ladder 17) |
| **MERCY** | Spare once conditions are met — the enemy is released, GRACE rises | forbearance; the Publican & the Pharisee |

Your **pride** makes the world colder and redder — and makes the final boss
stronger. Your **grace** makes the gate glow. The **chapel confession**
restores HP and supplies, but its grace gift is received once rather than
farmed; falling in battle is a fall, not an end — *repent and rise*.
Three endings await: THE LADDER IS NOT CLIMBED · A PARTLY-WASHED PILGRIM ·
THE EMPTY SUMMIT.

See **THEOLOGY.md** for the full mechanic→source mapping.

## Controls

| Context | Input |
|---|---|
| Explore | `WASD` move · Mouse look (pointer lock, drag-look fallback) · `Space` jump · `Shift` run |
| Battle dodge | `WASD` move the heart · hold `Space` to pray |
| Battle choices | `WASD` choose · `Enter` act · `Esc` returns from a submenu |
| Global | `Esc` pause · `♪ sound` mute (top right) |

## Asset pipeline

Same convention as wizard-castle — `public/assets/` (served at `/assets/`):

- `tools/gen-sprites.js` → `public/assets/sprites/*.png`: 1 row × N frames,
  64×64 cells, sprite centred, pure pink `#FF00FF` key background (validator
  rejects any pink in the art). Actors: `heart`, `tempter`, `brother`
  (incl. `forgiven`), `pride`, `elder`, `torch`, `banner`, `shard`,
  `prayer_shield`, `beam`, `explosion`, `puff`, `shadow`.
- `tools/gen-textures.js` → `public/assets/textures/*`: albedo/normal/
  roughness/metalness/AO sets for `stone_wall`, `stone_floor`, `wood_floor`,
  `gold`, `icon`, `brick`, `wax_emissive` (byzantine palette).
- Frame counts come from `public/assets/sprites/manifest.json`.

**Drop in your own art:** replace any `public/assets/sprites/*.png` keeping
the layout convention (or update `manifest.json`), and it just works — see
`HANDOFF.md` for the exact slots.

## Project layout

```
index.html             byzantine-styled HUD + battle UI + screens
src/
  main.js              boot, states (explore/battle/fall/confess/ending), triggers
  config.js            pilgrimage map + palette + constants
  level.js             geometry, physical lights, passion-specific room storytelling
  textures.js          PBR material loader
  SpriteSystem.js      chroma-key billboard shader + animation (shared)
  player.js            pilgrim exploration controller (no combat)
  branch.js            persisted pride/grace state + endings disposition
  encounters.js        the three thresholds (dialogue, patterns, outcomes)
  battle/battle.js     Undertale-style battle (box, heart, menu, shield)
  battle/patterns.js   bullet patterns (scaled by your pride)
  audio.js             WebAudio synth + chapel ambience
  hud.js               DOM HUD
tools/                 asset generators (shared pipeline)
tests/run.mjs          Playwright: both full journeys + endings + no console errors
vite.config.js         Vite 8/Rolldown split for the cacheable Three.js chunk
THEOLOGY.md            mechanic → Orthodox source mapping
HANDOFF.md             designer handoff (Corey)
```
