import { Hono } from 'hono';
import { createTodayPost } from '../core/posts.js';
import type { TaskResponse } from '@devvit/web/server';

const cron = new Hono();

cron.post('/daily-rollover', async (c) => {
  try {
    await createTodayPost();
    return c.json<TaskResponse>({ status: 'success' }, 200);
  } catch (error) {
    console.error('Error in daily rollover:', error);
    return c.json<TaskResponse>({ status: 'error', message: String(error) }, 500);
  }
});

export { cron };
