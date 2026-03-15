import * as PIXI from 'pixi.js';
import {
  CameraRotation,
  Direction,
} from '@/core/constants';
import { worldToScreen, getDepthValue } from './isometric';
import { getCharacterTexture } from './textures';
import { hasJobSpriteSheet, getIdleFrame, type SpriteDirection } from './sprite-loader';

export interface UnitRenderData {
  id: string;
  x: number;
  y: number;
  z: number;
  team: 'player' | 'enemy' | 'ally' | 'neutral';
  facing: Direction;
  jobName: string;
  currentHP: number;
  maxHP: number;
  isActive: boolean;
}

const FACING_MAP: Record<Direction, SpriteDirection> = {
  [Direction.North]: 'north',
  [Direction.East]: 'east',
  [Direction.South]: 'south',
  [Direction.West]: 'west',
};

/**
 * Create a unit sprite — uses loaded sprite sheet if available,
 * otherwise falls back to procedural generation.
 */
export function createUnitGraphic(unit: UnitRenderData): PIXI.Container {
  const container = new PIXI.Container();
  const facing = FACING_MAP[unit.facing] || 'south';

  let sprite: PIXI.Sprite;

  // Fixed offset from anchor point for HP bar and indicator
  // This ensures consistent positioning regardless of sprite frame size
  const HP_BAR_Y = -50;
  const ARROW_Y = -58;

  // Try loaded sprite sheet first
  const sheetFrame = hasJobSpriteSheet(unit.jobName)
    ? getIdleFrame(unit.jobName, facing)
    : null;

  if (sheetFrame) {
    // Use the real FFT sprite
    sprite = new PIXI.Sprite(sheetFrame);
    sprite.anchor.set(0.5, 0.9);
    sprite.texture.source.scaleMode = 'nearest';

    // Scale to fit nicely on the isometric grid.
    // Original PS1 frames are 48×56, we want them to be ~40px tall on the grid.
    const targetHeight = 48;
    const scale = targetHeight / sheetFrame.height;
    sprite.scale.set(scale);

    // Tint enemy sprites slightly red
    if (unit.team === 'enemy') {
      sprite.tint = 0xff9999;
    } else if (unit.team === 'ally') {
      sprite.tint = 0x99ff99;
    }
  } else {
    // Fallback to procedural sprites
    const fallbackTex = getCharacterTexture(unit.jobName, unit.team, facing);
    sprite = new PIXI.Sprite(fallbackTex);
    sprite.anchor.set(0.5, 0.9);
    sprite.texture.source.scaleMode = 'nearest';
    sprite.scale.set(0.9);
  }

  container.addChild(sprite);

  // HP bar - fixed offset from ground position
  const hpBar = createHPBar(unit.currentHP, unit.maxHP);
  hpBar.y = HP_BAR_Y;
  container.addChild(hpBar);

  // Active turn indicator - fixed offset from ground position
  if (unit.isActive) {
    const arrow = new PIXI.Graphics();
    arrow.poly([0, ARROW_Y, -4, ARROW_Y - 6, 4, ARROW_Y - 6]);
    arrow.fill(0xffe840);
    arrow.poly([0, ARROW_Y + 1, -3, ARROW_Y - 5, 3, ARROW_Y - 5]);
    arrow.fill(0xffff88);
    container.addChild(arrow);
  }

  return container;
}

function createHPBar(current: number, max: number): PIXI.Container {
  const container = new PIXI.Container();
  const barWidth = 24;
  const barHeight = 3;

  const border = new PIXI.Graphics();
  border.rect(-barWidth / 2 - 1, -1, barWidth + 2, barHeight + 2);
  border.fill(0x080810);
  container.addChild(border);

  const bg = new PIXI.Graphics();
  bg.rect(-barWidth / 2, 0, barWidth, barHeight);
  bg.fill(0x202030);
  container.addChild(bg);

  const ratio = Math.max(0, current / max);
  let fillColor: number;
  if (ratio > 0.5) fillColor = 0x30b030;
  else if (ratio > 0.25) fillColor = 0xd0b020;
  else fillColor = 0xd02020;

  if (ratio > 0) {
    const fill = new PIXI.Graphics();
    fill.rect(-barWidth / 2, 0, Math.round(barWidth * ratio), barHeight);
    fill.fill(fillColor);
    container.addChild(fill);

    const hl = new PIXI.Graphics();
    hl.rect(-barWidth / 2, 0, Math.round(barWidth * ratio), 1);
    hl.fill({ color: 0xffffff, alpha: 0.25 });
    container.addChild(hl);
  }

  return container;
}

export interface UnitSprite {
  container: PIXI.Container;
  depth: number;
  unitId: string;
}

export function createUnitSprites(
  units: UnitRenderData[],
  rotation: CameraRotation,
  mapWidth: number,
  mapHeight: number
): UnitSprite[] {
  return units.map((unit) => {
    const container = createUnitGraphic(unit);
    const screen = worldToScreen(unit.x, unit.y, unit.z, rotation, mapWidth, mapHeight);
    container.x = screen.px;
    container.y = screen.py;
    const depth = getDepthValue(unit.x, unit.y, unit.z, 1, rotation, mapWidth, mapHeight);
    return { container, depth, unitId: unit.id };
  });
}
