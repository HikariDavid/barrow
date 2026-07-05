import Phaser from 'phaser';
import { COLS, ROWS, TILE, MAX_HP } from '../../shared/const.js';

export class Hud {
  scene: Phaser.Scene;
  hpText: Phaser.GameObjects.Text;
  torchBar: Phaser.GameObjects.Graphics;
  torchText: Phaser.GameObjects.Text;
  depthText: Phaser.GameObjects.Text;
  goldText: Phaser.GameObjects.Text;
  weaponText: Phaser.GameObjects.Text;
  invSlots: Phaser.GameObjects.Text[] = [];
  waitBtn: Phaser.GameObjects.Text;
  muteBtn: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const w = COLS * TILE;
    const bottom = ROWS * TILE;

    // Top bar background
    const topBg = scene.add.graphics();
    topBg.fillStyle(0x0b0b10, 0.9);
    topBg.fillRect(0, 0, w, 16);

    // HP
    this.hpText = scene.add.text(2, 1, '', {
      fontSize: '10px',
      fontFamily: 'Inter, sans-serif',
      color: '#E8E0CE',
    });

    // Torch bar
    this.torchBar = scene.add.graphics();
    this.torchText = scene.add.text(w - 24, 1, '', {
      fontSize: '8px',
      fontFamily: 'Inter, sans-serif',
      color: '#E8A33D',
    });

    // Depth
    this.depthText = scene.add.text(w / 2 - 10, 1, '', {
      fontSize: '10px',
      fontFamily: 'Grenze Gotisch, serif',
      color: '#E8E0CE',
    });

    // Gold
    this.goldText = scene.add.text(w / 2 + 10, 1, '', {
      fontSize: '8px',
      fontFamily: 'Inter, sans-serif',
      color: '#E8A33D',
    });

    // Weapon
    this.weaponText = scene.add.text(2, bottom - 32, '', {
      fontSize: '8px',
      fontFamily: 'Inter, sans-serif',
      color: '#E8A33D',
    });

    // Inventory slots
    for (let i = 0; i < 3; i++) {
      const slot = scene.add.text(2 + i * 48, bottom - 18, `[${i + 1}]`, {
        fontSize: '8px',
        fontFamily: 'Inter, sans-serif',
        color: '#3E5C76',
        backgroundColor: '#1a1a24',
        padding: { x: 4, y: 2 },
      });
      slot.setInteractive();
      this.invSlots.push(slot);
    }

    // Wait button
    this.waitBtn = scene.add.text(w - 36, bottom - 18, 'WAIT', {
      fontSize: '8px',
      fontFamily: 'Inter, sans-serif',
      color: '#E8E0CE',
      backgroundColor: '#1a1a24',
      padding: { x: 4, y: 2 },
    });
    this.waitBtn.setInteractive();

    // Mute
    this.muteBtn = scene.add.text(w - 36, 1, '♪', {
      fontSize: '10px',
      color: '#3E5C76',
    });
    this.muteBtn.setInteractive();
  }

  update(
    hp: number,
    torch: number,
    depth: number,
    gold: number,
    weapon: string | null,
    inventory: string[],
    muted: boolean
  ) {
    // HP hearts
    const hearts = '\u2665'.repeat(hp) + '\u2661'.repeat(MAX_HP - hp);
    this.hpText.setText(hearts);

    // Torch bar
    this.torchBar.clear();
    const barW = 60;
    const barH = 4;
    const barX = 30;
    const barY = 4;
    this.torchBar.fillStyle(0x1a1a24, 1);
    this.torchBar.fillRect(barX, barY, barW, barH);
    const fill = Math.max(0, torch / 100);
    this.torchBar.fillStyle(0xe8a33d, 1);
    this.torchBar.fillRect(barX, barY, barW * fill, barH);
    this.torchText.setText(`${torch}`);

    this.depthText.setText(`F${depth}`);
    this.goldText.setText(`${gold}g`);
    this.weaponText.setText(weapon ? weapon : 'Fists');

    for (let i = 0; i < 3; i++) {
      const item = inventory[i];
      this.invSlots[i]!.setText(item ? item.substring(0, 6) : `[${i + 1}]`);
      this.invSlots[i]!.setColor(item ? '#E8E0CE' : '#3E5C76');
    }

    this.muteBtn.setText(muted ? '\u2716' : '\u266A');
  }

  destroy() {
    this.hpText.destroy();
    this.torchBar.destroy();
    this.torchText.destroy();
    this.depthText.destroy();
    this.goldText.destroy();
    this.weaponText.destroy();
    this.waitBtn.destroy();
    this.muteBtn.destroy();
    for (const slot of this.invSlots) slot.destroy();
  }
}
