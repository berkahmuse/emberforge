// EMBERFORGE — configuration: constants, palette, materials, difficulties,
// orders, upgrades, feats. One job: the numbers and names the whole game
// reads. No logic here beyond small lookup tables.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const STEP = 1 / 60;

export const DAYS = 5;
export const START_GOLD = 50;
export const START_LIVES = 3; // ruined blades allowed before the run ends
export const DAY_CLOCK = 240; // seconds per day, days 1-4
export const ROYAL_CLOCK = 180; // seconds for the day-5 Dragonblade
export const ORDERS_PER_DAY = [3, 3, 4, 4, 1];
export const REROLL_COST = 20;
export const FAVOUR_BONUS = 50; // gold for beating Brakk's day target

// Rival Brakk's gold target per day (standings race).
export const BRAKK_DAY_TARGET = [90, 140, 200, 260, 0];
export const DRAGONBLADE_BONUS = 500; // gold for finishing before Brakk

// Palette — fallback direction (no verified Pro Max palette match for a
// forge game; Dark Mode OLED + data-dense dashboard as general guidance).
// One accent (ember orange); heat states are functional colours, like the
// red/green alerts of a dark dashboard, not decoration.
export const PAL = {
  ground: '#14100c',
  ground2: '#1c150e',
  panel: '#20180f',
  panel2: '#2a1f13',
  hairline: 'rgba(245, 237, 224, 0.10)',
  hairlineStrong: 'rgba(245, 237, 224, 0.22)',
  text: '#f5ede0',
  muted: '#b8a88f',
  dim: '#7d6f5c',
  accent: '#f97316', // ember orange — the one accent
  accentDark: '#c2410c',
  gold: '#eab308', // coin + white-hot heat (functional)
  steel: '#7a8b99', // cold steel (functional)
  danger: '#ef4444', // ruin / lose (functional)
  good: '#a3e635', // perfect-strike flash (functional)
  whiteHot: '#fde68a',
};

// Typography — offline only: system fonts, no network requests.
// Display: heavy system sans with wide tracking. Numbers: ui-monospace,
// tabular. (Pro Max "Terminal CLI Monospace" pairing, realised offline.)
export const FONT_DISPLAY = '"Arial Black", "Segoe UI", system-ui, sans-serif';
export const FONT_BODY = '"Segoe UI", system-ui, sans-serif';
export const FONT_MONO = 'ui-monospace, "Cascadia Mono", Consolas, monospace';

export const MATERIALS = {
  iron: {
    id: 'iron', name: 'Iron', cost: 10, heatRate: 1.0, coolRate: 1.0,
    payout: 1.0, perfect: 26, good: 64,
    blurb: 'Cheap and forgiving. Heats slow, cools steady.',
  },
  steel: {
    id: 'steel', name: 'Steel', cost: 25, heatRate: 1.25, coolRate: 0.95,
    payout: 1.5, perfect: 22, good: 56,
    blurb: 'Balanced. Pays better, runs hotter.',
  },
  mithril: {
    id: 'mithril', name: 'Mithril', cost: 60, heatRate: 1.6, coolRate: 0.9,
    payout: 2.5, perfect: 18, good: 48,
    blurb: 'Rare and wild. Huge payout, tight window.',
  },
};
export const MATERIAL_IDS = ['iron', 'steel', 'mithril'];

export const QUALITY = {
  crude: { id: 'crude', name: 'CRUDE', mult: 0.6 },
  fine: { id: 'fine', name: 'FINE', mult: 1.0 },
  masterwork: { id: 'masterwork', name: 'MASTERWORK', mult: 1.8 },
};

// Strike results. Progress/heat deltas are the base values; upgrades and
// difficulty scale them in world.js.
export const STRIKE = {
  perfect: { progress: 9, heat: 7 },
  good: { progress: 5, heat: 6 },
  clang: { progress: 1, heat: 8 },
};
export const HEAT_COOL_PER_SEC = 4;
export const COMBO_WINDOW = 2.5;
export const COMBO_MAX = 5;
export const RING_SPEED_DEG = 150; // marker sweep, degrees per second
export const WHITE_LOW = 70; // white-hot quench window, low end
export const WHITE_HIGH = 90; // white-hot quench window, high end
export const MASTERWORK_MIN_PROGRESS = 90;
export const FINE_MIN_PROGRESS = 60;

export const DIFFICULTIES = [
  {
    id: 'apprentice', num: 1, name: 'APPRENTICE',
    blurb: 'Slow heat, wide windows, patient ring.',
    heatRate: 0.8, ringRate: 0.8, scoreMult: 1.0,
  },
  {
    id: 'journeyman', num: 2, name: 'JOURNEYMAN',
    blurb: 'The smith\u2019s usual day. Balanced heat and time.',
    heatRate: 1.0, ringRate: 1.0, scoreMult: 1.0,
  },
  {
    id: 'master', num: 3, name: 'MASTER',
    blurb: 'Fast heat, tight windows. Score pays +25%.',
    heatRate: 1.25, ringRate: 1.25, scoreMult: 1.25,
  },
];

export const BLADE_TYPES = ['SWORD', 'AXE', 'DAGGER', 'HAMMER', 'SPEAR'];

export const UPGRADES = [
  { id: 'bellows', name: 'Big Bellows', cost: 0,
    blurb: 'Heat cools 40% faster. The blade forgives more.' },
  { id: 'anvil', name: 'Master Anvil', cost: 0,
    blurb: 'Strikes land +2 progress. Fewer swings per blade.' },
  { id: 'barrel', name: 'Quench Barrel', cost: 0,
    blurb: 'White-hot window widens to 60–95 heat.' },
  { id: 'lucky', name: 'Lucky Hammer', cost: 0,
    blurb: '15% of strikes are critical: double progress.' },
  { id: 'stove', name: 'Coal Stove', cost: 0,
    blurb: 'Strikes add 25% less heat. Push harder.' },
  { id: 'stock', name: 'Steel Stock', cost: 0,
    blurb: 'Materials cost 30% less, every blade.' },
  { id: 'apprentice', name: 'Apprentice', cost: 0,
    blurb: 'Your apprentice adds +1 progress every second.' },
  { id: 'charm', name: 'Ember Charm', cost: 0,
    blurb: 'Combo window stretches to 4 seconds.' },
];

export const FEATS = [
  { id: 'first-blade', name: 'FIRST BLADE', blurb: 'Deliver your first order.' },
  { id: 'flawless-day', name: 'FLAWLESS DAY', blurb: 'Clear a day with no ruined blade.' },
  { id: 'masterwork', name: 'MASTERWORK', blurb: 'Forge a MASTERWORK blade.' },
  { id: 'combo-five', name: 'COMBO FIVE', blurb: 'Reach a x5 strike combo.' },
  { id: 'rich-smith', name: 'RICH SMITH', blurb: 'Hold 300 gold at once.' },
  { id: 'dragonslayer', name: 'DRAGONSLAYER', blurb: 'Deliver the Dragonblade and win.' },
];

export const GRADE_THRESHOLDS = { s: 1400, a: 1000, b: 650 };
