// ─── Equipment Management ───

import { getEquipment, type EquipmentDefinition, type EquipmentSlot } from '@/data/equipment';
import { JOBS, type JobId, type ArmorCategory } from '@/data/jobs';
import type { WeaponCategory } from '@/battle/damage-calc';

// ─── Types ───

export interface UnitEquipment {
  rightHand: string | null;   // EquipmentId
  leftHand: string | null;    // EquipmentId (shield or dual-wield weapon)
  head: string | null;        // EquipmentId
  body: string | null;        // EquipmentId
  accessory: string | null;   // EquipmentId
}

export interface EquipmentBonuses {
  hpBonus: number;
  mpBonus: number;
  paBonus: number;
  maBonus: number;
  speedBonus: number;
  moveBonus: number;
  jumpBonus: number;
  physEvade: number;
  magEvade: number;
}

export interface BaseStats {
  hp: number;
  mp: number;
  pa: number;
  ma: number;
  speed: number;
  move: number;
  jump: number;
}

export interface JobMultipliers {
  hpMult: number;
  mpMult: number;
  paMult: number;
  maMult: number;
  speedMult: number;
  moveBase: number;
  jumpBase: number;
}

// ─── Slot-to-ArmorCategory mapping ───

function armorTypeToArmorCategory(armorType: string): ArmorCategory | null {
  switch (armorType) {
    case 'hat':     return 'hat';
    case 'helmet':  return 'helmet';
    case 'clothes': return 'clothing';
    case 'armor':   return 'armor';
    case 'robe':    return 'robe';
    default:        return null;
  }
}

// ─── Equipment Manager ───

export class EquipmentManager {
  /**
   * Check if a job can equip a given piece of equipment.
   */
  canEquip(equipId: string, jobId: JobId): boolean {
    const equip = getEquipment(equipId);
    if (!equip) return false;

    const job = JOBS[jobId];
    if (!job) return false;

    if (equip.slot === 'weapon') {
      return equip.weaponType != null &&
        job.equippableWeapons.includes(equip.weaponType as WeaponCategory);
    }

    if (equip.slot === 'shield') {
      return job.equippableArmor.includes('shield');
    }

    if (equip.slot === 'accessory') {
      return job.equippableArmor.includes('accessory');
    }

    if (equip.slot === 'head' || equip.slot === 'body') {
      if (!equip.armorType) return false;
      const armorCat = armorTypeToArmorCategory(equip.armorType);
      if (!armorCat) return false;
      return job.equippableArmor.includes(armorCat);
    }

    return false;
  }

  /**
   * Equip an item to a unit's equipment slot if the job allows it.
   * Returns the updated equipment and the previously equipped item (if any).
   */
  equip(
    unitEquip: UnitEquipment,
    slot: EquipmentSlot,
    equipId: string,
    jobId: JobId
  ): { equipment: UnitEquipment; unequipped: string | null } | null {
    if (!this.canEquip(equipId, jobId)) return null;

    const equip = getEquipment(equipId);
    if (!equip) return null;

    // Verify slot compatibility
    if (equip.slot === 'weapon' && slot !== 'weapon' && slot !== 'shield') return null;
    if (equip.slot === 'shield' && slot !== 'shield') return null;
    if (equip.slot !== 'weapon' && equip.slot !== 'shield' && equip.slot !== slot) return null;

    const updated = { ...unitEquip };
    let unequipped: string | null = null;

    switch (slot) {
      case 'weapon':
        unequipped = updated.rightHand;
        updated.rightHand = equipId;
        break;
      case 'shield':
        unequipped = updated.leftHand;
        updated.leftHand = equipId;
        break;
      case 'head':
        unequipped = updated.head;
        updated.head = equipId;
        break;
      case 'body':
        unequipped = updated.body;
        updated.body = equipId;
        break;
      case 'accessory':
        unequipped = updated.accessory;
        updated.accessory = equipId;
        break;
    }

    return { equipment: updated, unequipped };
  }

  /**
   * Remove equipment from a slot.
   */
  unequip(
    unitEquip: UnitEquipment,
    slot: EquipmentSlot
  ): { equipment: UnitEquipment; unequipped: string | null } {
    const updated = { ...unitEquip };
    let unequipped: string | null = null;

    switch (slot) {
      case 'weapon':
        unequipped = updated.rightHand;
        updated.rightHand = null;
        break;
      case 'shield':
        unequipped = updated.leftHand;
        updated.leftHand = null;
        break;
      case 'head':
        unequipped = updated.head;
        updated.head = null;
        break;
      case 'body':
        unequipped = updated.body;
        updated.body = null;
        break;
      case 'accessory':
        unequipped = updated.accessory;
        updated.accessory = null;
        break;
    }

    return { equipment: updated, unequipped };
  }

  /**
   * Calculate total stat bonuses from all equipped items.
   */
  calculateEquipmentBonuses(unitEquip: UnitEquipment): EquipmentBonuses {
    const bonuses: EquipmentBonuses = {
      hpBonus: 0, mpBonus: 0, paBonus: 0, maBonus: 0,
      speedBonus: 0, moveBonus: 0, jumpBonus: 0,
      physEvade: 0, magEvade: 0,
    };

    const slots: (string | null)[] = [
      unitEquip.rightHand, unitEquip.leftHand,
      unitEquip.head, unitEquip.body, unitEquip.accessory,
    ];

    for (const equipId of slots) {
      if (!equipId) continue;
      const equip = getEquipment(equipId);
      if (!equip) continue;

      bonuses.hpBonus += equip.hpBonus;
      bonuses.mpBonus += equip.mpBonus;
      bonuses.paBonus += equip.paBonus;
      bonuses.maBonus += equip.maBonus;
      bonuses.speedBonus += equip.speedBonus;
      bonuses.moveBonus += equip.moveBonus;
      bonuses.jumpBonus += equip.jumpBonus;
      bonuses.physEvade += equip.physEvade;
      bonuses.magEvade += equip.magEvade;
    }

    return bonuses;
  }

  /**
   * Calculate effective stats from base stats, job multipliers, and equipment bonuses.
   */
  getEffectiveStats(
    baseStats: BaseStats,
    jobMults: JobMultipliers,
    equipBonuses: EquipmentBonuses
  ): BaseStats {
    return {
      hp: Math.floor(baseStats.hp * jobMults.hpMult) + equipBonuses.hpBonus,
      mp: Math.floor(baseStats.mp * jobMults.mpMult) + equipBonuses.mpBonus,
      pa: Math.floor(baseStats.pa * jobMults.paMult) + equipBonuses.paBonus,
      ma: Math.floor(baseStats.ma * jobMults.maMult) + equipBonuses.maBonus,
      speed: Math.floor(baseStats.speed * jobMults.speedMult) + equipBonuses.speedBonus,
      move: jobMults.moveBase + equipBonuses.moveBonus,
      jump: jobMults.jumpBase + equipBonuses.jumpBonus,
    };
  }
}

export const equipmentManager = new EquipmentManager();

/**
 * Create a fresh empty equipment loadout.
 */
export function createEmptyEquipment(): UnitEquipment {
  return {
    rightHand: null,
    leftHand: null,
    head: null,
    body: null,
    accessory: null,
  };
}
