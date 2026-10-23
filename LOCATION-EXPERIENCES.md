# A lived-in pilgrimage

Twelve landmark activities are now playable: the Aqueduct, Harbour, Forum,
Pantokrator, Stoudios, Hagia Eirene, Basilica Cistern, Baths of Zeuxippus,
Mosaic Peristyle, Milion, Augustaion, and Chalke. The Hagia Sophia row below
remains a design proposal. Harbour now plays directly in the 3D quay, with
a physical handcart, cargo obstacles, a porter, and a loading destination.
Aqueduct and Forum also play in the city: approach physical gate handles and
watch basins fill, or walk to named witnesses and inspect behind a cloth stall. The Hippodrome is
the reference for depth: enter a recognizable place, learn a physical activity,
feel its pressures, make a consequential choice, and return to the road.

Each landmark should eventually have a two-to-four-minute experience with its
own activity, characters, and aftermath. Winning or doing skilled work should
feel good. The temptation comes from seeking status at another person's expense,
concealing a mistake, or refusing help. Humility can include accepting help and
doing excellent work; it does not always mean deliberately losing.

## Locations

| Location | Playable activity | Pride pressure | Humble alternative | Visible aftermath |
| --- | --- | --- | --- | --- |
| Hippodrome (existing) | Drive seven laps, steer, manage the horses | Pursue the crowd's glory | Stop for the wrecked rival | Race result and vendor recognition |
| Aqueduct of Valens (playable) | Time gates to fill three neighborhood channels before the reservoir empties | Fill a patron's fountain while households wait | Distribute water fairly; ask the keeper for advice | Filled channels and a remembered result |
| Port of Theodosius (playable) | Balance a handcart and steer between cargo stacks before the departure bell | Rush past a struggling porter for the foreman's praise | Brake, draw alongside, and help; he steadies your load afterward | Cart arrival, remaining grain, and a remembered result |
| Forum of Constantine (playable) | Hear witnesses and inspect a purse behind a stall | Accuse the porter to satisfy the crowd | Hear the porter and sweeper; inspect the purse and return it quietly | Evidence board, witness testimony, and a remembered result |
| Pantokrator Monastery (playable) | Prepare a tray, remember bedside needs, and carry it without spilling | Serve the influential patient first; claim another attendant's work | Follow need, share credit, ask when uncertain | Patients receive different care; an attendant offers guidance |
| Saint John of Stoudios (playable) | Copy a short pattern with timed strokes; correct a mistake before the ink dries | Hide an error to claim a flawless manuscript | Reveal the mistake and accept instruction | The corrected page keeps its visible repair |
| Basilica Cistern (playable) | Navigate dark column lanes carrying a lamp and follow echoes to a missing worker | Race for the exit and claim you explored alone | Share the lamp and slow down to guide the worker | Two people emerge together; the lamp is passed onward |
| Baths of Zeuxippus (playable) | Adjust warm/cool water and arrange safe passage across wet tiles | Reserve the comfortable basin for yourself | Make it safe for an older visitor, even if your own bath waits | Visitors use the space you prepared |
| Mosaic Peristyle (playable) | Fit a small mosaic from rotated pieces, with a novice working on the border | Take the novice's finished section as your own | Credit the novice and repair your own misplaced tile | A shared finished pattern and a remembered collaborator |
| Augustaion (playable) | Guide a procession through a small crowd by opening paths and matching its pace | Push people aside to put yourself at the front | Make room for the slower participants and keep the group together | The procession arrives together or leaves people behind |
| Milion (playable) | Rotate a route board and use local clues to guide three travelers | Guess confidently rather than admit you do not know | Ask a local porter and correct your directions | Travelers reach their destinations; someone returns to thank the porter |
| Chalke (playable) | Carry a sealed petition through a queue, listening to people whose turn is ahead of yours | Use a supposed connection to jump the queue | Keep your place and help someone state a neglected request | The petition includes another person's need |
| Hagia Eirene (playable) | Match a simple shared musical phrase by listening and entering on time | Play over the quieter singer to be noticed | Leave space, recover from mistakes, and support the ensemble | Voices resolve together or fall apart |
| Hagia Sophia / chapel | Attend to a sequence of voices and quiet tasks; choose what burden to acknowledge | Perform devotion for watching visitors | Acknowledge a specific wrong and make room for another person | Link to the existing elder/confession flow; do not invent a second sacrament reward loop |

These are fictional game situations, not historical reconstructions. Water,
music, light, cargo, and mosaic activities need clearly readable physical feedback
before dialogue explains their meaning.

