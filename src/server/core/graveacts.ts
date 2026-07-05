import { redis } from '@devvit/redis';

export function graveActsKey(graveId: string): string {
  return `graveacts:${graveId}`;
}

export async function hasActed(
  graveId: string,
  user: string,
  act: 'respect' | 'loot'
): Promise<boolean> {
  const field = `${user}:${act === 'respect' ? 'r' : 'l'}`;
  const val = await redis.hGet(graveActsKey(graveId), field);
  return val === '1';
}

export async function recordAct(
  graveId: string,
  user: string,
  act: 'respect' | 'loot'
): Promise<boolean> {
  const key = graveActsKey(graveId);
  const field = `${user}:${act === 'respect' ? 'r' : 'l'}`;
  const countField = act === 'respect' ? '_r' : '_l';

  const existing = await redis.hGet(key, field);
  if (existing === '1') return false;

  await redis.hSet(key, { [field]: '1' });
  await redis.hIncrBy(key, countField, 1);
  return true;
}

export async function getGraveActCounts(
  graveId: string
): Promise<{ respects: number; loots: number }> {
  const key = graveActsKey(graveId);
  const r = await redis.hGet(key, '_r');
  const l = await redis.hGet(key, '_l');
  return { respects: r ? parseInt(r, 10) : 0, loots: l ? parseInt(l, 10) : 0 };
}
