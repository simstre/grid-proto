// Isometric tile dimensions (2:1 ratio, classic FFT style)
export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;
export const TILE_WIDTH_HALF = TILE_WIDTH / 2;
export const TILE_HEIGHT_HALF = TILE_HEIGHT / 2;

// Height step: pixels per height unit (each height unit ≈ half character height)
export const HEIGHT_STEP = 12;

// Tile side face height (visible side when tile has height > 0)
export const TILE_DEPTH_PX = HEIGHT_STEP;

// Max map dimensions
export const MAX_MAP_SIZE = 64;
export const MAX_HEIGHT = 15;

// Camera defaults
export const DEFAULT_ZOOM = 2;
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 4;
export const CAMERA_PAN_SPEED = 8;

// CT system
export const CT_THRESHOLD = 100;
export const CT_COST_MOVE_AND_ACT = 100;
export const CT_COST_MOVE_OR_ACT = 80;
export const CT_COST_WAIT = 60;

// Unit sprite dimensions (chibi proportions)
export const UNIT_SPRITE_WIDTH = 24;
export const UNIT_SPRITE_HEIGHT = 36;

// Colors - FFT earth-tone palette
export const PALETTE = {
  // Tile surfaces
  grassLight: 0x7a9b57,
  grassDark: 0x5c7a3e,
  grassSide: 0x4a6332,
  stone: 0x8c8478,
  stoneDark: 0x6e6860,
  stoneSide: 0x5a5550,
  water: 0x4a7ab5,
  waterDeep: 0x3a5a8a,
  sand: 0xc4a96a,
  sandSide: 0x9a8450,
  dirt: 0x8b7355,
  dirtSide: 0x6b5540,
  lava: 0xd44a00,

  // UI
  cursorHighlight: 0xffff88,
  moveRange: 0x4488ff,
  attackRange: 0xff4444,
  abilityRange: 0x44ff44,

  // Unit team colors
  playerUnit: 0x4488cc,
  enemyUnit: 0xcc4444,
  allyUnit: 0x44cc44,
  neutralUnit: 0xcccc44,

  // UI backgrounds
  menuBg: 0x1a1a2e,
  menuBorder: 0x8888aa,
  textColor: 0xffffff,
  textShadow: 0x222244,
} as const;

// Directions
export enum Direction {
  North = 0,
  East = 1,
  South = 2,
  West = 3,
}

// Camera rotation states
export enum CameraRotation {
  R0 = 0,
  R90 = 1,
  R180 = 2,
  R270 = 3,
}

export type TerrainType = 'grass' | 'stone' | 'water' | 'sand' | 'dirt' | 'lava' | 'wood' | 'roof';
export type SurfaceType = 'natural' | 'artificial' | 'water' | 'lava';
