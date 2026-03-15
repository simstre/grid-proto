import * as PIXI from 'pixi.js';
import { Camera } from '@/rendering/camera';
import { InputManager } from '@/core/input';
import { CameraRotation } from '@/core/constants';
import {
  createMapTiles,
  createCursorGraphic,
  createRangeOverlay,
} from '@/rendering/tile-renderer';
import { createUnitSprites, type UnitRenderData } from '@/rendering/unit-renderer';
import { screenToWorldWithHeight, worldToScreen } from '@/rendering/isometric';
import {
  BattleManager,
  createBattleUnit,
  type BattleUnit,
} from '@/battle/battle-manager';
import { BattleHUD } from '@/ui/battle-hud';
import { createOrbonneMonastery } from '@/data/maps/orbonne-monastery';
import { preloadAllSprites } from '@/rendering/sprite-loader';
import { audio } from '@/core/audio';

export class Game {
  private app: PIXI.Application;
  private camera: Camera;
  private input: InputManager;
  private battle: BattleManager;
  private hud: BattleHUD;

  // Rendering layers
  private worldContainer!: PIXI.Container;
  private tileLayer!: PIXI.Container;
  private rangeLayer!: PIXI.Container;
  private unitLayer!: PIXI.Container;
  private cursorGraphic!: PIXI.Graphics;

  private hoveredTile: { x: number; y: number } | null = null;
  private lastRotation: CameraRotation = CameraRotation.R0;
  private needsRedraw = true;

  constructor() {
    this.app = new PIXI.Application();
    this.camera = new Camera();
    this.input = null as any; // Set in init()
    this.battle = null as any;
    this.hud = null as any;
  }

