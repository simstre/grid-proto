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
import { TitleScreen } from '@/ui/title-screen';
import { WorldMapUI } from '@/ui/world-map-ui';
import { FormationUI } from '@/ui/formation-ui';
import { BattleResults, type UnitRewardInfo, type BattleResultsData } from '@/ui/battle-results';
import { DamageNumberRenderer, type DamageNumberType } from '@/rendering/damage-numbers';
import { ParticleSystem } from '@/rendering/particle-system';
import { preloadAllSprites } from '@/rendering/sprite-loader';
import { audio } from '@/core/audio';
import {
  type GameState,
  createNewGameState,
  loadGameState,
  saveGameState,
} from '@/story/story-flags';
import { WorldMap } from '@/overworld/world-map';
import { getBattle, CHAPTERS, type StoryBattle } from '@/data/campaign';
import { JOBS } from '@/data/jobs';
import { Direction } from '@/core/constants';
import type { WeaponCategory } from '@/battle/damage-calc';
import type { StatusId } from '@/battle/status-effects';

// Map factory imports
import { createOrbonneMonastery } from '@/data/maps/orbonne-monastery';
import { createMagicCityGariland } from '@/data/maps/magic-city-gariland';
import { createSweegyWoods } from '@/data/maps/sweegy-woods';
import { createDorterTradeCity } from '@/data/maps/dorter-trade-city';

import { dialogueManager } from '@/story/dialogue';
import { DialogueBoxUI } from '@/ui/dialogue-box';

// ─── Scene types ───

type GameScene = 'title' | 'world_map' | 'formation' | 'battle' | 'battle_results' | 'dialogue';

// ─── Map ID to factory ───

const MAP_FACTORIES: Record<string, () => import('@/data/maps/map-types').BattleMapData> = {
  'orbonne-monastery': createOrbonneMonastery,
  'magic-city-gariland': createMagicCityGariland,
  'sweegy-woods': createSweegyWoods,
  'dorter-trade-city': createDorterTradeCity,
};

// ─── Fade overlay helper ───

