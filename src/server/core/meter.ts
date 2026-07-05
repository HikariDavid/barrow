import { redis } from '@devvit/redis';
import { METER_TIERS } from '../../shared/const';

export function meterKey(date: string): string {
  return `meter:${date}`;
}

export async function getMeter(date: string): Promise<number> {
  const val = await redis.get(meterKey(date));
  return val ? parseInt(val, 10) : 0;
}

export async function addMeter(date: string, depth: number): Promise<number> {
  return await redis.incrBy(meterKey(date), depth);
}

export function getTier(value: number): 0 | 1 | 2 | 3 {
  if (value >= METER_TIERS[2]) return 3;
  if (value >= METER_TIERS[1]) return 2;
  if (value >= METER_TIERS[0]) return 1;
  return 0;
}

export async function getUnlockedYesterday(yesterdayDate: string): Promise<0 | 1 | 2 | 3> {
  const value = await getMeter(yesterdayDate);
  return getTier(value);
}
