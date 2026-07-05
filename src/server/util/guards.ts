import { MAX_FLOORS, GOLD_PILE_MAX } from '../../shared/const';
import type { FinishBody } from '../../shared/types';

export function validateFinish(body: FinishBody): boolean {
  if (body.depth < 1 || body.depth > MAX_FLOORS) return false;
  if (body.gold < 0 || body.gold > body.depth * GOLD_PILE_MAX * 60) return false;
  if (body.turns < 1) return false;
  if (body.durationMs < body.turns * 120) return false;
  if (body.depth > Math.floor(body.turns / 6) + 1) return false;
  return true;
}
