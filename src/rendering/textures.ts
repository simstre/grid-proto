import * as PIXI from 'pixi.js';
import {
  TILE_WIDTH,
  TILE_HEIGHT,
  TILE_WIDTH_HALF,
  TILE_HEIGHT_HALF,
  HEIGHT_STEP,
  TerrainType,
} from '@/core/constants';

// ─── FFT Color Palette (sampled from original game) ───

interface TerrainPalette {
  base: number[];
  highlight: number[];
  shadow: number[];
  blades?: number[];
  detail?: number[];
  foam?: number[];
}

const FFT_PALETTE: Record<TerrainType, TerrainPalette> = {
  grass: {
    base: [0x6b8c42, 0x5a7a36, 0x7a9b4e, 0x4e6b2a],
    highlight: [0x8bab5e, 0x95b568],
    shadow: [0x3e5520, 0x4a6328],
    blades: [0x5e8035, 0x72943f, 0x4a6b28],
  },
  stone: {
    base: [0x8a8078, 0x7a706a, 0x96908a, 0x6e6860],
    highlight: [0xa09a94, 0xaaa4a0],
    shadow: [0x5a5550, 0x4e4a46],
    detail: [0x6a6460, 0x807a74],
  },
  dirt: {
    base: [0x8b7355, 0x7a6348, 0x9a8360, 0x6b5540],
    highlight: [0xa89370, 0xb09a78],
    shadow: [0x5a4530, 0x4e3c28],
    detail: [0x7a6848, 0x6b5a3e],
  },
  sand: {
    base: [0xc4a96a, 0xb89e60, 0xd0b575, 0xae9458],
    highlight: [0xdcc888, 0xe0cc90],
    shadow: [0x9a8450, 0x8e7a48],
    detail: [0xb49858, 0xc0a462],
  },
  water: {
    base: [0x4a7ab5, 0x3e6ea8, 0x5686c0, 0x3660a0],
    highlight: [0x6898d0, 0x78a8e0],
    shadow: [0x2a5080, 0x244a78],
    detail: [0x5888c0, 0x4a78b0],
    foam: [0x90c0e0, 0xa0d0f0],
  },
  lava: {
    base: [0xd44a00, 0xc04000, 0xe05500, 0xb03800],
    highlight: [0xff8820, 0xffaa40],
    shadow: [0x802800, 0x6e2000],
    detail: [0xe06000, 0xcc4800],
  },
  wood: {
    base: [0x8b6914, 0x7a5c10, 0x9a7818, 0x6b500c],
    highlight: [0xa88520, 0xb09028],
    shadow: [0x5a4008, 0x4e3606],
    detail: [0x7a600e, 0x6b5410],
  },
  roof: {
    base: [0x994444, 0x883838, 0xaa5050, 0x7a3030],
    highlight: [0xbb6060, 0xcc7070],
    shadow: [0x662020, 0x5a1818],
    detail: [0x884040, 0x7a3434],
  },
};

