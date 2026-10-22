# Meeting on the Pilgrim Way

The first multiplayer version shares each guest's server-issued connection ID,
display name, position, facing, and availability. Up to 32 guests can enter each
named gathering. Other pilgrims are rendered in the 3D world and can wave or
request a private Daily audio/video conversation when within eight world units.
Invitations expire after 30 seconds; both players must choose Join within 45
seconds after acceptance. Conversations last 90 seconds from both players joining.

This is social multiplayer: each person's morning, NPCs, encounters, inventory,
and activity results still belong to that person's game. The server does not
accept inventory mutations. Positions are validated and bounded, but exploration
is client controlled; it is not a competitive or cheat-resistant simulation.

## Local development

```powershell
npm install
npm run multiplayer:dev
# In a second terminal:
npm run dev -- --host 127.0.0.1
```

Local Vite automatically connects to `ws://127.0.0.1:8787/ws` when a player
chooses Join. Presence and waves work without Daily credentials. To exercise real
calls, copy `multiplayer-worker/.dev.vars.example` to
`multiplayer-worker/.dev.vars` and enter a Daily API key in that ignored file.
The same Daily account as the Phaser edition can be used; no account subdomain
variable is needed because the REST API returns the created room's URL.

Use two browser profiles or an incognito window for independent local saves.
Open Fellowship, give each person a name, and join the same gathering. Walk
near each other in the city to enable invitations. Browsers require HTTPS or
localhost for camera/microphone permissions.

## Deploy the new Worker and enable the frontend

The new Worker is independent of `byzantine-multiplayer`; deploying it does not
alter the Phaser game's backend. Use the installed Wrangler CLI:

```powershell
npm run multiplayer:check
npx wrangler deploy --config multiplayer-worker/wrangler.jsonc
npx wrangler secret put DAILY_API_KEY --config multiplayer-worker/wrangler.jsonc
```

The deployed multiplayer endpoint is
`wss://pride-humility-multiplayer.mark-abella.workers.dev/ws`.
Production builds use `.env.production`, and the GitHub workflow uses that same
endpoint as its default. An Actions variable can override it for a different backend.

Enter the API key at Wrangler's interactive secret prompt. Never put it in a
`VITE_` variable, source file, chat, or committed configuration. Set
`VITE_MULTIPLAYER_URL` to the deployed Worker's `wss://…/ws` URL before building
the frontend. `.env.example` shows the format. For the existing GitHub deployment
workflow, optionally set the repository Actions **variable** `VITE_MULTIPLAYER_URL`, then
publish the frontend through the normal tested deployment process. No URL means
the build remains playable solo and explains that multiplayer is unconfigured.

The origin allowlist in `multiplayer-worker/wrangler.jsonc` includes the existing
production site, its Pages preview subdomains, and local development/test ports.
Add an exact origin when introducing a custom domain. `/health` reports whether
a Daily key is configured without revealing it.

## Lifecycle and privacy

- Durable Objects use SQLite for pending invitation and call deadlines and the
  WebSocket Hibernation API for presence. An alarm expires invitations, unfinished
  joins, calls, and stale connections. One object belongs to each gathering.
- A room is provisioned only after the invitee accepts. Private Daily rooms allow
  two participants, scoped expiring tokens, no administrator privileges, and no
  screen sharing. Audio invitations cannot publish video. Initial media is off.
- Ending a call disables both local media tracks, leaves and destroys the Daily
  frame, notifies the other player, and requests server-side room expiry. The
  original room and token expiry provides a backstop if Daily's expiry update
  fails. An in-flight provision cannot revive a cancelled or disconnected call.
- Guests are anonymous connection identities. Gathering codes are not access
  control, and reconnects do not preserve block identity. Durable accounts,
  persistent moderation, and economy synchronization are separate future work.
- This app does not record calls, store tokens, or broadcast inventories. Daily
  handles media transport under its own account configuration and terms.

## Verification

```powershell
npm test
npm run test:multiplayer
npm run multiplayer:check
```

After deployment, `npm run test:multiplayer:live` checks the production service
with two temporary guest sessions, verifies presence and waves, and disconnects
them. It never opens Daily media or modifies a real player's save.
With `VERIFY_DAILY=1`, it also prepares and ends a real private Daily room,
verifying separate participant credentials without activating devices.

The multiplayer suite runs a real local Worker/SQLite/WebSocket service, exercises
room isolation and invitation authorization, and opens two independent browser
game sessions. Daily REST responses and media frames are simulated; the suite
does not create paid Daily rooms or claim to verify real microphones/cameras.
After provisioning production credentials, check a real call in two browsers:
accept, explicitly join, enable devices in Daily, confirm two-way media, and end
the call from each side. Also let one conversation reach its timer.

Implementation references:
[Cloudflare WebSocket Hibernation](https://developers.cloudflare.com/durable-objects/best-practices/websockets/),
[Daily rooms](https://docs.daily.co/reference/rest-api/rooms/create-room),
[Daily meeting tokens](https://docs.daily.co/reference/rest-api/meeting-tokens/create-meeting-token),
[Daily createFrame](https://docs.daily.co/reference/daily-js/factory-methods/create-frame).
