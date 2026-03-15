// ─── AI Behavior Profiles ───
// Each behavior modifies the base scoring weights to create distinct AI personalities,
// faithful to FFT's varied enemy AI patterns.

export type AIBehavior = 'aggressive' | 'defensive' | 'healer' | 'support' | 'coward';

export interface ScoringWeights {
  killPotential: number;
  damageDealt: number;
  healingAlly: number;
  selfPreservation: number;
  clustering: number;
  afterMoveVulnerability: number;
  statusInfliction: number;
  fleeFromEnemies: number;
  buffAllies: number;
  avoidCombat: number;
}

/** Default (neutral) weight multipliers — all 1.0 */
const BASE_WEIGHTS: ScoringWeights = {
  killPotential: 1.0,
  damageDealt: 1.0,
  healingAlly: 1.0,
  selfPreservation: 1.0,
  clustering: 1.0,
  afterMoveVulnerability: 1.0,
  statusInfliction: 1.0,
  fleeFromEnemies: 1.0,
  buffAllies: 1.0,
  avoidCombat: 1.0,
};

const BEHAVIOR_WEIGHTS: Record<AIBehavior, ScoringWeights> = {
  aggressive: {
    ...BASE_WEIGHTS,
    killPotential: 1.5,
    damageDealt: 1.5,
    selfPreservation: 0.5,
    afterMoveVulnerability: 0.5,
    clustering: 0.7,
  },

  defensive: {
    ...BASE_WEIGHTS,
    selfPreservation: 1.5,
    clustering: 2.0,
    afterMoveVulnerability: 1.5,
    damageDealt: 0.8,
  },

  healer: {
    ...BASE_WEIGHTS,
    healingAlly: 3.0,
    fleeFromEnemies: 2.0,
    selfPreservation: 1.5,
    damageDealt: 0.3,
    killPotential: 0.3,
    clustering: 1.5,
  },

  support: {
    ...BASE_WEIGHTS,
    buffAllies: 2.5,
    avoidCombat: 2.0,
    damageDealt: 0.4,
    killPotential: 0.5,
    clustering: 1.5,
    selfPreservation: 1.2,
  },

  coward: {
    ...BASE_WEIGHTS,
    selfPreservation: 2.0,
    fleeFromEnemies: 2.5,
    afterMoveVulnerability: 2.0,
    damageDealt: 0.5,
    killPotential: 0.7,
    clustering: 1.5,
  },
};

/**
 * Get the scoring weight multipliers for a given AI behavior.
 */
export function getBehaviorWeights(behavior: AIBehavior): ScoringWeights {
  return { ...BEHAVIOR_WEIGHTS[behavior] };
}

/**
 * Map a job name to a default AI behavior.
 */
export function getDefaultBehavior(jobName: string): AIBehavior {
  const lower = jobName.toLowerCase();

  if (lower.includes('knight') || lower.includes('squire') || lower.includes('monk') || lower.includes('samurai') || lower.includes('dragoon')) {
    return 'aggressive';
  }
  if (lower.includes('mage') || lower.includes('wizard') || lower.includes('summoner') || lower.includes('time')) {
    return 'support';
  }
  if (lower.includes('archer') || lower.includes('thief') || lower.includes('ninja') || lower.includes('geomancer')) {
    return 'defensive';
  }
  if (lower.includes('priest') || lower.includes('healer') || lower.includes('white') || lower.includes('oracle') || lower.includes('chemist')) {
    return 'healer';
  }

  // Default to aggressive for unknown jobs
  return 'aggressive';
}
