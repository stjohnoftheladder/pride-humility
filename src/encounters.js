// The three thresholds of the pilgrimage.
// Contract consumed by src/battle/battle.js:
//   intro        : string[] | (branch) => string[]
//   hp           : enemy "walls" (how much FIGHT damage it absorbs)
//   patterns     : bullet pattern names (see src/battle/patterns.js)
//   prayerNeeded : sustained prayer moments required before mercy can work
//   mercy        : (branch, battle) => bool — is sparing possible right now
//   lines        : round/pray/fight/mercyReady/spared/defeated/wait
//   outcomes     : spared|defeated -> { grace, pride, flags }
export const ENCOUNTER_ORDER = ['tempter', 'brother', 'pride'];

export const ENCOUNTERS = {
  tempter: {
    id: 'tempter',
    name: 'The Tempter',
    enemy: 'tempter',
    room: 'The Tempter\u2019s Chamber',
    hp: 34,
    patterns: ['coins', 'greed', 'words'],
    prayerNeeded: 1,
    intro(branch) {
      const lines = [
        'A small demon squats on a heap of gold, grinning.',
        'It tosses a coin at your feet. \u201CTake it,\u201D it says. \u201CYou\u2019ve come so far. You deserve it.\u201D',
        'The gold shines with a light that is not light.',
      ];
      return lines;
    },
    mercy(branch, battle) {
      return battle.prayActions >= 1 && battle.round >= 2;
    },
    lines: {
      round(round) {
        const lines = [
          '\u201CSee how much I have. See how little you are.\u201D',
          '\u201CGold answers every question. Take it and be somebody.\u201D',
          '\u201CYour prayers are just words. Words don\u2019t buy bread.\u201D',
        ];
        return lines[round % lines.length];
      },
      pray: [
        'You pray the Jesus Prayer. The gold dims, briefly.',
        '\u201CThat sound... it hurts my ears,\u201D the demon squints.',
      ],
      fight(dmg, hp) {
        if (hp <= 0) return `You shatter the heap of gold.`;
        return `You strike the demon. Coins scatter. (−${dmg})`;
      },
      mercyReady: 'The demon is squirming, half-hearted. It could be spared.',
      spared: '\u201C...You\u2019re letting me go? Take the gold! No? Then go, strange one. Go.\u201D The Tempter slinks into the dark, looking back twice.',
      defeated: 'The demon bursts into a shower of counterfeit coins. They turn to dust before they hit the ground.',
      wait: 'You wait, watching the coins. They do not move. Neither does your heart. (+1 grace)',
    },
    outcomes: {
      spared: { grace: 15, pride: 0, flags: ['sparedTempter'] },
      defeated: { grace: 0, pride: 10, flags: ['killedTempter'] },
    },
  },

  brother: {
    id: 'brother',
    name: 'The Wounded Brother',
    enemy: 'brother',
    room: 'The Brother\u2019s Cell',
    hp: 26,
    patterns: ['wrath', 'words'],
    prayerNeeded: 1,
    intro(branch) {
      const lines = [
        'A monk sits with his back to you, a bandaged arm across his knees.',
        'He does not turn. \u201CYou. You\u2019re the one the abbot praises, aren\u2019t you?\u201D',
      ];
      if (branch.flag('killedTempter')) {
        lines.push('\u201CThe demon-slayer. You even killed my demon for me. Now everyone will say \u2018ask him\u2019.\u201D');
      } else {
        lines.push('\u201CEveryone forgives you. No one forgives me. I have carried this for years.\u201D');
      }
      lines.push('He rises, and his words become blows.');
      return lines;
    },
    mercy(branch, battle) {
      return battle.prayActions >= 1 && battle.round >= 2;
    },
    lines: {
      round(round) {
        const lines = [
          '\u201CYou think you\u2019re better than me. Everyone thinks that.\u201D',
          '\u201CForgive? You don\u2019t know what was taken from me.\u201D',
          '\u201CSay one word against me and I will never forget it.\u201D',
        ];
        return lines[round % lines.length];
      },
      pray: [
        'You pray for him — and for yourself. The cell grows lighter.',
        '\u201C...Why are you praying for ME?\u201D His voice wavers.',
      ],
      fight(dmg, hp) {
        if (hp <= 0) return `He falls. You stand over him, and feel only the cold.`;
        return `You strike him. The bandage reddens. This is not victory. (−${dmg})`;
      },
      mercyReady: 'His shoulders slump. For a moment, the grievance is quiet.',
      spared: '\u201CI... I don\u2019t know how to put it down. But you carried it with me. That is enough.\u201D He embraces you, and weeps.',
      defeated: 'He falls, and you stand over him, and you feel nothing but the cold.',
      wait: 'You wait, letting his anger pass over you like weather. (+1 grace)',
    },
    outcomes: {
      spared: { grace: 15, pride: 0, flags: ['forgaveBrother'] },
      defeated: { grace: 0, pride: 12, flags: ['struckBrother'] },
    },
  },

  pride: {
    id: 'pride',
    name: 'The Demon of Pride',
    enemy: 'pride',
    room: 'The Ladder Chamber',
    hp: 60,
    patterns: ['vanity', 'crown', 'fall'],
    prayerNeeded: 2,
    intro(branch) {
      const lines = [
        'The last door opens onto a vast darkness. Something enormous waits — a crowned figure, feathered like a peacock.',
        '\u201CYou made it,\u201D it purrs. \u201CThrough greed, through wrath. Look how strong you are.\u201D',
        '\u201CI am Pride. I am the last rung. I have been riding you the whole way.\u201D',
      ];
      if (branch.pride >= 40) {
        lines.push('It spreads its wings, and every feather is an eye. \u201CYou are already wearing my crown.\u201D');
      } else {
        lines.push('It spreads its wings, and every feather is an eye, watching you.');
      }
      return lines;
    },
    mercy(branch, battle) {
      return branch.grace >= 45 && battle.prayActions >= 2;
    },
    lines: {
      round(round) {
        const lines = [
          '\u201CYou could have stopped at any moment. You didn\u2019t. That was me.\u201D',
          '\u201CFight me. Everyone fights me. That is how I win.\u201D',
          '\u201CPray? I AM your prayer — the prayer to be great.\u201D',
        ];
        return lines[round % lines.length];
      },
      pray: [
        '\u201CLord Jesus Christ...\u201D The eyes blink, one by one.',
        '\u201CStop that. I can\u2019t see myself in that sound.\u201D',
      ],
      fight(dmg, hp) {
        if (hp <= 0) return `The shadow shatters — but you feel its crown settle on your own head.`;
        return `You strike the shadow. It grins wider. \u201CYes. There we are.\u201D (−${dmg})`;
      },
      mercyReady: 'The feathers droop. For a moment it looks... tired. It can be spared — if you are humble enough to try.',
      spared: '\u201C...You refuse to fight. You refuse to be great. Then what am I? What am I without your hunger?\u201D The Demon of Pride shrinks, and shrinks, until it is a small grey bird — which flies away.',
      defeated: '\u201CYou think you\u2019ve won? Look at yourself. You have become me.\u201D',
      wait: 'You wait in the dark, and the dark grows used to you. (+1 grace)',
    },
    outcomes: {
      spared: { grace: 20, pride: 0, flags: ['sparedPride'] },
      defeated: { grace: 0, pride: 25, flags: ['killedPride'] },
    },
  },
};
