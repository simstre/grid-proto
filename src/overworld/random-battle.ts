// ─── Random Encounter System ───

import type { JobId } from '@/data/jobs';
import type { EnemyUnitConfig } from '@/data/campaign';

// ─── Job pools by chapter (more advanced jobs unlock in later chapters) ───

const CHAPTER_JOB_POOLS: Record<number, JobId[]> = {
  1: ['squire', 'chemist', 'archer', 'knight'],
  2: ['squire', 'knight', 'archer', 'blackMage', 'whiteMage', 'monk', 'thief'],
  3: ['knight', 'archer', 'blackMage', 'whiteMage', 'monk', 'thief', 'timeMage', 'dragoon', 'ninja'],
  4: ['knight', 'monk', 'ninja', 'samurai', 'dragoon', 'summoner', 'blackMage', 'whiteMage', 'geomancer'],
};

// ─── Helpers ───

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── RandomBattleGenerator ───

export class RandomBattleGenerator {
  /** Encounter trigger chance (40%) */
  private encounterRate = 0.4;

  /**
   * Roll whether a random encounter should trigger.
   * Called when the player crosses a random_encounter node.
   */
  shouldTrigger(): boolean {
    return Math.random() < this.encounterRate;
  }

  /**
   * Generate a random enemy formation scaled to the player's level and chapter.
   */
  generateEncounter(
    playerLevel: number,
    chapter: number,
    startPositions: { x: number; y: number }[]
  ): EnemyUnitConfig[] {
    const jobPool = CHAPTER_JOB_POOLS[Math.min(chapter, 4)] ?? CHAPTER_JOB_POOLS[1];

    // Enemy count: 3–5
    const enemyCount = randomInt(3, Math.min(5, startPositions.length));

    const enemies: EnemyUnitConfig[] = [];

    for (let i = 0; i < enemyCount; i++) {
      const jobId = randomElement(jobPool);

      // Enemy level: playerLevel ± 2, minimum 1
      const level = Math.max(1, playerLevel + randomInt(-2, 2));

      const position = startPositions[i] ?? startPositions[startPositions.length - 1];

      enemies.push({
        jobId,
        level,
        position: { ...position },
        name: `${jobId.charAt(0).toUpperCase() + jobId.slice(1)} ${String.fromCharCode(65 + i)}`,
      });
    }

    return enemies;
  }

  /**
   * Get a random map ID suitable for encounters.
   * Randomly selects from available maps.
   */
  getRandomMapId(): string {
    const maps = [
      'orbonne-monastery',
      'magic-city-gariland',
      'sweegy-woods',
      'dorter-trade-city',
    ];
    return randomElement(maps);
  }
}

export const randomBattleGenerator = new RandomBattleGenerator();
