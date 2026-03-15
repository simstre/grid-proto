// ─── Damage Calculation System ───
// Implements FFT weapon-type formulas, modifiers, evasion, and hit rates.

import { Direction } from '@/core/constants';
import type { Element, ElementAffinityMap } from '@/data/elements';
import { getElementMultiplier } from '@/data/elements';
import { getZodiacCompat, type ZodiacSign } from '@/data/zodiac';
import type { AppliedStatus } from './status-effects';

// ─── Types ───

export type WeaponCategory =
  | 'sword' | 'katana' | 'knightSword'
  | 'bow' | 'ninjaBlade'
  | 'staff' | 'rod'
  | 'gun'
  | 'axe' | 'flail'
  | 'fist' | 'knife' | 'spear'
  | 'crossbow' | 'book' | 'instrument'
  | 'bag' | 'cloth';

export interface DamageInput {
  // Attacker stats
  pa: number;
  ma: number;
  speed: number;
  brave: number;
  faith: number;
  weaponPower: number;
  weaponCategory: WeaponCategory;
  weaponAccuracy: number;     // 0–100
  weaponElement: Element | null;
  attackerFacing: Direction;
  attackerStatuses: AppliedStatus[];
  attackerZodiac: ZodiacSign | null;
  /** True if attacker has Attack UP support ability */
  hasAttackUp: boolean;

  // Defender stats
  defenderMaxHP: number;
  defenderCurrentHP: number;
  defenderFaith: number;
  defenderFacing: Direction;
  defenderStatuses: AppliedStatus[];
  defenderZodiac: ZodiacSign | null;
  defenderElementAffinities: ElementAffinityMap;
  shieldEvasion: number;     // 0–100
  accessoryEvasion: number;  // 0–100
  classEvasion: number;      // 0–100 (C-Ev)
  defenderSpeed: number;

  // Ability overrides (for spells/abilities)
  isMagic: boolean;
  abilityPower?: number;     // overrides weapon-based formula if provided
  abilityElement?: Element;
}

export interface DamageResult {
  damage: number;
  isCritical: boolean;
  isHealing: boolean;   // true if element absorb turns damage into healing
  element: Element | null;
}

export interface HitResult {
  chance: number;       // 0–100
  hit: boolean;
}

// ─── Weapon formulas ───

function getPhysicalBaseDamage(input: DamageInput): number {
  const { pa, speed, brave, weaponPower, weaponCategory } = input;

  switch (weaponCategory) {
    // Basic: PA * WP (swords, knives, spears, crossbows, etc.)
    case 'sword':
    case 'knife':
    case 'spear':
    case 'crossbow':
    case 'fist':
      return pa * weaponPower;

    // Honor: Br/100 * PA * WP (katanas, knight swords)
    case 'katana':
    case 'knightSword':
      return Math.floor((brave / 100) * pa * weaponPower);

    // Speed: (PA+Sp)/2 * WP (bows, ninja blades)
    case 'bow':
    case 'ninjaBlade':
      return Math.floor(((pa + speed) / 2) * weaponPower);

    // Mage: MA * WP (staffs, rods)
    case 'staff':
    case 'rod':
      return input.ma * weaponPower;

    // Gun: WP^2 (ignores stats)
    case 'gun':
      return weaponPower * weaponPower;

    // Random: rand(1, PA) * WP (axes, flails, bags)
    case 'axe':
    case 'flail':
    case 'bag':
      return (1 + Math.floor(Math.random() * pa)) * weaponPower;

    // Misc: PA * WP (books, instruments, cloth)
    case 'book':
    case 'instrument':
    case 'cloth':
      return pa * weaponPower;

    default:
      return pa * weaponPower;
  }
}

// ─── Modifier helpers ───

function hasStatusId(statuses: AppliedStatus[], id: string): boolean {
  return statuses.some((s) => s.id === id);
}

