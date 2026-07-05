import { COLS, ROWS } from '../../shared/const.js';

export type FovResult = {
  visible: Set<string>;
  explored: Set<string>;
};

export function computeFov(
  tiles: string[][],
  px: number,
  py: number,
  radius: number,
  explored: Set<string>
): FovResult {
  const visible = new Set<string>();

  // Simple raycasting
  for (let angle = 0; angle < 360; angle += 1) {
    const rad = (angle * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);

    let x = px + 0.5;
    let y = py + 0.5;

    for (let step = 0; step < radius * 2; step++) {
      const ix = Math.floor(x);
      const iy = Math.floor(y);

      if (ix < 0 || ix >= COLS || iy < 0 || iy >= ROWS) break;

      const key = `${ix},${iy}`;
      visible.add(key);
      explored.add(key);

      if (tiles[iy]![ix] === 'wall') break;

      x += dx * 0.5;
      y += dy * 0.5;
    }
  }

  return { visible, explored };
}
