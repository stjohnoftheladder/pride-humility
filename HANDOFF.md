# HANDOFF.md — Pride & Humility (for Corey)

> A playable prototype waiting for your art. Everything visual is a drop-in
> replacement; the pipeline and game logic stay untouched when you swap files.
> Sibling projects: `wizard-castle/` (the engine parent), `byzantine/`
> (Fellowship Go — where this palette and the fonts come from).

## 1. What this is

An Undertale-style Orthodox teaching game: explore a dark monastery in 3D
(first person), then fight **Pride, Greed, and Anger** as turn-based
encounters — your choices (FIGHT vs. PRAY / ALMS / MERCY) move a **pride /
grace** meter that literally changes the world's lighting and decides the
ending. Read `THEOLOGY.md` for what every mechanic means — the art should
serve that, not fight it.

## 2. Visual direction (inherited from byzantine)

- **"Byzantine Parchment Pixel"** — dark warm sanctuary, gold illumination,
  candle-light glow, pixel sprites.
- Tokens (from `byzantine/DESIGN-HANDOFF.md`, hard constraints):
  `--bg #120d07 · --surface #1a140d · --gold #f3d276 · --gold-dim #c4a46c ·
  --text #e8dcc8 · --accent #8b6914`. Text contrast ≥ 4.5:1, targets ≥ 44px.
- Fonts already embedded: `public/assets/fonts/` (PixelEmulator, SFPixelate,
  CyrillicPixel, Miludaland — copied from byzantine).
- Canvas: **640×360** internal, upscaled pixelated (desktop web game, unlike
  byzantine's 480×854 phone app).

## 3. Your art slots — drop-in, no code changes

### Sprites — `public/assets/sprites/`
Each file: **1 row × N frames, 64×64 cells, sprite centred in its cell,
background = pure `#FF00FF` pink** (a validator rejects pink inside the art).
Replace a file with the same name + same frame count and it just works; if
your sheet has different frames, update the entry in `manifest.json`.

| File | What it is | Notes |
|---|---|---|
| `heart_idle.png` (4) | **the soul** — the tiny red heart in the battle box | the protagonist; should read as *vulnerable, alive, beloved* |
| `tempter_*.png` (idle 4 / walk 6 / attack 4 / death 5) | Greed — small grinning demon on gold | hunched, coins, gold tooth |
| `brother_*.png` (idle 4 / walk 6 / attack 4 / forgiven 4 / death 5) | Anger — a wounded monk | bandaged arm; `forgiven` = arms open, face lifted, halo |
| `pride_*.png` (idle 4 / walk 6 / attack 6 / death 8) | the Demon of Pride — the boss | peacock-feather vanity, crown, many eyes; **big** (3.0 world units) |
| `elder_idle.png` (4) | the confessor at the chapel | white beard, staff, candle |
| `torch_idle.png` (4) | candle-light (dotted through the level) | warm flame |
| `banner_idle.png` (2) | hanging icons (cross banners) | deep red + gold |
| `shard_idle.png` (2) | enemy bullets — prideful words | angular, white-hot with red core |
| `prayer_shield_idle.png` (4) | the prayer halo around the heart | gold ring + rays, NOT a tech force-field |
| `beam_idle.png` (2) | heavenly light on mercy/victory | soft gold column |
| `explosion_idle.png` (6) / `puff_idle.png` (4) / `shadow_idle.png` (1) | combat FX + grounding shadows | |

### PBR textures — `public/assets/textures/`
`<name>_{albedo,normal,roughness,metalness,ao}.png`, 256×256, seamless
(RepeatWrapping). Sets: `stone_wall`, `stone_floor`, `wood_floor`, `gold`
(metal, e.g. the Ladder gate trim), `icon` (cloth), `brick`, `wax_emissive`.
Replace with same filenames.

### World art (3D, `src/level.js`)
- Level geometry is procedural boxes + merged meshes (stone walls, columns,
  floors, ceilings). The open **gate court** shows the night sky.
- Lighting: physically calibrated warm candle `PointLight`s (flicker), a dim blue hemisphere that
  **turns blood-red as the pilgrim's pride rises**, and a gold gate light
  that **glows brighter with grace**. If you deliver custom light/glow art
  (candle glows, vignettes), the byzantine `addGlow`/candle-pool approach is
  the reference.

## 4. The feel targets

- **Prayer** = stillness + gold light. The shield should feel like being
  held, not like armor.
- **Mercy** = release: enemy shrinks/softens, beam falls, palette warms.
- **FIGHT** = heavy: the screen dims a degree; the demon grins.
- **Falling** = cold red vignette; **confession** = warm restoration.
- Keep the heart tiny and the box precious — Undertale's box is a *place of
  testing*, not a widget.

## 5. Running it

```bash
npm install
npm run dev       # play
npm test          # 20 Playwright checks: journeys, choices, world, input, endings
```

`?debug` in the URL exposes `window.__game` (state, teleport, battle drive,
branch) — handy for capturing specific moments for your art pass.

## 6. Where design help is wanted

1. **The heart** — the single most important pixel object; worth several
   versions.
2. **The Demon of Pride** — the set-piece; feather-eye motif has room to be
   gorgeous and unsettling.
3. **Battle box frame** (currently a canvas texture in `src/battle/battle.js`
   `makeBoxTexture`) — could be your gold-embossed corner frame.
4. **Title screen + ending screens** — currently text on gold; could take a
   pixel icon/candle composition.
5. **Candle glows / vignette overlays** in the 3D world.

The procedural environment now includes three readable story groups in
`src/level.js`: scattered gold (`tempter-coins`), a stained pallet and fallen
stool (`brother-wound`), and watching wall-eyes (`pride-eyes`). These are
deliberately simple blocking geometry and strong candidates for authored art.

## 7. Constraints

- Don't introduce new runtime dependencies (three + vite only) without
  asking.
- Keep the pink-keyed sprite convention — it's the swap contract.
- Keep 4.5:1 contrast on any DOM text you restyle (the tests check console,
  not contrast — yet — but byzantine's axe discipline should carry over).
