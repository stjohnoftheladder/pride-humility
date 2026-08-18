# Contributing — Pride & Humility

Thanks for helping! This is a small two-person project (design + development).
The whole loop is: **clone → change → push**, and CI tests every push; a push
to `main` also auto-deploys the game to https://pride-humility.pages.dev.

## For Corey (art)

Most of your work is **drop-in replacements** — no code needed:

1. Clone the repo:
   ```bash
   git clone https://github.com/stjohnoftheladder/pride-humility.git
   cd pride-humility
   npm install
   npm run dev    # play at http://localhost:5173
   ```
2. **Replace sprites** in `public/assets/sprites/` — same filenames, same
   convention: 1 row × N frames, 64×64 cells, sprite centred, pure bright pink
   `#FF00FF` background, no pink in the art. If your sheet has a different
   number of frames, update that file's `frames`/`cols` in
   `public/assets/sprites/manifest.json`.
3. **Replace PBR textures** in `public/assets/textures/` — same filenames
   (`<name>_albedo/normal/roughness/metalness/ao.png`).
4. See **HANDOFF.md** for the exact art slots, palette tokens and feel targets.
5. Commit and push:
   ```bash
   git add public/assets
   git commit -m "Art: describe what you replaced"
   git push
   ```

If your change breaks a check, CI will tell you (and the live site won't
update). That's intended.

## For everyone

- **Tests gate everything:** `npm test` runs the Playwright suite (both full
  journeys, endings, branch integrity, input handling, no console errors).
- **Format/lint:** none enforced beyond tests — keep it simple.
- **Don't** commit `node_modules/`, `dist/`, or log files (already ignored).
- **Generated assets are committed** (they're the swappable placeholders), so
  `npm run gen` is only needed when the generators themselves change.

## Workflow

- Push to `main` → CI runs `npm test` → on success the deploy workflow builds
  and deploys to Cloudflare Pages → the live URL updates in ~1–2 minutes.
- For bigger experiments, use a branch + pull request; CI runs the same tests
  on PRs, and merging to `main` deploys.
