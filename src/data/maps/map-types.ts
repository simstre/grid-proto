import type { TerrainType, SurfaceType } from '@/core/constants';

export interface TileData {
  height: number;
  terrain: TerrainType;
  walkable: boolean;
  surface: SurfaceType;
  depth: number; // for water tiles
}

export interface BattleMapData {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: TileData[][];
  playerStartPositions: { x: number; y: number }[];
  enemyStartPositions: { x: number; y: number }[];
}

export function createEmptyMap(width: number, height: number): TileData[][] {
  const tiles: TileData[][] = [];
  for (let x = 0; x < width; x++) {
    tiles[x] = [];
    for (let y = 0; y < height; y++) {
      tiles[x][y] = {
        height: 0,
        terrain: 'grass',
        walkable: true,
        surface: 'natural',
        depth: 0,
      };
    }
  }
  return tiles;
}
