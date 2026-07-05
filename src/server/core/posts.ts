import { redis } from '@devvit/redis';
import { reddit, context } from '@devvit/web/server';
import { getGameDate, getDayNumber } from '../util/date.js';
import { getTopLeaderboard } from './lb.js';
import { getGraveActCounts } from './graveacts.js';
import { getAllGraves, seedLoreGraves } from './graves.js';
import { LORE_GRAVES } from '../../shared/const';
import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';

function flagsKey(): string {
  return 'flags';
}

async function getFlag(field: string): Promise<string | undefined> {
  return await redis.hGet(flagsKey(), field) ?? undefined;
}

async function setFlag(field: string, value: string): Promise<void> {
  await redis.hSet(flagsKey(), { [field]: value });
}

export async function createTodayPost(): Promise<string> {
  const date = getGameDate(0);
  const existing = await getFlag(`posted:${date}`);
  if (existing) return existing;

  const dayNum = getDayNumber(date);
  const title = `BARROW \u2014 Day ${dayNum} \u00b7 ${date}`;
  const post = await reddit.submitCustomPost({
    title,
    styles: {
      height: 'TALL',
      backgroundColor: '#0B0B10FF',
      backgroundColorDark: '#0B0B10FF',
    },
  });

  const top = await getTopLeaderboard(yesterday(date), 3);
  const topText =
    top.length > 0
      ? top.map((e) => `u/${e.user} (${e.depth})`).join(' \u00b7 ')
      : 'No survivors yet.';

  let graveNote = '';
  const allGraves = await getAllGraves(yesterday(date));
  if (allGraves.length > 0) {
    let mostHonored = '';
    let maxRespects = 0;
    for (const g of allGraves.slice(0, 50)) {
      const counts = await getGraveActCounts(g.id);
      if (counts.respects > maxRespects) {
        maxRespects = counts.respects;
        mostHonored = g.user;
      }
    }
    if (mostHonored) {
      graveNote = ` Most honored grave: u/${mostHonored}.`;
    }
  }

  const stickyText = `Leave your fate below. Yesterday's deepest: ${topText}.${graveNote}`;
  const comment = await reddit.submitComment({
    id: post.id,
    text: stickyText,
  });

  await setFlag(`posted:${date}`, post.id);
  await setFlag(`sticky:${date}`, comment.id);

  return post.id;
}

function yesterday(date: string): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function handleMenuCreatePost(): MenuItemRequest {
  return {} as MenuItemRequest;
}

export async function executeMenuCreatePost(): Promise<UiResponse> {
  const postId = await createTodayPost();
  const sub = context.subredditName ?? 'unknown';
  return {
    navigateTo: `https://reddit.com/r/${sub}/comments/${postId}`,
  };
}

export async function executeSeedFirstDead(): Promise<UiResponse> {
  const date = getGameDate(0);
  const seeded = await getFlag('seeded');
  if (seeded) {
    return { showToast: 'Already seeded.' };
  }
  await seedLoreGraves(date, [...LORE_GRAVES]);
  await setFlag('seeded', '1');
  return { showToast: '14 lore graves seeded into tomorrow.' };
}

export async function executeAdvanceDay(): Promise<UiResponse> {
  const current = await redis.get('debug:dayOffset');
  const offset = current ? parseInt(current, 10) : 0;
  await redis.set('debug:dayOffset', String(offset + 1));
  return { showToast: `Day offset now ${offset + 1}.` };
}

export async function executeResetOffset(): Promise<UiResponse> {
  await redis.set('debug:dayOffset', '0');
  return { showToast: 'Day offset reset to 0.' };
}
