import { redis } from '@devvit/redis';
import type { RunState } from '../../shared/types';

function runKey(date: string, user: string): string {
  return `run:${date}:${user}`;
}

export async function getRun(date: string, user: string): Promise<RunState | null> {
  const raw = await redis.get(runKey(date, user));
  return raw ? (JSON.parse(raw) as RunState) : null;
}

export async function setRun(run: RunState): Promise<void> {
  await redis.set(runKey(run.date, run.user), JSON.stringify(run));
}

export async function createRun(date: string, user: string): Promise<RunState> {
  const run: RunState = {
    date,
    user,
    status: 'active',
    depth: 1,
    gold: 0,
    turns: 0,
    startedAt: Date.now(),
  };
  await setRun(run);
  return run;
}

export async function finishRun(
  run: RunState,
  result: 'died' | 'escaped',
  gold: number,
  turns: number,
  depth: number
): Promise<RunState> {
  run.status = result;
  run.gold = gold;
  run.turns = turns;
  run.depth = depth;
  run.finishedAt = Date.now();
  await setRun(run);
  return run;
}
