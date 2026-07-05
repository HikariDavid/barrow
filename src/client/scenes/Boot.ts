import Phaser from 'phaser';

export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Assets are generated programmatically in Dungeon scene
  }

  create() {
    this.scene.start('Dungeon');
  }
}
