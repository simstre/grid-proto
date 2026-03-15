import {
  TILE_WIDTH_HALF,
  TILE_HEIGHT_HALF,
  HEIGHT_STEP,
  CameraRotation,
} from '@/core/constants';

/**
 * Convert world grid coordinates to screen pixel coordinates.
 * Uses standard 2:1 isometric projection with height offset.
 */
export function worldToScreen(
  x: number,
  y: number,
  z: number,
  rotation: CameraRotation = CameraRotation.R0,
  mapWidth: number = 0,
  mapHeight: number = 0
): { px: number; py: number } {
  const [rx, ry] = rotateCoords(x, y, rotation, mapWidth, mapHeight);
  return {
    px: (rx - ry) * TILE_WIDTH_HALF,
    py: (rx + ry) * TILE_HEIGHT_HALF - z * HEIGHT_STEP,
  };
}

/**
 * Apply camera rotation to world coordinates.
 */
export function rotateCoords(
  x: number,
  y: number,
  rotation: CameraRotation,
  mapWidth: number,
  mapHeight: number
): [number, number] {
  const maxX = mapWidth - 1;
  const maxY = mapHeight - 1;
  switch (rotation) {
    case CameraRotation.R0:
      return [x, y];
    case CameraRotation.R90:
      return [y, maxX - x];
    case CameraRotation.R180:
      return [maxX - x, maxY - y];
    case CameraRotation.R270:
      return [maxY - y, x];
  }
}

/**
 * Reverse camera rotation (screen-pick back to world coords).
 */
export function unrotateCoords(
  rx: number,
  ry: number,
  rotation: CameraRotation,
  mapWidth: number,
  mapHeight: number
): [number, number] {
  const maxX = mapWidth - 1;
  const maxY = mapHeight - 1;
  switch (rotation) {
    case CameraRotation.R0:
      return [rx, ry];
    case CameraRotation.R90:
      return [maxX - ry, rx];
    case CameraRotation.R180:
      return [maxX - rx, maxY - ry];
    case CameraRotation.R270:
      return [ry, maxY - rx];
  }
}

/**
 * Convert screen pixel coordinates to approximate world grid coordinates.
 * This gives a flat-plane estimate (z=0). For accurate picking with height,
 * use screenToWorldWithHeight which raycasts through tiles.
 */
export function screenToWorldFlat(
  px: number,
  py: number,
  rotation: CameraRotation = CameraRotation.R0,
  mapWidth: number = 0,
  mapHeight: number = 0
): { x: number; y: number } {
  // Inverse of the isometric projection (assuming z=0)
  const rx = (px / TILE_WIDTH_HALF + py / TILE_HEIGHT_HALF) / 2;
  const ry = (py / TILE_HEIGHT_HALF - px / TILE_WIDTH_HALF) / 2;
  const [x, y] = unrotateCoords(rx, ry, rotation, mapWidth, mapHeight);
  return { x, y };
}

/**
 * Test if a screen point falls within an isometric diamond at the given screen position.
 */
export function isPointInIsoDiamond(
  px: number,
  py: number,
  tileCenterX: number,
  tileCenterY: number
): boolean {
  const dx = Math.abs(px - tileCenterX);
  const dy = Math.abs(py - tileCenterY);
  return (dx / TILE_WIDTH_HALF + dy / TILE_HEIGHT_HALF) <= 1;
}

/**
 * Accurate screen-to-world picking that accounts for tile heights.
 * Raycasts from the front/top tiles backward, checking if the click
 * falls within each tile's diamond at its rendered height.
 */
export function screenToWorldWithHeight(
  screenX: number,
  screenY: number,
  cameraOffsetX: number,
  cameraOffsetY: number,
  cameraZoom: number,
  rotation: CameraRotation,
  mapWidth: number,
  mapHeight: number,
  getHeight: (x: number, y: number) => number
): { x: number; y: number } | null {
  // Convert screen coords to world-space pixels (accounting for camera)
  const wpx = (screenX - cameraOffsetX) / cameraZoom;
  const wpy = (screenY - cameraOffsetY) / cameraZoom;

  // We need to check tiles from front to back (high depth-sort value first)
  // and from highest z first, so the topmost visible tile wins.
  let bestTile: { x: number; y: number } | null = null;
  let bestDepth = -Infinity;

  for (let wx = 0; wx < mapWidth; wx++) {
    for (let wy = 0; wy < mapHeight; wy++) {
      const h = getHeight(wx, wy);
      const screen = worldToScreen(wx, wy, h, rotation, mapWidth, mapHeight);

      if (isPointInIsoDiamond(wpx, wpy, screen.px, screen.py)) {
        // Depth: tiles closer to camera (higher rotated x+y and higher z) win
        const [rx, ry] = rotateCoords(wx, wy, rotation, mapWidth, mapHeight);
        const depth = (rx + ry) * 100 + h;
        if (depth > bestDepth) {
          bestDepth = depth;
          bestTile = { x: wx, y: wy };
        }
      }
    }
  }

  return bestTile;
}

/**
 * Calculate the depth sort value for a renderable at the given position.
 * Higher values should be rendered later (on top).
 */
export function getDepthValue(
  x: number,
  y: number,
  z: number,
  layer: number, // 0=tile, 1=unit, 2=effect
  rotation: CameraRotation,
  mapWidth: number,
  mapHeight: number
): number {
  const [rx, ry] = rotateCoords(x, y, rotation, mapWidth, mapHeight);
  return (rx + ry) * 1000 + z * 10 + layer;
}
