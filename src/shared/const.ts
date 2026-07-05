export const COLS = 9;
export const ROWS = 11;
export const TILE = 16;

export const START_TORCH = 60;
export const TORCH_PER_TURN = 1;
export const MAX_HP = 10;
export const BASE_DAMAGE = 1;
export const INVENTORY_SLOTS = 3;

export const LIGHT_THRESHOLDS = [
  { min: 70, radius: 3.5 },
  { min: 40, radius: 2.5 },
  { min: 1, radius: 1.5 },
  { min: 0, radius: 0.75 },
] as const;

export const DARKNESS_HP_LOSS_INTERVAL = 3;
export const DARKNESS_BONUS_DAMAGE = 1;

export const ENEMY_STATS = {
  rat: { hp: 1, dmg: 1, name: 'Rat' },
  skeleton: { hp: 2, dmg: 1, name: 'Skeleton' },
  wisp: { hp: 1, dmg: 0, name: 'Wisp' },
  knight: { hp: 3, dmg: 2, name: 'Barrow Knight' },
} as const;

export const ENEMY_CHASE_RADIUS = 1;
export const ENEMY_AGGRO_RANGE = 2;

export const ENEMY_GOLD = { rat: 2, skeleton: 4, wisp: 6, knight: 12 } as const;

export const SHRINE_FLOORS = [5, 10, 15, 20, 25];
export const SPIKE_START_FLOOR = 4;
export const MAX_ENEMIES = 7;
export const ENEMIES_BASE = 2;
export const ENEMIES_PER_FLOOR_DIVISOR = 2;

export const ITEMS_PER_FLOOR_MIN = 2;
export const ITEMS_PER_FLOOR_MAX = 3;
export const GOLD_PILE_MIN = 3;
export const GOLD_PILE_MAX = 8;
export const TRINKET_INTERVAL = 2;
export const MAX_FLOORS = 30;

export const EMBER_TORCH_BOOST = 25;
export const BANDAGE_HP_BOOST = 3;
export const RESPECT_TORCH_BOOST = 5;

export const INVISIBILITY_DAMAGE_INTERVAL = 3;

export const METER_TIERS = [150, 600, 1500] as const;

export const STREAK_BONUS_PER_LEVEL = 5;
export const STREAK_MAX_LEVEL = 5;

export const MIN_GRAVES_FROM_ENTRY = 2;
export const MAX_GRAVES_PER_FLOOR = 6;
export const MAX_GRAVES_PER_DAY = 200;
export const GRAVE_BURY_DISTANCE = 8;

export const TRINKETS = [
  'Tin Locket',
  'Cracked Compass',
  'Wren Skull',
  'Cold Candle',
  'River Pearl',
  'Rust Key',
  'Moth Charm',
  'Salt Vial',
] as const;

export const WEAPONS = [
  { name: 'Dagger', dmg: 2, minFloor: 2 },
  { name: 'Sword', dmg: 3, minFloor: 6 },
] as const;

export const FLAIR_MILESTONES = [
  { depth: 5, text: 'Gravewalker' },
  { depth: 10, text: 'Bonelight Bearer' },
  { depth: 15, text: 'Deep Warden' },
  { depth: 20, text: 'Barrow Lord' },
] as const;

export const LAUNCH_DATE = '2026-07-15';

export const WORD_BANK = {
  openers: ['Beware', 'Seek', 'Trust', 'Avoid', 'Fear', 'Follow', 'Praise', 'Mourn'],
  subjects: [
    'the gold',
    'the darkness',
    'the rats',
    'the knight',
    'the stairs',
    'the third floor',
    'the wisp-light',
    'this grave',
    'the shrine',
    'the quiet',
  ],
  closers: [
    'below',
    'ahead',
    'always',
    'never',
    '…trust me',
    'in the dark',
    'before dawn',
    'with your life',
    'as I did',
    'no further',
  ],
} as const;

export const LORE_GRAVES = [
  { user: 'The Unnamed Wanderer', epitaph: [0, 5, 0] as [number, number, number] },
  { user: 'A Forgotten Cartographer', epitaph: [1, 3, 7] as [number, number, number] },
  { user: 'The Third Torchbearer', epitaph: [2, 6, 2] as [number, number, number] },
  { user: 'One Who Counted Coins', epitaph: [0, 0, 5] as [number, number, number] },
  { user: 'The Last Pilgrim', epitaph: [4, 8, 6] as [number, number, number] },
  { user: 'A Silent Watcher', epitaph: [5, 4, 3] as [number, number, number] },
  { user: 'The Hollow Saint', epitaph: [6, 9, 1] as [number, number, number] },
  { user: 'The Broken Compass', epitaph: [3, 1, 4] as [number, number, number] },
  { user: 'The Ash-Bearer', epitaph: [7, 2, 9] as [number, number, number] },
  { user: 'The Cold Witness', epitaph: [0, 7, 8] as [number, number, number] },
  { user: 'The Drowned Pilgrim', epitaph: [1, 5, 6] as [number, number, number] },
  { user: 'The Fading Ember', epitaph: [4, 0, 2] as [number, number, number] },
  { user: 'The Stone Listener', epitaph: [2, 8, 7] as [number, number, number] },
  { user: 'The Bone Collector', epitaph: [6, 3, 4] as [number, number, number] },
] as const;

export const METER_TIER_REWARDS = {
  T1: 'The dead were many. The Barrow relents.',
  T2: 'The Barrow is unmoved.',
  T3: 'The dead were many. The Barrow relents.',
} as const;
