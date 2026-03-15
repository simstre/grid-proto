import * as PIXI from 'pixi.js';
import {
  TILE_WIDTH,
  TILE_HEIGHT,
  TILE_WIDTH_HALF,
  TILE_HEIGHT_HALF,
  HEIGHT_STEP,
  PALETTE,
  CameraRotation,
  TerrainType,
} from '@/core/constants';
import { worldToScreen, getDepthValue } from './isometric';
import { getTileTopTexture } from './textures';
import type { BattleMapData, TileData } from '@/data/maps/map-types';

// ─── FFT-style side face colors (earth/stone layers) ───

interface SideColors {
  top: number;    // Layer just below surface
  mid: number;    // Middle layer
  bottom: number; // Deep layer
  line: number;   // Sediment line color
}

const SIDE_COLORS: Record<TerrainType, SideColors> = {
  grass:  { top: 0x6b5540, mid: 0x5a4530, bottom: 0x4e3c28, line: 0x3e3020 },
  stone:  { top: 0x6e6860, mid: 0x5a5550, bottom: 0x4e4a46, line: 0x404040 },
  water:  { top: 0x3a5a8a, mid: 0x2a4a78, bottom: 0x1e3e6a, line: 0x183058 },
  sand:   { top: 0x9a8450, mid: 0x8a7444, bottom: 0x7a6438, line: 0x6a5830 },
  dirt:   { top: 0x6b5540, mid: 0x5a4530, bottom: 0x4e3c28, line: 0x3e3020 },
  lava:   { top: 0x802800, mid: 0x6e2000, bottom: 0x5a1800, line: 0xff6600 },
  wood:   { top: 0x5a4008, mid: 0x4e3606, bottom: 0x423004, line: 0x382800 },
  roof:   { top: 0x662020, mid: 0x5a1818, bottom: 0x501414, line: 0x441010 },
};

/**
 * Draw an isometric diamond using a pixel-art texture.
 */
function drawTexturedTop(container: PIXI.Container, terrain: TerrainType, seed: number): void {
  const texture = getTileTopTexture(terrain, seed);
  const sprite = new PIXI.Sprite(texture);
  sprite.anchor.set(0.5, 0.5);
  container.addChild(sprite);
}

/**
 * Draw FFT-style side face with layered earth texture.
 * Left face = south-west facing, receives less light.
 * Right face = south-east facing, slightly brighter.
 */
function drawSideFace(
  g: PIXI.Graphics,
  cx: number,
  cy: number,
  heightUnits: number,
  terrain: TerrainType,
  side: 'left' | 'right',
  seed: number
): void {
  if (heightUnits <= 0) return;

  const totalHeight = heightUnits * HEIGHT_STEP;
  const colors = SIDE_COLORS[terrain] || SIDE_COLORS.stone;
  const lightMul = side === 'left' ? 0.85 : 1.0;

  // Draw each height unit as a separate layer with sediment lines
  for (let h = 0; h < heightUnits; h++) {
    const layerTop = h * HEIGHT_STEP;
    const layerH = HEIGHT_STEP;

    // Determine layer color (top layers match surface, lower = earthen)
    let layerColor: number;
    if (h === 0) {
      layerColor = colors.top;
    } else if (h < heightUnits / 2) {
      layerColor = colors.mid;
    } else {
      layerColor = colors.bottom;
    }

    layerColor = multiplyColor(layerColor, lightMul);

    if (side === 'left') {
      // Left face parallelogram for this layer
      g.poly([
        cx - TILE_WIDTH_HALF, cy + layerTop,
        cx, cy + TILE_HEIGHT_HALF + layerTop,
        cx, cy + TILE_HEIGHT_HALF + layerTop + layerH,
        cx - TILE_WIDTH_HALF, cy + layerTop + layerH,
      ]);
      g.fill(layerColor);

      // Sediment line at top of each layer
      if (h > 0) {
        g.moveTo(cx - TILE_WIDTH_HALF, cy + layerTop);
        g.lineTo(cx, cy + TILE_HEIGHT_HALF + layerTop);
        g.stroke({ width: 1, color: multiplyColor(colors.line, lightMul), alpha: 0.8 });
      }
    } else {
      // Right face parallelogram for this layer
      g.poly([
        cx, cy + TILE_HEIGHT_HALF + layerTop,
        cx + TILE_WIDTH_HALF, cy + layerTop,
        cx + TILE_WIDTH_HALF, cy + layerTop + layerH,
        cx, cy + TILE_HEIGHT_HALF + layerTop + layerH,
      ]);
      g.fill(layerColor);

      if (h > 0) {
        g.moveTo(cx, cy + TILE_HEIGHT_HALF + layerTop);
        g.lineTo(cx + TILE_WIDTH_HALF, cy + layerTop);
        g.stroke({ width: 1, color: multiplyColor(colors.line, lightMul), alpha: 0.8 });
      }
    }
  }

  // Outline on the outer edges
  const outlineColor = 0x181818;
  if (side === 'left') {
    g.moveTo(cx - TILE_WIDTH_HALF, cy);
    g.lineTo(cx - TILE_WIDTH_HALF, cy + totalHeight);
    g.lineTo(cx, cy + TILE_HEIGHT_HALF + totalHeight);
    g.stroke({ width: 1, color: outlineColor, alpha: 0.5 });
  } else {
    g.moveTo(cx + TILE_WIDTH_HALF, cy);
    g.lineTo(cx + TILE_WIDTH_HALF, cy + totalHeight);
    g.lineTo(cx, cy + TILE_HEIGHT_HALF + totalHeight);
    g.stroke({ width: 1, color: outlineColor, alpha: 0.5 });
  }
}

