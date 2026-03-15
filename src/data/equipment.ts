// ─── Equipment Definitions ───

import type { WeaponCategory } from '@/battle/damage-calc';
import type { Element } from '@/data/elements';

// ─── Types ───

export type EquipmentSlot = 'weapon' | 'shield' | 'head' | 'body' | 'accessory';
export type ArmorType = 'hat' | 'helmet' | 'clothes' | 'armor' | 'robe';

export interface EquipmentDefinition {
  id: string;
  name: string;
  slot: EquipmentSlot;
  weaponType?: WeaponCategory;
  armorType?: ArmorType;
  wp: number;
  weaponAccuracy: number;
  physEvade: number;
  magEvade: number;
  hpBonus: number;
  mpBonus: number;
  paBonus: number;
  maBonus: number;
  speedBonus: number;
  moveBonus: number;
  jumpBonus: number;
  element: Element | null;
  statusImmunities: string[];
  autoStatuses: string[];
  price: number;
}

// ─── Helper ───

function weapon(
  id: string, name: string, weaponType: WeaponCategory,
  wp: number, acc: number, price: number,
  overrides: Partial<EquipmentDefinition> = {}
): EquipmentDefinition {
  return {
    id, name, slot: 'weapon', weaponType, wp, weaponAccuracy: acc,
    physEvade: 0, magEvade: 0, hpBonus: 0, mpBonus: 0,
    paBonus: 0, maBonus: 0, speedBonus: 0, moveBonus: 0, jumpBonus: 0,
    element: null, statusImmunities: [], autoStatuses: [], price,
    ...overrides,
  };
}

function shield(
  id: string, name: string,
  physEvade: number, magEvade: number, price: number,
  overrides: Partial<EquipmentDefinition> = {}
): EquipmentDefinition {
  return {
    id, name, slot: 'shield', wp: 0, weaponAccuracy: 0,
    physEvade, magEvade, hpBonus: 0, mpBonus: 0,
    paBonus: 0, maBonus: 0, speedBonus: 0, moveBonus: 0, jumpBonus: 0,
    element: null, statusImmunities: [], autoStatuses: [], price,
    ...overrides,
  };
}

function headgear(
  id: string, name: string, armorType: ArmorType,
  hpBonus: number, price: number,
  overrides: Partial<EquipmentDefinition> = {}
): EquipmentDefinition {
  return {
    id, name, slot: 'head', armorType, wp: 0, weaponAccuracy: 0,
    physEvade: 0, magEvade: 0, hpBonus, mpBonus: 0,
    paBonus: 0, maBonus: 0, speedBonus: 0, moveBonus: 0, jumpBonus: 0,
    element: null, statusImmunities: [], autoStatuses: [], price,
    ...overrides,
  };
}

function bodyArmor(
  id: string, name: string, armorType: ArmorType,
  hpBonus: number, price: number,
  overrides: Partial<EquipmentDefinition> = {}
): EquipmentDefinition {
  return {
    id, name, slot: 'body', armorType, wp: 0, weaponAccuracy: 0,
    physEvade: 0, magEvade: 0, hpBonus, mpBonus: 0,
    paBonus: 0, maBonus: 0, speedBonus: 0, moveBonus: 0, jumpBonus: 0,
    element: null, statusImmunities: [], autoStatuses: [], price,
    ...overrides,
  };
}

function accessory(
  id: string, name: string, price: number,
  overrides: Partial<EquipmentDefinition> = {}
): EquipmentDefinition {
  return {
    id, name, slot: 'accessory', wp: 0, weaponAccuracy: 0,
    physEvade: 0, magEvade: 0, hpBonus: 0, mpBonus: 0,
    paBonus: 0, maBonus: 0, speedBonus: 0, moveBonus: 0, jumpBonus: 0,
    element: null, statusImmunities: [], autoStatuses: [], price,
    ...overrides,
  };
}

// ─── Equipment Definitions ───

