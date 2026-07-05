import { redis } from '@devvit/redis';
import { tomorrow } from '../util/date.js';
import { MAX_GRAVES_PER_DAY, MAX_GRAVES_PER_FLOOR } from '../../shared/const';
import type { Grave } from '../../shared/types';

export function graveKey(date: string): string {
  return `graves:${date}`;
}

export async function writeGrave(date: string, grave: Grave): Promise<boolean> {
  const tomorrowDate = tomorrow(date);
  const key = graveKey(tomorrowDate);
  const count = await redis.hLen(key);
  if (count >= MAX_GRAVES_PER_DAY) {
  const all = await redis.hScan(key, 0, undefined, 1000);
  const graves: Grave[] = all.fieldValues.map(
    (fv: { field: string; value: string }) => JSON.parse(fv.value) as Grave
  );
  graves.sort((a: Grave, b: Grave) => a.floor - b.floor);
    if (graves.length > 0) {
      await redis.hDel(key, [graves[0]!.id]);
    }
  }
  await redis.hSet(key, { [grave.id]: JSON.stringify(grave) });
  return true;
}

export async function getGravesForFloor(date: string, floor: number): Promise<Grave[]> {
  const key = graveKey(date);
  const all = await redis.hScan(key, 0, undefined, 1000);
  const graves: Grave[] = all.fieldValues.map(
    (fv: { field: string; value: string }) => JSON.parse(fv.value) as Grave
  );
  const filtered = graves.filter((g: Grave) => g.floor === floor);
  return filtered.slice(0, MAX_GRAVES_PER_FLOOR);
}

export async function getAllGraves(date: string): Promise<Grave[]> {
  const key = graveKey(date);
  const all = await redis.hScan(key, 0, undefined, 1000);
  return all.fieldValues.map(
    (fv: { field: string; value: string }) => JSON.parse(fv.value) as Grave
  );
}

export async function seedLoreGraves(
  date: string,
  loreGraves: Array<{ user: string; epitaph: [number, number, number] }>
): Promise<void> {
  const targetDate = tomorrow(date);
  const key = graveKey(targetDate);
  for (let i = 0; i < loreGraves.length; i++) {
    const lore = loreGraves[i]!;
    const grave: Grave = {
      id: `lore-${i}`,
      user: lore.user,
      floor: (i % 20) + 1,
      x: 4,
      y: 5,
      item: 'a handful of dust',
      epitaph: lore.epitaph,
    };
    await redis.hSet(key, { [grave.id]: JSON.stringify(grave) });
  }
}
