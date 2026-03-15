import type { BattleMapData, TileData } from './map-types';

/**
 * Inspired by the Magic City Gariland battle from Chapter 1.
 * Town square: flat cobblestone streets, buildings of various heights, rooftops.
 */
export function createMagicCityGariland(): BattleMapData {
  const W = 14;
  const H = 10;
  const tiles: TileData[][] = [];

  for (let x = 0; x < W; x++) {
    tiles[x] = [];
    for (let y = 0; y < H; y++) {
      tiles[x][y] = {
        height: 0,
        terrain: 'stone',
        walkable: true,
        surface: 'artificial',
        depth: 0,
      };
    }
  }

  const set = (x: number, y: number, h: number, t: TileData['terrain'] = 'stone', w = true) => {
    if (x >= 0 && x < W && y >= 0 && y < H) {
      tiles[x][y] = { height: h, terrain: t, walkable: w, surface: t === 'water' ? 'water' : t === 'grass' ? 'natural' : 'artificial', depth: 0 };
    }
  };

  // Building 1 (top-left) - 2 story building
  for (let x = 0; x <= 2; x++) {
    for (let y = 0; y <= 2; y++) {
      set(x, y, 4, 'roof', false);
    }
  }
  // Accessible rooftop edge
  set(2, 2, 4, 'stone', true);

  // Building 2 (top-right) - taller building
  for (let x = 10; x <= 13; x++) {
    for (let y = 0; y <= 1; y++) {
      set(x, y, 6, 'roof', false);
    }
  }

  // Building 3 (bottom) - low wall / marketplace stalls
  for (let x = 5; x <= 8; x++) {
    set(x, 8, 2, 'wood', true); // walkable stall roofs
    set(x, 9, 2, 'wood', false);
  }

  // Building 4 (side) - medium building
  for (let x = 0; x <= 1; x++) {
    for (let y = 6; y <= 9; y++) {
      set(x, y, 5, 'roof', false);
    }
  }

  // Street level stairs to building 1 roof
  set(3, 0, 2, 'stone');
  set(3, 1, 1, 'stone');

  // Crates and barrels (small height obstacles)
  set(6, 3, 1, 'wood');
  set(7, 3, 1, 'wood');
  set(6, 4, 1, 'wood');

  // Fountain in town center
  set(7, 5, 1, 'stone');
  set(7, 6, 0, 'water', false);

  // Raised walkway on the right side
  for (let y = 3; y <= 7; y++) {
    set(12, y, 1, 'stone');
    set(13, y, 1, 'stone');
  }

  // Stone steps down
  set(11, 5, 1, 'stone');

  return {
    id: 'magic-city-gariland',
    name: 'Magic City Gariland',
    width: W,
    height: H,
    tiles,
    playerStartPositions: [
      { x: 1, y: 4 },
      { x: 2, y: 4 },
      { x: 1, y: 5 },
      { x: 2, y: 5 },
    ],
    enemyStartPositions: [
      { x: 11, y: 7 },
      { x: 12, y: 8 },
      { x: 13, y: 8 },
      { x: 10, y: 7 },
    ],
  };
}
