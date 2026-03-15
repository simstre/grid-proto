import type { BattleMapData, TileData } from './map-types';

/**
 * Dorter Trade City — a dense urban battlefield with multi-story buildings,
 * rooftop access, and narrow alleys. Good verticality for archers.
 * 12x10 map.
 */
export function createDorterTradeCity(): BattleMapData {
  const W = 12;
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
      tiles[x][y] = {
        height: h,
        terrain: t,
        walkable: w,
        surface: t === 'water' ? 'water' : t === 'grass' ? 'natural' : 'artificial',
        depth: 0,
      };
    }
  };

  // ── Building 1: Two-story warehouse (top-left) ──
  set(0, 0, 6, 'roof', false);
  set(1, 0, 6, 'roof', false);
  set(2, 0, 6, 'roof', false);
  set(0, 1, 6, 'roof', false);
  set(1, 1, 6, 'roof', false);
  set(2, 1, 6, 'roof', true);   // accessible rooftop corner
  set(0, 2, 6, 'roof', false);

  // Stairs up to warehouse rooftop
  set(3, 0, 3, 'stone');
  set(3, 1, 2, 'stone');
  set(3, 2, 1, 'stone');

  // ── Building 2: Tall tower (top-right) ──
  set(9, 0, 8, 'roof', false);
  set(10, 0, 8, 'roof', false);
  set(9, 1, 8, 'roof', true);   // sniper perch
  set(10, 1, 8, 'roof', false);

  // Stairs to tower
  set(8, 0, 4, 'stone');
  set(8, 1, 2, 'stone');
  set(11, 0, 4, 'stone');
  set(11, 1, 2, 'stone');

  // ── Building 3: Market hall (center) ──
  for (let x = 4; x <= 7; x++) {
    set(x, 3, 4, 'wood', false);
    set(x, 4, 4, 'wood', false);
  }
  // Walkable rooftop edges
  set(4, 3, 4, 'wood', true);
  set(7, 3, 4, 'wood', true);
  set(4, 4, 4, 'wood', true);
  set(7, 4, 4, 'wood', true);

  // Steps up to market hall
  set(3, 3, 2, 'stone');
  set(3, 4, 2, 'stone');
  set(8, 3, 2, 'stone');
  set(8, 4, 2, 'stone');

  // ── Building 4: Inn (bottom-left) ──
  set(0, 7, 5, 'roof', false);
  set(1, 7, 5, 'roof', false);
  set(0, 8, 5, 'roof', false);
  set(1, 8, 5, 'roof', false);
  set(0, 9, 5, 'roof', false);
  set(1, 9, 5, 'roof', false);
  // Walkable rooftop
  set(1, 7, 5, 'stone', true);

  // Stairs
  set(2, 7, 3, 'stone');
  set(2, 8, 1, 'stone');

  // ── Building 5: Shop (bottom-right) ──
  set(9, 7, 4, 'wood', false);
  set(10, 7, 4, 'wood', false);
  set(11, 7, 4, 'wood', false);
  set(9, 8, 4, 'wood', false);
  set(10, 8, 4, 'wood', true);  // accessible roof
  set(11, 8, 4, 'wood', false);
  set(9, 9, 4, 'wood', false);
  set(10, 9, 4, 'wood', false);
  set(11, 9, 4, 'wood', false);

  // Steps up to shop roof
  set(8, 8, 2, 'stone');
  set(8, 9, 1, 'stone');

  // ── Crates and barrels in alleyways ──
  set(5, 6, 1, 'wood');
  set(6, 6, 1, 'wood');
  set(5, 7, 1, 'wood');

  // ── Central street (main thoroughfare, ground level) ──
  // Already ground level 0 by default

  // ── Elevated stone walkway along right side ──
  for (let y = 3; y <= 6; y++) {
    set(11, y, 1, 'stone');
  }

  // ── Small garden patch ──
  set(0, 4, 0, 'grass');
  set(0, 5, 0, 'grass');
  set(0, 6, 0, 'grass');

  return {
    id: 'dorter-trade-city',
    name: 'Dorter Trade City',
    width: W,
    height: H,
    tiles,
    playerStartPositions: [
      { x: 1, y: 4 },
      { x: 1, y: 5 },
      { x: 2, y: 5 },
      { x: 0, y: 5 },
      { x: 2, y: 4 },
    ],
    enemyStartPositions: [
      { x: 9, y: 1 },   // tower sniper
      { x: 10, y: 5 },
      { x: 10, y: 8 },  // shop roof
      { x: 8, y: 3 },
      { x: 7, y: 3 },   // market hall
    ],
  };
}
