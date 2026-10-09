# A lived-in pilgrimage

The Aqueduct, Harbour, and Forum activities are now playable; the other activities
below remain design proposals. Harbour now plays directly in the 3D quay, with
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
| Pantokrator Monastery | Prepare a tray, remember bedside needs, and carry it without spilling | Serve the influential patient first; claim another attendant's work | Follow need, share credit, ask when uncertain | Patients receive different care; an attendant offers guidance |
| Saint John of Stoudios | Copy a short pattern with timed strokes; correct a mistake before the ink dries | Hide an error to claim a flawless manuscript | Reveal the mistake and accept instruction | The corrected page keeps its visible repair |
| Basilica Cistern | Navigate dark column lanes carrying a lamp and follow echoes to a missing worker | Race for the exit and claim you explored alone | Share the lamp and slow down to guide the worker | Two people emerge together; the lamp is passed onward |
| Baths of Zeuxippus | Adjust warm/cool water and arrange safe passage across wet tiles | Reserve the comfortable basin for yourself | Make it safe for an older visitor, even if your own bath waits | Visitors use the space you prepared |
| Mosaic Peristyle | Fit a small mosaic from rotated pieces, with a novice working on the border | Take the novice's finished section as your own | Credit the novice and repair your own misplaced tile | A shared finished pattern and a remembered collaborator |
| Augustaion | Guide a procession through a small crowd by opening paths and matching its pace | Push people aside to put yourself at the front | Make room for the slower participants and keep the group together | The procession arrives together or leaves people behind |
| Milion | Rotate a route board and use local clues to guide three travelers | Guess confidently rather than admit you do not know | Ask a local porter and correct your directions | Travelers reach their destinations; someone returns to thank the porter |
| Chalke | Carry a sealed petition through a queue, listening to people whose turn is ahead of yours | Use a supposed connection to jump the queue | Keep your place and help someone state a neglected request | The petition includes another person's need |
| Hagia Eirene | Match a simple shared musical phrase by listening and entering on time | Play over the quieter singer to be noticed | Leave space, recover from mistakes, and support the ensemble | Voices resolve together or fall apart |
| Hagia Sophia / chapel | Attend to a sequence of voices and quiet tasks; choose what burden to acknowledge | Perform devotion for watching visitors | Acknowledge a specific wrong and make room for another person | Link to the existing elder/confession flow; do not invent a second sacrament reward loop |

These are fictional game situations, not historical reconstructions. Water,
music, light, cargo, and mosaic activities need clearly readable physical feedback
before dialogue explains their meaning.

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
journey flags. Each site grants +3 grace or +4 pride once. Incomplete work and
abandonment do not change the meters. New sites contribute at most nine grace,
and the existing full-journey ending tests remain part of verification.

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