// Seeded random for deterministic textures
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function colorToRGB(c: number): [number, number, number] {
  return [(c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff];
}

// ─── Tile Texture Generation ───

interface TextureCache {
  tops: Map<string, PIXI.Texture>;
  leftSides: Map<string, PIXI.Texture>;
  rightSides: Map<string, PIXI.Texture>;
}

let cache: TextureCache | null = null;

function getCache(): TextureCache {
  if (!cache) {
    cache = {
      tops: new Map(),
      leftSides: new Map(),
      rightSides: new Map(),
    };
  }
  return cache;
}

/**
 * Generate a pixel-art tile top texture (isometric diamond).
 */
export function getTileTopTexture(terrain: TerrainType, seed: number = 0): PIXI.Texture {
  const key = `${terrain}_${seed}`;
  const c = getCache();
  if (c.tops.has(key)) return c.tops.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = TILE_WIDTH;
  canvas.height = TILE_HEIGHT;
  const ctx = canvas.getContext('2d')!;

  const palette = FFT_PALETTE[terrain] || FFT_PALETTE.grass;
  const rand = seededRandom(seed * 1000 + terrain.charCodeAt(0));

  // Fill the diamond shape pixel by pixel
  for (let py = 0; py < TILE_HEIGHT; py++) {
    for (let px = 0; px < TILE_WIDTH; px++) {
      // Check if pixel is inside the isometric diamond
      const dx = Math.abs(px - TILE_WIDTH_HALF) / TILE_WIDTH_HALF;
      const dy = Math.abs(py - TILE_HEIGHT_HALF) / TILE_HEIGHT_HALF;
      if (dx + dy > 1.0) continue;

      // Determine pixel color based on terrain type
      const color = getTerrainPixelColor(terrain, px, py, rand, palette);
      ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
      ctx.fillRect(px, py, 1, 1);
    }
  }

  // Add edge darkening for depth
  addDiamondEdge(ctx);

  const texture = PIXI.Texture.from(canvas);
  c.tops.set(key, texture);
  return texture;
}

function getTerrainPixelColor(
  terrain: TerrainType,
  px: number,
  py: number,
  rand: () => number,
  palette: TerrainPalette
): [number, number, number] {
  const baseColors = palette.base;
  const highlights = palette.highlight;
  const shadows = palette.shadow;

  // Base color selection with dithering pattern
  const patternIdx = ((px >> 1) + (py >> 1)) % baseColors.length;
  let baseColor = baseColors[patternIdx];

  // Add noise variation
  const noise = rand();
  if (noise < 0.15) {
    baseColor = highlights[Math.floor(rand() * highlights.length)];
  } else if (noise < 0.25) {
    baseColor = shadows[Math.floor(rand() * shadows.length)];
  }

  // Lighting gradient (top-left light source, like FFT)
  const lightFactor = 1.0 - (px + py) / (TILE_WIDTH + TILE_HEIGHT) * 0.2;

  const [r, g, b] = colorToRGB(baseColor);

  // Terrain-specific details
  if (terrain === 'grass') {
    return addGrassDetail(px, py, r, g, b, rand, lightFactor, palette as TerrainPalette);
  }
  if (terrain === 'stone') {
    return addStoneDetail(px, py, r, g, b, rand, lightFactor);
  }
  if (terrain === 'water') {
    return addWaterDetail(px, py, r, g, b, rand, lightFactor, palette as TerrainPalette);
  }

  return [
    Math.min(255, Math.round(r * lightFactor)),
    Math.min(255, Math.round(g * lightFactor)),
    Math.min(255, Math.round(b * lightFactor)),
  ];
}

function addGrassDetail(
  px: number, py: number,
  r: number, g: number, b: number,
  rand: () => number,
  lightFactor: number,
  palette: TerrainPalette
): [number, number, number] {
  // Grass blade pattern
  const bladePattern = ((px * 7 + py * 13) % 5);
  if (bladePattern === 0 && rand() > 0.5 && palette.blades) {
    const blade = palette.blades[Math.floor(rand() * palette.blades.length)];
    const [br, bg, bb] = colorToRGB(blade);
    return [
      Math.min(255, Math.round(br * lightFactor)),
      Math.min(255, Math.round(bg * lightFactor)),
      Math.min(255, Math.round(bb * lightFactor)),
    ];
  }

  // Small flower dots
  if (rand() > 0.985) {
    return [220, 200, 100]; // tiny yellow flower
  }

  return [
    Math.min(255, Math.round(r * lightFactor)),
    Math.min(255, Math.round(g * lightFactor)),
    Math.min(255, Math.round(b * lightFactor)),
  ];
}

function addStoneDetail(
  px: number, py: number,
  r: number, g: number, b: number,
  rand: () => number,
  lightFactor: number
): [number, number, number] {
  // Stone crack lines
  const crackX = (px * 3 + py * 7) % 11;
  const crackY = (px * 5 + py * 3) % 13;
  if (crackX === 0 || crackY === 0) {
    if (rand() > 0.6) {
      return [
        Math.round(r * 0.7 * lightFactor),
        Math.round(g * 0.7 * lightFactor),
        Math.round(b * 0.7 * lightFactor),
      ];
    }
  }

  // Mortar lines (grid pattern for stone blocks)
  if (((px + 2) % 12 < 1) || ((py + 1) % 8 < 1)) {
    return [
      Math.round(r * 0.75 * lightFactor),
      Math.round(g * 0.75 * lightFactor),
      Math.round(b * 0.75 * lightFactor),
    ];
  }

  return [
    Math.min(255, Math.round(r * lightFactor)),
    Math.min(255, Math.round(g * lightFactor)),
    Math.min(255, Math.round(b * lightFactor)),
  ];
}

function addWaterDetail(
  px: number, py: number,
  r: number, g: number, b: number,
  rand: () => number,
  lightFactor: number,
  palette: TerrainPalette
): [number, number, number] {
  // Wave pattern
  const wave = Math.sin(px * 0.3 + py * 0.2) * 0.5 + 0.5;
  if (wave > 0.8 && rand() > 0.5 && palette.foam) {
    const foam = palette.foam[Math.floor(rand() * palette.foam.length)];
    const [fr, fg, fb] = colorToRGB(foam);
    return [
      Math.min(255, Math.round(fr * lightFactor * 0.8)),
      Math.min(255, Math.round(fg * lightFactor * 0.8)),
      Math.min(255, Math.round(fb * lightFactor * 0.8)),
    ];
  }

  // Shimmer highlights
  if (rand() > 0.95) {
    return [
      Math.min(255, r + 40),
      Math.min(255, g + 40),
      Math.min(255, b + 60),
    ];
  }

  return [
    Math.min(255, Math.round(r * lightFactor)),
    Math.min(255, Math.round(g * lightFactor)),
    Math.min(255, Math.round(b * lightFactor)),
  ];
}

function addDiamondEdge(ctx: CanvasRenderingContext2D): void {
  const imgData = ctx.getImageData(0, 0, TILE_WIDTH, TILE_HEIGHT);
  const data = imgData.data;

  for (let py = 0; py < TILE_HEIGHT; py++) {
    for (let px = 0; px < TILE_WIDTH; px++) {
      const idx = (py * TILE_WIDTH + px) * 4;
      if (data[idx + 3] === 0) continue;

      const dx = Math.abs(px - TILE_WIDTH_HALF) / TILE_WIDTH_HALF;
      const dy = Math.abs(py - TILE_HEIGHT_HALF) / TILE_HEIGHT_HALF;
      const edgeDist = 1.0 - (dx + dy);

      // Darken pixels near the diamond edge
      if (edgeDist < 0.12) {
        const factor = edgeDist / 0.12;
        data[idx] = Math.round(data[idx] * (0.5 + 0.5 * factor));
        data[idx + 1] = Math.round(data[idx + 1] * (0.5 + 0.5 * factor));
        data[idx + 2] = Math.round(data[idx + 2] * (0.5 + 0.5 * factor));
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Generate a tile side face texture (left or right).
 */
export function getTileSideTexture(
  terrain: TerrainType,
  side: 'left' | 'right',
  heightUnits: number,
  seed: number = 0
): PIXI.Texture {
  const key = `${terrain}_${side}_${heightUnits}_${seed}`;
  const c = getCache();
  const sideMap = side === 'left' ? c.leftSides : c.rightSides;
  if (sideMap.has(key)) return sideMap.get(key)!;

  const heightPx = heightUnits * HEIGHT_STEP;
  if (heightPx <= 0) {
    const empty = PIXI.Texture.EMPTY;
    sideMap.set(key, empty);
    return empty;
  }

  const canvas = document.createElement('canvas');
  // Side face is a parallelogram — we draw it as a rectangle and use PIXI mesh or just draw directly
  canvas.width = TILE_WIDTH_HALF;
  canvas.height = heightPx + TILE_HEIGHT_HALF;
  const ctx = canvas.getContext('2d')!;

  const palette = FFT_PALETTE[terrain] || FFT_PALETTE.grass;
  const shadows = palette.shadow;
  const details = 'detail' in palette ? (palette as any).detail : shadows;
  const rand = seededRandom(seed * 2000 + (side === 'left' ? 1 : 2));

  // Side faces use darker, earthen tones
  const sideColors = terrain === 'grass'
    ? [0x5a4530, 0x4e3c28, 0x6b5540, 0x5e4838]  // Brown earth underneath grass
    : shadows;

  for (let py = 0; py < canvas.height; py++) {
    for (let px = 0; px < canvas.width; px++) {
      const colorIdx = ((px >> 2) + (py >> 2)) % sideColors.length;
      let color = sideColors[colorIdx];

      // Add horizontal layer lines (sediment)
      if (py % HEIGHT_STEP < 1) {
        color = darken(color, 0.7);
      }

      // Vertical crack details
      if ((px * 5 + py * 3) % 17 === 0 && rand() > 0.7) {
        color = darken(color, 0.75);
      }

      // Gradient: darker toward bottom
      const depthFactor = 1.0 - (py / canvas.height) * 0.3;

      // Side lighting: left face is darker (shadow side in FFT)
      const sideFactor = side === 'left' ? 0.85 : 1.0;

      const [r, g, b] = colorToRGB(color);
      const noise = 0.95 + rand() * 0.1;
      ctx.fillStyle = `rgb(${clamp(r * depthFactor * sideFactor * noise)},${clamp(g * depthFactor * sideFactor * noise)},${clamp(b * depthFactor * sideFactor * noise)})`;
      ctx.fillRect(px, py, 1, 1);
    }
  }

  const texture = PIXI.Texture.from(canvas);
  sideMap.set(key, texture);
  return texture;
}

function darken(color: number, factor: number): number {
  const r = Math.round(((color >> 16) & 0xff) * factor);
  const g = Math.round(((color >> 8) & 0xff) * factor);
  const b = Math.round((color & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}

function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

// ─── Character Sprite Generation ───
// Chunky 8-bit sprites using pixel-grid bitmaps.
// Each cell = 1 actual pixel. Sprites are 32×48 natively,
// rendered at 1:1 and scaled by the camera zoom.
//
// FFT proportions: head ~45% of height, round and massive.
// Stubby limbs, wide shoulders, thick black outlines, bold colors.
// The head alone is about 16×16 pixels.

export interface CharacterPalette {
  O: number; // outline (near-black)
  S: number; // skin lit
  s: number; // skin shadow
  H: number; // hair main
  h: number; // hair highlight
  d: number; // hair dark
  A: number; // armor/outfit primary
  a: number; // armor shadow
  B: number; // armor secondary/accent
  b: number; // armor accent dark
  M: number; // metal/buckle
  m: number; // metal highlight
  W: number; // weapon blade
  w: number; // weapon highlight
  G: number; // weapon grip/guard
  E: number; // eye pupil
  e: number; // eye white
  C: number; // cape/cloth
  c: number; // cape shadow
  T: number; // boot/glove leather
  t: number; // boot shadow
}

// Grid dimensions: 32 wide × 48 tall (native pixels, no scaling)
const GRID_W = 32;
const GRID_H = 48;

// ─── Sprite Grids ───
// '.' = transparent. Each character maps to a palette key.
// The grids are designed for an FFT-inspired chibi look with a huge round head.

// Facing SOUTH (front view) — the primary sprite
const SQUIRE_SOUTH: string[] = [
  // Row 0-1: top of hair
  '................................',
  '..........OOOOOOOOOO..........',
  '.........OHHHHHhhhHHO.........',
  '........OHHHhhhhhhhHHO........',
  '........OHHhhhhhhhhhHO........',
  '.......OHHhhhhhhhhhhhOO.......',
  '.......OHHhhhhhhhhhhhHO.......',
  '.......OHHSSSSSSSSSSdHO.......',
  '.......OHSSSSSSSSSSSSdO.......',
  '.......OHSSSSSSSSSSSSdO.......',
  '.......OsSSEeSSSSEeSSdO.......',
  '.......OsSSSSSSSSSSSsdO.......',
  '.......OsSSSSSssSSSSSdO.......',
  '........OsSSSSSSSSSSdO........',
  '........OOsSSSSSSSSdOO........',
  '.........OOOsSSSsdOOO.........',
  '..........OOOOSSOOOO..........',
  // Row 17: neck + shoulders
  '...........OOSSOO.............',
  '........OOOOBBBBOOOO..........',
  '.......OaaBBABBABBaaO.........',
  '......OaaABABAABABaaSO........',
  '......OaAABABAABABAaSO........',
  '......OaAABBAAAABBAaSO........',
  '.......OAABBAAAABBASO.........',
  '.......OAAAMMMMMAASO..........',
  '........OAAaaaaAAO............',
  '........OAaOOOOaAO............',
  '........OaOO..OOaO............',
  '.......OaAO....OAaO...........',
  '.......OAAO....OAAO...........',
  '.......OaAO....OAaO...........',
  '.......OTTO....OTTO...........',
  '......OOTTO....OTTOO..........',
  '......OTTTO....OTTT0..........',
  '.....OOTOO......OOTOO.........',
  '.....OOOO........OOOO.........',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

const SQUIRE_NORTH: string[] = [
  '................................',
  '..........OOOOOOOOOO..........',
  '.........OHHHHHHHHhHO.........',
  '........OHHHHHHHHHhhHO........',
  '........OHHHHHHHHHhHHO........',
  '.......OHHHHHHHHHHHhHOO.......',
  '.......OHHHHHHHHHHHhHHO.......',
  '.......OHHHHHHHHHHHHdHO.......',
  '.......OHHHHHHHHHHHHHdO.......',
  '.......OHHHHHHHHHHHHHdO.......',
  '.......OHHHHHHHHHHHHHdO.......',
  '.......OdHHHHHHHHHHHddO.......',
  '.......OdHHHHHHHHHHHddO.......',
  '........OdHHHHHHHHHdO.........',
  '........OOdHHHHHHHdOO.........',
  '.........OOOdHHHdOOO..........',
  '..........OOOOSSOOOO..........',
  '...........OOSSOO.............',
  '........OOOOAAAAOOOO..........',
  '.......OaaAAABBAAAAaO.........',
  '......OaaAAABAABAAaaSO........',
  '......OaAAAABAABAAAASO........',
  '......OaAAAAAAAAAAAASO........',
  '.......OAAAAAAAAAAAOO.........',
  '.......OAAAMMMMMAASO..........',
  '........OAAaaaaAAO............',
  '........OAaOOOOaAO............',
  '........OaOO..OOaO............',
  '.......OaAO....OAaO...........',
  '.......OAAO....OAAO...........',
  '.......OaAO....OAaO...........',
  '.......OTTO....OTTO...........',
  '......OOTTO....OTTOO..........',
  '......OTTTO....OTTT0..........',
  '.....OOTOO......OOTOO.........',
  '.....OOOO........OOOO.........',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

const SQUIRE_EAST: string[] = [
  '................................',
  '..........OOOOOOOO............',
  '.........OHHHhhhHOO...........',
  '........OHHhhhhhHHOO..........',
  '........OHhhhhhhhHHO..........',
  '.......OHHhhhhhhhSSO..........',
  '.......OHHhhhhhSSSSO..........',
  '.......OHHhhhSSSSSSO..........',
  '.......OHdSSEeSSSSO...........',
  '.......OHdSSSSSSSSO...........',
  '.......OHdSSSSsSSO............',
  '.......OHdSSSSSSO.............',
  '.......OOdSSSSSOO.............',
  '........OOdSSSSOO.............',
  '........OOOsSSSO..............',
  '.........OOOSSOO..............',
  '...........OSSO...............',
  '..........OOSOO...............',
  '.........OOBBaOO..............',
  '........OBABBaaOO.............',
  '........OABBAAaSSO............',
  '.......OAABAAaaSSOO...........',
  '.......OAABAAAASSOw...........',
  '........OAAAAAASOOw...........',
  '........OAAMMMSOw.............',
  '.........OAaaSOww.............',
  '.........OaOOOOO..............',
  '.........OaOO.................',
  '........OaAO..................',
  '........OAAO..................',
  '........OaAO..................',
  '........OTTO..................',
  '.......OOTTO..................',
  '.......OTTTO..................',
  '......OOTOO...................',
  '......OOOO....................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

const SQUIRE_WEST: string[] = SQUIRE_EAST.map(row => {
  // Mirror horizontally: reverse the non-padding content
  const chars = row.split('');
  chars.reverse();
  return chars.join('');
});

// ─── Job-specific full sprites ───
// Knights have bulkier armor, mages have robes, archers have capes

const KNIGHT_SOUTH: string[] = [
  '................................',
  '..........OOOOOOOOOO..........',
  '.........OHHHHHhhhHHO.........',
  '........OHHHhhhhhhhHHO........',
  '........OHHhhhhhhhhhHO........',
  '.......OHHhhhhhhhhhhhOO.......',
  '.......OHHhhhhhhhhhhhHO.......',
  '.......OHHSSSSSSSSSSdHO.......',
  '.......OHSSSSSSSSSSSSdO.......',
  '.......OHSSSSSSSSSSSSdO.......',
  '.......OsSSEeSSSSEeSSdO.......',
  '.......OsSSSSSSSSSSSsdO.......',
  '.......OsSSSSSssSSSSSdO.......',
  '........OsSSSSSSSSSSdO........',
  '........OOsSSSSSSSSdOO........',
  '.........OOOsSSSsdOOO.........',
  '..........OOOOSSOOOO..........',
  '...........OOSSOO.............',
  '.......OOOOMmMmMOOOO..........',
  '......OMmMMAMAAMAMmMO.........',
  '.....OMMmAAMAAMAAmMMSO........',
  '.....OmMAAAMAMMAAAAASO........',
  '.....OmMAAMMAAAAMMAASO........',
  '......OMAAMMAAMMAAASO.........',
  '......OMAAMMMMMMAAMO..........',
  '.......OMMaaaaaMMMO...........',
  '.......OMAOOOOOaMO............',
  '.......OMOO...OOMO............',
  '......OMAO.....OAMO...........',
  '......OMAO.....OAMO...........',
  '......OMAO.....OAMO...........',
  '......OMTO.....OTMO...........',
  '.....OOMTO.....OTMOO..........',
  '.....OMTTO.....OTTMO..........',
  '....OOMOO.......OOMOO.........',
  '....OOOO.........OOOO.........',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

const WHITE_MAGE_SOUTH: string[] = [
  '................................',
  '..........OOOOOOOOOO..........',
  '.........OHHHHHhhhHHO.........',
  '........OHHHhhhhhhhHHO........',
  '........OHHhhhhhhhhhHO........',
  '.......OHHhhhhhhhhhhhOO.......',
  '.......OHHhhhhhhhhhhhHO.......',
  '.......OHHSSSSSSSSSSdHO.......',
  '.......OHSSSSSSSSSSSSdO.......',
  '.......OHSSSSSSSSSSSSdO.......',
  '.......OsSSEeSSSSEeSSdO.......',
  '.......OsSSSSSSSSSSSsdO.......',
  '.......OsSSSSSssSSSSSdO.......',
  '........OsSSSSSSSSSSdO........',
  '........OOsSSSSSSSSdOO........',
  '.........OOOsSSSsdOOO.........',
  '..........OOOOSSOOOO..........',
  '...........OOSSOO.............',
  '........OOOOCCCCOOOO..........',
  '.......OcCCCCBBCCCCcO.........',
  '......OccCCCBCCBCCCcSO........',
  '......OcCCCBCCCBCCCcSO........',
  '......OcCCCCCCCCCCCcSO........',
  '.......OCCCCCCCCCCCcO.........',
  '.......OCCCCMMMCCCO...........',
  '........OCCCcccCCO............',
  '........OCcCCCCcCO............',
  '.......OcCCCCCCCCcO...........',
  '.......OcCCCCCCCCcO...........',
  '......OcCCCC..CCCCcO..........',
  '......OcCCC....CCCcO..........',
  '......OCCC......CCCO..........',
  '.....OOCCO......OCCOO.........',
  '.....OCCO........OCCO.........',
  '....OOTOO........OOTOO........',
  '....OOOO..........OOOO........',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

const BLACK_MAGE_SOUTH: string[] = [
  '..............OO................',
  '.............OHHO...............',
  '............OHHHO...............',
  '...........OHHHHO...............',
  '..........OHHHHHO...............',
  '.........OHHHHHHO...............',
  '.......OOHHHHHHHOOO.............',
  '.......OHHHHHHHhhhOO............',
  '.......OHHHHHHHhhhhO............',
  '.......OHHHHHHHHhhhO............',
  '.......OddOOOOOOOOhO............',
  '.......OdOEeOOOEeOdO............',
  '.......OdOOOOOOOOOdO............',
  '........OdOOOOOOOdO.............',
  '........OOdOOOOOdOO.............',
  '.........OOOOOOdOOO.............',
  '..........OOOOSSOOOO............',
  '...........OOSSOO...............',
  '........OOOOCCCCOOOO............',
  '.......OcCCCCCCCCCcO............',
  '......OccCCCCCCCCCcSO...........',
  '......OcCCCCCCCCCCcSO...........',
  '......OcCCCCCCCCCCcSO...........',
  '.......OCCCCCCCCCCcO............',
  '.......OCCCCMMMCCCO.............',
  '........OCCCcccCCO..............',
  '........OCcCCCCcCO..............',
  '.......OcCCCCCCCCcO.............',
  '.......OcCCCCCCCCcO.............',
  '......OcCCCC..CCCCcO............',
  '......OcCCC....CCCcO............',
  '......OCCC......CCCO............',
  '.....OOCCO......OCCOO...........',
  '.....OCCO........OCCO...........',
  '....OOTOO........OOTOO..........',
  '....OOOO..........OOOO..........',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

const ARCHER_SOUTH: string[] = [
  '................................',
  '..........OOOOOOOOOO..........',
  '.........OHHHHHhhhHHO.........',
  '........OHHHhhhhhhhHHO........',
  '........OHHhhhhhhhhhHO........',
  '.......OHHhhhhhhhhhhhOO.......',
  '.......OHHhhhhhhhhhhhHO.......',
  '.......OHHSSSSSSSSSSdHO.......',
  '.......OHSSSSSSSSSSSSdO.......',
  '.......OHSSSSSSSSSSSSdO.......',
  '.......OsSSEeSSSSEeSSdO.......',
  '.......OsSSSSSSSSSSSsdO.......',
  '.......OsSSSSSssSSSSSdO.......',
  '........OsSSSSSSSSSSdO........',
  '........OOsSSSSSSSSdOO........',
  '.........OOOsSSSsdOOO.........',
  '..........OOOOSSOOOO..........',
  '...........OOSSOO.............',
  '........OOOOABABOOOO....O.....',
  '.......OaaBBABBAABaaO...O.....',
  '......OaaABABAABAAaaSO..O.....',
  '......OaAABABAABAAAASO..O.....',
  '......OaAABBAAAABAAASO.O......',
  '.......OAABBAAAABBAOO.O.......',
  '.......OAAAMMMMMAASO.O........',
  '........OAAaaaaAAO..O.........',
  '........OAaOOOOaAO............',
  '........OaOO..OOaO............',
  '.......OaAO....OAaO...........',
  '.......OAAO....OAAO...........',
  '.......OaAO....OAaO...........',
  '.......OTTO....OTTO...........',
  '......OOTTO....OTTOO..........',
  '......OTTTO....OTTT0..........',
  '.....OOTOO......OOTOO.........',
  '.....OOOO........OOOO.........',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

// For north/east/west we use the base and flip
const makeNorth = (south: string[]): string[] => {
  // Replace face with back-of-head (hair all over)
  return south.map((row, i) => {
    if (i >= 7 && i <= 15) {
      // Replace skin/eyes with hair
      return row.replace(/S/g, 'H').replace(/s/g, 'd').replace(/E/g, 'H').replace(/e/g, 'h');
    }
    return row;
  });
};

const makeEast = (south: string[]): string[] => {
  // Shift head slightly right, compress body — simplified side view
  return south.map((row, i) => {
    // Trim 4 cols from left side of body area to make it narrower
    if (i >= 18 && i <= 35) {
      const chars = row.split('');
      // Remove some left-side pixels to narrow the profile
      let removed = 0;
      for (let j = 0; j < chars.length && removed < 3; j++) {
        if (chars[j] !== '.') {
          chars[j] = '.';
          removed++;
        }
      }
      return chars.join('');
    }
    return row;
  });
};

const makeWest = (east: string[]): string[] => {
  return east.map(row => row.split('').reverse().join(''));
};

// ─── Palette definitions per job ───

const JOB_PALETTES: Record<string, CharacterPalette> = {
  Squire: {
    O: 0x101010, S: 0xe8c8a0, s: 0xc0a078, // skin
    H: 0xc89828, h: 0xe8c050, d: 0x987018,  // blonde hair
    A: 0x4870a8, a: 0x304878, B: 0x6090c8, b: 0x385888, // blue outfit
    M: 0x989898, m: 0xc8c8c8, // belt
    W: 0x808898, w: 0xb0b8c8, G: 0x604020, // sword
    E: 0x182038, e: 0xe8e8f0, // eyes
    C: 0x4870a8, c: 0x304060, // cape
    T: 0x705830, t: 0x504020, // boots
  },
  Knight: {
    O: 0x101010, S: 0xe8c8a0, s: 0xc0a078,
    H: 0x584030, h: 0x786050, d: 0x382818,
    A: 0x6878a8, a: 0x485870, B: 0x8898b8, b: 0x586880,
    M: 0xa8a8b8, m: 0xd0d0e0,
    W: 0x889098, w: 0xb8c0c8, G: 0x604020,
    E: 0x182038, e: 0xe8e8f0,
    C: 0x6878a8, c: 0x485060,
    T: 0x585060, t: 0x383840,
  },
  'White Mage': {
    O: 0x101010, S: 0xe8c8a0, s: 0xc0a078,
    H: 0xe0d0a8, h: 0xf0e8d0, d: 0xc0b088,
    A: 0xd0c8b8, a: 0xa8a090, B: 0xe0d8c8, b: 0xb8b0a0,
    M: 0xc0a048, m: 0xe0c068,
    W: 0x786040, w: 0xa88860, G: 0x604020,
    E: 0x182038, e: 0xe8e8f0,
    C: 0xd8d0c0, c: 0xa8a090,
    T: 0xa89878, t: 0x887860,
  },
  'Black Mage': {
    O: 0x101010, S: 0xe8c8a0, s: 0xc0a078,
    H: 0x282028, h: 0x383038, d: 0x181018,
    A: 0x302848, a: 0x201838, B: 0x483860, b: 0x282040,
    M: 0x786020, m: 0xa08030,
    W: 0x584828, w: 0x887048, G: 0x403018,
    E: 0xd8d020, e: 0xf8f080,
    C: 0x302050, c: 0x201838,
    T: 0x382830, t: 0x201820,
  },
  Archer: {
    O: 0x101010, S: 0xe8c8a0, s: 0xc0a078,
    H: 0x985828, h: 0xb87840, d: 0x704018,
    A: 0x487838, a: 0x305028, B: 0x609848, b: 0x406830,
    M: 0x908068, m: 0xb0a088,
    W: 0x786020, w: 0xa88840, G: 0x503818,
    E: 0x182038, e: 0xe8e8f0,
    C: 0x608040, c: 0x405828,
    T: 0x685030, t: 0x483820,
  },
};

// Build all sprite sets per job
interface JobSpriteSet {
  south: string[];
  north: string[];
  east: string[];
  west: string[];
}

function buildJobSprites(south: string[]): JobSpriteSet {
  const east = makeEast(south);
  return {
    south,
    north: makeNorth(south),
    east,
    west: makeWest(east),
  };
}

const JOB_SPRITES: Record<string, JobSpriteSet> = {
  Squire: buildJobSprites(SQUIRE_SOUTH),
  Knight: buildJobSprites(KNIGHT_SOUTH),
  'White Mage': buildJobSprites(WHITE_MAGE_SOUTH),
  'Black Mage': buildJobSprites(BLACK_MAGE_SOUTH),
  Archer: buildJobSprites(ARCHER_SOUTH),
};

const charTextureCache = new Map<string, PIXI.Texture>();

/**
 * Render a chunky 8-bit character sprite at native resolution (32×48).
 */
export function generateCharacterSprite(
  jobName: string,
  team: 'player' | 'enemy' | 'ally' | 'neutral',
  facing: 'south' | 'north' | 'east' | 'west',
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = GRID_W;
  canvas.height = GRID_H;
  const ctx = canvas.getContext('2d')!;

  const palette = getTeamPalette(jobName, team);
  const spriteSet = JOB_SPRITES[jobName] || JOB_SPRITES.Squire;
  const grid = spriteSet[facing];

  // Draw each pixel
  for (let gy = 0; gy < GRID_H; gy++) {
    const row = grid[gy] || '';
    for (let gx = 0; gx < GRID_W; gx++) {
      const ch = row[gx];
      if (!ch || ch === '.') continue;

      const color = palette[ch as keyof CharacterPalette];
      if (color === undefined) continue;

      const [r, g, b] = colorToRGB(color);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(gx, gy, 1, 1);
    }
  }

  // Ground shadow ellipse
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(GRID_W / 2, GRID_H - 8, 10, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1.0;

  return canvas;
}

function getTeamPalette(jobName: string, team: string): CharacterPalette {
  const base = JOB_PALETTES[jobName] || JOB_PALETTES.Squire;
  if (team === 'player') return base;

  if (team === 'enemy') {
    return {
      ...base,
      A: tintColor(base.A, 0xc03030, 0.45),
      a: tintColor(base.a, 0x901818, 0.45),
      B: tintColor(base.B, 0xe04040, 0.4),
      b: tintColor(base.b, 0x802020, 0.4),
      C: tintColor(base.C, 0xc03030, 0.45),
      c: tintColor(base.c, 0x801818, 0.4),
    };
  }
  if (team === 'ally') {
    return {
      ...base,
      A: tintColor(base.A, 0x30c030, 0.35),
      a: tintColor(base.a, 0x189018, 0.35),
      B: tintColor(base.B, 0x40e040, 0.3),
      b: tintColor(base.b, 0x208020, 0.3),
      C: tintColor(base.C, 0x30c030, 0.35),
      c: tintColor(base.c, 0x188018, 0.3),
    };
  }
  return base;
}

function tintColor(base: number, tint: number, amount: number): number {
  const [br, bg, bb] = colorToRGB(base);
  const [tr, tg, tb] = colorToRGB(tint);
  const r = Math.round(br + (tr - br) * amount);
  const g = Math.round(bg + (tg - bg) * amount);
  const b = Math.round(bb + (tb - bb) * amount);
  return (r << 16) | (g << 8) | b;
}

/**
 * Get a cached PIXI texture for a character sprite.
 */
export function getCharacterTexture(
  jobName: string,
  team: 'player' | 'enemy' | 'ally' | 'neutral',
  facing: 'south' | 'north' | 'east' | 'west'
): PIXI.Texture {
  const key = `${jobName}_${team}_${facing}`;
  if (charTextureCache.has(key)) return charTextureCache.get(key)!;

  const canvas = generateCharacterSprite(jobName, team, facing);
  const texture = PIXI.Texture.from(canvas);
  charTextureCache.set(key, texture);
  return texture;
}
