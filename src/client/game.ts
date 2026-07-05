import { Boot } from './scenes/Boot';
import { Dungeon } from './scenes/Dungeon';
import Phaser from 'phaser';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS, // Force CANVAS — WebGL can fail silently in Reddit's iframe sandbox
  parent: 'game-container',
  backgroundColor: '#0B0B10',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 144,
    height: 176,
    zoom: 4,
  },
  pixelArt: true,
  scene: [Boot, Dungeon],
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
  input: {
    activePointers: 2,
  },
};

const StartGame = (parent: string) => {
  return new Phaser.Game({ ...config, parent });
};

document.addEventListener('DOMContentLoaded', () => {
  StartGame('game-container');
});
