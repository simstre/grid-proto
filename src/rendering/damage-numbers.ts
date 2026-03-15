// ─── Floating Damage Number Renderer ───

import * as PIXI from 'pixi.js';

export type DamageNumberType = 'normal' | 'critical' | 'healing' | 'miss';

interface FloatingNumber {
  text: PIXI.Text;
  startY: number;
  elapsed: number;
  lifetime: number;
}

const DAMAGE_COLORS: Record<DamageNumberType, string> = {
  normal: '#ffffff',
  critical: '#ffee44',
  healing: '#44dd44',
  miss: '#aaaaaa',
};

const FLOAT_SPEED = 40; // pixels per second (in world space)
const DEFAULT_LIFETIME = 1.0; // seconds

export class DamageNumberRenderer {
  readonly container: PIXI.Container;
  private numbers: FloatingNumber[] = [];

  constructor() {
    this.container = new PIXI.Container();
  }

  /**
   * Spawn a floating damage number at a world position.
   */
  addDamageNumber(
    worldX: number,
    worldY: number,
    amount: number,
    type: DamageNumberType
  ): void {
    const displayText = type === 'miss' ? 'MISS' : String(amount);
    const fontSize = type === 'critical' ? 16 : 13;

    const text = new PIXI.Text({
      text: displayText,
      style: new PIXI.TextStyle({
        fontFamily: '"Press Start 2P", "Courier New", monospace',
        fontSize,
        fill: DAMAGE_COLORS[type],
        stroke: { color: '#000000', width: 3 },
        dropShadow: {
          alpha: 0.8,
          angle: Math.PI / 4,
          blur: 1,
          color: '#000000',
          distance: 2,
        },
        fontWeight: type === 'critical' ? 'bold' : 'normal',
      }),
    });

    text.anchor.set(0.5, 1);
    text.x = worldX;
    text.y = worldY;

    this.container.addChild(text);
    this.numbers.push({
      text,
      startY: worldY,
      elapsed: 0,
      lifetime: DEFAULT_LIFETIME,
    });
  }

  /**
   * Update all floating numbers — move upward and fade out.
   */
  update(dt: number): void {
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const num = this.numbers[i];
      num.elapsed += dt;

      const progress = num.elapsed / num.lifetime;

      // Float upward
      num.text.y = num.startY - FLOAT_SPEED * num.elapsed;

      // Fade out in the second half
      if (progress > 0.5) {
        num.text.alpha = 1 - (progress - 0.5) * 2;
      }

      // Scale pop on spawn
      if (progress < 0.15) {
        const pop = 1 + 0.3 * (1 - progress / 0.15);
        num.text.scale.set(pop);
      } else {
        num.text.scale.set(1);
      }

      // Remove when lifetime expires
      if (num.elapsed >= num.lifetime) {
        this.container.removeChild(num.text);
        num.text.destroy();
        this.numbers.splice(i, 1);
      }
    }
  }

  /**
   * Remove all active damage numbers.
   */
  clear(): void {
    for (const num of this.numbers) {
      this.container.removeChild(num.text);
      num.text.destroy();
    }
    this.numbers = [];
  }
}
