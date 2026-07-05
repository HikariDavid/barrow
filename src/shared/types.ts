export type Tile = 'wall' | 'floor' | 'stairs' | 'shrine' | 'spike' | 'grave';
export type EnemyType = 'rat' | 'skeleton' | 'wisp' | 'knight';
export type ItemType = 'ember' | 'bandage' | 'gold' | 'dagger' | 'sword' | 'trinket';

export type RunState = {
  date: string;
  user: string;
  status: 'active' | 'died' | 'escaped';
  depth: number;
  gold: number;
  turns: number;
  startedAt: number;
  finishedAt?: number;
};

export type Grave = {
  id: string;
  user: string;
  floor: number;
  x: number;
  y: number;
  item: string;
  epitaph: [number, number, number];
};

export type LedgerEntry = {
  id: string;
  text: string;
  ts: number;
};

export type LbRow = {
  user: string;
  score: number;
  depth: number;
  gold: number;
  escaped: boolean;
};

export type InitPayload = {
  date: string;
  dayNumber: number;
  username?: string;
  run?: RunState;
  graves: Grave[];
  meter: { value: number; tiers: [number, number, number]; unlockedYesterday: 0 | 1 | 2 | 3 };
  streak: { current: number; best: number; bonusTorch: number };
  lb: { top: LbRow[]; me?: LbRow };
  ledger: LedgerEntry[];
  flags: { loggedOut: boolean };
};

export type FinishBody = {
  result: 'died' | 'escaped';
  depth: number;
  gold: number;
  turns: number;
  durationMs: number;
  buriedItem?: string;
  epitaph?: [number, number, number];
  deathPos?: { floor: number; x: number; y: number };
};

export type Enemy = {
  type: EnemyType;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  aggroed: boolean;
  moveTimer: number;
};

export type Item = {
  type: ItemType;
  name: string;
  x: number;
  y: number;
  collected: boolean;
};

export type Player = {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  weapon: { name: string; dmg: number } | null;
  inventory: string[];
  torch: number;
};

export type FloorState = {
  tiles: Tile[][];
  enemies: Enemy[];
  items: Item[];
  graves: Grave[];
  stairsX: number;
  stairsY: number;
  shrineX?: number;
  shrineY?: number;
  entryX: number;
  entryY: number;
};

export type GraveAction = {
  graveId: string;
  act: 'respect' | 'loot';
};
