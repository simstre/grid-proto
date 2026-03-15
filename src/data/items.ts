// ─── Item Definitions ───

export type ItemType = 'healing' | 'revive' | 'status_cure';

export interface ItemDefinition {
  id: string;
  name: string;
  type: ItemType;
  hpRestore: number;
  mpRestore: number;
  statusCured: string | null;
  price: number;
}

const itemDefs: ItemDefinition[] = [
  { id: 'potion',       name: 'Potion',        type: 'healing',     hpRestore: 30,  mpRestore: 0, statusCured: null,       price: 50   },
  { id: 'hiPotion',     name: 'Hi-Potion',     type: 'healing',     hpRestore: 70,  mpRestore: 0, statusCured: null,       price: 200  },
  { id: 'xPotion',      name: 'X-Potion',      type: 'healing',     hpRestore: 150, mpRestore: 0, statusCured: null,       price: 700  },
  { id: 'ether',        name: 'Ether',         type: 'healing',     hpRestore: 0,   mpRestore: 20, statusCured: null,      price: 300  },
  { id: 'phoenixDown',  name: 'Phoenix Down',  type: 'revive',      hpRestore: 0,   mpRestore: 0, statusCured: null,       price: 300  },
  { id: 'antidote',     name: 'Antidote',      type: 'status_cure', hpRestore: 0,   mpRestore: 0, statusCured: 'poison',   price: 50   },
  { id: 'eyeDrops',     name: 'Eye Drops',     type: 'status_cure', hpRestore: 0,   mpRestore: 0, statusCured: 'blind',    price: 50   },
  { id: 'echoHerbs',    name: 'Echo Herbs',    type: 'status_cure', hpRestore: 0,   mpRestore: 0, statusCured: 'silence',  price: 50   },
  { id: 'maidensKiss',  name: "Maiden's Kiss", type: 'status_cure', hpRestore: 0,   mpRestore: 0, statusCured: 'charm',    price: 50   },
  { id: 'soft',         name: 'Soft',          type: 'status_cure', hpRestore: 0,   mpRestore: 0, statusCured: 'stone',    price: 100  },
  { id: 'holyWater',    name: 'Holy Water',    type: 'status_cure', hpRestore: 0,   mpRestore: 0, statusCured: 'undead',   price: 200  },
];

export const ITEMS: Record<string, ItemDefinition> = {};
for (const item of itemDefs) {
  ITEMS[item.id] = item;
}

export function getItem(id: string): ItemDefinition | undefined {
  return ITEMS[id];
}