## Pantokrator, Stoudios and Hagia Eirene

Each plays in its own module under `src/activities/`, lazy-loaded on first
entry, and shares the bottom dock, WASD + mouse look, E, Q / Esc and R.

- **Pantokrator:** walk to the beds (or ask Theophano) to learn each need, set
  two items on the tray at the table, and walk them over. Running with water
  or wine tilts the tray and spills it onto the floor. Physician Nikolaos asks
  who made the poultice once all three are cared for: F claims it, H credits
  Theophano. Serving the patron first or claiming her work resolves pride.
- **Stoudios:** press Space at the page as the ring closes on each stroke's
  start; a mistimed stroke wavers and you try it again. On the fifth stroke
  the quill catches and blots, and the ink stays wet for ten seconds. F gilds
  over it (pride). E shows Brother Ioannikios, then Space lifts the ink and
  the stroke is laid again (humility); the pale scraped patch stays on the
  finished page. If the ink dries first, the page is spoiled and retryable.
- **Hagia Eirene:** stand in your place, press E, and listen to one phrase
  while the lamps pulse. Then sing Romanos's beats with Space for three
  phrases and leave Kassia's two answering beats to her. Singing over her
  dims her lamp and turns listeners toward you; two such entries resolve
  pride. Entering on time for most of your beats resolves humility.


## Basilica Cistern and Baths of Zeuxippus

Both live in their own modules, `src/activities/cistern.js` and
`src/activities/zeuxippus.js`, and load on
first entry. They reuse the existing `cistern` and `zeuxippus` courts.

- **Cistern:** a vault closes over the court and the day dims; the lamp is the
  only light, with ninety seconds of oil. Column lanes on the dry rim make the
  walk weave. Ripples spread on the water by the far wall, and the HUD says
  whether each echo grew louder. E calls to Theodoros, then E again shares the
  lamp. He follows your footsteps at half a walking pace and stops when he
  loses the light. Reaching the road exit with him resolves humility, and
  Pelagia carries the lamp down for the next shift. At the exit without him,
  F tells the foreman you explored alone (pride). Empty oil is unfinished.
- **Baths:** stand at the warm or cool tap and hold Space; the basin water
  shifts from blue to orange and steams above comfortable. E takes a mat from
  the stack and lays it on a shining wet tile. E offers Theodora the basin:
  she sways and sits back down on wet tiles, and names cold or scalding water.
  When both are right she crosses on the mats and bathes (humility), and
  another bather follows the same path. F at a comfortable basin takes it for
  yourself (pride). The basin drains after 150 seconds (unfinished).

## Mosaic Peristyle and Milion

Both live in their own modules, `src/activities/mosaicPeristyle.js` and
`src/activities/milion.js`, and load on first entry.

- **Mosaic Peristyle:** turn the eight floor tiles around the gold medallion
  until each gold quarter meets its red sinopia line, while Irene, the novice,
  visibly sets the sixteen border tiles. The last tile you set lifts and rocks;
  hold Space on it to press it flush. At Kosmas, the master, F claims the whole
  floor (pride) and H names Irene's border as hers (humility, once your loose
  tile is repaired). On humility Irene becomes "Your collaborator" and a "One
  floor, two hands" sign stands over the pattern.
- **Milion:** E turns the route board's pointer and F sends the current
  traveler that way. A wrong direction walks out, stops, and comes back to be
  corrected. The third traveler seeks the grain ships, on the arm worn smooth:
  pointing without asking Basil the porter is a guess and resolves pride even
  when it is right. Asking him is humility; once all three arrive, the first
  traveler walks back to thank him.

Both close as unfinished after 120 seconds.

## Augustaion and Chalke

Both share `src/activities/palace.js`, imported only on first entry. Each site
builds one instanced body and head mesh for its people, as the road market
does, and updates only while active.

- **Augustaion** (sign south of the Milion): a six-person procession walks the
  north lane toward a gold ring at the palace end. Four bystanders block the
  lane. E beside a bystander asks them to make room; they step aside. E beside
  Sergios, the cross bearer, sets the pace of the slowest walkers, Gerontios and
  Maria. The procession arriving together resolves humbly. F beside a bystander
  shoves the whole lane aside and puts you at the front; the cross hurries and
  the slow walkers are left behind (proud). Arriving with people strung out, or
  running out of time, is unfinished and changes no meters.
