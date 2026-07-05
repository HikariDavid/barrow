import { Hono } from 'hono';
import {
  executeMenuCreatePost,
  executeSeedFirstDead,
  executeAdvanceDay,
  executeResetOffset,
} from '../core/posts.js';
import type { UiResponse } from '@devvit/web/shared';

const menu = new Hono();

menu.post('/create-post', async (c) => {
  try {
    const result = await executeMenuCreatePost();
    return c.json<UiResponse>(result, 200);
  } catch (error) {
    console.error('Error creating post:', error);
    return c.json<UiResponse>({ showToast: 'Failed to create post' }, 400);
  }
});

menu.post('/seed-first-dead', async (c) => {
  try {
    const result = await executeSeedFirstDead();
    return c.json<UiResponse>(result, 200);
  } catch (error) {
    console.error('Error seeding graves:', error);
    return c.json<UiResponse>({ showToast: 'Failed to seed graves' }, 400);
  }
});

menu.post('/advance-day', async (c) => {
  try {
    const result = await executeAdvanceDay();
    return c.json<UiResponse>(result, 200);
  } catch (error) {
    console.error('Error advancing day:', error);
    return c.json<UiResponse>({ showToast: 'Failed to advance day' }, 400);
  }
});

menu.post('/reset-offset', async (c) => {
  try {
    const result = await executeResetOffset();
    return c.json<UiResponse>(result, 200);
  } catch (error) {
    console.error('Error resetting offset:', error);
    return c.json<UiResponse>({ showToast: 'Failed to reset offset' }, 400);
  }
});

export { menu };
