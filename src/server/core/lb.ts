import { redis } from '@devvit/redis';

export function lbKey(date: string): string {
  return `lb:${date}`;
}

export type LbEntry = {
  user: string;
  score: number;
  depth: number;
  gold: number;
  escaped: boolean;
};

export function computeScore(depth: number, gold: number, escaped: boolean): number {
  return depth * 100000 + Math.min(gold, 9999) * 10 + (escaped ? 1 : 0);
}

export async function addToLeaderboard(
  date: string,
  user: string,
  depth: number,
  gold: number,
  escaped: boolean
): Promise<void> {
  const score = computeScore(depth, gold, escaped);
  await redis.zAdd(lbKey(date), { member: user, score });
}

export async function getTopLeaderboard(
  date: string,
  count: number = 25
): Promise<LbEntry[]> {
  const results = await redis.zRange(lbKey(date), 0, count - 1, { by: 'rank' });
  const entries: LbEntry[] = [];
  for (const r of results) {
    const score = r.score;
    const depth = Math.floor(score / 100000);
    const gold = Math.floor((score % 100000) / 10);
    const escaped = score % 10 === 1;
    entries.push({ user: r.member, score, depth, gold, escaped });
  }
  return entries;
}

export async function getUserRank(
  date: string,
  user: string
): Promise<{ rank: number; entry: LbEntry } | null> {
  const rank = await redis.zRank(lbKey(date), user);
  if (rank === null || rank === undefined) return null;
  const score = await redis.zScore(lbKey(date), user);
  if (score === null || score === undefined) return null;
  const depth = Math.floor(score / 100000);
  const gold = Math.floor((score % 100000) / 10);
  const escaped = score % 10 === 1;
  return { rank: rank as number, entry: { user, score, depth, gold, escaped } };
}
