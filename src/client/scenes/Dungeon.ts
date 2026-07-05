import Phaser from 'phaser';
import { COLS, ROWS, TILE, MAX_HP, RESPECT_TORCH_BOOST } from '../../shared/const.js';
import type { InitPayload, FloorState, Player, Grave, RunState, Tile as TileType } from '../../shared/types.js';
import { generateFloor } from '../systems/gen.js';
import { computeFov } from '../systems/fov.js';
import { processPlayerMove, processEnemyTurns } from '../systems/turns.js';
import { getLightRadius } from '../systems/light.js';
import { generateSpritesheet, SPRITE_ORDER } from '../systems/sprites.js';
import { Hud } from '../ui/hud.js';
import { onFirstTap, playStep, playHit, playPickup, playDeath, playRespects, isMuted, initAudioState } from '../systems/audio.js';

export class Dungeon extends Phaser.Scene {
  private initPayload!: InitPayload;
  private player!: Player;
  private floor!: FloorState;
  private currentDepth = 1;
  private explored = new Set<string>();
  private turnCount = 0;
  private gameActive = false;
  private isGhost = false;
  private tileSprites: Phaser.GameObjects.Image[][] = [];
  private enemySprites: Phaser.GameObjects.Image[] = [];
  private itemSprites: Phaser.GameObjects.Image[] = [];
  private graveSprites: Phaser.GameObjects.Image[] = [];
  private lightRT!: Phaser.GameObjects.RenderTexture;
  private lightGfx!: Phaser.GameObjects.Graphics;
  private exploredLayer!: Phaser.GameObjects.Graphics;
  private hud!: Hud;
  private autoWalkTarget: { x: number; y: number } | null = null;
  private inputQueue: { dx: number; dy: number }[] = [];
  private processing = false;
  private runStarted = false;
  private hintText!: Phaser.GameObjects.Text;

  constructor() {
    super('Dungeon');
  }

  create() {
    initAudioState();
    this.setupInput();
    this.exploredLayer = this.add.graphics();
    this.exploredLayer.setDepth(99);
    // RenderTexture overlay: fill dark, erase light circle (Graphics.fillStyle alpha=0 doesn't erase!)
    this.lightRT = this.add.renderTexture(0, 0, COLS * TILE, ROWS * TILE);
    this.lightRT.setDepth(100);
    this.lightGfx = this.add.graphics();
    this.lightGfx.setVisible(false);

    this.hud = new Hud(this);

    this.hintText = this.add.text(COLS * TILE / 2, ROWS * TILE / 2, 'Tap a tile to walk. Find the stairs. Mind your torch.', {
      fontSize: '6px',
      fontFamily: 'Inter, sans-serif',
      color: '#E8A33D',
      align: 'center',
      wordWrap: { width: COLS * TILE - 8 },
    });
    this.hintText.setOrigin(0.5);
    this.hintText.setDepth(200);
    this.hintText.setAlpha(0);

    this.loadInit();
  }

  private async loadInit() {
    try {
      const resp = await fetch('/api/init');
      this.initPayload = (await resp.json()) as InitPayload;
    } catch {
      this.initPayload = {
        date: '2026-01-01',
        dayNumber: 1,
        graves: [],
        meter: { value: 0, tiers: [150, 600, 1500], unlockedYesterday: 0 },
        streak: { current: 0, best: 0, bonusTorch: 0 },
        lb: { top: [] },
        ledger: [],
        flags: { loggedOut: true },
      };
    }

    this.isGhost = this.initPayload.flags.loggedOut || (this.initPayload.run?.status !== 'active' && !!this.initPayload.run);
    this.runStarted = !!this.initPayload.run;

    const startTorch = 60 + (this.initPayload.streak?.bonusTorch ?? 0);
    this.player = {
      x: 4,
      y: 0,
      hp: MAX_HP,
      maxHp: MAX_HP,
      weapon: null,
      inventory: [],
      torch: startTorch,
    };

    generateSpritesheet(this);
    this.loadFloor();
    this.gameActive = true;

    if (this.initPayload.ledger.length > 0) {
      this.showLedger();
    }

    // Show hint for first 3 turns
    this.hintText.setAlpha(1);
  }