const equipDefs: EquipmentDefinition[] = [
  // ── Swords ──
  weapon('broadSword',     'Broad Sword',     'sword', 4,  85, 200),
  weapon('longSword',      'Long Sword',      'sword', 6,  85, 500),
  weapon('ironSword',      'Iron Sword',      'sword', 8,  85, 900),
  weapon('mythrilSword',   'Mythril Sword',   'sword', 10, 90, 1600),
  weapon('platinumSword',  'Platinum Sword',  'sword', 12, 90, 3100),

  // ── Knight Swords ──
  weapon('defender',       'Defender',        'knightSword', 16, 80, 0,
    { physEvade: 40 }),
  weapon('saveTheQueen',   'Save the Queen',  'knightSword', 18, 80, 0,
    { autoStatuses: ['protect'] }),
  weapon('excalibur',      'Excalibur',       'knightSword', 21, 85, 0,
    { element: 'holy' as Element, paBonus: 3, autoStatuses: ['haste'] }),

  // ── Katanas ──
  weapon('ashura',         'Ashura',          'katana', 7,  80, 1200),
  weapon('kotetsu',        'Kotetsu',         'katana', 10, 80, 3000),
  weapon('murasame',       'Murasame',        'katana', 14, 85, 6000),

  // ── Bows ──
  weapon('longBow',        'Long Bow',        'bow', 4,  75, 400),
  weapon('silverBow',      'Silver Bow',      'bow', 8,  80, 1500),
  weapon('iceBow',         'Ice Bow',         'bow', 10, 80, 3000,
    { element: 'ice' as Element }),

  // ── Staves ──
  weapon('oakStaff',       'Oak Staff',       'staff', 3,  75, 200,
    { maBonus: 1 }),
  weapon('whiteStaff',     'White Staff',     'staff', 4,  75, 800,
    { maBonus: 2 }),
  weapon('wizardStaff',    'Wizard Staff',    'staff', 5,  75, 2000,
    { maBonus: 3 }),

  // ── Rods ──
  weapon('rod',            'Rod',             'rod', 3,  75, 200,
    { maBonus: 1 }),
  weapon('thunderRod',     'Thunder Rod',     'rod', 5,  75, 1000,
    { maBonus: 2, element: 'lightning' as Element }),
  weapon('flameRod',       'Flame Rod',       'rod', 5,  75, 1000,
    { maBonus: 2, element: 'fire' as Element }),

  // ── Ninja Blades ──
  weapon('hiddenKnife',    'Hidden Knife',    'ninjaBlade', 6,  85, 1200),
  weapon('ninjaBlade',     'Ninja Blade',     'ninjaBlade', 10, 90, 4000),

  // ── Axes ──
  weapon('battleAxe',      'Battle Axe',      'axe', 9,  70, 1500),
  weapon('giantAxe',       'Giant Axe',       'axe', 14, 65, 4500),

  // ── Spears ──
  weapon('javelin',        'Javelin',         'spear', 6,  80, 600),
  weapon('spear',          'Spear',           'spear', 9,  80, 1500),
  weapon('holyLance',      'Holy Lance',      'spear', 14, 85, 6000,
    { element: 'holy' as Element }),

  // ── Guns ──
  weapon('romandanGun',    'Romandan Gun',    'gun', 6,  100, 2000),
  weapon('mythrilGun',     'Mythril Gun',     'gun', 8,  100, 4500),

  // ── Shields ──
  shield('buckler',        'Buckler',         10, 0,  300),
  shield('bronzeShield',   'Bronze Shield',   16, 0,  600),
  shield('mythrilShield',  'Mythril Shield',  22, 5,  1800),
  shield('crystalShield',  'Crystal Shield',  30, 10, 5000),

  // ── Helmets ──
  headgear('leatherCap',   'Leather Cap',     'helmet', 16,  300),
  headgear('ironHelm',     'Iron Helm',       'helmet', 40,  1200),
  headgear('crystalHelm',  'Crystal Helm',    'helmet', 80,  5000,
    { paBonus: 1 }),

  // ── Hats ──
  headgear('featherHat',   'Feather Hat',     'hat', 12, 300,
    { mpBonus: 8 }),
  headgear('wizardHat',    'Wizard Hat',      'hat', 20, 1200,
    { mpBonus: 16, maBonus: 1 }),
  headgear('ribbon',       'Ribbon',          'hat', 10, 8000,
    { statusImmunities: ['silence', 'blind', 'poison', 'charm', 'stone', 'sleep', 'confusion'] }),

  // ── Armor ──
  bodyArmor('leatherArmor', 'Leather Armor',  'armor', 24,  400),
  bodyArmor('chainMail',    'Chain Mail',     'armor', 56,  1600),
  bodyArmor('crystalArmor', 'Crystal Armor',  'armor', 100, 6000,
    { paBonus: 1 }),

  // ── Robes ──
  bodyArmor('linenRobe',   'Linen Robe',      'robe', 18, 400,
    { mpBonus: 10 }),
  bodyArmor('wizardRobe',  'Wizard Robe',     'robe', 30, 2000,
    { mpBonus: 22, maBonus: 2 }),
  bodyArmor('whiteRobe',   'White Robe',      'robe', 40, 4000,
    { mpBonus: 30, maBonus: 1, statusImmunities: ['silence'] }),

  // ── Accessories ──
  accessory('powerWrist',  'Power Wrist',     3000, { paBonus: 2 }),
  accessory('magicRing',   'Magic Ring',      4000, { maBonus: 2 }),
  accessory('sprintShoes', 'Sprint Shoes',    3000, { speedBonus: 1, moveBonus: 1 }),
  accessory('angelRing',   'Angel Ring',      5000, { autoStatuses: ['reraise'] }),
  accessory('bracer',      'Bracer',          5000, { paBonus: 3 }),
];

// ─── Exports ───

export const EQUIPMENT: Record<string, EquipmentDefinition> = {};
for (const equip of equipDefs) {
  EQUIPMENT[equip.id] = equip;
}

export function getEquipment(id: string): EquipmentDefinition | undefined {
  return EQUIPMENT[id];
}

export function getEquipmentBySlot(slot: EquipmentSlot): EquipmentDefinition[] {
  return equipDefs.filter((e) => e.slot === slot);
}

export function getEquipmentByType(weaponType: WeaponCategory): EquipmentDefinition[] {
  return equipDefs.filter((e) => e.weaponType === weaponType);
}
