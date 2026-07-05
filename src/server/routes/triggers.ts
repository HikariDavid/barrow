import { Hono } from 'hono';
import { createTodayPost } from '../core/posts.js';
import type { OnAppInstallRequest, TriggerResponse } from '@devvit/web/shared';

const triggers = new Hono();

triggers.post('/', async (c) => {
  try {
    await createTodayPost();
    const input = await c.req.json<OnAppInstallRequest>();
    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `BARROW installed (trigger: ${input.type})`,
      },
      200
    );
  } catch (error) {
    console.error('Error on install:', error);
    return c.json<TriggerResponse>(
      { status: 'error', message: 'Failed to create initial post' },
      400
    );
  }
});

export { triggers };
