import type { BattleMapData } from '@/data/maps/map-types';

interface PathNode {
  x: number;
  y: number;
  cost: number;
  parent: PathNode | null;
}

const CARDINAL_DIRS = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
];

/**
 * Calculate all tiles reachable by a unit using BFS.
 * Respects Move stat, Jump stat, terrain walkability, and occupied tiles.
 * Returns a Set of "x,y" strings for reachable tiles.
 */
export function calculateMoveRange(
  startX: number,
  startY: number,
  movePoints: number,
  jumpStat: number,
  map: BattleMapData,
  occupiedTiles: Set<string>,
  canFly: boolean = false,
  canTeleport: boolean = false
): Set<string> {
  if (canTeleport) {
    return calculateTeleportRange(startX, startY, movePoints, map, occupiedTiles);
  }

  const reachable = new Set<string>();
  const visited = new Map<string, number>(); // tile key -> best remaining move
  const queue: Array<{ x: number; y: number; remaining: number }> = [
    { x: startX, y: startY, remaining: movePoints },
  ];

  visited.set(`${startX},${startY}`, movePoints);

  while (queue.length > 0) {
    const { x, y, remaining } = queue.shift()!;

    for (const [dx, dy] of CARDINAL_DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;

      // Bounds check
      if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) continue;

      const tile = map.tiles[nx][ny];

      // Walkability check
      if (!tile.walkable) continue;

      // Height check (unless flying)
      const currentHeight = map.tiles[x][y].height;
      const targetHeight = tile.height;
      const heightDiff = Math.abs(targetHeight - currentHeight);

      if (!canFly && heightDiff > jumpStat) continue;

      // Movement cost (1 per tile, could vary by terrain later)
      const cost = 1;
      const newRemaining = remaining - cost;
      if (newRemaining < 0) continue;

      // Skip if we already found a better path here
      if (visited.has(key) && visited.get(key)! >= newRemaining) continue;
      visited.set(key, newRemaining);

      // Can move here if not occupied (but can pass through allies)
      if (!occupiedTiles.has(key)) {
        reachable.add(key);
      }

      // Continue BFS from this tile
      queue.push({ x: nx, y: ny, remaining: newRemaining });
    }
  }

  return reachable;
}

/**
 * Teleport range: any tile within Manhattan distance, ignoring terrain.
 */
function calculateTeleportRange(
  startX: number,
  startY: number,
  movePoints: number,
  map: BattleMapData,
  occupiedTiles: Set<string>
): Set<string> {
  const reachable = new Set<string>();
  for (let x = 0; x < map.width; x++) {
    for (let y = 0; y < map.height; y++) {
      const dist = Math.abs(x - startX) + Math.abs(y - startY);
      if (dist === 0 || dist > movePoints) continue;
      const key = `${x},${y}`;
      if (!map.tiles[x][y].walkable) continue;
      if (occupiedTiles.has(key)) continue;
      reachable.add(key);
    }
  }
  return reachable;
}

/**
 * A* pathfinding on the isometric height grid.
 * Returns an array of {x, y} positions from start to end (excluding start).
 */
export function findPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  jumpStat: number,
  map: BattleMapData,
  occupiedTiles: Set<string>
): Array<{ x: number; y: number }> | null {
  const openSet: PathNode[] = [{ x: startX, y: startY, cost: 0, parent: null }];
  const closedSet = new Set<string>();

  const heuristic = (x: number, y: number) => Math.abs(x - endX) + Math.abs(y - endY);

  while (openSet.length > 0) {
    // Find lowest f-cost node
    openSet.sort((a, b) => (a.cost + heuristic(a.x, a.y)) - (b.cost + heuristic(b.x, b.y)));
    const current = openSet.shift()!;
    const key = `${current.x},${current.y}`;

    if (current.x === endX && current.y === endY) {
      // Reconstruct path
      const path: Array<{ x: number; y: number }> = [];
      let node: PathNode | null = current;
      while (node && !(node.x === startX && node.y === startY)) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }

    if (closedSet.has(key)) continue;
    closedSet.add(key);

    for (const [dx, dy] of CARDINAL_DIRS) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const nkey = `${nx},${ny}`;

      if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) continue;
      if (closedSet.has(nkey)) continue;

      const tile = map.tiles[nx][ny];
      if (!tile.walkable) continue;

      const heightDiff = Math.abs(tile.height - map.tiles[current.x][current.y].height);
      if (heightDiff > jumpStat) continue;

      // Can't end on occupied tile (but can pass through... in FFT you can't pass through enemies)
      if (occupiedTiles.has(nkey) && !(nx === endX && ny === endY)) continue;

      openSet.push({
        x: nx,
        y: ny,
        cost: current.cost + 1,
        parent: current,
      });
    }
  }

  return null; // No path found
}

/**
 * Calculate attack range tiles from a given position.
 * Simple diamond shape (Manhattan distance).
 */
export function calculateAttackRange(
  x: number,
  y: number,
  minRange: number,
  maxRange: number,
  map: BattleMapData,
  verticalTolerance: number = 99
): Set<string> {
  const tiles = new Set<string>();
  const baseHeight = map.tiles[x][y].height;

  for (let dx = -maxRange; dx <= maxRange; dx++) {
    for (let dy = -maxRange; dy <= maxRange; dy++) {
      const dist = Math.abs(dx) + Math.abs(dy);
      if (dist < minRange || dist > maxRange) continue;

      const tx = x + dx;
      const ty = y + dy;
      if (tx < 0 || tx >= map.width || ty < 0 || ty >= map.height) continue;

      const heightDiff = Math.abs(map.tiles[tx][ty].height - baseHeight);
      if (heightDiff > verticalTolerance) continue;

      tiles.add(`${tx},${ty}`);
    }
  }

  return tiles;
}
