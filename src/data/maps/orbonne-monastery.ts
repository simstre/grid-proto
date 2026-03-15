import type { BattleMapData, TileData } from './map-types';

/**
 * A map inspired by FFT's first story battle at Orbonne Monastery.
 * Features: elevated stone platform, stairs, grassy surroundings, varied height.
 */
export function createOrbonneMonastery(): BattleMapData {
  const W = 12;
  const H = 12;
  const tiles: TileData[][] = [];

  for (let x = 0; x < W; x++) {
    tiles[x] = [];
    for (let y = 0; y < H; y++) {
      tiles[x][y] = {
        height: 0,
        terrain: 'grass',
        walkable: true,
        surface: 'natural',
        depth: 0,
      };
    }
  }

  const set = (x: number, y: number, h: number, t: TileData['terrain'] = 'stone', w = true) => {
    if (x >= 0 && x < W && y >= 0 && y < H) {
      tiles[x][y] = { height: h, terrain: t, walkable: w, surface: t === 'water' ? 'water' : t === 'grass' ? 'natural' : 'artificial', depth: 0 };
    }
  };

  // Central raised stone platform (monastery courtyard)
  for (let x = 4; x <= 8; x++) {
    for (let y = 4; y <= 8; y++) {
      set(x, y, 3, 'stone');
    }
  }

  // Inner higher platform (altar area)
  for (let x = 5; x <= 7; x++) {
    for (let y = 5; y <= 7; y++) {
      set(x, y, 5, 'stone');
    }
  }
  // Highest point
  set(6, 6, 7, 'stone');

  // Stairs on south side (y=8, going from ground to platform)
  set(6, 9, 1, 'stone');
  set(6, 10, 0, 'stone');

  // Stairs on west side
  set(3, 6, 1, 'stone');
  set(2, 6, 0, 'stone');

  // Steps on north side
  set(6, 3, 1, 'stone');
  set(6, 2, 0, 'stone');

  // Steps on east side
  set(9, 6, 1, 'stone');
  set(10, 6, 0, 'stone');

  // Some terrain variety
  set(0, 0, 1, 'dirt');
  set(1, 0, 1, 'dirt');
  set(0, 1, 1, 'dirt');
  set(11, 11, 0, 'sand');
  set(10, 11, 0, 'sand');
  set(11, 10, 0, 'sand');

  // Water feature
  set(1, 9, 0, 'water');
  set(1, 10, 0, 'water');
  set(2, 10, 0, 'water');
  tiles[1][9].walkable = false;
  tiles[1][10].walkable = false;
  tiles[2][10].walkable = false;

  // Some raised grass areas
  set(0, 5, 1, 'grass');
  set(0, 6, 1, 'grass');
  set(0, 7, 2, 'grass');
  set(11, 3, 1, 'grass');
  set(11, 4, 2, 'grass');
  set(11, 5, 1, 'grass');

  return {
    id: 'orbonne-monastery',
    name: 'Orbonne Monastery',
    width: W,
    height: H,
    tiles,
    playerStartPositions: [
      { x: 1, y: 2 },
      { x: 2, y: 1 },
      { x: 1, y: 3 },
      { x: 3, y: 1 },
    ],
    enemyStartPositions: [
      { x: 10, y: 9 },
      { x: 9, y: 10 },
      { x: 10, y: 10 },
      { x: 9, y: 9 },
    ],
  };
}
