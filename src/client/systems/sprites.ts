import Phaser from 'phaser';

type Palette = {
  peat: number;
  bone: number;
  amber: number;
  ember: number;
  moon: number;
  moss: number;
};

const PAL: Palette = {
  peat: 0x0b0b10,
  bone: 0xe8e0ce,
  amber: 0xe8a33d,
  ember: 0xc4501b,
  moon: 0x3e5c76,
  moss: 0x5c7a5a,
};

type PixelMap = string[];

const SPRITE_MAPS: Record<string, PixelMap[]> = {
  player: [
    [
      '....####....',
      '...######...',
      '..##.BB.##..',
      '..#.B..B.#..',
      '..##.BB.##..',
      '...######...',
      '....####....',
      '...AAAAAA...',
      '..AAAAAAAA..',
      '..AAAAAAAA..',
      '...AAAAAA...',
      '....AA.AA...',
      '...AA...AA..',
      '...BB...BB..',
    ],
  ],
  ghost: [
    [
      '....####....',
      '...######...',
      '..##.MM.##..',
      '..#.M..M.#..',
      '..##.MM.##..',
      '...######...',
      '....####....',
      '...MMMMMM...',
      '..MMMMMMMM..',
      '..MMMMMMMM..',
      '...MMMMMM...',
      '....MM.MM...',
      '...MM...MM..',
      '...MM...MM..',
    ],
  ],
  rat: [
    [
      '............',
      '............',
      '............',
      '............',
      '....BBB.....',
      '...BBBBB....',
      '..BB.B.BB...',
      '..BBBBBBB...',
      '...BBBBB....',
      '....BBB.....',
      '....B.B.....',
      '...B...B....',
      '............',
      '............',
    ],
  ],
  skeleton: [
    [
      '....BBBB....',
      '...BBBBBB...',
      '..BB.BB.BB..',
      '..BBBBBBBB..',
      '...BBBBBB...',
      '....BBBB....',
      '.....BB.....',
      '....BBBB....',
      '...BB..BB...',
      '....BBBB....',
      '.....BB.....',
      '....BB.BB...',
      '...BB...BB..',
      '............',
    ],
  ],
  wisp: [
    [
      '............',
      '............',
      '....MMMM....',
      '...MMMMMM...',
      '..MMM.MM.M..',
      '..MMMMMMMM..',
      '..MMMMMMMM..',
      '...MMMMMM...',
      '....MMMM....',
      '............',
      '............',
      '............',
      '............',
      '............',
    ],
  ],
  knight: [
    [
      '...AAAAAA...',
      '..AAAAAAAA..',
      '..AA.AA.AA..',
      '..AAAAAAAA..',
      '..AAAAAAAA..',
      '...AAAAAA...',
      '....AAAA....',
      '..AAAAAAAA..',
      '.AAAAAAAAAA.',
      '..AAAAAAAA..',
      '...AAAAAA...',
      '....AA.AA...',
      '...AA...AA..',
      '..AAA...AAA.',
    ],
  ],
  gravestone: [
    [
      '............',
      '...MMMMMM...',
      '..MMMMMMMM..',
      '..MMMMMMMM..',
      '..MMMMMMMM..',
      '..MMMMMMMM..',
      '..MMMMMMMM..',
      '..MMMMMMMM..',
      '..MMMMMMMM..',
      '.MMMMMMMMMM.',
      '.MMMMMMMMMM.',
      '.MMMMMMMMMM.',
      '.MMMMMMMMMM.',
      '............',
    ],
  ],
  shrine: [
    [
      '............',
      '.....GG.....',
      '....GGGG....',
      '...GGGGGG...',
      '..GG.GG.GG..',
      '..GGGGGGGG..',
      '...GGGGGG...',
      '....GGGG....',
      '.....GG.....',
      '....GGGG....',
      '...GGGGGG...',
      '..GGGGGGGG..',
      '.GGGGGGGGGG.',
      '............',
    ],
  ],
  stairs: [
    [
      '............',
      '............',
      '..BBBBBBBB..',
      '..B.......B.',
      '..BBBBBBBB..',
      '..B.......B.',
      '..BBBBBBBB..',
      '..B.......B.',
      '..BBBBBBBB..',
      '..B.......B.',
      '..BBBBBBBB..',
      '............',
      '............',
      '............',
    ],
  ],
  ember: [
    [
      '............',
      '............',
      '............',
      '............',
      '.....RR.....',
      '....RRRR....',
      '...RRAARR...',
      '...RAAAAR...',
      '....RRRR....',
      '.....RR.....',
      '............',
      '............',
      '............',
      '............',
    ],
  ],
  bandage: [
    [
      '............',
      '............',
      '............',
      '............',
      '...BBBBBB...',
      '..BB....BB..',
      '..BB.BB.BB..',
      '..BB.BB.BB..',
      '..BB....BB..',
      '...BBBBBB...',
      '............',
      '............',
      '............',
      '............',
    ],
  ],
  gold: [
    [
      '............',
      '............',
      '............',
      '............',
      '....AAAA....',
      '...AAAAAA...',
      '..AA.AA.AA..',
      '..AA.AA.AA..',
      '..AA.AA.AA..',
      '...AAAAAA...',
      '....AAAA....',
      '............',
      '............',
      '............',
    ],
  ],
  dagger: [
    [
      '............',
      '............',
      '............',
      '............',
      '........A...',
      '.......AA...',
      '......AAA...',
      '.....AAAA...',
      '....AAAAA...',
      '...AAA.B....',
      '..AAA..B....',
      '.AA....BB...',
      '......BBB...',
      '............',
    ],
  ],
  sword: [
    [
      '........A...',
      '.......AA...',
      '......AAA...',
      '.....AAAA...',
      '....AAAAA...',
      '...AAAAAA...',
      '..AAAAAAA...',
      '.AAAAAAAA...',
      '..AAA.B.....',
      '...AA.B.....',
      '....BBB.....',
      '.....BB.....',
      '....BBBB....',
      '............',
    ],
  ],
  spike: [
    [
      '............',
      '............',
      '............',
      '............',
      '.....A......',
      '....AA.A....',
      '...A..A..A..',
      '..A...A...A.',
      '.A....A....A',
      'AAAAAAAAAAAA',
      '............',
      '............',
      '............',
      '............',
    ],
  ],
  wall0: [
    [
      '############',
      '#BBBBBBBBBB#',
      '#BB.BB.BB.B#',
      '#BBBBBBBBBB#',
      '#B.BB.BB.BB#',
      '#BBBBBBBBBB#',
      '#BB.BB.BB.B#',
      '#BBBBBBBBBB#',
      '#B.BB.BB.BB#',
      '#BBBBBBBBBB#',
      '#BB.BB.BB.B#',
      '#BBBBBBBBBB#',
      '#B.BB.BB.BB#',
      '############',
    ],
  ],
  wall1: [
    [
      '############',
      '#BBBBBBBBBB#',
      '#B.BB.BB.BB#',
      '#BBBBBBBBBB#',
      '#BB.BB.BB.B#',
      '#BBBBBBBBBB#',
      '#B.BB.BB.BB#',
      '#BBBBBBBBBB#',
      '#BB.BB.BB.B#',
      '#BBBBBBBBBB#',
      '#B.BB.BB.BB#',
      '#BBBBBBBBBB#',
      '#BB.BB.BB.B#',
      '############',
    ],
  ],
  floor0: [
    [
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
    ],
  ],
  floor1: [
    [
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
    ],
  ],
};

