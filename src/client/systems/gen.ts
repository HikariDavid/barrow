import { COLS, ROWS, ENEMY_STATS } from '../../shared/const.js';
import type { Tile, Enemy, Item, EnemyType, ItemType, Grave } from '../../shared/types.js';
import { createFloorRng } from '../../shared/prng.js';

export function generateFloor(
  date: string,
  floor: number,
  graveData: Array<{ x: number; y: number }>
): {
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
} {
  const rng = createFloorRng(date, floor);

  const tiles: Tile[][] = [];
  for (let y = 0; y < ROWS; y++) {
    tiles[y] = [];
    for (let x = 0; x < COLS; x++) {
      tiles[y]![x] = 'wall';
    }
  }

  const entryX = Math.floor(COLS / 2);
  const entryY = 0;
  tiles[entryY]![entryX] = 'floor';

  // Drunkard walk — target 55% of interior tiles (7×9=63 → ~35)
  const targetFloor = 35;
  let carved = 1;
  let cx = entryX;
  let cy = entryY;
  const dirs = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];

  while (carved < targetFloor) {
    const dir = dirs[Math.floor(rng() * 4)]!;
    const dx = dir[0]!;
    const dy = dir[1]!;
    const nx = cx + dx;
    const ny = cy + dy;
    if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
      if (tiles[ny]![nx] === 'wall') {
        tiles[ny]![nx] = 'floor';
        carved++;
      }
      cx = nx;
      cy = ny;
    }
  }

  // Place stairs at max distance from entry
  let bestDist = 0;
  let stairsX = entryX;
  let stairsY = entryY;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (tiles[y]![x] === 'floor') {
        const dist = Math.abs(x - entryX) + Math.abs(y - entryY);
        if (dist > bestDist && dist >= 8) {
          bestDist = dist;
          stairsX = x;
          stairsY = y;
        }
      }
    }
  }
  tiles[stairsY]![stairsX] = 'stairs';

  // Place shrine on special floors
  const shrineFloors = [5, 10, 15, 20, 25];
  let shrineX: number | undefined;
  let shrineY: number | undefined;
  if (shrineFloors.includes(floor)) {
    const candidates: Array<[number, number]> = [];
    for (let y = 1; y < ROWS - 1; y++) {
      for (let x = 1; x < COLS - 1; x++) {
        if (tiles[y]![x] === 'floor' && !(x === stairsX && y === stairsY)) {
          candidates.push([x, y]);
        }
      }
    }
    if (candidates.length > 0) {
      const idx = Math.floor(rng() * candidates.length);
      const [sx, sy] = candidates[idx]!;
      shrineX = sx;
      shrineY = sy;
      tiles[sy]![sx] = 'shrine';
    }
  }

  // Place spikes (floor 4+)
  if (floor >= 4) {
    const spikeCount = 2 + Math.floor(rng() * 2);
    let placed = 0;
    let attempts = 0;
    while (placed < spikeCount && attempts < 100) {
      const x = Math.floor(rng() * COLS);
      const y = Math.floor(rng() * ROWS);
      if (
        tiles[y]![x] === 'floor' &&
        !(x === entryX && y === entryY) &&
        !(x === stairsX && y === stairsY)
      ) {
        tiles[y]![x] = 'spike';
        placed++;
      }
      attempts++;
    }
  }

  // Place enemies
  const enemyCount = Math.min(
    7,
    2 + Math.floor(floor / 2)
  );
  const enemies: Enemy[] = [];
  const validTypes: EnemyType[] = ['rat'];
  if (floor >= 2) validTypes.push('skeleton');
  if (floor >= 3) validTypes.push('wisp');
  if (floor >= 5) validTypes.push('knight');

  let enemyPlaced = 0;
  let enemyAttempts = 0;
  while (enemyPlaced < enemyCount && enemyAttempts < 200) {
    const x = Math.floor(rng() * COLS);
    const y = Math.floor(rng() * ROWS);
    if (
      tiles[y]![x] === 'floor' &&
      Math.abs(x - entryX) + Math.abs(y - entryY) > 3
    ) {
      const typeIdx = Math.floor(rng() * validTypes.length);
      const type = validTypes[typeIdx]!;
      const stats = ENEMY_STATS[type];
      enemies.push({
        type,
        hp: stats.hp,
        maxHp: stats.hp,
        x,
        y,
        aggroed: false,
        moveTimer: type === 'skeleton' ? 0 : -1,
      });
      enemyPlaced++;
    }
    enemyAttempts++;
  }

  // Place items
  const itemCount = 2 + Math.floor(rng() * 2);
  const items: Item[] = [];
  let itemPlaced = 0;
  let itemAttempts = 0;
  while (itemPlaced < itemCount && itemAttempts < 200) {
    const x = Math.floor(rng() * COLS);
    const y = Math.floor(rng() * ROWS);
    if (
      tiles[y]![x] === 'floor' &&
      !(x === entryX && y === entryY) &&
      !(x === stairsX && y === stairsY)
    ) {
      const roll = rng();
      let type: ItemType;
      let name: string;
      if (roll < 0.4) {
        type = 'ember';
        name = 'Ember';
      } else if (roll < 0.65) {
        type = 'gold';
        name = 'Gold';
      } else if (roll < 0.8) {
        type = 'bandage';
        name = 'Bandage';
      } else if (roll < 0.9 && floor >= 2) {
        type = 'dagger';
        name = 'Dagger';
      } else if (roll < 0.95 && floor >= 6) {
        type = 'sword';
        name = 'Sword';
      } else {
        type = 'trinket';
        const trinkets = [
          'Tin Locket', 'Cracked Compass', 'Wren Skull', 'Cold Candle',
          'River Pearl', 'Rust Key', 'Moth Charm', 'Salt Vial',
        ];
        name = trinkets[Math.floor(rng() * trinkets.length)]!;
      }
      items.push({ type, name, x, y, collected: false });
      itemPlaced++;
    }
    itemAttempts++;
  }

  // Place gravestones
  for (const grave of graveData.slice(0, 6)) {
    let gx = grave.x;
    let gy = grave.y;
    if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS || tiles[gy]![gx] !== 'floor') {
      // Nudge to nearest floor
      let found = false;
      for (let r = 1; r < 5 && !found; r++) {
        for (let dy = -r; dy <= r && !found; dy++) {
          for (let dx = -r; dx <= r && !found; dx++) {
            const nx = gx + dx;
            const ny = gy + dy;
            if (
              nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS &&
              tiles[ny]![nx] === 'floor' &&
              Math.abs(nx - entryX) + Math.abs(ny - entryY) >= 2
            ) {
              gx = nx;
              gy = ny;
              found = true;
            }
          }
        }
      }
      if (!found) continue;
    }
    if (Math.abs(gx - entryX) + Math.abs(gy - entryY) < 2) continue;
    if (tiles[gy]![gx] === 'floor') {
      tiles[gy]![gx] = 'grave';
    }
  }

  const result: {
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
  } = { tiles, enemies, items, graves: [], stairsX, stairsY, entryX, entryY };
  if (shrineX !== undefined) result.shrineX = shrineX;
  if (shrineY !== undefined) result.shrineY = shrineY;
  return result;
}
