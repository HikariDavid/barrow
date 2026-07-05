import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import { getGameDate, getDayNumber } from '../util/date.js';
import { getRun, createRun, finishRun } from '../core/runs.js';
import { addToLeaderboard, getTopLeaderboard, getUserRank } from '../core/lb.js';
import { addMeter, getMeter, getUnlockedYesterday } from '../core/meter.js';
import { updateStreak, bonusTorch, getStreak } from '../core/streaks.js';
import { recordAct, hasActed } from '../core/graveacts.js';
import { getLedgerEntries, clearLedgerEntries } from '../core/ledger.js';
import { writeGrave, getAllGraves } from '../core/graves.js';
import { validateFinish } from '../util/guards.js';
import { FLAIR_MILESTONES, METER_TIERS, RESPECT_TORCH_BOOST } from '../../shared/const';
import type { InitPayload, FinishBody, GraveAction, Grave } from '../../shared/types';

const api = new Hono();

api.get('/init', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json({ status: 'error', message: 'postId missing' }, 400);
  }

  const date = getGameDate(0);
  const dayNumber = getDayNumber(date);
  const username = await reddit.getCurrentUsername().catch(() => undefined);

  let run = null;
  let streakData = { current: 0, best: 0, bonusTorch: 0 };
  let ledgerEntries: Awaited<ReturnType<typeof getLedgerEntries>> = [];

  if (username) {
    run = await getRun(date, username) ?? undefined;
    const rawStreak = await getStreak(username);
    streakData = {
      current: rawStreak.current,
      best: rawStreak.best,
      bonusTorch: bonusTorch(rawStreak.current),
    };
    ledgerEntries = await getLedgerEntries(username);
  }

  // Graves are read for ALL users (logged-in and logged-out) —
  // they're needed for dungeon generation regardless of auth state.
  const graves = await getAllGraves(date);

  const meterValue = await getMeter(date);
  const unlockedYesterday = await getUnlockedYesterday(
    getGameDate(-1)
  );

  const lbTop = await getTopLeaderboard(date, 25);
  let lbMe = undefined;
  if (username) {
    const me = await getUserRank(date, username);
    if (me) {
      lbMe = { ...me.entry, rank: me.rank };
    }
  }

  const payload: InitPayload = {
    date,
    dayNumber,
    username: username ?? undefined,
    run: run ?? undefined,
    graves,
    meter: {
      value: meterValue,
      tiers: [...METER_TIERS],
      unlockedYesterday,
    },
    streak: streakData,
    lb: { top: lbTop, me: lbMe ? { ...lbMe, user: username! } : undefined },
    ledger: ledgerEntries,
    flags: { loggedOut: !username },
  };

  return c.json(payload);
});

api.post('/run/start', async (c) => {
  const username = await reddit.getCurrentUsername();
  if (!username) {
    return c.json({ status: 'error', message: 'Not logged in' }, 401);
  }

  const date = getGameDate(0);
  const existing = await getRun(date, username);
  if (existing) {
    return c.json({ status: 'ok', run: existing });
  }

  const run = await createRun(date, username);
  return c.json({ status: 'ok', run });
});

api.post('/run/finish', async (c) => {
  const username = await reddit.getCurrentUsername();
  if (!username) {
    return c.json({ status: 'error', message: 'Not logged in' }, 401);
  }

  const date = getGameDate(0);
  const body = await c.req.json<FinishBody>();
  const run = await getRun(date, username);

  if (!run || run.status !== 'active') {
    return c.json({ status: 'ghost' });
  }

  if (!validateFinish(body)) {
    return c.json({ status: 'ghost' });
  }

  await finishRun(run, body.result, body.gold, body.turns, body.depth);
  await addToLeaderboard(date, username, body.depth, body.gold, body.result === 'escaped');
  await addMeter(date, body.depth);
  const streak = await updateStreak(username, date);

  if (body.result === 'died' && body.deathPos && body.epitaph && body.buriedItem) {
    const grave: Grave = {
      id: `${date}-${username}-${Date.now()}`,
      user: username,
      floor: body.deathPos.floor,
      x: body.deathPos.x,
      y: body.deathPos.y,
      item: body.buriedItem,
      epitaph: body.epitaph,
    };
    await writeGrave(date, grave);
  }

  for (const milestone of FLAIR_MILESTONES) {
    if (body.depth >= milestone.depth) {
      try {
        await reddit.setUserFlair({
          subredditName: context.subredditName!,
          username,
          text: milestone.text,
        });
      } catch {
        // swallow flair errors
      }
    }
  }

  return c.json({ status: 'ok', streak });
});

api.post('/grave/act', async (c) => {
  const username = await reddit.getCurrentUsername();
  if (!username) {
    return c.json({ status: 'error', message: 'Not logged in' }, 401);
  }

  const body = await c.req.json<GraveAction>();
  const acted = await hasActed(body.graveId, username, body.act);
  if (acted) {
    return c.json({ status: 'error', message: 'Already acted' }, 400);
  }

  const success = await recordAct(body.graveId, username, body.act);
  if (!success) {
    return c.json({ status: 'error', message: 'Already acted' }, 400);
  }

  let torchBonus = 0;
  const itemTaken = '';

  if (body.act === 'respect') {
    torchBonus = RESPECT_TORCH_BOOST;
  }

  return c.json({
    status: 'ok',
    torchBonus,
    itemTaken,
  });
});

api.post('/ledger/clear', async (c) => {
  const username = await reddit.getCurrentUsername();
  if (!username) {
    return c.json({ status: 'error', message: 'Not logged in' }, 401);
  }

  const entries = await getLedgerEntries(username);
  const ids = entries.map((e) => e.id);
  await clearLedgerEntries(username, ids);
  return c.json({ status: 'ok' });
});

api.get('/leaderboard', async (c) => {
  const date = getGameDate(0);
  const username = await reddit.getCurrentUsername().catch(() => undefined);
  const top = await getTopLeaderboard(date, 25);
  let me = undefined;
  if (username) {
    const rank = await getUserRank(date, username);
    if (rank) {
      me = { ...rank.entry, rank: rank.rank };
    }
  }
  return c.json({ top, me });
});

api.post('/share-fall', async (c) => {
  const username = await reddit.getCurrentUsername();
  if (!username) {
    return c.json({ status: 'error', message: 'Not logged in' }, 401);
  }

  const date = getGameDate(0);
  const run = await getRun(date, username);
  if (!run || run.status === 'active') {
    return c.json({ status: 'error', message: 'No finished run' }, 400);
  }

  const stickyId = await redis.hGet('flags', `sticky:${date}`);
  if (!stickyId) {
    return c.json({ status: 'error', message: 'No sticky comment' }, 400);
  }

  const resultText = run.status === 'escaped' ? 'Escaped' : `Slain`;
  const text = `Floor ${run.depth} \u00b7 ${run.gold} gold \u00b7 ${resultText}.`;
  await reddit.submitComment({ id: stickyId as `t1_${string}`, text, runAs: 'USER' });

  return c.json({ status: 'ok' });
});

export { api };
