// ─── Shop System ───

import { getEquipment, type EquipmentDefinition } from '@/data/equipment';
import { getItem, ITEMS, type ItemDefinition } from '@/data/items';

// ─── Types ───

export interface OwnedEquipmentEntry {
  equipId: string;
  quantity: number;
}

export interface PlayerInventory {
  gold: number;
  ownedEquipment: OwnedEquipmentEntry[];
  ownedItems: Record<string, number>;
}

export interface ShopStock {
  equipment: EquipmentDefinition[];
  items: ItemDefinition[];
}

// ─── Shop stock by chapter ───
// Each chapter unlocks additional equipment ids; earlier chapters' stock carries forward.

const CHAPTER_EQUIPMENT_UNLOCKS: Record<number, string[]> = {
  1: [
    // Basic weapons
    'broadSword', 'longBow', 'oakStaff', 'rod', 'javelin',
    'hiddenKnife', 'battleAxe', 'romandanGun',
    // Basic armor
    'buckler', 'leatherCap', 'featherHat',
    'leatherArmor', 'linenRobe',
    // Accessories
    'powerWrist', 'sprintShoes',
  ],
  2: [
    'longSword', 'ashura', 'silverBow', 'whiteStaff', 'thunderRod', 'flameRod',
    'spear',
    'bronzeShield', 'ironHelm', 'wizardHat',
    'chainMail', 'wizardRobe',
    'magicRing',
  ],
  3: [
    'ironSword', 'kotetsu', 'iceBow', 'wizardStaff', 'ninjaBlade',
    'giantAxe', 'mythrilGun',
    'mythrilShield', 'crystalHelm',
    'crystalArmor', 'whiteRobe',
    'bracer', 'angelRing',
  ],
  4: [
    'mythrilSword', 'platinumSword', 'murasame', 'holyLance',
    'crystalShield', 'ribbon',
    // Knight swords are rare drops/steals, not sold in shops
  ],
};

const CHAPTER_ITEM_UNLOCKS: Record<number, string[]> = {
  1: ['potion', 'antidote', 'eyeDrops', 'phoenixDown'],
  2: ['hiPotion', 'ether', 'echoHerbs', 'maidensKiss'],
  3: ['xPotion', 'soft', 'holyWater'],
  4: [],
};

// ─── Shop Manager ───

export class ShopManager {
  /**
   * Get available shop stock for the given story chapter (1–4).
   */
  getShopStock(chapter: number): ShopStock {
    const equipIds = new Set<string>();
    const itemIds = new Set<string>();

    for (let ch = 1; ch <= Math.min(chapter, 4); ch++) {
      const eqUnlocks = CHAPTER_EQUIPMENT_UNLOCKS[ch];
      if (eqUnlocks) {
        for (const id of eqUnlocks) equipIds.add(id);
      }
      const itUnlocks = CHAPTER_ITEM_UNLOCKS[ch];
      if (itUnlocks) {
        for (const id of itUnlocks) itemIds.add(id);
      }
    }

    const equipment: EquipmentDefinition[] = [];
    for (const id of equipIds) {
      const equip = getEquipment(id);
      if (equip && equip.price > 0) equipment.push(equip);
    }

    const items: ItemDefinition[] = [];
    for (const id of itemIds) {
      const item = getItem(id);
      if (item) items.push(item);
    }

    return { equipment, items };
  }

  /**
   * Buy a piece of equipment. Returns updated inventory or null if not enough gold.
   */
  buyEquipment(
    inventory: PlayerInventory,
    equipId: string
  ): PlayerInventory | null {
    const equip = getEquipment(equipId);
    if (!equip) return null;
    if (equip.price <= 0) return null;
    if (inventory.gold < equip.price) return null;

    const updated = {
      ...inventory,
      gold: inventory.gold - equip.price,
      ownedEquipment: [...inventory.ownedEquipment],
    };

    const existing = updated.ownedEquipment.find((e) => e.equipId === equipId);
    if (existing) {
      existing.quantity += 1;
    } else {
      updated.ownedEquipment.push({ equipId, quantity: 1 });
    }

    return updated;
  }

  /**
   * Sell a piece of equipment at half its buy price.
   * Returns updated inventory or null if the player doesn't own it.
   */
  sellEquipment(
    inventory: PlayerInventory,
    equipId: string
  ): PlayerInventory | null {
    const equip = getEquipment(equipId);
    if (!equip) return null;

    const entryIndex = inventory.ownedEquipment.findIndex(
      (e) => e.equipId === equipId && e.quantity > 0
    );
    if (entryIndex === -1) return null;

    const sellPrice = Math.floor(equip.price / 2);
    const updated = {
      ...inventory,
      gold: inventory.gold + sellPrice,
      ownedEquipment: [...inventory.ownedEquipment],
    };

    const entry = { ...updated.ownedEquipment[entryIndex] };
    entry.quantity -= 1;

    if (entry.quantity <= 0) {
      updated.ownedEquipment.splice(entryIndex, 1);
    } else {
      updated.ownedEquipment[entryIndex] = entry;
    }

    return updated;
  }

  /**
   * Buy consumable items. Returns updated inventory or null if not enough gold.
   */
  buyItem(
    inventory: PlayerInventory,
    itemId: string,
    qty: number
  ): PlayerInventory | null {
    if (qty <= 0) return null;
    const item = getItem(itemId);
    if (!item) return null;

    const totalCost = item.price * qty;
    if (inventory.gold < totalCost) return null;

    const updated = {
      ...inventory,
      gold: inventory.gold - totalCost,
      ownedItems: { ...inventory.ownedItems },
    };

    updated.ownedItems[itemId] = (updated.ownedItems[itemId] ?? 0) + qty;

    return updated;
  }
}

export const shopManager = new ShopManager();

/**
 * Create a fresh starting inventory.
 */
export function createStartingInventory(startingGold: number = 500): PlayerInventory {
  return {
    gold: startingGold,
    ownedEquipment: [],
    ownedItems: {},
  };
}