function createFadeOverlay(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: #000;
    z-index: 3000;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.4s ease;
  `;
  document.body.appendChild(el);
  return el;
}

function fadeOut(overlay: HTMLDivElement): Promise<void> {
  return new Promise((resolve) => {
    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'auto';
    setTimeout(resolve, 400);
  });
}

function fadeIn(overlay: HTMLDivElement): Promise<void> {
  return new Promise((resolve) => {
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
    setTimeout(resolve, 400);
  });
}

export class Game {
  private app: PIXI.Application;
  private camera: Camera;
  private input: InputManager;
  private battle: BattleManager | null = null;
  private hud: BattleHUD;

  // Rendering layers
  private worldContainer!: PIXI.Container;
  private backgroundLayer!: PIXI.Container;
  private tileLayer!: PIXI.Container;
  private rangeLayer!: PIXI.Container;
  private unitLayer!: PIXI.Container;
  private cursorGraphic!: PIXI.Graphics;

  // Visual effects
  private damageNumbers: DamageNumberRenderer;
  private particles: ParticleSystem;

  // UI screens
  private titleScreen: TitleScreen;
  private worldMapUI: WorldMapUI;
  private formationUI: FormationUI;
  private battleResultsUI: BattleResults;
  private dialogueBox: DialogueBoxUI;
  private fadeOverlay: HTMLDivElement;

  // Game state
  private currentScene: GameScene = 'title';
  private gameState: GameState | null = null;
  private worldMap: WorldMap;
  private currentBattle: StoryBattle | null = null;
  private deployedUnitIds: string[] = [];

  private hoveredTile: { x: number; y: number } | null = null;
  private lastRotation: CameraRotation = CameraRotation.R0;
  private needsRedraw = true;
  private lastDamageDisplayCount = 0;

  // Track scene after dialogue ends
  private postDialogueAction: (() => void) | null = null;

  constructor() {
    this.app = new PIXI.Application();
    this.camera = new Camera();
    this.input = null as any;
    this.hud = null as any;
    this.damageNumbers = new DamageNumberRenderer();
    this.particles = new ParticleSystem();
    this.worldMap = new WorldMap();

    // Create UI screens
    this.titleScreen = new TitleScreen();
    this.worldMapUI = new WorldMapUI(this.worldMap);
    this.formationUI = new FormationUI();
    this.battleResultsUI = new BattleResults();
    this.dialogueBox = new DialogueBoxUI();
    this.fadeOverlay = createFadeOverlay();
  }

  async init(): Promise<void> {
    const container = document.getElementById('game-container')!;

    await this.app.init({
      resizeTo: container,
      backgroundColor: 0x1a1a2e,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    container.insertBefore(this.app.canvas, container.firstChild);
    this.input = new InputManager(this.app.canvas as HTMLCanvasElement);

    // Create rendering layers
    this.worldContainer = new PIXI.Container();
    this.backgroundLayer = new PIXI.Container();
    this.tileLayer = new PIXI.Container();
    this.rangeLayer = new PIXI.Container();
    this.unitLayer = new PIXI.Container();
    this.cursorGraphic = createCursorGraphic();
    this.cursorGraphic.visible = false;

    this.worldContainer.addChild(this.backgroundLayer);
    this.worldContainer.addChild(this.tileLayer);
    this.worldContainer.addChild(this.rangeLayer);
    this.worldContainer.addChild(this.unitLayer);
    this.worldContainer.addChild(this.damageNumbers.container);
    this.worldContainer.addChild(this.particles.container);
    this.worldContainer.addChild(this.cursorGraphic);
    this.app.stage.addChild(this.worldContainer);

    // Preload sprites
    await preloadAllSprites();

    // Initialize audio
    await audio.init();

    // Initialize HUD (hidden until battle)
    const overlay = document.getElementById('ui-overlay')!;
    this.hud = new BattleHUD(overlay);
    this.hud.setActionCallback((action) => this.handleAction(action));

    // Setup UI callbacks
    this.setupUICallbacks();

    // Start game loop
    this.app.ticker.add(() => this.update());

    // Show title screen
    this.showTitleScreen();
  }

  // ─── Scene Management ───

  private async transitionTo(scene: GameScene, setup: () => void): Promise<void> {
    await fadeOut(this.fadeOverlay);
    setup();
    this.currentScene = scene;
    await fadeIn(this.fadeOverlay);
  }

  private showTitleScreen(): void {
    this.currentScene = 'title';
    this.worldContainer.visible = false;
    const hasSave = loadGameState() !== null;
    this.titleScreen.show(hasSave);
  }

  private showWorldMap(): void {
    if (!this.gameState) return;
    this.worldContainer.visible = false;
    this.worldMap.setCurrentNode(this.gameState.currentNode);
    this.worldMapUI.show(this.gameState);
  }

  private showFormation(battle: StoryBattle): void {
    if (!this.gameState) return;
    this.currentBattle = battle;
    const availableUnits = this.gameState.roster.getAllUnits();
    this.formationUI.show(battle, availableUnits);
  }

  private startBattle(battle: StoryBattle, deployedIds: string[]): void {
    if (!this.gameState) return;

    this.deployedUnitIds = deployedIds;

    // Get map factory
    const factory = MAP_FACTORIES[battle.mapId];
    if (!factory) {
      console.error(`Unknown map: ${battle.mapId}`);
      return;
    }
    const map = factory();

    // Create player units from roster
    const playerUnits: BattleUnit[] = [];
    for (let i = 0; i < deployedIds.length; i++) {
      const rosterUnit = this.gameState.roster.getUnit(deployedIds[i]);
      if (!rosterUnit || i >= map.playerStartPositions.length) continue;

      const pos = map.playerStartPositions[i];
      const job = JOBS[rosterUnit.jobId];

      playerUnits.push(createBattleUnit(
        rosterUnit.id,
        rosterUnit.name,
        'player',
        pos.x,
        pos.y,
        {
          jobName: rosterUnit.jobName,
          maxHP: rosterUnit.maxHP,
          currentHP: rosterUnit.maxHP,
          maxMP: rosterUnit.maxMP,
          currentMP: rosterUnit.maxMP,
          pa: rosterUnit.pa,
          ma: rosterUnit.ma,
          speed: rosterUnit.speed,
          move: rosterUnit.move,
          jump: rosterUnit.jump,
          brave: rosterUnit.brave,
          faith: rosterUnit.faith,
          weaponPower: 5 + Math.floor(rosterUnit.level * 1.5),
          weaponCategory: (job?.equippableWeapons?.[0] ?? 'sword') as WeaponCategory,
          attackRange: job?.equippableWeapons?.[0] === 'bow' ? 4 : job?.equippableWeapons?.[0] === 'staff' ? 3 : 1,
        }
      ));
    }

    // Create enemy units from battle definition
    const enemyUnits: BattleUnit[] = battle.enemyFormation.map((config, i) => {
      const job = JOBS[config.jobId];
      const name = config.name ?? `Enemy ${i + 1}`;
      const baseHP = 80 + config.level * 12;
      const baseMP = 20 + config.level * 3;
      const basePA = 6 + Math.floor(config.level * 0.8);
      const baseMA = 5 + Math.floor(config.level * 0.6);
      const baseSpeed = 5 + Math.floor(config.level * 0.4);

      return createBattleUnit(
        `enemy_${i}`,
        name,
        'enemy',
        config.position.x,
        config.position.y,
        {
          jobName: job?.name ?? config.jobId,
          maxHP: job ? Math.floor(baseHP * job.hpMult) : baseHP,
          currentHP: job ? Math.floor(baseHP * job.hpMult) : baseHP,
          maxMP: job ? Math.floor(baseMP * job.mpMult) : baseMP,
          currentMP: job ? Math.floor(baseMP * job.mpMult) : baseMP,
          pa: job ? Math.floor(basePA * job.paMult) : basePA,
          ma: job ? Math.floor(baseMA * job.maMult) : baseMA,
          speed: job ? Math.floor(baseSpeed * job.speedMult) : baseSpeed,
          move: job?.moveBase ?? 4,
          jump: job?.jumpBase ?? 3,
          weaponPower: 4 + Math.floor(config.level * 1.2),
          weaponCategory: (job?.equippableWeapons?.[0] ?? 'sword') as WeaponCategory,
          attackRange: job?.equippableWeapons?.[0] === 'bow' ? 4 : job?.equippableWeapons?.[0] === 'staff' ? 3 : 1,
        }
      );
    });

    const allUnits = [...playerUnits, ...enemyUnits];
    this.battle = new BattleManager(map, allUnits);

    // Setup rendering
    this.worldContainer.visible = true;
    this.needsRedraw = true;
    this.lastDamageDisplayCount = 0;

    // Center camera
    const center = worldToScreen(
      map.width / 2, map.height / 2, 2,
      this.camera.rotation, map.width, map.height
    );
    this.camera.centerOn(this.app.screen.width, this.app.screen.height, center.px, center.py);

    // Start battle
    this.battle.startBattle();

    // Start BGM
    const startBgm = () => {
      audio.playBgm('battle');
      document.removeEventListener('click', startBgm);
      document.removeEventListener('keydown', startBgm);
    };
    document.addEventListener('click', startBgm);
    document.addEventListener('keydown', startBgm);
    // Try playing immediately (works if user has already interacted)
    audio.playBgm('battle');
  }

  private showBattleResults(): void {
    if (!this.gameState || !this.currentBattle) return;

    const battle = this.currentBattle;
    const rewards = battle.rewards;

    // Calculate rewards per unit
    const unitRewards: UnitRewardInfo[] = [];
    const baseExp = 20 + (battle.chapter * 10);
    const baseJP = 10 + (battle.chapter * 5);

    for (const unitId of this.deployedUnitIds) {
      const rosterUnit = this.gameState.roster.getUnit(unitId);
      if (!rosterUnit) continue;

      const expResult = this.gameState.roster.awardExp(unitId, baseExp);
      this.gameState.roster.awardJP(unitId, rosterUnit.jobId, baseJP);

      unitRewards.push({
        name: rosterUnit.name,
        jobName: rosterUnit.jobName,
        expGained: baseExp,
        jpGained: baseJP,
        leveledUp: expResult.leveled,
        newLevel: expResult.newLevel,
      });
    }

    // Award gold
    this.gameState.inventory.gold += rewards.gold;

    // Mark battle complete
    this.gameState.completedBattles.add(battle.id);
    this.gameState.currentNode = this.worldMap.getCurrentNodeId();

    // Check chapter advancement
    const currentChapter = CHAPTERS.find((c) => c.number === this.gameState!.currentChapter);
    if (currentChapter) {
      const allRequired = currentChapter.battles.filter((b) => b.isRequired);
      const allDone = allRequired.every((b) => this.gameState!.completedBattles.has(b.id));
      if (allDone && this.gameState.currentChapter < CHAPTERS.length) {
        this.gameState.currentChapter += 1;
      }
    }

    // Auto-save
    saveGameState(this.gameState);

    const resultsData: BattleResultsData = {
      battleName: battle.name,
      goldEarned: rewards.gold,
      itemsFound: rewards.items,
      unitRewards,
    };

    this.battleResultsUI.show(resultsData);
  }

  // ─── UI Callbacks ───

  private setupUICallbacks(): void {
    // Title screen
    this.titleScreen.setOnSelect((action) => {
      audio.playSfx('confirm');
      if (action === 'new_game') {
        this.gameState = createNewGameState();
        this.transitionTo('world_map', () => {
          this.titleScreen.hide();
          this.showWorldMap();
        });
      } else if (action === 'continue') {
        const saved = loadGameState();
        if (saved) {
          this.gameState = saved;
          this.transitionTo('world_map', () => {
            this.titleScreen.hide();
            this.showWorldMap();
          });
        }
      }
    });

    // World map
    this.worldMapUI.setOnNodeSelect((nodeId) => {
      if (!this.gameState) return;
      audio.playSfx('confirm');

      const node = this.worldMap.getNode(nodeId);
      if (!node) return;

      // Travel to the node
      if (nodeId !== this.worldMap.getCurrentNodeId()) {
        this.worldMap.travelTo(nodeId, this.gameState);
      }
      this.worldMap.setCurrentNode(nodeId);
      this.gameState.currentNode = nodeId;

      if (node.type === 'story_battle' && node.battleId) {
        const battle = getBattle(node.battleId);
        if (battle) {
          this.transitionTo('formation', () => {
            this.worldMapUI.hide();
            this.showFormation(battle);
          });
        }
      } else if (node.type === 'random_encounter') {
        // For random encounters, use the nearest story battle's formation or a generic one
        // For now, treat them as travel-only nodes — just refresh the map
        this.worldMapUI.hide();
        this.showWorldMap();
      } else if (node.type === 'town') {
        // Towns are just stops; refresh map
        this.worldMapUI.hide();
        this.showWorldMap();
      }
    });

    // Formation
    this.formationUI.setOnStart((selectedIds) => {
      if (!this.currentBattle) return;
      audio.playSfx('confirm');

      this.transitionTo('battle', () => {
        this.formationUI.hide();
        this.startBattle(this.currentBattle!, selectedIds);
      });
    });

    this.formationUI.setOnBack(() => {
      audio.playSfx('cancel');
      this.transitionTo('world_map', () => {
        this.formationUI.hide();
        this.currentBattle = null;
        this.showWorldMap();
      });
    });

    // Battle results
    this.battleResultsUI.setOnContinue(() => {
      audio.playSfx('confirm');
      audio.stopBgm(300);

      this.transitionTo('world_map', () => {
        this.battleResultsUI.hide();
        this.battle = null;
        this.currentBattle = null;
        this.worldContainer.visible = false;
        this.damageNumbers.clear();
        this.particles.clear();
        this.showWorldMap();
      });
    });

    // Dialogue box
    this.dialogueBox.setOnAdvance(() => {
      const advanced = dialogueManager.advance();
      if (!advanced) {
        // Dialogue ended
        this.dialogueBox.hide();
        this.postDialogueAction?.();
        this.postDialogueAction = null;
      }
    });

    this.dialogueBox.setOnChoice((index) => {
      dialogueManager.selectChoice(index);
    });

    dialogueManager.onLineChange = (line) => {
      this.dialogueBox.show(line);
      if (line.choices && line.choices.length > 0) {
        this.dialogueBox.showChoices(line.choices);
      }
    };

    dialogueManager.onEnd = () => {
      this.dialogueBox.hide();
      this.postDialogueAction?.();
      this.postDialogueAction = null;
    };
  }

  // ─── Game Loop ───

  private update(): void {
    const dt = this.app.ticker.deltaMS / 1000;

    // Update effects regardless of scene
    this.damageNumbers.update(dt);
    this.particles.update(dt);

    if (this.currentScene !== 'battle' || !this.battle) {
      this.input.endFrame();
      return;
    }

    const state = this.battle.state;

    // Update camera
    this.camera.update(this.input, this.app.screen.width, this.app.screen.height);

    // Check rotation change
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

    // Handle Escape
    if (this.input.isKeyJustPressed('Escape')) {
      audio.playSfx('cancel');
      this.battle.cancel();
      this.needsRedraw = true;
    }

    // Number key shortcuts for action menu
    if (state.phase === 'select_action') {
      const activeUnit = state.units.find(u => u.id === state.activeUnitId);
      if (activeUnit && activeUnit.team === 'player') {
        if (this.input.isKeyJustPressed('Digit1') && !activeUnit.hasMoved) {
          this.handleAction('move');
        }
        if (this.input.isKeyJustPressed('Digit2') && !activeUnit.hasActed) {
          this.handleAction('attack');
        }
        if (this.input.isKeyJustPressed('Digit3')) {
          this.handleAction('wait');
        }
      }
    }

    // Key 4 = cancel/back in sub-menus
    if (['select_move', 'select_target', 'confirm_facing'].includes(state.phase)) {
      if (this.input.isKeyJustPressed('Digit4')) {
        audio.playSfx('cancel');
        this.battle.cancel();
        this.needsRedraw = true;
      }
    }

    // Handle click
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

    // Process new damage displays -> spawn visual effects
    this.processDamageDisplays();

    // Redraw world
    this.redrawWorld();

    // Update cursor
    this.updateCursor();

    // Apply camera transform
    this.worldContainer.x = this.camera.x;
    this.worldContainer.y = this.camera.y;
    this.worldContainer.scale.set(this.camera.zoom);

    // Update HUD
    this.hud.update(state, this.hoveredTile);

    // Check for battle end
    this.checkBattleEnd();

    this.input.endFrame();
  }

  private processDamageDisplays(): void {
    if (!this.battle) return;

    const displays = this.battle.state.damageDisplay;
    while (this.lastDamageDisplayCount < displays.length) {
      const dd = displays[this.lastDamageDisplayCount];
      this.lastDamageDisplayCount++;

      // Find the unit to get its screen position
      const unit = this.battle.state.units.find((u) => u.id === dd.targetId);
      if (!unit) continue;

      const h = this.battle.state.map.tiles[unit.x]?.[unit.y]?.height ?? 0;
      const screen = worldToScreen(
        unit.x, unit.y, h,
        this.camera.rotation,
        this.battle.state.map.width,
        this.battle.state.map.height
      );

      // Determine damage number type
      let dmgType: DamageNumberType = 'normal';
      if (dd.isMiss) dmgType = 'miss';
      else if (dd.isHealing) dmgType = 'healing';
      else if (dd.isCritical) dmgType = 'critical';

      this.damageNumbers.addDamageNumber(screen.px, screen.py - 20, dd.amount, dmgType);

      // Spawn particle effect
      if (dd.isMiss) {
        // No particles for miss
      } else if (dd.isHealing) {
        this.particles.spawnEffect('heal', screen.px, screen.py - 10);
      } else if (dd.isCritical) {
        this.particles.spawnEffect('hit', screen.px, screen.py - 10);
        this.particles.spawnEffect('fire', screen.px, screen.py - 10);
      } else {
        this.particles.spawnEffect('hit', screen.px, screen.py - 10);
      }

      // Check if unit died
      if (unit && !unit.isAlive) {
        this.particles.spawnEffect('death', screen.px, screen.py - 10);
      }
    }
  }

  private checkBattleEnd(): void {
    if (!this.battle) return;
    const phase = this.battle.state.phase;

    if (phase === 'battle_won' && this.currentScene === 'battle') {
      this.currentScene = 'battle_results';
      audio.stopBgm(300);
      setTimeout(() => audio.playBgm('victory'), 500);

      // Show results after a delay
      setTimeout(() => {
        this.showBattleResults();
      }, 2000);
    } else if (phase === 'battle_lost' && this.currentScene === 'battle') {
      this.currentScene = 'battle_results';
      audio.stopBgm(300);
      setTimeout(() => audio.playBgm('gameover'), 500);

      // Show defeat screen
      setTimeout(() => {
        this.battleResultsUI.showDefeat(
          () => {
            // Retry
            audio.playSfx('confirm');
            audio.stopBgm(300);
            this.battleResultsUI.hide();
            if (this.currentBattle && this.deployedUnitIds.length > 0) {
              this.transitionTo('battle', () => {
                this.damageNumbers.clear();
                this.particles.clear();
                this.startBattle(this.currentBattle!, this.deployedUnitIds);
              });
            }
          },
          () => {
            // Quit to world map
            audio.playSfx('cancel');
            audio.stopBgm(300);
            this.transitionTo('world_map', () => {
              this.battleResultsUI.hide();
              this.battle = null;
              this.currentBattle = null;
              this.worldContainer.visible = false;
              this.damageNumbers.clear();
              this.particles.clear();
              this.showWorldMap();
            });
          }
        );
      }, 2000);
    }
  }

  // ─── Rendering ───

  private redrawWorld(): void {
    if (this.needsRedraw) {
      this.needsRedraw = false;
      this.redrawTiles();
      this.redrawRangeOverlays();
    }
    this.redrawUnits();
  }

  private redrawTiles(): void {
    if (!this.battle) return;
    this.tileLayer.removeChildren();
    const state = this.battle.state;
    const tiles = createMapTiles(state.map, this.camera.rotation);
    for (const tile of tiles) {
      this.tileLayer.addChild(tile.container);
    }
    this.drawBackground();
  }

  private drawBackground(): void {
    if (!this.battle) return;
    this.backgroundLayer.removeChildren();

    const state = this.battle.state;
    const map = state.map;

    // Determine dominant terrain color
    const terrainCounts = new Map<string, number>();
    for (let x = 0; x < map.width; x++) {
      for (let y = 0; y < map.height; y++) {
        const t = map.tiles[x][y].terrain;
        terrainCounts.set(t, (terrainCounts.get(t) || 0) + 1);
      }
    }
    let dominantTerrain = 'grass';
    let maxCount = 0;
    for (const [terrain, count] of terrainCounts) {
      if (count > maxCount) {
        maxCount = count;
        dominantTerrain = terrain;
      }
    }

    // Map terrain to MUCH darker ground colors — the map sits on a dark landscape
    const terrainColors: Record<string, { base: number; dark: number; deepDark: number }> = {
      grass:  { base: 0x0e1a0a, dark: 0x070d05, deepDark: 0x030602 },
      stone:  { base: 0x141414, dark: 0x0a0a0a, deepDark: 0x040404 },
      water:  { base: 0x060e14, dark: 0x030710, deepDark: 0x010306 },
      sand:   { base: 0x14120a, dark: 0x0a0905, deepDark: 0x040302 },
      dirt:   { base: 0x100c08, dark: 0x080604, deepDark: 0x030201 },
      lava:   { base: 0x100400, dark: 0x080200, deepDark: 0x040100 },
      wood:   { base: 0x0e0a04, dark: 0x070502, deepDark: 0x030201 },
      roof:   { base: 0x0e0808, dark: 0x070404, deepDark: 0x030202 },
    };

    const colors = terrainColors[dominantTerrain] || terrainColors.grass;

    // Calculate map center in screen coords
    const centerScreen = worldToScreen(
      map.width / 2, map.height / 2, 0,
      this.camera.rotation, map.width, map.height
    );

    // Create a large ground plane extending infinitely in all directions
    const extend = 4000; // large enough to cover any scroll/zoom
    const bg = new PIXI.Graphics();

    // Fill entire area with the deepest dark color
    bg.rect(
      centerScreen.px - extend,
      centerScreen.py - extend,
      extend * 2,
      extend * 2
    );
    bg.fill(colors.deepDark);

    // Build concentric rectangles from outside in, getting lighter toward center
    // This creates a vignette: dark at edges, slightly lighter near the map
    const vignetteSteps = 12;
    for (let i = 0; i <= vignetteSteps; i++) {
      const t = i / vignetteSteps; // 0 = outermost, 1 = innermost
      const size = extend * (1.0 - t * 0.75); // shrinks from full extend to 25%

      // Blend from deepDark at edges to base near center
      const r0 = (colors.deepDark >> 16) & 0xff;
      const g0 = (colors.deepDark >> 8) & 0xff;
      const b0 = colors.deepDark & 0xff;
      const r1 = (colors.base >> 16) & 0xff;
      const g1 = (colors.base >> 8) & 0xff;
      const b1 = colors.base & 0xff;
      const r = Math.round(r0 + (r1 - r0) * t);
      const g = Math.round(g0 + (g1 - g0) * t);
      const b = Math.round(b0 + (b1 - b0) * t);
      const blendedColor = (r << 16) | (g << 8) | b;

      bg.rect(
        centerScreen.px - size,
        centerScreen.py - size,
        size * 2,
        size * 2
      );
      bg.fill(blendedColor);
    }

    // Vignette overlay: darken the outer edges with semi-transparent black rings
    const vignetteOverlay = new PIXI.Graphics();
    const vSteps = 10;
    for (let i = vSteps; i >= 1; i--) {
      const t = i / vSteps;
      const outerSize = extend * (0.5 + 0.5 * t);
      vignetteOverlay.rect(
        centerScreen.px - outerSize,
        centerScreen.py - outerSize,
        outerSize * 2,
        outerSize * 2
      );
      vignetteOverlay.fill({ color: 0x000000, alpha: 0.06 * t });
    }

    this.backgroundLayer.addChild(bg);
    this.backgroundLayer.addChild(vignetteOverlay);
  }

  private redrawRangeOverlays(): void {
    if (!this.battle) return;
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
    if (!this.battle) return;
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

    sprites.sort((a, b) => a.depth - b.depth);
    for (const sprite of sprites) {
      this.unitLayer.addChild(sprite.container);
    }
  }

  private updateCursor(): void {
    if (!this.battle || !this.hoveredTile) {
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

  // ─── Input Handling ───

  private handleTileClick(x: number, y: number): void {
    if (!this.battle) return;
    const state = this.battle.state;

    switch (state.phase) {
      case 'select_move':
        if (this.battle.confirmMove(x, y)) {
          audio.playSfx('confirm');
          this.needsRedraw = true;
        }
        break;

      case 'select_target': {
        const targetUnit = this.battle.state.units.find(
          (u) => u.x === x && u.y === y && u.isAlive
        );
        const attackingUnit = this.battle.getActiveUnit();
        const isMagicAttack = attackingUnit?.weaponCategory === 'staff' || attackingUnit?.weaponCategory === 'rod';

        if (this.battle.confirmAttack(x, y)) {
          const lastResult = targetUnit?.lastDamageResult;
          const wasMiss = lastResult && lastResult.isMiss;

          if (wasMiss) {
            audio.playSfx('cancel');
          } else {
            if (isMagicAttack) {
              audio.playSfx('magic');
            } else {
              audio.playAttack();
            }
            setTimeout(() => audio.playSfx('hit'), 200);
          }

          if (targetUnit && !targetUnit.isAlive) {
            setTimeout(() => audio.playSfx('death'), 300);
          }

          this.needsRedraw = true;
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
      return dx >= 0 ? 1 : 3;
    }
    return dy >= 0 ? 2 : 0;
  }

  private handleAction(action: string): void {
    if (!this.battle) return;
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
}