function multiplyColor(color: number, factor: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((color & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}

export interface TileSprite {
  container: PIXI.Container;
  depth: number;
  worldX: number;
  worldY: number;
}

/**
 * Creates all tile graphics for a battle map using textured rendering.
 */
export function createMapTiles(
  map: BattleMapData,
  rotation: CameraRotation
): TileSprite[] {
  const tiles: TileSprite[] = [];

  for (let x = 0; x < map.width; x++) {
    for (let y = 0; y < map.height; y++) {
      const tile = map.tiles[x][y];
      const tileSprite = createTileGraphic(x, y, tile, rotation, map.width, map.height);
      tiles.push(tileSprite);
    }
  }

  tiles.sort((a, b) => a.depth - b.depth);
  return tiles;
}

function createTileGraphic(
  x: number,
  y: number,
  tile: TileData,
  rotation: CameraRotation,
  mapWidth: number,
  mapHeight: number
): TileSprite {
  const container = new PIXI.Container();
  const screen = worldToScreen(x, y, tile.height, rotation, mapWidth, mapHeight);
  const seed = x * 137 + y * 251; // deterministic per tile

  // Draw side faces first (behind the top face)
  if (tile.height > 0) {
    const sideGraphics = new PIXI.Graphics();
    drawSideFace(sideGraphics, 0, 0, tile.height, tile.terrain, 'left', seed);
    drawSideFace(sideGraphics, 0, 0, tile.height, tile.terrain, 'right', seed);
    container.addChild(sideGraphics);
  }

  // Textured top face
  drawTexturedTop(container, tile.terrain, seed);

  // Grid line overlay (very subtle)
  const gridLine = new PIXI.Graphics();
  gridLine.poly([
    0, -TILE_HEIGHT_HALF,
    TILE_WIDTH_HALF, 0,
    0, TILE_HEIGHT_HALF,
    -TILE_WIDTH_HALF, 0,
  ]);
  gridLine.stroke({ width: 0.5, color: 0x000000, alpha: 0.1 });
  container.addChild(gridLine);

  container.x = screen.px;
  container.y = screen.py;

  const depth = getDepthValue(x, y, tile.height, 0, rotation, mapWidth, mapHeight);
  return { container, depth, worldX: x, worldY: y };
}

/**
 * Creates the cursor highlight graphic (FFT-style pulsing diamond).
 */
export function createCursorGraphic(): PIXI.Graphics {
  const g = new PIXI.Graphics();
  updateCursorGraphic(g);
  return g;
}

export function updateCursorGraphic(g: PIXI.Graphics, color: number = PALETTE.cursorHighlight): void {
  g.clear();

  // Inner glow fill
  g.poly([
    0, -TILE_HEIGHT_HALF + 1,
    TILE_WIDTH_HALF - 1, 0,
    0, TILE_HEIGHT_HALF - 1,
    -TILE_WIDTH_HALF + 1, 0,
  ]);
  g.fill({ color: 0xffffcc, alpha: 0.2 });

  // Bright animated border (double line like FFT)
  g.poly([
    0, -TILE_HEIGHT_HALF,
    TILE_WIDTH_HALF, 0,
    0, TILE_HEIGHT_HALF,
    -TILE_WIDTH_HALF, 0,
  ]);
  g.stroke({ width: 2, color: 0xffff88, alpha: 0.9 });

  // Inner border
  g.poly([
    0, -TILE_HEIGHT_HALF + 2,
    TILE_WIDTH_HALF - 2, 0,
    0, TILE_HEIGHT_HALF - 2,
    -TILE_WIDTH_HALF + 2, 0,
  ]);
  g.stroke({ width: 1, color: 0xffffff, alpha: 0.6 });
}

/**
 * Creates range overlay graphics with FFT-style tile highlighting.
 */
export function createRangeOverlay(
  tiles: Set<string>,
  color: number,
  rotation: CameraRotation,
  mapWidth: number,
  mapHeight: number,
  getHeight: (x: number, y: number) => number
): PIXI.Container {
  const container = new PIXI.Container();

  for (const key of tiles) {
    const [x, y] = key.split(',').map(Number);
    const h = getHeight(x, y);
    const screen = worldToScreen(x, y, h, rotation, mapWidth, mapHeight);

    const g = new PIXI.Graphics();

    // Filled diamond
    g.poly([
      0, -TILE_HEIGHT_HALF,
      TILE_WIDTH_HALF, 0,
      0, TILE_HEIGHT_HALF,
      -TILE_WIDTH_HALF, 0,
    ]);
    g.fill({ color, alpha: 0.3 });

    // Border
    g.poly([
      0, -TILE_HEIGHT_HALF + 1,
      TILE_WIDTH_HALF - 1, 0,
      0, TILE_HEIGHT_HALF - 1,
      -TILE_WIDTH_HALF + 1, 0,
    ]);
    g.stroke({ width: 1.5, color, alpha: 0.7 });

    g.x = screen.px;
    g.y = screen.py;
    container.addChild(g);
  }

  return container;
}
