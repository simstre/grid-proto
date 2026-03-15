// ─── Ability Definitions ───

import type { JobId } from './jobs';
import type { Element } from './elements';
import type { StatusId } from '@/battle/status-effects';

// ─── Types ───

export type AbilityType = 'action' | 'reaction' | 'support' | 'movement';
export type AoeShape = 'single' | 'line' | 'cross' | 'diamond' | 'square';

export interface AbilityDefinition {
  id: string;
  name: string;
  type: AbilityType;
  jobId: JobId;
  jpCost: number;
  description: string;

  // Action-specific fields
  mpCost?: number;
  range?: number;
  aoeShape?: AoeShape;
  aoeSize?: number;
  chargeTime?: number;
  power?: number;
  element?: Element;
  formulaType?: 'physical' | 'magical' | 'healing' | 'item' | 'fixed' | 'self';
  statusInflicted?: StatusId;
  statusChance?: number;
  reflectable?: boolean;

  // Reaction-specific fields
  triggerCondition?: string;
  activationStat?: 'brave' | 'faith';

  // Support/Movement-specific fields
  passiveEffect?: string;
}

// ─── Ability Data ───

const abilityDefs: AbilityDefinition[] = [
  // ──── Squire: Fundamentals ────
  {
    id: 'accumulate', name: 'Accumulate', type: 'action', jobId: 'squire', jpCost: 50,
    description: 'Raise own PA by 1 for the duration of battle.',
    mpCost: 0, range: 0, aoeShape: 'single', aoeSize: 0, chargeTime: 0,
    formulaType: 'self',
  },
  {
    id: 'throwStone', name: 'Throw Stone', type: 'action', jobId: 'squire', jpCost: 90,
    description: 'Throw a stone at an enemy for light damage.',
    mpCost: 0, range: 4, aoeShape: 'single', aoeSize: 0, chargeTime: 0,
    power: 4, formulaType: 'physical',
  },
  {
    id: 'yell', name: 'Yell', type: 'action', jobId: 'squire', jpCost: 150,
    description: 'Raise own Speed by 1.',
    mpCost: 0, range: 0, aoeShape: 'single', aoeSize: 0, chargeTime: 0,
    formulaType: 'self',
  },
  {
    id: 'wish', name: 'Wish', type: 'action', jobId: 'squire', jpCost: 200,
    description: 'Restore HP to self equal to half max HP.',
    mpCost: 0, range: 0, aoeShape: 'single', aoeSize: 0, chargeTime: 0,
    formulaType: 'healing',
  },
  {
    id: 'cheerUp', name: 'Cheer Up', type: 'action', jobId: 'squire', jpCost: 200,
    description: 'Raise own Brave by 5.',
    mpCost: 0, range: 0, aoeShape: 'single', aoeSize: 0, chargeTime: 0,
    formulaType: 'self',
  },

  // ──── Chemist: Items ────
  {
    id: 'usePotion', name: 'Potion', type: 'action', jobId: 'chemist', jpCost: 30,
    description: 'Use a Potion to restore 30 HP.',
    mpCost: 0, range: 4, aoeShape: 'single', aoeSize: 0, chargeTime: 0,
    power: 30, formulaType: 'item',
  },
  {
    id: 'useHiPotion', name: 'Hi-Potion', type: 'action', jobId: 'chemist', jpCost: 200,
    description: 'Use a Hi-Potion to restore 70 HP.',
    mpCost: 0, range: 4, aoeShape: 'single', aoeSize: 0, chargeTime: 0,
    power: 70, formulaType: 'item',
  },
  {
    id: 'usePhoenixDown', name: 'Phoenix Down', type: 'action', jobId: 'chemist', jpCost: 200,
    description: 'Revive a fallen ally.',
    mpCost: 0, range: 4, aoeShape: 'single', aoeSize: 0, chargeTime: 0,
    formulaType: 'item',
  },
  {
    id: 'useAntidote', name: 'Antidote', type: 'action', jobId: 'chemist', jpCost: 70,
    description: 'Remove Poison status from a unit.',
    mpCost: 0, range: 4, aoeShape: 'single', aoeSize: 0, chargeTime: 0,
    formulaType: 'item', statusInflicted: 'poison',
  },
  {
    id: 'useEyeDrops', name: 'Eye Drops', type: 'action', jobId: 'chemist', jpCost: 80,
    description: 'Remove Blind status from a unit.',
    mpCost: 0, range: 4, aoeShape: 'single', aoeSize: 0, chargeTime: 0,
    formulaType: 'item', statusInflicted: 'blind',
  },

  // ──── Knight: Battle Skill ────
  {
    id: 'speedBreak', name: 'Speed Break', type: 'action', jobId: 'knight', jpCost: 150,
    description: 'Reduce target Speed by 2.',
    mpCost: 0, range: 1, aoeShape: 'single', aoeSize: 0, chargeTime: 0,
    formulaType: 'physical',
  },
  {
    id: 'powerBreak', name: 'Power Break', type: 'action', jobId: 'knight', jpCost: 200,
    description: 'Reduce target PA by 3.',
    mpCost: 0, range: 1, aoeShape: 'single', aoeSize: 0, chargeTime: 0,
    formulaType: 'physical',
  },
  {
    id: 'magicBreak', name: 'Magic Break', type: 'action', jobId: 'knight', jpCost: 200,
    description: 'Reduce target MA by 3.',
    mpCost: 0, range: 1, aoeShape: 'single', aoeSize: 0, chargeTime: 0,
    formulaType: 'physical',
  },
  {
    id: 'armorBreak', name: 'Armor Break', type: 'action', jobId: 'knight', jpCost: 300,
    description: 'Destroy target armor, removing its stat bonuses.',
    mpCost: 0, range: 1, aoeShape: 'single', aoeSize: 0, chargeTime: 0,
    formulaType: 'physical',
  },
  {
    id: 'weaponBreak', name: 'Weapon Break', type: 'action', jobId: 'knight', jpCost: 300,
    description: 'Destroy target weapon, removing its stat bonuses.',
    mpCost: 0, range: 1, aoeShape: 'single', aoeSize: 0, chargeTime: 0,
    formulaType: 'physical',
  },

  // ──── Archer: Charge ────
  {
    id: 'chargePlus1', name: 'Charge+1', type: 'action', jobId: 'archer', jpCost: 100,
    description: 'Fire a charged shot with extra power.',
    mpCost: 0, range: 5, aoeShape: 'single', aoeSize: 0, chargeTime: 1,
    power: 1, formulaType: 'physical',
  },
  {
    id: 'chargePlus2', name: 'Charge+2', type: 'action', jobId: 'archer', jpCost: 200,
    description: 'Fire a charged shot with extra power.',
    mpCost: 0, range: 5, aoeShape: 'single', aoeSize: 0, chargeTime: 2,
    power: 2, formulaType: 'physical',
  },
  {
    id: 'chargePlus3', name: 'Charge+3', type: 'action', jobId: 'archer', jpCost: 300,
    description: 'Fire a charged shot with extra power.',
    mpCost: 0, range: 5, aoeShape: 'single', aoeSize: 0, chargeTime: 3,
    power: 3, formulaType: 'physical',
  },
  {
    id: 'chargePlus4', name: 'Charge+4', type: 'action', jobId: 'archer', jpCost: 450,
    description: 'Fire a charged shot with extra power.',
    mpCost: 0, range: 5, aoeShape: 'single', aoeSize: 0, chargeTime: 4,
    power: 4, formulaType: 'physical',
  },
  {
    id: 'chargePlus5', name: 'Charge+5', type: 'action', jobId: 'archer', jpCost: 600,
    description: 'Fire a charged shot with extra power.',
    mpCost: 0, range: 5, aoeShape: 'single', aoeSize: 0, chargeTime: 5,
    power: 5, formulaType: 'physical',
  },

  // ──── White Mage: White Magic ────
  {
    id: 'cure', name: 'Cure', type: 'action', jobId: 'whiteMage', jpCost: 50,
    description: 'Restore a small amount of HP.',
    mpCost: 6, range: 4, aoeShape: 'single', aoeSize: 0, chargeTime: 4,
    power: 14, formulaType: 'healing', reflectable: true,
  },
  {
    id: 'cura', name: 'Cura', type: 'action', jobId: 'whiteMage', jpCost: 180,
    description: 'Restore a moderate amount of HP in an area.',
    mpCost: 10, range: 4, aoeShape: 'diamond', aoeSize: 1, chargeTime: 5,
    power: 20, formulaType: 'healing', reflectable: true,
  },
  {
    id: 'curaga', name: 'Curaga', type: 'action', jobId: 'whiteMage', jpCost: 500,
    description: 'Restore a large amount of HP in a wide area.',
    mpCost: 16, range: 4, aoeShape: 'diamond', aoeSize: 2, chargeTime: 7,
    power: 28, formulaType: 'healing', reflectable: true,
  },
  {
    id: 'raise', name: 'Raise', type: 'action', jobId: 'whiteMage', jpCost: 200,
    description: 'Revive a fallen ally with partial HP.',
    mpCost: 10, range: 4, aoeShape: 'single', aoeSize: 0, chargeTime: 4,
    formulaType: 'healing', reflectable: false,
  },
  {
    id: 'protect', name: 'Protect', type: 'action', jobId: 'whiteMage', jpCost: 150,
    description: 'Grant Protect status, reducing physical damage taken.',
    mpCost: 6, range: 4, aoeShape: 'single', aoeSize: 0, chargeTime: 3,
    formulaType: 'magical', statusInflicted: 'protect', statusChance: 100, reflectable: true,
  },
  {
    id: 'shell', name: 'Shell', type: 'action', jobId: 'whiteMage', jpCost: 150,
    description: 'Grant Shell status, reducing magical damage taken.',
    mpCost: 6, range: 4, aoeShape: 'single', aoeSize: 0, chargeTime: 3,
    formulaType: 'magical', statusInflicted: 'shell', statusChance: 100, reflectable: true,
  },
  {
    id: 'esuna', name: 'Esuna', type: 'action', jobId: 'whiteMage', jpCost: 280,
    description: 'Remove negative status effects from a unit.',
    mpCost: 18, range: 4, aoeShape: 'single', aoeSize: 0, chargeTime: 5,
    formulaType: 'healing', reflectable: true,
  },

  // ──── Black Mage: Black Magic ────
  {
    id: 'fire', name: 'Fire', type: 'action', jobId: 'blackMage', jpCost: 50,
    description: 'Deal fire damage to a target.',
    mpCost: 6, range: 4, aoeShape: 'single', aoeSize: 0, chargeTime: 4,
    power: 14, element: 'fire' as Element, formulaType: 'magical', reflectable: true,
  },
  {
    id: 'fira', name: 'Fira', type: 'action', jobId: 'blackMage', jpCost: 200,
    description: 'Deal fire damage in an area.',
    mpCost: 12, range: 4, aoeShape: 'diamond', aoeSize: 1, chargeTime: 6,
    power: 24, element: 'fire' as Element, formulaType: 'magical', reflectable: true,
  },
  {
    id: 'firaga', name: 'Firaga', type: 'action', jobId: 'blackMage', jpCost: 500,
    description: 'Deal massive fire damage in a wide area.',
    mpCost: 24, range: 4, aoeShape: 'diamond', aoeSize: 2, chargeTime: 8,
    power: 36, element: 'fire' as Element, formulaType: 'magical', reflectable: true,
  },
  {
    id: 'thunder', name: 'Thunder', type: 'action', jobId: 'blackMage', jpCost: 50,
    description: 'Deal lightning damage to a target.',
    mpCost: 6, range: 4, aoeShape: 'single', aoeSize: 0, chargeTime: 4,
    power: 14, element: 'lightning' as Element, formulaType: 'magical', reflectable: true,
  },
  {
    id: 'thundara', name: 'Thundara', type: 'action', jobId: 'blackMage', jpCost: 200,
    description: 'Deal lightning damage in an area.',
    mpCost: 12, range: 4, aoeShape: 'diamond', aoeSize: 1, chargeTime: 6,
    power: 24, element: 'lightning' as Element, formulaType: 'magical', reflectable: true,
  },
  {
    id: 'thundaga', name: 'Thundaga', type: 'action', jobId: 'blackMage', jpCost: 500,
    description: 'Deal massive lightning damage in a wide area.',
    mpCost: 24, range: 4, aoeShape: 'diamond', aoeSize: 2, chargeTime: 8,
    power: 36, element: 'lightning' as Element, formulaType: 'magical', reflectable: true,
  },
  {
    id: 'blizzard', name: 'Blizzard', type: 'action', jobId: 'blackMage', jpCost: 50,
    description: 'Deal ice damage to a target.',
    mpCost: 6, range: 4, aoeShape: 'single', aoeSize: 0, chargeTime: 4,
    power: 14, element: 'ice' as Element, formulaType: 'magical', reflectable: true,
  },
  {
    id: 'blizzara', name: 'Blizzara', type: 'action', jobId: 'blackMage', jpCost: 200,
    description: 'Deal ice damage in an area.',
    mpCost: 12, range: 4, aoeShape: 'diamond', aoeSize: 1, chargeTime: 6,
    power: 24, element: 'ice' as Element, formulaType: 'magical', reflectable: true,
  },
  {
    id: 'blizzaga', name: 'Blizzaga', type: 'action', jobId: 'blackMage', jpCost: 500,
    description: 'Deal massive ice damage in a wide area.',
    mpCost: 24, range: 4, aoeShape: 'diamond', aoeSize: 2, chargeTime: 8,
    power: 36, element: 'ice' as Element, formulaType: 'magical', reflectable: true,
  },

  // ──── Monk: Punch Art ────
  {
    id: 'waveFist', name: 'Wave Fist', type: 'action', jobId: 'monk', jpCost: 150,
    description: 'Send a shockwave at a distant enemy.',
    mpCost: 0, range: 3, aoeShape: 'single', aoeSize: 0, chargeTime: 0,
    power: 10, formulaType: 'physical',
  },
  {
    id: 'earthSlash', name: 'Earth Slash', type: 'action', jobId: 'monk', jpCost: 200,
    description: 'Send a line of earth energy at enemies.',
    mpCost: 0, range: 3, aoeShape: 'line', aoeSize: 3, chargeTime: 0,
    power: 12, element: 'earth' as Element, formulaType: 'physical',
  },
  {
    id: 'chakra', name: 'Chakra', type: 'action', jobId: 'monk', jpCost: 250,
    description: 'Restore HP and MP to self and adjacent allies.',
    mpCost: 0, range: 0, aoeShape: 'diamond', aoeSize: 1, chargeTime: 0,
    formulaType: 'healing',
  },
  {
    id: 'revive', name: 'Revive', type: 'action', jobId: 'monk', jpCost: 400,
    description: 'Revive a fallen adjacent ally.',
    mpCost: 0, range: 1, aoeShape: 'single', aoeSize: 0, chargeTime: 0,
    formulaType: 'healing',
  },
  {
    id: 'aurablast', name: 'Aurablast', type: 'action', jobId: 'monk', jpCost: 500,
    description: 'Unleash a powerful blast of aura energy.',
    mpCost: 0, range: 2, aoeShape: 'single', aoeSize: 0, chargeTime: 0,
    power: 16, formulaType: 'physical',
  },

  // ──── Time Mage: Time Magic ────
  {
    id: 'haste', name: 'Haste', type: 'action', jobId: 'timeMage', jpCost: 100,
    description: 'Grant Haste status, increasing CT accumulation.',
    mpCost: 8, range: 4, aoeShape: 'single', aoeSize: 0, chargeTime: 3,
    formulaType: 'magical', statusInflicted: 'haste', statusChance: 100, reflectable: true,
  },
  {
    id: 'slow', name: 'Slow', type: 'action', jobId: 'timeMage', jpCost: 100,
    description: 'Inflict Slow status, decreasing CT accumulation.',
    mpCost: 8, range: 4, aoeShape: 'single', aoeSize: 0, chargeTime: 3,
    formulaType: 'magical', statusInflicted: 'slow', statusChance: 100, reflectable: true,
  },
  {
    id: 'stop', name: 'Stop', type: 'action', jobId: 'timeMage', jpCost: 350,
    description: 'Inflict Stop status, preventing all actions.',
    mpCost: 14, range: 4, aoeShape: 'single', aoeSize: 0, chargeTime: 5,
    formulaType: 'magical', statusInflicted: 'stop', statusChance: 100, reflectable: true,
  },
  {
    id: 'float', name: 'Float', type: 'action', jobId: 'timeMage', jpCost: 200,
    description: 'Grant Float status, avoiding ground-based effects.',
    mpCost: 8, range: 4, aoeShape: 'single', aoeSize: 0, chargeTime: 3,
    formulaType: 'magical', statusInflicted: 'float', statusChance: 100, reflectable: true,
  },
  {
    id: 'teleport', name: 'Teleport', type: 'action', jobId: 'timeMage', jpCost: 500,
    description: 'Instantly move to a distant tile.',
    mpCost: 16, range: 0, aoeShape: 'single', aoeSize: 0, chargeTime: 4,
    formulaType: 'self',
  },
  {
    id: 'quick', name: 'Quick', type: 'action', jobId: 'timeMage', jpCost: 800,
    description: 'Grant an immediate extra turn to target ally.',
    mpCost: 24, range: 4, aoeShape: 'single', aoeSize: 0, chargeTime: 3,
    formulaType: 'magical', reflectable: false,
  },

  // ──── Reaction Abilities ────
  {
    id: 'counterTackle', name: 'Counter Tackle', type: 'reaction', jobId: 'squire', jpCost: 180,
    description: 'Counter physical attacks with a tackle.',
    triggerCondition: 'physical_damage_received',
    activationStat: 'brave',
  },
  {
    id: 'firstStrike', name: 'First Strike', type: 'reaction', jobId: 'knight', jpCost: 1200,
    description: 'Preemptively attack enemies that enter your attack range.',
    triggerCondition: 'enemy_enters_range',
    activationStat: 'brave',
  },
  {
    id: 'autoPotion', name: 'Auto Potion', type: 'reaction', jobId: 'chemist', jpCost: 400,
    description: 'Automatically use a Potion when taking damage.',
    triggerCondition: 'damage_received',
    activationStat: 'brave',
  },

  // ──── Support Abilities ────
  {
    id: 'attackUp', name: 'Attack UP', type: 'support', jobId: 'knight', jpCost: 500,
    description: 'Increase physical attack damage by 33%.',
    passiveEffect: 'physical_damage_multiplier_1.33',
  },
  {
    id: 'magicUp', name: 'Magic UP', type: 'support', jobId: 'blackMage', jpCost: 500,
    description: 'Increase magical attack damage by 33%.',
    passiveEffect: 'magical_damage_multiplier_1.33',
  },
  {
    id: 'equipSword', name: 'Equip Sword', type: 'support', jobId: 'knight', jpCost: 300,
    description: 'Allows equipping swords regardless of current job.',
    passiveEffect: 'equip_weapon_sword',
  },

  // ──── Movement Abilities ────
  {
    id: 'movePlus1', name: 'Move+1', type: 'movement', jobId: 'squire', jpCost: 200,
    description: 'Increase movement range by 1.',
    passiveEffect: 'move_plus_1',
  },
  {
    id: 'movePlus2', name: 'Move+2', type: 'movement', jobId: 'thief', jpCost: 500,
    description: 'Increase movement range by 2.',
    passiveEffect: 'move_plus_2',
  },
  {
    id: 'jumpPlus1', name: 'Jump+1', type: 'movement', jobId: 'dragoon', jpCost: 200,
    description: 'Increase jump height by 1.',
    passiveEffect: 'jump_plus_1',
  },
  {
    id: 'teleportMovement', name: 'Teleport', type: 'movement', jobId: 'timeMage', jpCost: 600,
    description: 'Move by teleporting, ignoring obstacles.',
    passiveEffect: 'teleport_move',
  },
];

// ─── Exports ───

export const ABILITIES: Record<string, AbilityDefinition> = {};
for (const ability of abilityDefs) {
  ABILITIES[ability.id] = ability;
}

/**
 * Get all abilities belonging to a specific job.
 */
export function getAbilitiesForJob(jobId: JobId): AbilityDefinition[] {
  return abilityDefs.filter((a) => a.jobId === jobId);
}

/**
 * Get a single ability by id.
 */
export function getAbilityById(id: string): AbilityDefinition | undefined {
  return ABILITIES[id];
}