  private loadFloor() {
    this.clearSprites();

    const gravesForFloor = this.initPayload.graves.filter((g) => g.floor === this.currentDepth);
    const gravePositions = gravesForFloor.map((g) => ({ x: g.x, y: g.y }));

    this.floor = generateFloor(this.initPayload.date, this.currentDepth, gravePositions);
    this.floor.graves = gravesForFloor;

    // Render tiles
    this.tileSprites = [];
    for (let y = 0; y < ROWS; y++) {
      this.tileSprites[y] = [];
      for (let x = 0; x < COLS; x++) {
        const tile = this.floor.tiles[y]![x]!;
        const img = this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, 'barrow-sprites');
        img.setCrop(this.getTileCrop(tile, x, y));
        img.setDepth(0);
        this.tileSprites[y]![x] = img;
      }
    }

    // Render enemies
    this.enemySprites = [];
    for (const enemy of this.floor.enemies) {
      const img = this.add.image(enemy.x * TILE + TILE / 2, enemy.y * TILE + TILE / 2, 'barrow-sprites');
      img.setCrop(this.getEnemyCrop(enemy.type));
      img.setDepth(10);
      this.enemySprites.push(img);
    }

    // Render items
    this.itemSprites = [];
    for (const item of this.floor.items) {
      if (item.collected) continue;
      const img = this.add.image(item.x * TILE + TILE / 2, item.y * TILE + TILE / 2, 'barrow-sprites');
      img.setCrop(this.getItemCrop(item.type));
      img.setDepth(5);
      img.setData('tx', item.x);
      img.setData('ty', item.y);
      img.setAlpha(0); // hidden until FOV reveals
      this.itemSprites.push(img);
    }

    // Render graves
    this.graveSprites = [];
    for (const grave of this.floor.graves) {
      const img = this.add.image(grave.x * TILE + TILE / 2, grave.y * TILE + TILE / 2, 'barrow-sprites');
      img.setCrop(this.getGraveCrop());
      img.setDepth(5);
      this.graveSprites.push(img);
    }

    // Player sprite
    const playerKey = this.isGhost ? 'ghost' : 'player';
    const playerImg = this.add.image(this.player.x * TILE + TILE / 2, this.player.y * TILE + TILE / 2, 'barrow-sprites');
    playerImg.setCrop(this.getPlayerCrop(playerKey));
    playerImg.setDepth(50);
    playerImg.setData('isPlayer', true);

