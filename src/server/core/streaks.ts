import { redis } from '@devvit/redis';
import { yesterday } from '../util/date.js';
import {
  STREAK_BONUS_PER_LEVEL,
  STREAK_MAX_LEVEL,
} from '../../shared/const';

export function streakKey(user: string): string {
  return `streak:${user}`;
}

export type StreakData = {
  current: number;
  best: number;
  last: string;
};

export async function getStreak(user: string): Promise<StreakData> {
  const data = await redis.hGetAll(streakKey(user));
  return {
    current: data.current ? parseInt(data.current, 10) : 0,
    best: data.best ? parseInt(data.best, 10) : 0,
    last: data.last ?? '',
  };
}

export async function updateStreak(user: string, today: string): Promise<StreakData> {
  const streak = await getStreak(user);
  const yd = yesterday(today);
  let current: number;

  if (streak.last === yd) {
    current = streak.current + 1;
  } else if (streak.last === today) {
    current = streak.current;
  } else {
    current = 1;
  }

  const best = Math.max(streak.best, current);

  await redis.hSet(streakKey(user), {
    current: String(current),
    best: String(best),
    last: today,
  });

  return { current, best, last: today };
}

export function bonusTorch(streakCurrent: number): number {
  return STREAK_BONUS_PER_LEVEL * Math.min(streakCurrent - 1, STREAK_MAX_LEVEL);
}
