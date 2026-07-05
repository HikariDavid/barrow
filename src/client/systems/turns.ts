import { COLS, ROWS, TORCH_PER_TURN, DARKNESS_BONUS_DAMAGE, ENEMY_CHASE_RADIUS, ENEMY_AGGRO_RANGE } from '../../shared/const.js';
import type { Enemy, Player, Item, Tile } from '../../shared/types.js';

export type TurnResult = {
  playerMoved: boolean;
  attacked: string | null;
  damaged: number;
  torchDrained: number;
  pickedUp: Item | null;
  descended: boolean;
  died: boolean;
  shrineHit: boolean;
  enemyDied: Enemy | null;
};

const DIRS: readonly [number, number][] = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

export function processPlayerMove(
  dx: number,
  dy: number,
  player: Player,
  tiles: Tile[][],
  enemies: Enemy[],
  items: Item[]
): TurnResult {
  const result: TurnResult = {
    playerMoved: false,
    attacked: null,
    damaged: 0,
    torchDrained: 0,
    pickedUp: null,
    descended: false,
    died: false,
    shrineHit: false,
    enemyDied: null,
  };

  const nx = player.x + dx;
  const ny = player.y + dy;

  if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return result;
  if (tiles[ny]![nx] === 'wall') return result;

  // Check for enemy at target
  const enemyAtTarget = enemies.find((e) => e.x === nx && e.y === ny && e.hp > 0);
  if (enemyAtTarget) {
    const dmg = player.weapon ? player.weapon.dmg : 1;
    enemyAtTarget.hp -= dmg;
    result.attacked = enemyAtTarget.type;
    if (enemyAtTarget.hp <= 0) {
      result.enemyDied = enemyAtTarget;
    }
    result.playerMoved = false;
    return result;
  }

  // Move player
  player.x = nx;
  player.y = ny;
  result.playerMoved = true;

  // Check for items
  for (const item of items) {
    if (!item.collected && item.x === nx && item.y === ny) {
      if (item.type === 'ember') {
        player.torch = Math.min(player.torch + 25, 100);
        item.collected = true;
        result.pickedUp = item;
      } else if (item.type === 'gold') {
        item.collected = true;
        result.pickedUp = item;
      } else if (item.type === 'bandage') {
        if (player.inventory.length < 3) {
          player.inventory.push('Bandage');
          item.collected = true;
          result.pickedUp = item;
        }
      } else if (item.type === 'dagger' || item.type === 'sword') {
        const dmg = item.type === 'dagger' ? 2 : 3;
        player.weapon = { name: item.name, dmg };
        item.collected = true;
        result.pickedUp = item;
      } else if (item.type === 'trinket') {
        if (player.inventory.length < 3) {
          player.inventory.push(item.name);
          item.collected = true;
          result.pickedUp = item;
        }
      }
    }
  }

  // Check stairs
  if (tiles[ny]![nx] === 'stairs') {
    result.descended = true;
  }

  // Check shrine
  if (tiles[ny]![nx] === 'shrine') {
    result.shrineHit = true;
  }

  // Torch
  player.torch = Math.max(0, player.torch - TORCH_PER_TURN);
  result.torchDrained = TORCH_PER_TURN;

  // Darkness damage
  if (player.torch <= 0) {
    // This is handled by the caller checking turns
  }

  // Spike damage
  if (tiles[ny]![nx] === 'spike') {
    player.hp -= 1;
    result.damaged = 1;
  }

  return result;
}

export function processEnemyTurns(
  player: Player,
  enemies: Enemy[],
  tiles: Tile[][]
): { damage: number; torchDrain: number } {
  let damage = 0;
  let torchDrain = 0;

  for (const enemy of enemies) {
    if (enemy.hp <= 0) continue;

    // Wisp torch drain
    if (enemy.type === 'wisp') {
      const dist = Math.abs(enemy.x - player.x) + Math.abs(enemy.y - player.y);
      if (dist <= 1) {
        player.torch = Math.max(0, player.torch - 8);
        torchDrain += 8;
        // Wisp flees
        const fleeDirs = DIRS.filter(([fdx, fdy]: readonly [number, number]) => {
          const nx = enemy.x + fdx;
          const ny = enemy.y + fdy;
          return (
            nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS &&
            tiles[ny]![nx] !== 'wall' &&
            !(nx === player.x && ny === player.y)
          );
        });
        if (fleeDirs.length > 0) {
          const dir = fleeDirs[Math.floor(Math.random() * fleeDirs.length)]!;
          const fdx = dir[0]!;
          const fdy = dir[1]!;
          enemy.x += fdx;
          enemy.y += fdy;
        }
        continue;
      }
    }

    // Skeleton moves every 2nd turn
    if (enemy.type === 'skeleton') {
      enemy.moveTimer++;
      if (enemy.moveTimer % 2 !== 0) continue;
    }

    const dist = Math.abs(enemy.x - player.x) + Math.abs(enemy.y - player.y);

    // Aggro check
    if (!enemy.aggroed) {
      if (enemy.type === 'rat' && dist <= ENEMY_CHASE_RADIUS + 1) {
        enemy.aggroed = true;
      } else if (enemy.type === 'knight' && dist <= ENEMY_AGGRO_RANGE) {
        enemy.aggroed = true;
      } else if (enemy.type === 'skeleton' || enemy.type === 'wisp') {
        if (dist <= 3) enemy.aggroed = true;
      }
    }

    if (enemy.aggroed) {
      // Move toward player
      let bestDx = 0;
      let bestDy = 0;
      let bestDist = dist;
      for (const [dx, dy] of DIRS) {
        const nx = enemy.x + dx;
        const ny = enemy.y + dy;
        if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && tiles[ny]![nx] !== 'wall') {
          const nd = Math.abs(nx - player.x) + Math.abs(ny - player.y);
          if (nd < bestDist) {
            bestDist = nd;
            bestDx = dx;
            bestDy = dy;
          }
        }
      }
      if (bestDx !== 0 || bestDy !== 0) {
        enemy.x += bestDx;
        enemy.y += bestDy;
      }
    } else {
      // Random shuffle
      const validDirs = DIRS.filter(([fdx, fdy]) => {
        const nx = enemy.x + fdx;
        const ny = enemy.y + fdy;
        return nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && tiles[ny]![nx] !== 'wall';
      });
      if (validDirs.length > 0) {
        const dir = validDirs[Math.floor(Math.random() * validDirs.length)]!;
        const fdx = dir[0]!;
        const fdy = dir[1]!;
        enemy.x += fdx;
        enemy.y += fdy;
      }
    }

    // Attack if adjacent
    if (enemy.x === player.x && enemy.y === player.y) {
      const stats = { rat: { dmg: 1 }, skeleton: { dmg: 1 }, wisp: { dmg: 0 }, knight: { dmg: 2 } };
      const baseDmg = stats[enemy.type]!.dmg;
      const bonus = player.torch <= 0 ? DARKNESS_BONUS_DAMAGE : 0;
      damage += baseDmg + bonus;
    }
  }

  return { damage, torchDrain };
}

export function useBandage(player: Player): boolean {
  const idx = player.inventory.indexOf('Bandage');
  if (idx < 0) return false;
  player.inventory.splice(idx, 1);
  player.hp = Math.min(player.hp + 3, player.maxHp);
  return true;
}