    this.updateFov();
    this.updateHud();
  }

  private getTileCrop(tile: TileType, x: number, y: number): Phaser.Geom.Rectangle {
    const idx = SPRITE_ORDER.indexOf(tile === 'wall' ? `wall${x % 2}` : tile === 'floor' ? `floor${y % 2}` : tile);
    if (idx < 0) return new Phaser.Geom.Rectangle(0, 0, 16, 16);
    return new Phaser.Geom.Rectangle(idx * 16, 0, 16, 16);
  }

  private getEnemyCrop(type: string): Phaser.Geom.Rectangle {
    const idx = SPRITE_ORDER.indexOf(type);
    return idx >= 0 ? new Phaser.Geom.Rectangle(idx * 16, 0, 16, 16) : new Phaser.Geom.Rectangle(0, 0, 16, 16);
  }

  private getItemCrop(type: string): Phaser.Geom.Rectangle {
    const idx = SPRITE_ORDER.indexOf(type);
    return idx >= 0 ? new Phaser.Geom.Rectangle(idx * 16, 0, 16, 16) : new Phaser.Geom.Rectangle(0, 0, 16, 16);
  }

  private getGraveCrop(): Phaser.Geom.Rectangle {
    const idx = SPRITE_ORDER.indexOf('gravestone');
    return idx >= 0 ? new Phaser.Geom.Rectangle(idx * 16, 0, 16, 16) : new Phaser.Geom.Rectangle(0, 0, 16, 16);
  }

  private getPlayerCrop(key: string): Phaser.Geom.Rectangle {
    const idx = SPRITE_ORDER.indexOf(key);
    return idx >= 0 ? new Phaser.Geom.Rectangle(idx * 16, 0, 16, 16) : new Phaser.Geom.Rectangle(0, 0, 16, 16);
  }

  private clearSprites() {
    [...this.tileSprites.flat(), ...this.enemySprites, ...this.itemSprites, ...this.graveSprites].forEach((s) => s?.destroy());
    this.tileSprites = [];
    this.enemySprites = [];
    this.itemSprites = [];
    this.graveSprites = [];
  }

  private setupInput() {
    // Keyboard
    this.input.keyboard?.on('keydown-UP', () => this.queueMove(0, -1));
    this.input.keyboard?.on('keydown-DOWN', () => this.queueMove(0, 1));
    this.input.keyboard?.on('keydown-LEFT', () => this.queueMove(-1, 0));
    this.input.keyboard?.on('keydown-RIGHT', () => this.queueMove(1, 0));
    this.input.keyboard?.on('keydown-W', () => this.queueMove(0, -1));
    this.input.keyboard?.on('keydown-S', () => this.queueMove(0, 1));
    this.input.keyboard?.on('keydown-A', () => this.queueMove(-1, 0));
    this.input.keyboard?.on('keydown-D', () => this.queueMove(1, 0));
    this.input.keyboard?.on('keydown-SPACE', () => this.wait());

    // Touch/click
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      onFirstTap();
      const tx = Math.floor(pointer.x / TILE);
      const ty = Math.floor(pointer.y / TILE);
      if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return;

      const dist = Math.abs(tx - this.player.x) + Math.abs(ty - this.player.y);
      if (dist === 1) {
        this.queueMove(tx - this.player.x, ty - this.player.y);
      } else if (dist === 0) {
        this.wait();
      } else if (dist > 1) {
        this.autoWalk(tx, ty);
      }
    });
  }

  private queueMove(dx: number, dy: number) {
    if (!this.gameActive || this.processing) return;
    onFirstTap();
    this.inputQueue.push({ dx, dy });
    if (!this.processing) {
      this.processing = true;
      this.processNextInput();
    }
  }

  private wait() {
    if (!this.gameActive || this.processing) return;
    onFirstTap();
    this.processPlayerAction(0, 0);
  }

  private async processNextInput() {
    if (this.inputQueue.length === 0) {
      this.processing = false;
      return;
    }
    this.processing = true;
    const input = this.inputQueue.shift()!;
    await this.processMoveWithAutoWalk(input.dx, input.dy);
    this.processing = false;
  }

  private async processMoveWithAutoWalk(dx: number, dy: number) {
    this.autoWalkTarget = null;
    await this.processPlayerAction(dx, dy);
  }

  private autoWalk(tx: number, ty: number) {
    this.autoWalkTarget = { x: tx, y: ty };
    this.processAutoWalkStep();
  }

  private processAutoWalkStep() {
    if (!this.autoWalkTarget || !this.gameActive) return;
    const { x: tx, y: ty } = this.autoWalkTarget;
    if (this.player.x === tx && this.player.y === ty) {
      this.autoWalkTarget = null;
      return;
    }

    // Check for visible enemies
    for (const enemy of this.floor.enemies) {
      if (enemy.hp > 0) {
        const dist = Math.abs(enemy.x - this.player.x) + Math.abs(enemy.y - this.player.y);
        if (dist <= 3) {
          this.autoWalkTarget = null;
          return;
        }
      }
    }

    // Simple BFS step
    const dx = Math.sign(tx - this.player.x);
    const dy = Math.sign(ty - this.player.y);

    if (dx !== 0 && this.tryMove(dx, 0)) return;
    if (dy !== 0 && this.tryMove(0, dy)) return;
    this.autoWalkTarget = null;
  }

  private tryMove(dx: number, dy: number): boolean {
    const nx = this.player.x + dx;
    const ny = this.player.y + dy;
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return false;
    if (this.floor.tiles[ny]![nx] === 'wall') return false;
    this.queueMove(dx, dy);
    return true;
  }

  private async processPlayerAction(dx: number, dy: number) {
    // Start the scored run on first player action (not on init)
    if (!this.runStarted && !this.isGhost && !this.initPayload.flags.loggedOut) {
      try {
        const resp = await fetch('/api/run/start', { method: 'POST' });
        const data = (await resp.json()) as { status: string; run?: RunState };
        if (data.run) {
          this.initPayload.run = data.run;
          this.runStarted = true;
        } else {
          this.isGhost = true;
        }
      } catch {
        this.isGhost = true;
      }
    }

    const result = processPlayerMove(dx, dy, this.player, this.floor.tiles, this.floor.enemies, this.floor.items);

    if (result.playerMoved) {
      playStep();
    }
    if (result.attacked) {
      playHit();
      if (result.enemyDied) {
        const idx = this.floor.enemies.indexOf(result.enemyDied);
        if (idx >= 0 && this.enemySprites[idx]) {
          this.tweens.add({
            targets: this.enemySprites[idx],
            alpha: 0,
            duration: 200,
            onComplete: () => this.enemySprites[idx]?.destroy(),
          });
        }
      }
    }
    if (result.pickedUp) {
      playPickup();
    }

    // Check enemy damage from enemy turns
    const { damage: enemyDmg } = processEnemyTurns(this.player, this.floor.enemies, this.floor.tiles);
    if (enemyDmg > 0) {
      this.player.hp -= enemyDmg;
      playHit();
      this.cameras.main.shake(80, 0.02);
    }

    // Darkness damage
    if (this.player.torch <= 0 && this.turnCount % 3 === 0 && this.turnCount > 0) {
      this.player.hp -= 1;
    }

    this.turnCount++;
    if (this.turnCount === 3) {
      this.tweens.add({ targets: this.hintText, alpha: 0, duration: 500 });
    }

    if (result.enemyDied) {
      // Remove dead enemy
      const eidx = this.floor.enemies.indexOf(result.enemyDied);
      if (eidx >= 0) {
        this.floor.enemies.splice(eidx, 1);
        this.enemySprites.splice(eidx, 1);
      }
    }

    if (this.player.hp <= 0) {
      this.gameActive = false;
      playDeath();
      this.showDeathModal();
      return;
    }

    if (result.descended) {
      this.currentDepth++;
      this.player.x = this.floor.entryX;
      this.player.y = this.floor.entryY;
      this.loadFloor();
      this.showFloorTransition();
      return;
    }

    if (result.shrineHit) {
      this.showShrineChoice();
      return;
    }

    // Check graves
    for (const grave of this.floor.graves) {
      if (grave.x === this.player.x && grave.y === this.player.y) {
        this.showGravePanel(grave);
        break;
      }
    }

    // Update visuals
    this.updateFov();
    this.updateSprites();
    this.updateHud();

    if (this.autoWalkTarget) {
      this.time.delayedCall(100, () => this.processAutoWalkStep());
    }
  }

  private updateFov() {
    const radius = getLightRadius(this.player.torch);
    const { visible, explored } = computeFov(this.floor.tiles, this.player.x, this.player.y, radius, this.explored);
    this.explored = explored;

    // --- Tile visibility ---
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const key = `${x},${y}`;
        const img = this.tileSprites[y]?.[x];
        if (img) {
          img.setAlpha(visible.has(key) ? 1 : explored.has(key) ? 0.18 : 0);
        }
      }
    }

    // --- Enemy visibility ---
    for (let i = 0; i < this.floor.enemies.length; i++) {
      const e = this.floor.enemies[i]!;
      const sprite = this.enemySprites[i];
      if (sprite) sprite.setAlpha(visible.has(`${e.x},${e.y}`) ? 1 : 0);
    }

    // --- Item visibility (sprites store tx/ty in data) ---
    for (const sprite of this.itemSprites) {
      const tx = sprite.getData('tx') as number;
      const ty = sprite.getData('ty') as number;
      const key = `${tx},${ty}`;
      sprite.setAlpha(visible.has(key) ? 1 : explored.has(key) ? 0.5 : 0);
    }

    // --- Grave visibility ---
    for (let i = 0; i < this.floor.graves.length; i++) {
      const g = this.floor.graves[i]!;
      const sprite = this.graveSprites[i];
      if (sprite) {
        const key = `${g.x},${g.y}`;
        sprite.setAlpha(visible.has(key) ? 1 : explored.has(key) ? 0.3 : 0);
      }
    }

    // --- RenderTexture torch light ---
    // Fill RT with darkness, then ERASE a gradient circle at the player position.
    // This is the correct Phaser approach — Graphics fillStyle(color, 0) does NOT erase!
    const cx = this.player.x * TILE + TILE / 2;
    const cy = this.player.y * TILE + TILE / 2;
    const r = radius * TILE;

    this.lightRT.clear();
    this.lightRT.fill(0x0b0b10, 0.9);

    // Build gradient: bright at center, transparent at edge
    this.lightGfx.clear();
    const steps = 10;
    for (let i = steps; i >= 1; i--) {
      const t = i / steps;
      this.lightGfx.fillStyle(0xffffff, t);
      this.lightGfx.fillCircle(cx, cy, r * t);
    }
    this.lightRT.erase(this.lightGfx, 0, 0);

    // --- Explored memory dimming ---
    this.exploredLayer.clear();
    for (const key of this.explored) {
      if (!visible.has(key)) {
        const [x, y] = key.split(',').map(Number);
        if (x !== undefined && y !== undefined) {
          this.exploredLayer.fillStyle(0xe8e0ce, 0.06);
          this.exploredLayer.fillRect(x * TILE, y * TILE, TILE, TILE);
        }
      }
    }
  }

  private updateSprites() {
    // Update enemy sprites
    for (let i = 0; i < this.floor.enemies.length; i++) {
      const enemy = this.floor.enemies[i]!;
      const sprite = this.enemySprites[i];
      if (sprite) {
        sprite.setPosition(enemy.x * TILE + TILE / 2, enemy.y * TILE + TILE / 2);
      }
    }

    // Update player
    const playerSprite = this.children.list.find(
      (c) => (c as Phaser.GameObjects.Image).getData?.('isPlayer') === true
    ) as Phaser.GameObjects.Image | undefined;
    if (playerSprite) {
      playerSprite.setPosition(this.player.x * TILE + TILE / 2, this.player.y * TILE + TILE / 2);
    }
  }

  private updateHud() {
    this.hud.update(
      this.player.hp,
      this.player.torch,
      this.currentDepth,
      this.initPayload.run?.gold ?? 0,
      this.player.weapon?.name ?? null,
      this.player.inventory,
      isMuted()
    );
  }

  private showFloorTransition() {
    this.cameras.main.flash(200, 11, 11, 16);
  }

  private showDeathModal() {
    const w = COLS * TILE;
    const h = ROWS * TILE;
    const bg = this.add.graphics();
    bg.fillStyle(0x0b0b10, 0.95);
    bg.fillRect(0, 0, w, h);
    bg.setDepth(300);

    const title = this.add.text(w / 2, h / 2 - 40, `You died on floor ${this.currentDepth}.`, {
      fontSize: '8px',
      fontFamily: 'Grenze Gotisch, serif',
      color: '#C4501B',
      align: 'center',
    }).setOrigin(0.5).setDepth(301);

    const sub = this.add.text(w / 2, h / 2 - 20, 'The Barrow keeps you.', {
      fontSize: '7px',
      fontFamily: 'Inter, sans-serif',
      color: '#E8E0CE',
      align: 'center',
    }).setOrigin(0.5).setDepth(301);

    const note = this.add.text(w / 2, h / 2, 'Your grave will stand in tomorrow\'s Barrow.', {
      fontSize: '6px',
      fontFamily: 'Inter, sans-serif',
      color: '#3E5C76',
      align: 'center',
    }).setOrigin(0.5).setDepth(301);

    const btn = this.add.text(w / 2, h / 2 + 30, 'Bury & Compose', {
      fontSize: '8px',
      fontFamily: 'Grenze Gotisch, serif',
      color: '#0B0B10',
      backgroundColor: '#E8A33D',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(301).setInteractive();

    btn.on('pointerdown', () => {
      bg.destroy();
      title.destroy();
      sub.destroy();
      note.destroy();
      btn.destroy();
      this.showBurialAndEpitaph();
    });
  }

  private showBurialAndEpitaph() {
    const w = COLS * TILE;
    const h = ROWS * TILE;

    const bg = this.add.graphics();
    bg.fillStyle(0x0b0b10, 0.95);
    bg.fillRect(0, 0, w, h);
    bg.setDepth(300);

    const prompt = this.add.text(w / 2, 20, 'Leave something behind.', {
      fontSize: '7px',
      fontFamily: 'Inter, sans-serif',
      color: '#E8E0CE',
      align: 'center',
    }).setOrigin(0.5).setDepth(301);

    const items = this.player.inventory.length > 0 ? this.player.inventory : ['a handful of dust'];
    const chips: Phaser.GameObjects.Text[] = [];
    let selectedItem = items[0]!;

    items.forEach((item, i) => {
      const chip = this.add.text(w / 2 - 40 + i * 40, 40, item.substring(0, 8), {
        fontSize: '6px',
        fontFamily: 'Inter, sans-serif',
        color: i === 0 ? '#0B0B10' : '#E8E0CE',
        backgroundColor: i === 0 ? '#E8A33D' : '#1a1a24',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5).setDepth(301).setInteractive();

      chip.on('pointerdown', () => {
        selectedItem = item;
        chips.forEach((c, j) => {
          c.setColor(j === i ? '#0B0B10' : '#E8E0CE');
          c.setBackgroundColor(j === i ? '#E8A33D' : '#1a1a24');
        });
      });
      chips.push(chip);
    });

    // Epitaph composer
    const ePrompt = this.add.text(w / 2, 65, 'Last words. Choose them well.', {
      fontSize: '6px',
      fontFamily: 'Inter, sans-serif',
      color: '#3E5C76',
      align: 'center',
    }).setOrigin(0.5).setDepth(301);

    const wordBank = {
      openers: ['Beware', 'Seek', 'Trust', 'Avoid', 'Fear', 'Follow', 'Praise', 'Mourn'],
      subjects: ['the gold', 'the darkness', 'the rats', 'the knight', 'the stairs', 'this grave', 'the shrine'],
      closers: ['below', 'ahead', 'always', 'never', '...trust me', 'in the dark', 'before dawn', 'no further'],
    };

    let selectedOpener = 0;
    let selectedSubject = 0;
    let selectedCloser = 0;

    const openerChips: Phaser.GameObjects.Text[] = [];
    const subjectChips: Phaser.GameObjects.Text[] = [];
    const closerChips: Phaser.GameObjects.Text[] = [];

    wordBank.openers.forEach((word, i) => {
      const chip = this.add.text(10 + i * 17, 82, word.substring(0, 5), {
        fontSize: '5px',
        fontFamily: 'Inter, sans-serif',
        color: i === 0 ? '#0B0B10' : '#E8E0CE',
        backgroundColor: i === 0 ? '#E8A33D' : '#1a1a24',
        padding: { x: 2, y: 1 },
      }).setDepth(301).setInteractive();
      chip.on('pointerdown', () => {
        selectedOpener = i;
        openerChips.forEach((c, j) => {
          c.setColor(j === i ? '#0B0B10' : '#E8E0CE');
          c.setBackgroundColor(j === i ? '#E8A33D' : '#1a1a24');
        });
        updatePreview();
      });
      openerChips.push(chip);
    });

    wordBank.subjects.forEach((word, i) => {
      const chip = this.add.text(10 + i * 19, 94, word.substring(0, 8), {
        fontSize: '5px',
        fontFamily: 'Inter, sans-serif',
        color: i === 0 ? '#0B0B10' : '#E8E0CE',
        backgroundColor: i === 0 ? '#E8A33D' : '#1a1a24',
        padding: { x: 2, y: 1 },
      }).setDepth(301).setInteractive();
      chip.on('pointerdown', () => {
        selectedSubject = i;
        subjectChips.forEach((c, j) => {
          c.setColor(j === i ? '#0B0B10' : '#E8E0CE');
          c.setBackgroundColor(j === i ? '#E8A33D' : '#1a1a24');
        });
        updatePreview();
      });
      subjectChips.push(chip);
    });

    wordBank.closers.forEach((word, i) => {
      const chip = this.add.text(10 + i * 19, 106, word.substring(0, 8), {
        fontSize: '5px',
        fontFamily: 'Inter, sans-serif',
        color: i === 0 ? '#0B0B10' : '#E8E0CE',
        backgroundColor: i === 0 ? '#E8A33D' : '#1a1a24',
        padding: { x: 2, y: 1 },
      }).setDepth(301).setInteractive();
      chip.on('pointerdown', () => {
        selectedCloser = i;
        closerChips.forEach((c, j) => {
          c.setColor(j === i ? '#0B0B10' : '#E8E0CE');
          c.setBackgroundColor(j === i ? '#E8A33D' : '#1a1a24');
        });
        updatePreview();
      });
      closerChips.push(chip);
    });

    const preview = this.add.text(w / 2, 122, '', {
      fontSize: '6px',
      fontFamily: 'Grenze Gotisch, serif',
      color: '#3E5C76',
      align: 'center',
      wordWrap: { width: w - 16 },
    }).setOrigin(0.5).setDepth(301);

    function updatePreview() {
      const o = wordBank.openers[selectedOpener]!;
      const s = wordBank.subjects[selectedSubject]!;
      const c = wordBank.closers[selectedCloser]!;
      preview.setText(`${o} \u00b7 ${s} \u00b7 ${c}`);
    }
    updatePreview();

    const submitBtn = this.add.text(w / 2, 145, 'Send to the Barrow', {
      fontSize: '7px',
      fontFamily: 'Grenze Gotisch, serif',
      color: '#0B0B10',
      backgroundColor: '#E8A33D',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(301).setInteractive();

    submitBtn.on('pointerdown', async () => {
      submitBtn.setText('...');
      submitBtn.disableInteractive();

      const body = {
        result: 'died' as const,
        depth: this.currentDepth,
        gold: this.initPayload.run?.gold ?? 0,
        turns: this.turnCount,
        durationMs: this.turnCount * 2000,
        buriedItem: selectedItem,
        epitaph: [selectedOpener, selectedSubject, selectedCloser] as [number, number, number],
        deathPos: { floor: this.currentDepth, x: this.player.x, y: this.player.y },
      };

      try {
        await fetch('/api/run/finish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } catch {
        // continue to ghost
      }

      // Clean up modal
      [bg, prompt, ePrompt, preview, submitBtn, ...chips, ...openerChips, ...subjectChips, ...closerChips].forEach((o) => o.destroy());

      this.isGhost = true;
      this.gameActive = true;
      this.player.hp = 1;
      this.loadFloor();
    });
  }

  private showShrineChoice() {
    const w = COLS * TILE;
    const h = ROWS * TILE;

    const bg = this.add.graphics();
    bg.fillStyle(0x0b0b10, 0.95);
    bg.fillRect(0, 0, w, h);
    bg.setDepth(300);

    const title = this.add.text(w / 2, h / 2 - 30, 'A shrine to the Barrow.', {
      fontSize: '8px',
      fontFamily: 'Grenze Gotisch, serif',
      color: '#5C7A5A',
      align: 'center',
    }).setOrigin(0.5).setDepth(301);

    const ascendBtn = this.add.text(w / 2 - 30, h / 2, 'Ascend', {
      fontSize: '7px',
      fontFamily: 'Inter, sans-serif',
      color: '#0B0B10',
      backgroundColor: '#E8A33D',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(301).setInteractive();

    const descendBtn = this.add.text(w / 2 + 30, h / 2, 'Descend', {
      fontSize: '7px',
      fontFamily: 'Inter, sans-serif',
      color: '#E8E0CE',
      backgroundColor: '#3E5C76',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(301).setInteractive();

    ascendBtn.on('pointerdown', async () => {
      const gold = Math.round((this.initPayload.run?.gold ?? 0) * 1.25);
      try {
        await fetch('/api/run/finish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            result: 'escaped',
            depth: this.currentDepth,
            gold,
            turns: this.turnCount,
            durationMs: this.turnCount * 2000,
          }),
        });
      } catch { /* network error during finish — ignore */ }
      [bg, title, ascendBtn, descendBtn].forEach((o) => o.destroy());
      this.showEscapeModal();
    });

    descendBtn.on('pointerdown', () => {
      [bg, title, ascendBtn, descendBtn].forEach((o) => o.destroy());
    });
  }

  private showEscapeModal() {
    this.gameActive = false;
    const w = COLS * TILE;
    const h = ROWS * TILE;
    const bg = this.add.graphics();
    bg.fillStyle(0x0b0b10, 0.95);
    bg.fillRect(0, 0, w, h);
    bg.setDepth(300);

    this.add.text(w / 2, h / 2 - 15, 'You climbed back to the light.', {
      fontSize: '8px',
      fontFamily: 'Grenze Gotisch, serif',
      color: '#E8A33D',
      align: 'center',
    }).setOrigin(0.5).setDepth(301);

    this.add.text(w / 2, h / 2 + 5, 'The Barrow forgets the living.', {
      fontSize: '6px',
      fontFamily: 'Inter, sans-serif',
      color: '#3E5C76',
      align: 'center',
    }).setOrigin(0.5).setDepth(301);
  }

  private showGravePanel(grave: Grave) {
    const w = COLS * TILE;
    const h = ROWS * TILE;
    const bg = this.add.graphics();
    bg.fillStyle(0x0b0b10, 0.95);
    bg.fillRect(0, 0, w, h);
    bg.setDepth(300);

    const opener = ['Beware', 'Seek', 'Trust', 'Avoid', 'Fear', 'Follow', 'Praise', 'Mourn'][grave.epitaph[0]] ?? '';
    const subject = ['the gold', 'the darkness', 'the rats', 'the knight', 'the stairs', 'this grave', 'the shrine'][grave.epitaph[1]] ?? '';
    const closer = ['below', 'ahead', 'always', 'never', '...trust me', 'in the dark', 'before dawn', 'no further'][grave.epitaph[2]] ?? '';

    this.add.text(w / 2, 30, `${grave.user} fell here.`, {
      fontSize: '7px',
      fontFamily: 'Inter, sans-serif',
      color: '#E8E0CE',
      align: 'center',
    }).setOrigin(0.5).setDepth(301);

    this.add.text(w / 2, 45, `'${opener} \u00b7 ${subject} \u00b7 ${closer}'`, {
      fontSize: '6px',
      fontFamily: 'Grenze Gotisch, serif',
      color: '#3E5C76',
      align: 'center',
      wordWrap: { width: w - 16 },
    }).setOrigin(0.5).setDepth(301);

    const respectBtn = this.add.text(w / 2 - 25, 70, 'Pay respects', {
      fontSize: '6px',
      fontFamily: 'Inter, sans-serif',
      color: '#0B0B10',
      backgroundColor: '#5C7A5A',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(301).setInteractive();

    respectBtn.on('pointerdown', async () => {
      const resp = await fetch('/api/grave/act', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graveId: grave.id, act: 'respect' }),
      });
      const data = await resp.json() as { status: string; torchBonus?: number };
      if (data.status === 'ok') {
        this.player.torch = Math.min(100, this.player.torch + (data.torchBonus ?? RESPECT_TORCH_BOOST));
        playRespects();
        respectBtn.setColor('#3E5C76');
        respectBtn.setText('Respected');
        respectBtn.disableInteractive();
      }
    });

    if (grave.item !== 'a handful of dust') {
      const lootBtn = this.add.text(w / 2 + 25, 70, `Take ${grave.item}`, {
        fontSize: '6px',
        fontFamily: 'Inter, sans-serif',
        color: '#0B0B10',
        backgroundColor: '#E8A33D',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5).setDepth(301).setInteractive();

      lootBtn.on('pointerdown', async () => {
        const resp = await fetch('/api/grave/act', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ graveId: grave.id, act: 'loot' }),
        });
        const data = await resp.json() as { status: string };
        if (data.status === 'ok') {
          if (this.player.inventory.length < 3) {
            this.player.inventory.push(grave.item);
          }
          lootBtn.setColor('#3E5C76');
          lootBtn.setText('Taken');
          lootBtn.disableInteractive();
        }
      });
    }

    const closeBtn = this.add.text(w / 2, 95, 'Close', {
      fontSize: '6px',
      fontFamily: 'Inter, sans-serif',
      color: '#3E5C76',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(301).setInteractive();

    closeBtn.on('pointerdown', () => {
      this.children.list
        .filter((c) => (c as unknown as { depth: number }).depth === 301)
        .forEach((c) => c.destroy());
      bg.destroy();
      this.updateFov();
      this.updateHud();
    });
  }

  private showLedger() {
    const w = COLS * TILE;
    const h = ROWS * TILE;
    const bg = this.add.graphics();
    bg.fillStyle(0x0b0b10, 0.95);
    bg.fillRect(0, 0, w, h);
    bg.setDepth(300);

    this.add.text(w / 2, 20, 'While you were gone...', {
      fontSize: '8px',
      fontFamily: 'Grenze Gotisch, serif',
      color: '#E8A33D',
      align: 'center',
    }).setOrigin(0.5).setDepth(301);

    const entries = this.initPayload.ledger.slice(0, 5);
    entries.forEach((entry, i) => {
      this.add.text(w / 2, 40 + i * 14, entry.text, {
        fontSize: '6px',
        fontFamily: 'Inter, sans-serif',
        color: '#E8E0CE',
        align: 'center',
        wordWrap: { width: w - 16 },
      }).setOrigin(0.5).setDepth(301);
    });

    const closeBtn = this.add.text(w / 2, h - 30, 'Close', {
      fontSize: '7px',
      fontFamily: 'Inter, sans-serif',
      color: '#3E5C76',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(301).setInteractive();

    closeBtn.on('pointerdown', async () => {
      this.children.list
        .filter((c) => (c as unknown as { depth: number }).depth === 301)
        .forEach((c) => c.destroy());
      bg.destroy();
      try {
        await fetch('/api/ledger/clear', { method: 'POST' });
      } catch { /* network error — ignore */ }
    });
  }

  override update(_time: number) {
    // Torch pulse when low
    if (this.player.torch < 20 && this.player.torch > 0) {
      // Pulse the torch bar via HUD
    }
  }
}
