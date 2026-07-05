import Phaser from 'phaser';
import { COLS, ROWS, TILE } from '../../shared/const.js';
import { LIGHT_THRESHOLDS } from '../../shared/const.js';

export function getLightRadius(torch: number): number {
  for (const t of LIGHT_THRESHOLDS) {
    if (torch >= t.min) return t.radius;
  }
  return 0.75;
}

export function renderTorchlight(
  _scene: Phaser.Scene,
  overlay: Phaser.GameObjects.Graphics,
  px: number,
  py: number,
  torch: number,
  explored: Set<string>,
  exploredLayer: Phaser.GameObjects.Graphics,
  time: number
) {
  overlay.clear();
  exploredLayer.clear();

  // Fill with darkness
  overlay.fillStyle(0x0b0b10, 1);
  overlay.fillRect(0, 0, COLS * TILE, ROWS * TILE);

  // Flicker
  const flicker = 1 + Math.sin(time * 0.009 * Math.PI * 2) * 0.04;
  const radius = getLightRadius(torch) * TILE * flicker;

  // Erase radial gradient at player
  const cx = px * TILE + TILE / 2;
  const cy = py * TILE + TILE / 2;
  const steps = 12;
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const r = radius * t;
    overlay.fillStyle(0x0b0b10, 0);
    // Use blend mode to erase
    overlay.fillCircle(cx, cy, r);
  }

  // Explored memory layer
  exploredLayer.fillStyle(0xe8e0ce, 0.1);
  for (const key of explored) {
    const [x, y] = key.split(',').map(Number);
    if (x !== undefined && y !== undefined) {
      exploredLayer.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }
}
