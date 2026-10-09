# Main road market

`src/market.js` owns the crowd. `level.npcs` exposes the same array: stable
IDs, roles, positions, names, movement state, and vendor conversation content.
There are 118 walkers, two workers, and 20 stalls along the road, with extra foot traffic
beside the Hippodrome. Instanced bodies, heads, counters, goods, and awnings
keep rendering costs small. Walkers pause at their route ends and give the
player space. Stall counters have collision; the middle of the road stays open.

Press E near a vendor, then choose with buttons or 1 / 2; Escape leaves.
Twenty distinct vendor scenes cover generosity, status, responsibility,
patience, race glory, honesty, teachability, credit, forgiveness, and solidarity.
Vendors have individual names. Each vendor remembers one response across saves and offers follow-up dialogue.
Humility adds 1 grace; pride adds 2 pride, once per vendor. There is no provision
reward or purchase economy. Citizens offer short street dialogue.

## Errands and workers

Three errands connect named stalls: bread for the stable hands, cups for weary
travelers, and fruit for the porters. Use the numbered conversation option to
accept. Carry one parcel at a time; the road HUD names its recipient and gives
direction and distance. Active deliveries survive reloads. Speak to the recipient
and choose a quiet handoff (+2 grace) or request an announcement (+3 pride).
Each delivery resolves once, and accepting alone has no meter reward.

Isaak the stable hand and Euphemia the sweeper stand near the Hippodrome.
Help with their work quietly or call attention to your generosity. They remember
your motive just as the vendors remember ordinary market choices.

Market residents near the Hippodrome recognize the saved race outcome: helping
the Blue driver, winning for the Greens, or finishing elsewhere. If the save
records both help and victory, their dialogue puts the injured driver's life first.

Possible next steps:

- Have apprentices and porters exchange conversations while waiting.
- Add directional walking sprites and market sounds within the existing art style.

The choices make ordinary relationships part of the pilgrimage: mercy and
honesty versus reputation and entitlement. Meter changes represent the game's
existing narrative model, and repeat conversations cannot generate more points.