const CHAR_MAP: Record<string, number> = {
  '.': 0x00000000,
  '#': PAL.peat,
  'A': PAL.amber,
  'B': PAL.bone,
  'R': PAL.ember,
  'M': PAL.moon,
  'G': PAL.moss,
};

export function generateSpritesheet(scene: Phaser.Scene): Phaser.Textures.Texture {
  const canvas = document.createElement('canvas');
  const spriteCount = Object.keys(SPRITE_MAPS).length;
  canvas.width = 16 * spriteCount;
  canvas.height = 16;
  const ctx = canvas.getContext('2d')!;

  let offsetX = 0;
  for (const [_name, frames] of Object.entries(SPRITE_MAPS)) {
    const frame = frames[0]!;
    for (let y = 0; y < 16; y++) {
      const row = frame[y] ?? '';
      for (let x = 0; x < 16; x++) {
        const ch = row[x] ?? '.';
        const color = CHAR_MAP[ch] ?? 0;
        if (color !== 0) {
          ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
          ctx.fillRect(offsetX + x, y, 1, 1);
        }
      }
    }
    offsetX += 16;
  }

  const key = 'barrow-sprites';
  scene.textures.addCanvas(key, canvas);
  return scene.textures.get(key);
}

export function getSpriteFrame(
  _sheet: Phaser.Textures.Texture,
  name: string
): string | null {
  const names = Object.keys(SPRITE_MAPS);
  const idx = names.indexOf(name);
  if (idx < 0) return null;
  return `${idx * 16},0,16,16`;
}

export const SPRITE_ORDER = Object.keys(SPRITE_MAPS);