function getDirectionalEvasionMod(
  attackerFacing: Direction,
  defenderFacing: Direction
): number {
  // Determine relative attack direction
  // Back attack: attacker hits from behind the defender
  // Side attack: attacker hits from the side
  const diff = ((attackerFacing - defenderFacing) + 4) % 4;

  // diff === 0: attacker faces same way as defender -> back attack
  // diff === 2: attacker faces opposite of defender -> front attack
  // diff === 1 or 3: side attack
  switch (diff) {
    case 0: return 0.5;   // back: halve evasion
    case 1:
    case 3: return 0.75;  // side: reduce by 25%
    case 2: return 1.0;   // front: full evasion
    default: return 1.0;
  }
}

// ─── Main damage calculation ───

export function calculateDamage(input: DamageInput): DamageResult {
  let baseDamage: number;

  if (input.abilityPower != null) {
    // Ability with explicit power (spells, skills)
    baseDamage = input.abilityPower * (input.isMagic ? input.ma : input.pa);
  } else {
    baseDamage = getPhysicalBaseDamage(input);
  }

  // Magical damage: casterFaith/100 * targetFaith/100
  if (input.isMagic) {
    baseDamage = Math.floor(baseDamage * (input.faith / 100) * (input.defenderFaith / 100));
  }

  // Attack UP (+33% physical)
  if (input.hasAttackUp && !input.isMagic) {
    baseDamage = Math.floor(baseDamage * 1.33);
  }

  // Protect: -33% physical damage
  if (!input.isMagic && hasStatusId(input.defenderStatuses, 'protect')) {
    baseDamage = Math.floor(baseDamage * 0.67);
  }

  // Shell: -33% magical damage
  if (input.isMagic && hasStatusId(input.defenderStatuses, 'shell')) {
    baseDamage = Math.floor(baseDamage * 0.67);
  }

  // Element
  const element = input.abilityElement ?? input.weaponElement;
  let elementMult = getElementMultiplier(element, input.defenderElementAffinities);

  // Oil doubles fire damage
  if (element === 'fire' && hasStatusId(input.defenderStatuses, 'oil')) {
    elementMult *= 2;
  }

  baseDamage = Math.floor(baseDamage * Math.abs(elementMult));
  const isHealing = elementMult < 0;

  // Zodiac compatibility
  if (input.attackerZodiac != null && input.defenderZodiac != null) {
    const zodiacMult = getZodiacCompat(input.attackerZodiac, input.defenderZodiac);
    baseDamage = Math.floor(baseDamage * zodiacMult);
  }

  // Critical hit chance: Brave/100 chance (physical only)
  let isCritical = false;
  if (!input.isMagic) {
    isCritical = Math.random() * 100 < input.brave;
    if (isCritical) {
      baseDamage = Math.floor(baseDamage * 1.5);
    }
  }

  // Minimum 1 damage
  const finalDamage = Math.max(1, baseDamage);

  return {
    damage: finalDamage,
    isCritical,
    isHealing,
    element,
  };
}

// ─── Hit chance calculation ───

export function calculateHitChance(input: DamageInput): HitResult {
  // Guns always hit
  if (input.weaponCategory === 'gun') {
    return { chance: 100, hit: true };
  }

  // Magic always hits (in FFT, magic hit is handled by Faith already in damage)
  if (input.isMagic) {
    return { chance: 100, hit: true };
  }

  // Base hit = weapon accuracy + attacker speed - defender speed
  let hitChance = input.weaponAccuracy + input.speed - input.defenderSpeed;

  // Blind reduces accuracy by 25%
  if (hasStatusId(input.attackerStatuses, 'blind')) {
    hitChance -= 25;
  }

  // Directional evasion modifier
  const dirMod = getDirectionalEvasionMod(input.attackerFacing, input.defenderFacing);

  // Shield evasion (affected by direction)
  hitChance -= Math.floor(input.shieldEvasion * dirMod);

  // Accessory evasion
  hitChance -= input.accessoryEvasion;

  // Class evasion (affected by direction)
  hitChance -= Math.floor(input.classEvasion * dirMod);

  // Clamp to 1–100
  hitChance = Math.max(1, Math.min(100, hitChance));

  const roll = Math.random() * 100;
  return {
    chance: hitChance,
    hit: roll < hitChance,
  };
}