- **Chalke** (sign before the bronze doors): a sealed petition and a gold ring
  marking your place behind five petitioners. The clerk calls one name every
  six seconds and the line shuffles forward. E hears each petitioner. The clerk
  passes over Eirene, who cannot write; after hearing her, H adds her request
  to your petition. At the front, E presents it: with her need included it
  resolves humbly, without it the result is unfinished. F beside the clerk
  claims a connection with the Magistros and jumps the queue (proud).

## Shared frame and rewards

The nine newer activities share `SiteActivity` in `src/activities/siteKit.js`
(Augustaion and Chalke keep their own crowd coordinator in `palace.js`). Each
stop in `src/activitySites.js` names the module that plays it. A first humble
resolution grants +2 grace and a first proud one +3 pride (`SITE_GRACE` and
`SITE_PRIDE`), the weight of a market errand and less than the Aqueduct,
Harbour and Forum (+3 / +4). Each also pays 6 gold in morning mode.
Incomplete work, abandonment and replays change no meters.

## Build order

1. **Aqueduct:** a visible, compact water puzzle provides a different form of fun
   from driving and introduces stewardship rather than another delivery quest.
2. **Harbour:** steering and load balance reuse some racing experience while
   changing the pace, setting, and social stakes.
3. **Forum:** listening and investigation add a completely different kind of
   agency, without relying on reflexes.

Play-test these three before expanding to every card. Look for what players
remember doing and whom they remember meeting, rather than the meter reward.

## Keep the implementation small

Aqueduct's basins sit in the water court beside the arches; Forum's witnesses
and stall stand inside the circular court. Both have walkable entrances from
the main road. Basin and stall collisions stay inside those landmark footprints.
During world activities, dialogue, status and controls stack in a bottom dock
so they do not cover one another or the central view. The same dock serves
Harbour and Hippodrome; exploration restores the normal HUD positions.

Aqueduct and Forum share `src/activities.js`, imported only on first entry (about
4 KB compressed). Each site builds its props once on first entry, reuses shared
geometry and materials, and updates only during play. WASD and mouse look remain
active. Aqueduct requires approaching a gate before holding Space; E hears the
keeper. Forum uses E at each witness or the purse, then F to accuse or H to
explain at the merchant. The returned purse disappears and filled water remains
visible until retry. Harbour uses `src/harbourCart.js` with the existing world,
camera, and collision system. Shared geometry and instanced wheels, sacks, and
obstacles keep its props compact. W pushes, S brakes, A/D steer, and E helps the
porter when stopped beside him. Mouse look stays available; Q/Escape leaves and
R restarts. The cart simulation updates only while active. Entry positions and labels
live in `src/activitySites.js`. Only the active game updates; leaving drops its
simulation. Small signs belong to their site's existing feature group. Q/Escape
returns to the road, R retries, and first completed outcomes persist in existing
journey flags. Aqueduct, Harbour and Forum each grant +3 grace or +4 pride once;
the nine newer sites grant +2 or +3 (see "Shared frame and rewards"). Incomplete
work and abandonment do not change the meters. Together the twelve sites can add
at most 27 grace, and the existing full-journey ending tests remain part of
verification.

- The world activity coordinator handles Aqueduct and Forum. All three activities
  keep controls and results in the world with compact HUDs. Both coordinators
  use the same saved outcome flags and rewards.
- Reuse existing site geometry, material batches, and named NPC records. Add
  props only when they teach a control or show an outcome.
- Load an activity's code when entered. Update its simulation only while active;
  dormant sites need only a proximity trigger and saved result.
- Share small utilities for timing windows, route progress, interaction targets,
  and object pooling; do not turn every activity into a generic choice screen.
- Store stable IDs and compact outcomes, not world meshes or animation state.
  Rewards resolve once; practice runs remain available.
- Budget all new site rewards against the existing endings before releasing
  them. Reuse visits must not allow farming or trivialize the three thresholds.
- Start with authored scenarios, shared geometry, and a few reusable sounds.
  No dialogue service, procedural quest engine, or independent AI per citizen.

## Crowd identity policy (implemented)

The market has exactly one instance of each of 20 vendor trades. Each scene is
authored separately. The 118 roaming citizens have stable, distinct full names
and full dialogue lines assembled from twelve personal perspectives and ten
journeys. Two stationary workers have their own authored scenes. Perspective
sentences are shared; the full citizen dialogue is unique. This is intentionally
a compact authored vocabulary, not 118 independent branching stories.

Body proportions and clothing/skin variations are assigned deterministically.
People still share two instanced body/head meshes, and the complete market uses
six instanced meshes. Fixed conservative crowd bounds avoid per-frame bounds
recomputation. Standing figures do not rewrite their transforms each frame.
