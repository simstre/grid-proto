// ─── Simple Particle System for Spell Effects ───

import * as PIXI from 'pixi.js';

export type ParticleEffectType = 'fire' | 'ice' | 'lightning' | 'heal' | 'hit' | 'death';

interface Particle {
  gfx: PIXI.Graphics;
  vx: number;
  vy: number;
  lifetime: number;
  elapsed: number;
  startAlpha: number;
  size: number;
}

interface EffectConfig {
  count: number;
  lifetime: [number, number]; // min, max
  speed: [number, number];
  colors: number[];
  sizeRange: [number, number];
  gravity: number;
  spread: number; // radial spread in pixels
  directionBias: { x: number; y: number }; // directional velocity bias
}

const EFFECT_CONFIGS: Record<ParticleEffectType, EffectConfig> = {
  fire: {
    count: 15,
    lifetime: [0.5, 1.0],
    speed: [20, 60],
    colors: [0xff4400, 0xff6600, 0xff8800, 0xffaa00, 0xffcc00],
    sizeRange: [2, 5],
    gravity: -30,
    spread: 8,
    directionBias: { x: 0, y: -1 },
  },
  ice: {
    count: 12,
    lifetime: [0.4, 0.8],
    speed: [15, 40],
    colors: [0x88ccff, 0x66aaff, 0xaaddff, 0xccf0ff],
    sizeRange: [2, 4],
    gravity: 20,
    spread: 12,
    directionBias: { x: 0, y: 0.5 },
  },
  lightning: {
    count: 10,
    lifetime: [0.1, 0.4],
    speed: [40, 100],
    colors: [0xffff44, 0xffffaa, 0xffff00, 0xeeff88],
    sizeRange: [1, 3],
    gravity: 0,
    spread: 15,
    directionBias: { x: 0, y: 0 },
  },
  heal: {
    count: 12,
    lifetime: [0.6, 1.0],
    speed: [10, 30],
    colors: [0x44ff44, 0x88ff88, 0x22dd22, 0xaaffaa],
    sizeRange: [2, 4],
    gravity: -20,
    spread: 10,
    directionBias: { x: 0, y: -1 },
  },
  hit: {
    count: 15,
    lifetime: [0.2, 0.5],
    speed: [30, 80],
    colors: [0xffffff, 0xeeeeee, 0xdddddd],
    sizeRange: [1, 3],
    gravity: 0,
    spread: 6,
    directionBias: { x: 0, y: 0 },
  },
  death: {
    count: 20,
    lifetime: [0.5, 1.0],
    speed: [10, 40],
    colors: [0x332244, 0x443355, 0x221133, 0x554466],
    sizeRange: [2, 5],
    gravity: 10,
    spread: 15,
    directionBias: { x: 0, y: 0.3 },
  },
};

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class ParticleSystem {
  readonly container: PIXI.Container;
  private particles: Particle[] = [];

  constructor() {
    this.container = new PIXI.Container();
  }

  /**
   * Spawn a particle effect at a world position.
   */
  spawnEffect(type: ParticleEffectType, worldX: number, worldY: number): void {
    const config = EFFECT_CONFIGS[type];

    for (let i = 0; i < config.count; i++) {
      const size = randRange(config.sizeRange[0], config.sizeRange[1]);
      const color = pickRandom(config.colors);
      const speed = randRange(config.speed[0], config.speed[1]);
      const lifetime = randRange(config.lifetime[0], config.lifetime[1]);

      // Random direction with bias
      const angle = Math.random() * Math.PI * 2;
      const vx = Math.cos(angle) * speed + config.directionBias.x * speed;
      const vy = Math.sin(angle) * speed + config.directionBias.y * speed;

      // Random offset within spread
      const ox = (Math.random() - 0.5) * config.spread * 2;
      const oy = (Math.random() - 0.5) * config.spread * 2;

      const gfx = new PIXI.Graphics();
      gfx.circle(0, 0, size);
      gfx.fill(color);
      gfx.x = worldX + ox;
      gfx.y = worldY + oy;

      this.container.addChild(gfx);
      this.particles.push({
        gfx,
        vx,
        vy,
        lifetime,
        elapsed: 0,
        startAlpha: 0.9,
        size,
      });
    }
  }

  /**
   * Update all particles — move, fade, remove expired.
   */
  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.elapsed += dt;

      const progress = p.elapsed / p.lifetime;

      // Move
      p.gfx.x += p.vx * dt;
      p.gfx.y += p.vy * dt;

      // Fade out
      p.gfx.alpha = p.startAlpha * (1 - progress);

      // Shrink near end
      if (progress > 0.7) {
        const shrink = 1 - (progress - 0.7) / 0.3;
        p.gfx.scale.set(shrink);
      }

      // Remove expired
      if (p.elapsed >= p.lifetime) {
        this.container.removeChild(p.gfx);
        p.gfx.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Remove all active particles.
   */
  clear(): void {
    for (const p of this.particles) {
      this.container.removeChild(p.gfx);
      p.gfx.destroy();
    }
    this.particles = [];
  }
}
