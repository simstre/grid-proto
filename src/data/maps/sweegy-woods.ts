import type { BattleMapData, TileData } from './map-types';

/**
 * A dense forest map with clearings, tall trees, and a stream cutting through.
 * 10x10 — ambush scenario with varied height from tree-covered terrain.
 */
export function createSweegyWoods(): BattleMapData {
  const W = 10;
  const H = 10;
  const tiles: TileData[][] = [];

  for (let x = 0; x < W; x++) {
    tiles[x] = [];
    for (let y = 0; y < H; y++) {
      tiles[x][y] = {
        height: 1,
        terrain: 'grass',
        walkable: true,
        surface: 'natural',
        depth: 0,
      };
    }
  }

  const set = (x: number, y: number, h: number, t: TileData['terrain'] = 'grass', w = true) => {
    if (x >= 0 && x < W && y >= 0 && y < H) {
      tiles[x][y] = {
        height: h,
        terrain: t,
        walkable: w,
        surface: t === 'water' ? 'water' : 'natural',
        depth: 0,
      };
    }
  };

  // Dense tree clusters (tall, unwalkable) — northwest
  set(0, 0, 4, 'grass', false);
  set(1, 0, 4, 'grass', false);
  set(0, 1, 3, 'grass', false);
  set(0, 2, 3, 'grass', false);

  // Tree cluster — northeast
  set(8, 0, 4, 'grass', false);
  set(9, 0, 4, 'grass', false);
  set(9, 1, 3, 'grass', false);

  // Tree cluster — southeast
  set(8, 8, 3, 'grass', false);
  set(9, 8, 4, 'grass', false);
  set(9, 9, 4, 'grass', false);
  set(8, 9, 3, 'grass', false);

  // Scattered trees — mid-map cover
  set(3, 2, 3, 'grass', false);
  set(6, 3, 3, 'grass', false);
  set(2, 6, 3, 'grass', false);
  set(7, 7, 3, 'grass', false);

  // Elevated underbrush / hillocks
  set(1, 3, 2, 'grass');
  set(2, 3, 2, 'grass');
  set(4, 1, 2, 'grass');
  set(5, 1, 2, 'grass');
  set(7, 4, 2, 'grass');
  set(8, 4, 2, 'grass');
  set(5, 7, 2, 'grass');
  set(6, 7, 2, 'grass');

  // Central clearing (flat ground level 0)
  for (let x = 4; x <= 6; x++) {
    for (let y = 4; y <= 6; y++) {
      set(x, y, 0, 'dirt');
    }
  }

  // Stream running diagonally (SW to NE)
  set(0, 8, 0, 'water', false);
  set(1, 7, 0, 'water', false);
  set(1, 8, 0, 'water', false);
  set(2, 7, 0, 'water');  // shallow crossing
  set(3, 6, 0, 'water', false);
  set(3, 7, 0, 'water', false);

  // Stream continues
  set(7, 2, 0, 'water', false);
  set(8, 1, 0, 'water', false);
  set(8, 2, 0, 'water');  // shallow crossing

  // Dirt paths
  set(1, 4, 0, 'dirt');
  set(1, 5, 0, 'dirt');
  set(2, 5, 0, 'dirt');
  set(3, 5, 0, 'dirt');
  set(7, 5, 0, 'dirt');
  set(8, 5, 0, 'dirt');
  set(8, 6, 0, 'dirt');

  // Southern edge low ground
  set(4, 9, 0, 'grass');
  set(5, 9, 0, 'grass');
  set(6, 9, 0, 'grass');
  set(7, 9, 0, 'grass');

  // Northern edge varied height
  set(3, 0, 2, 'grass');
  set(4, 0, 2, 'grass');
  set(5, 0, 1, 'grass');
  set(6, 0, 1, 'grass');

  return {
    id: 'sweegy-woods',
    name: 'Sweegy Woods',
    width: W,
    height: H,
    tiles,
    playerStartPositions: [
      { x: 1, y: 4 },
      { x: 1, y: 5 },
      { x: 2, y: 4 },
      { x: 2, y: 5 },
    ],
    enemyStartPositions: [
      { x: 7, y: 5 },
      { x: 8, y: 5 },
      { x: 8, y: 6 },
      { x: 7, y: 4 },
      { x: 9, y: 5 },
    ],
  };
}
