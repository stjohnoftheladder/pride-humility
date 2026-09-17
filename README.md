# Pride & Humility — a pilgrimage

**Play it live:** https://pride-humility.pages.dev
**Source:** https://github.com/stjohnoftheladder/pride-humility

An Undertale-style **pride vs. humility** prototype rooted in Eastern Orthodox
teaching, built as a **hybrid**: 3D first-person pilgrimage exploration
(three.js) with turn-based **2D battle screens** (heart-in-the-box dodging,
FIGHT / ALMS / WAIT→MERCY).

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

Deploy to the live site (Cloudflare Pages):

```bash
npm run build && npx wrangler pages deploy dist --project-name pride-humility --branch main
```

## The game

You are a pilgrim at a monastery gate. Three thresholds stand between you and
the Ladder — **the Tempter** (greed), **the Wounded Brother** (anger), and
**the Demon of Pride** (the last rung). Each encounter asks the same question
*by whose strength do you climb?* — and answers it through play:

| Action | Effect | Theology |
|---|---|---|
| **FIGHT** | a clean strike restores 1 HP and shortens the next assault, but raises **PRIDE** and strengthens the final adversary | violence offers immediate relief while feeding the passion (Climacus, Ladder 23) |
| **PRAY** | hold `Space` while dodging to sustain prayer, raise the shield, and open the heart to mercy | the prayer of the heart as defense and costly stillness |
| **ALMS** | share one provision (heal) | almsgiving loosens possessions (Ladder 17) |
| **WAIT** | endure another assault without striking | patience creates room for mercy |
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
| Explore | `WASD` move · Mouse look (pointer lock, drag-look fallback) · `Shift` run · `E` interact · `M` map |
| Dev (`?debug`) | `1`–`7` toggle an addition · `PageDown`/`PageUp` travel to the next/previous stop of the walk |
| Battle dodge | `WASD` move the heart · hold `Space` to pray |
| Battle choices | `WASD` choose · `Enter`/`Space` act · `X` back |
| Global | `Esc` pause · `♪ sound` mute (top right) |

## Features a dev can switch off

Work-in-progress additions are listed behind flags in `src/config.js`:

```js
export const FEATURES = {
  harbour: true,                                   // the Port of Theodosius
  augustaion: true, milion: true, chalke: true,     // the monumental quarter
  zeuxippus: true, cistern: true, hagiaEirene: true,
};
```

Set one to `false` and reload. The flag is read while the map is built, so it
decides what is carved into the grid, what geometry is built and what blocks the
pilgrim.

**The port** stands at the foot of the road, past the chapel, in the rows the
long map otherwise leaves empty: the wing at the size it was drawn, wall to the
north, quay, then open sea to the map's edge.

**The quarter** is what actually stood around Hagia Sophia, raised at the
pilgrimage's climax: the `augustaion` (the marble forecourt, carved out of the
wall just before the chapel), the `milion` (mile zero, a tetrapylon you walk
through), the `chalke` (the palace gate, shut, with the icon of Christ above it),
`zeuxippus` (the baths' peristyle and their statues), the `cistern` (a sunken
court of columns standing in water) and `hagiaEirene` (the other great church, a
second dome on the band beside Hagia Sophia's).

**Walk up to any of them** and a card appears at the bottom left: the name, what
it was, and the line that says how a dev switches it off — the number key while
`?debug` is on, or the flag to set in `src/config.js`. Hagia Sophia itself is
fixed scenery rather than an addition, but it is signed in the world, named on
the map, and in the same card, so the landmark the road climbs toward can always
be found.

In `?debug`, `PageDown` and `PageUp` travel instantly to the next or previous
stop of the walk — the Gate Court, the Bottom Spine, the Pilgrim Way, the Ladder
Chamber, Hagia Sophia, the Chapel, the Port — naming where you land.

The mini-map (`M`) shows the whole city as a strip and follows those flags:
a switched-off addition empties out of it. The strip is turned half about, so the
destination is at the top and walking south moves you up it — turning rather
than mirroring keeps your left hand on the map's left, which is what you need
when you pick a side at the spine. The port is named on its band, Hagia Sophia is
named beside its dome, and each monument of the quarter gets a ring; the same
names stand over them in the world.

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
  config.js            pilgrimage map + palette + constants + FEATURES flags
  city.js              wall-band dressing: the nobleman's house, Hagia Sophia, roof cells
  level.js             geometry, physical lights, passion-specific room storytelling
  minimap.js           whole-city HUD mini-map strip (M)
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
tests/run.mjs          Playwright: both full journeys + endings + HUD/map + feature flags
vite.config.js         Vite 8/Rolldown split for the cacheable Three.js chunk
.github/workflows/     ci.yml: Playwright suite, then Pages deploy (gated on it)
THEOLOGY.md            mechanic → Orthodox source mapping
HANDOFF.md             designer handoff (Corey)
```