  async init(): Promise<void> {
    const container = document.getElementById('game-container')!;

    await this.app.init({
      resizeTo: container,
      backgroundColor: 0x1a1a2e,
      antialias: false, // Pixel art style
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    container.insertBefore(this.app.canvas, container.firstChild);
    this.input = new InputManager(this.app.canvas as HTMLCanvasElement);

    // Create rendering layers
    this.worldContainer = new PIXI.Container();
    this.tileLayer = new PIXI.Container();
    this.rangeLayer = new PIXI.Container();
    this.unitLayer = new PIXI.Container();
    this.cursorGraphic = createCursorGraphic();
    this.cursorGraphic.visible = false;

    this.worldContainer.addChild(this.tileLayer);
    this.worldContainer.addChild(this.rangeLayer);
    this.worldContainer.addChild(this.unitLayer);
    this.worldContainer.addChild(this.cursorGraphic);
    this.app.stage.addChild(this.worldContainer);

    // Preload any available sprite sheets (non-blocking, falls back gracefully)
    await preloadAllSprites();

    // Initialize audio
    await audio.init();

    // Initialize battle
    this.initBattle();

    // Initialize HUD
    const overlay = document.getElementById('ui-overlay')!;
    this.hud = new BattleHUD(overlay);
    this.hud.setActionCallback((action) => this.handleAction(action));

    // Center camera on map
    const map = this.battle.state.map;
    const center = worldToScreen(
      map.width / 2, map.height / 2, 2,
      this.camera.rotation, map.width, map.height
    );
    this.camera.centerOn(this.app.screen.width, this.app.screen.height, center.px, center.py);

    // Start game loop
    this.app.ticker.add(() => this.update());

    // Start battle + BGM (BGM starts on first user click due to autoplay policy)
    this.battle.startBattle();
    const startBgm = () => {
      audio.playBgm('battle');
      document.removeEventListener('click', startBgm);
      document.removeEventListener('keydown', startBgm);
    };
    document.addEventListener('click', startBgm);
    document.addEventListener('keydown', startBgm);
  }

  private initBattle(): void {
    const map = createOrbonneMonastery();

    const units: BattleUnit[] = [
      // Player units
      createBattleUnit('p1', 'Ramza', 'player', map.playerStartPositions[0].x, map.playerStartPositions[0].y, {
        jobName: 'Ramza', maxHP: 120, currentHP: 120, pa: 9, speed: 7, move: 4, jump: 3, weaponPower: 6,
      }),
      createBattleUnit('p2', 'Delita', 'player', map.playerStartPositions[1].x, map.playerStartPositions[1].y, {
        jobName: 'Knight', maxHP: 140, currentHP: 140, pa: 10, ma: 5, speed: 5, move: 3, jump: 3, weaponPower: 8,
      }),
      createBattleUnit('p3', 'Alma', 'player', map.playerStartPositions[2].x, map.playerStartPositions[2].y, {
        jobName: 'White Mage', maxHP: 80, currentHP: 80, pa: 5, ma: 10, speed: 6, move: 3, jump: 3, weaponPower: 3, attackRange: 3,
      }),
      createBattleUnit('p4', 'Rad', 'player', map.playerStartPositions[3].x, map.playerStartPositions[3].y, {
        jobName: 'Archer', maxHP: 90, currentHP: 90, pa: 8, speed: 6, move: 4, jump: 3, weaponPower: 5, attackRange: 4,
      }),

      // Enemy units
      createBattleUnit('e1', 'Knight A', 'enemy', map.enemyStartPositions[0].x, map.enemyStartPositions[0].y, {
        jobName: 'Knight', maxHP: 110, currentHP: 110, pa: 9, speed: 5, move: 3, jump: 3, weaponPower: 7,
      }),
      createBattleUnit('e2', 'Knight B', 'enemy', map.enemyStartPositions[1].x, map.enemyStartPositions[1].y, {
        jobName: 'Knight', maxHP: 100, currentHP: 100, pa: 8, speed: 5, move: 3, jump: 3, weaponPower: 6,
      }),
      createBattleUnit('e3', 'Archer C', 'enemy', map.enemyStartPositions[2].x, map.enemyStartPositions[2].y, {
        jobName: 'Archer', maxHP: 85, currentHP: 85, pa: 7, speed: 6, move: 4, jump: 3, weaponPower: 5, attackRange: 4,
      }),
      createBattleUnit('e4', 'Mage D', 'enemy', map.enemyStartPositions[3].x, map.enemyStartPositions[3].y, {
        jobName: 'Black Mage', maxHP: 70, currentHP: 70, pa: 4, ma: 10, speed: 7, move: 3, jump: 3, weaponPower: 4, attackRange: 3,
      }),
    ];

    this.battle = new BattleManager(map, units);
  }

  private update(): void {
    const state = this.battle.state;

    // Update camera
    this.camera.update(this.input, this.app.screen.width, this.app.screen.height);

    // Check if rotation changed
    if (this.camera.rotation !== this.lastRotation) {
      this.lastRotation = this.camera.rotation;
      this.needsRedraw = true;
    }

    // Update hovered tile
    const inputState = this.input.getState();
    this.hoveredTile = screenToWorldWithHeight(
      inputState.mouseX,
      inputState.mouseY,
      this.camera.x,
      this.camera.y,
      this.camera.zoom,
      this.camera.rotation,
      state.map.width,
      state.map.height,
      (x, y) => state.map.tiles[x][y].height
    );

    // Mute toggle
    if (this.input.isKeyJustPressed('KeyM')) {
      audio.toggleMute();
    }

    // Handle click
    if (this.input.isKeyJustPressed('Escape')) {
      audio.playSfx('cancel');
      this.battle.cancel();
      this.needsRedraw = true;
    }

    if (inputState.mouseJustPressed && this.hoveredTile) {
      this.handleTileClick(this.hoveredTile.x, this.hoveredTile.y);
    }

    // Handle keyboard shortcuts for facing
    if (state.phase === 'confirm_facing') {
      if (this.input.isKeyJustPressed('ArrowUp')) { this.battle.confirmFacing(0); this.needsRedraw = true; }
      if (this.input.isKeyJustPressed('ArrowRight')) { this.battle.confirmFacing(1); this.needsRedraw = true; }
      if (this.input.isKeyJustPressed('ArrowDown')) { this.battle.confirmFacing(2); this.needsRedraw = true; }
      if (this.input.isKeyJustPressed('ArrowLeft')) { this.battle.confirmFacing(3); this.needsRedraw = true; }
    }

    // Redraw world
    this.redrawWorld();

    // Update cursor position
    this.updateCursor();

    // Apply camera transform to world container
    this.worldContainer.x = this.camera.x;
    this.worldContainer.y = this.camera.y;
    this.worldContainer.scale.set(this.camera.zoom);

    // Update HUD
    this.hud.update(state, this.hoveredTile);

    this.input.endFrame();
  }

  private redrawWorld(): void {
    // Redraw tiles (only when rotation changes or first frame)
    if (this.needsRedraw) {
      this.needsRedraw = false;
      this.redrawTiles();
      this.redrawRangeOverlays();
    }

    // Always redraw units (they move)
    this.redrawUnits();
  }

  private redrawTiles(): void {
    this.tileLayer.removeChildren();
    const state = this.battle.state;
    const tiles = createMapTiles(state.map, this.camera.rotation);
    for (const tile of tiles) {
      this.tileLayer.addChild(tile.container);
    }
  }

  private redrawRangeOverlays(): void {
    this.rangeLayer.removeChildren();
    const state = this.battle.state;

    if (state.phase === 'select_move' && state.moveRange.size > 0) {
      const overlay = createRangeOverlay(
        state.moveRange, 0x4488ff,
        this.camera.rotation, state.map.width, state.map.height,
        (x, y) => state.map.tiles[x][y].height
      );
      this.rangeLayer.addChild(overlay);
    }

    if (state.phase === 'select_target' && state.attackRange.size > 0) {
      const overlay = createRangeOverlay(
        state.attackRange, 0xff4444,
        this.camera.rotation, state.map.width, state.map.height,
        (x, y) => state.map.tiles[x][y].height
      );
      this.rangeLayer.addChild(overlay);
    }
  }

  private redrawUnits(): void {
    this.unitLayer.removeChildren();
    const state = this.battle.state;

    const unitRenderData: UnitRenderData[] = state.units
      .filter((u) => u.isAlive)
      .map((u) => ({
        id: u.id,
        x: u.x,
        y: u.y,
        z: state.map.tiles[u.x][u.y].height,
        team: u.team,
        facing: u.facing,
        jobName: u.jobName,
        currentHP: u.currentHP,
        maxHP: u.maxHP,
        isActive: u.id === state.activeUnitId,
      }));

    const sprites = createUnitSprites(
      unitRenderData,
      this.camera.rotation,
      state.map.width,
      state.map.height
    );

    // Sort by depth and add
    sprites.sort((a, b) => a.depth - b.depth);
    for (const sprite of sprites) {
      this.unitLayer.addChild(sprite.container);
    }
  }

  private updateCursor(): void {
    if (!this.hoveredTile) {
      this.cursorGraphic.visible = false;
      return;
    }

    const { x, y } = this.hoveredTile;
    const state = this.battle.state;
    if (x < 0 || x >= state.map.width || y < 0 || y >= state.map.height) {
      this.cursorGraphic.visible = false;
      return;
    }

    const h = state.map.tiles[x][y].height;
    const screen = worldToScreen(x, y, h, this.camera.rotation, state.map.width, state.map.height);
    this.cursorGraphic.x = screen.px;
    this.cursorGraphic.y = screen.py;
    this.cursorGraphic.visible = true;
  }

  private handleTileClick(x: number, y: number): void {
    const state = this.battle.state;

    switch (state.phase) {
      case 'select_move':
        if (this.battle.confirmMove(x, y)) {
          audio.playSfx('confirm');
          this.needsRedraw = true;
        }
        break;

      case 'select_target': {
        // Find the target to check weapon type before attacking
        const targetUnit = this.battle.state.units.find(
          (u) => u.x === x && u.y === y && u.isAlive
        );
        const attackingUnit = this.battle.getActiveUnit();
        const isMagicAttack = attackingUnit?.weaponCategory === 'staff' || attackingUnit?.weaponCategory === 'rod';

        if (this.battle.confirmAttack(x, y)) {
          // Check the last damage result to see if it was a miss
          const lastResult = targetUnit?.lastDamageResult;
          const wasMiss = lastResult && lastResult.isMiss;

          if (wasMiss) {
            // No attack SFX on a miss — just a whoosh/cancel
            audio.playSfx('cancel');
          } else {
            // Play appropriate SFX
            if (isMagicAttack) {
              audio.playSfx('magic');
            } else {
              audio.playAttack();
            }
            // Play hit sound after a short delay
            setTimeout(() => audio.playSfx('hit'), 200);
          }

          // Check if the target died
          if (targetUnit && !targetUnit.isAlive) {
            setTimeout(() => audio.playSfx('death'), 300);
          }

          this.needsRedraw = true;
          // Check for battle end BGM
          setTimeout(() => this.checkBattleEndAudio(), 400);
        }
        break;
      }

      case 'confirm_facing': {
        const unit = this.battle.getActiveUnit();
        if (unit) {
          audio.playSfx('confirm');
          const facing = this.getFacingFromClick(unit.x, unit.y, x, y);
          this.battle.confirmFacing(facing);
          this.needsRedraw = true;
        }
        break;
      }
    }
  }

  private getFacingFromClick(fromX: number, fromY: number, toX: number, toY: number): number {
    const dx = toX - fromX;
    const dy = toY - fromY;
    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx >= 0 ? 1 : 3; // East or West
    }
    return dy >= 0 ? 2 : 0; // South or North
  }

  private handleAction(action: string): void {
    audio.playSfx('select');
    switch (action) {
      case 'move':
        this.battle.selectMove();
        this.needsRedraw = true;
        break;
      case 'attack':
        this.battle.selectAttack();
        this.needsRedraw = true;
        break;
      case 'wait':
        this.battle.selectWait();
        break;
      case 'cancel':
        audio.playSfx('cancel');
        this.battle.cancel();
        this.needsRedraw = true;
        break;
    }
  }

  private checkBattleEndAudio(): void {
    const phase = this.battle.state.phase;
    if (phase === 'battle_won') {
      audio.stopBgm(300);
      setTimeout(() => audio.playBgm('victory'), 500);
    } else if (phase === 'battle_lost') {
      audio.stopBgm(300);
      setTimeout(() => audio.playBgm('gameover'), 500);
    }
  }
}
