// ─── Campaign / Story Data ───

import type { JobId } from '@/data/jobs';

// ─── Types ───

export interface EnemyUnitConfig {
  jobId: JobId;
  level: number;
  position: { x: number; y: number };
  name?: string;
}

export interface BattleRewards {
  gold: number;
  items: string[];  // equipment or item IDs
}

export interface StoryBattle {
  id: string;
  name: string;
  chapter: number;
  mapId: string;
  description: string;
  enemyFormation: EnemyUnitConfig[];
  isRequired: boolean;
  prerequisiteBattleIds: string[];
  rewards: BattleRewards;
}

export interface Chapter {
  id: string;
  number: number;
  name: string;
  battles: StoryBattle[];
}

// ─── Chapter 1: The Meager ───

const ch1Battles: StoryBattle[] = [
  {
    id: 'ch1_orbonne',
    name: 'Orbonne Monastery',
    chapter: 1,
    mapId: 'orbonne-monastery',
    description: 'Cadets from the Akademy are ambushed at the monastery gates. A tutorial battle to learn the basics of movement and combat.',
    enemyFormation: [
      { jobId: 'squire', level: 1, position: { x: 10, y: 9 }, name: 'Cadet A' },
      { jobId: 'squire', level: 1, position: { x: 9, y: 10 }, name: 'Cadet B' },
      { jobId: 'chemist', level: 1, position: { x: 10, y: 10 }, name: 'Chemist C' },
    ],
    isRequired: true,
    prerequisiteBattleIds: [],
    rewards: { gold: 300, items: ['potion', 'potion'] },
  },
  {
    id: 'ch1_gariland',
    name: 'Magic City Gariland',
    chapter: 1,
    mapId: 'magic-city-gariland',
    description: 'Thieves have overrun the town square. Rout them and restore order. Introduces varied jobs among the enemy ranks.',
    enemyFormation: [
      { jobId: 'squire', level: 2, position: { x: 11, y: 7 }, name: 'Thief A' },
      { jobId: 'squire', level: 2, position: { x: 12, y: 8 }, name: 'Thief B' },
      { jobId: 'archer', level: 2, position: { x: 13, y: 8 }, name: 'Archer C' },
      { jobId: 'chemist', level: 1, position: { x: 10, y: 7 }, name: 'Medic D' },
    ],
    isRequired: true,
    prerequisiteBattleIds: ['ch1_orbonne'],
    rewards: { gold: 500, items: ['broadSword'] },
  },
  {
    id: 'ch1_sweegy',
    name: 'Sweegy Woods',
    chapter: 1,
    mapId: 'sweegy-woods',
    description: 'An ambush in the forest! Enemies lurk among the trees. Use the terrain for cover and watch out for flanking.',
    enemyFormation: [
      { jobId: 'squire', level: 2, position: { x: 7, y: 5 }, name: 'Brigand A' },
      { jobId: 'squire', level: 2, position: { x: 8, y: 5 }, name: 'Brigand B' },
      { jobId: 'archer', level: 3, position: { x: 8, y: 6 }, name: 'Bowman C' },
      { jobId: 'squire', level: 3, position: { x: 7, y: 4 }, name: 'Brigand D' },
      { jobId: 'chemist', level: 2, position: { x: 9, y: 5 }, name: 'Herbalist E' },
    ],
    isRequired: true,
    prerequisiteBattleIds: ['ch1_gariland'],
    rewards: { gold: 600, items: ['longBow', 'potion'] },
  },
  {
    id: 'ch1_dorter',
    name: 'Dorter Trade City',
    chapter: 1,
    mapId: 'dorter-trade-city',
    description: 'A fierce battle in the streets of Dorter. Enemy archers hold the rooftops — dislodge them or suffer withering fire.',
    enemyFormation: [
      { jobId: 'archer', level: 3, position: { x: 9, y: 1 }, name: 'Sniper A' },
      { jobId: 'knight', level: 3, position: { x: 10, y: 5 }, name: 'Guard B' },
      { jobId: 'archer', level: 3, position: { x: 10, y: 8 }, name: 'Archer C' },
      { jobId: 'knight', level: 3, position: { x: 8, y: 3 }, name: 'Guard D' },
      { jobId: 'blackMage', level: 3, position: { x: 7, y: 3 }, name: 'Mage E' },
    ],
    isRequired: true,
    prerequisiteBattleIds: ['ch1_sweegy'],
    rewards: { gold: 800, items: ['ironHelm', 'potion'] },
  },
];

// ─── Chapter 2: The Manipulator and the Subservient ───

const ch2Battles: StoryBattle[] = [
  {
    id: 'ch2_zirekile',
    name: 'Zirekile Falls',
    chapter: 2,
    mapId: 'orbonne-monastery',  // reuse map with different formation
    description: 'A riverside ambush near the falls. Enemies attack from higher ground across the waterway.',
    enemyFormation: [
      { jobId: 'knight', level: 5, position: { x: 10, y: 9 }, name: 'Knight A' },
      { jobId: 'knight', level: 5, position: { x: 9, y: 10 }, name: 'Knight B' },
      { jobId: 'archer', level: 5, position: { x: 10, y: 10 }, name: 'Archer C' },
      { jobId: 'blackMage', level: 4, position: { x: 9, y: 9 }, name: 'Mage D' },
    ],
    isRequired: true,
    prerequisiteBattleIds: ['ch1_dorter'],
    rewards: { gold: 1000, items: ['longSword', 'hiPotion'] },
  },
  {
    id: 'ch2_zaland',
    name: 'Zaland Fort City',
    chapter: 2,
    mapId: 'dorter-trade-city',
    description: 'Assault on the fort gates. Break through the enemy defenses and reach the inner sanctum.',
    enemyFormation: [
      { jobId: 'knight', level: 6, position: { x: 9, y: 1 }, name: 'Sentinel A' },
      { jobId: 'knight', level: 5, position: { x: 10, y: 5 }, name: 'Guard B' },
      { jobId: 'archer', level: 6, position: { x: 10, y: 8 }, name: 'Crossbow C' },
      { jobId: 'whiteMage', level: 5, position: { x: 8, y: 3 }, name: 'Cleric D' },
      { jobId: 'blackMage', level: 6, position: { x: 7, y: 3 }, name: 'Warlock E' },
    ],
    isRequired: true,
    prerequisiteBattleIds: ['ch2_zirekile'],
    rewards: { gold: 1200, items: ['ashura', 'ether'] },
  },
  {
    id: 'ch2_goland',
    name: 'Goland Coal City',
    chapter: 2,
    mapId: 'sweegy-woods',
    description: 'A chase through the mining tunnels and surrounding forests. Dark and dangerous.',
    enemyFormation: [
      { jobId: 'thief', level: 6, position: { x: 7, y: 5 }, name: 'Bandit A' },
      { jobId: 'thief', level: 6, position: { x: 8, y: 5 }, name: 'Bandit B' },
      { jobId: 'archer', level: 6, position: { x: 8, y: 6 }, name: 'Hunter C' },
      { jobId: 'monk', level: 6, position: { x: 7, y: 4 }, name: 'Brawler D' },
    ],
    isRequired: true,
    prerequisiteBattleIds: ['ch2_zaland'],
    rewards: { gold: 1500, items: ['silverBow', 'hiPotion'] },
  },
];

// ─── Chapter 3: The Valiant ───

const ch3Battles: StoryBattle[] = [
  {
    id: 'ch3_yardow',
    name: 'Yardow Fort City',
    chapter: 3,
    mapId: 'dorter-trade-city',
    description: 'Ninjas have fortified Yardow. Fast enemies with deadly blades guard every rooftop and alley.',
    enemyFormation: [
      { jobId: 'ninja', level: 8, position: { x: 9, y: 1 }, name: 'Shadow A' },
      { jobId: 'ninja', level: 8, position: { x: 10, y: 5 }, name: 'Shadow B' },
      { jobId: 'archer', level: 7, position: { x: 10, y: 8 }, name: 'Marksman C' },
      { jobId: 'knight', level: 8, position: { x: 8, y: 3 }, name: 'Captain D' },
      { jobId: 'whiteMage', level: 7, position: { x: 7, y: 3 }, name: 'Healer E' },
    ],
    isRequired: true,
    prerequisiteBattleIds: ['ch2_goland'],
    rewards: { gold: 2000, items: ['hiddenKnife', 'xPotion'] },
  },
  {
    id: 'ch3_riovanes_gate',
    name: 'Riovanes Castle Gate',
    chapter: 3,
    mapId: 'orbonne-monastery',
    description: 'Storm the outer gates of Riovanes Castle. Heavy resistance from elite guard.',
    enemyFormation: [
      { jobId: 'knight', level: 9, position: { x: 10, y: 9 }, name: 'Elite Guard A' },
      { jobId: 'knight', level: 9, position: { x: 9, y: 10 }, name: 'Elite Guard B' },
      { jobId: 'dragoon', level: 8, position: { x: 10, y: 10 }, name: 'Dragoon C' },
      { jobId: 'blackMage', level: 8, position: { x: 9, y: 9 }, name: 'Court Mage D' },
      { jobId: 'whiteMage', level: 8, position: { x: 8, y: 9 }, name: 'Cleric E' },
    ],
    isRequired: true,
    prerequisiteBattleIds: ['ch3_yardow'],
    rewards: { gold: 2500, items: ['mythrilSword', 'ether'] },
  },
  {
    id: 'ch3_riovanes_roof',
    name: 'Riovanes Castle Rooftop',
    chapter: 3,
    mapId: 'magic-city-gariland',
    description: 'The final confrontation atop the castle. A desperate battle on the ramparts.',
    enemyFormation: [
      { jobId: 'samurai', level: 10, position: { x: 11, y: 7 }, name: 'Blade Master' },
      { jobId: 'ninja', level: 9, position: { x: 12, y: 8 }, name: 'Assassin A' },
      { jobId: 'ninja', level: 9, position: { x: 13, y: 8 }, name: 'Assassin B' },
      { jobId: 'summoner', level: 9, position: { x: 10, y: 7 }, name: 'Summoner C' },
    ],
    isRequired: true,
    prerequisiteBattleIds: ['ch3_riovanes_gate'],
    rewards: { gold: 3000, items: ['kotetsu', 'angelRing'] },
  },
];

// ─── Chapter 4: Somebody to Love ───

const ch4Battles: StoryBattle[] = [
  {
    id: 'ch4_bethla_south',
    name: 'Bethla Garrison South Wall',
    chapter: 4,
    mapId: 'dorter-trade-city',
    description: 'Break through the southern wall of the heavily fortified Bethla Garrison.',
    enemyFormation: [
      { jobId: 'knight', level: 11, position: { x: 9, y: 1 }, name: 'Wall Captain' },
      { jobId: 'dragoon', level: 10, position: { x: 10, y: 5 }, name: 'Dragoon A' },
      { jobId: 'archer', level: 10, position: { x: 10, y: 8 }, name: 'Sniper B' },
      { jobId: 'samurai', level: 10, position: { x: 8, y: 3 }, name: 'Samurai C' },
      { jobId: 'summoner', level: 10, position: { x: 7, y: 3 }, name: 'War Mage D' },
    ],
    isRequired: true,
    prerequisiteBattleIds: ['ch3_riovanes_roof'],
    rewards: { gold: 3500, items: ['platinumSword', 'xPotion'] },
  },
  {
    id: 'ch4_murond_entrance',
    name: 'Murond Holy Place',
    chapter: 4,
    mapId: 'orbonne-monastery',
    description: 'Enter the sacred grounds of Murond. Temple knights bar the way with righteous fury.',
    enemyFormation: [
      { jobId: 'knight', level: 12, position: { x: 10, y: 9 }, name: 'Temple Knight A' },
      { jobId: 'knight', level: 12, position: { x: 9, y: 10 }, name: 'Temple Knight B' },
      { jobId: 'whiteMage', level: 11, position: { x: 10, y: 10 }, name: 'High Priest C' },
      { jobId: 'samurai', level: 12, position: { x: 9, y: 9 }, name: 'Blade Saint D' },
      { jobId: 'summoner', level: 11, position: { x: 8, y: 9 }, name: 'Summoner E' },
    ],
    isRequired: true,
    prerequisiteBattleIds: ['ch4_bethla_south'],
    rewards: { gold: 4000, items: ['excalibur', 'ribbon'] },
  },
  {
    id: 'ch4_graveyard',
    name: 'Graveyard of Airships',
    chapter: 4,
    mapId: 'sweegy-woods',
    description: 'The final battle amid the ruins of ancient airships. All or nothing.',
    enemyFormation: [
      { jobId: 'ninja', level: 13, position: { x: 7, y: 5 }, name: 'Dark Knight A' },
      { jobId: 'samurai', level: 13, position: { x: 8, y: 5 }, name: 'Dark Knight B' },
      { jobId: 'dragoon', level: 12, position: { x: 8, y: 6 }, name: 'Dark Dragoon C' },
      { jobId: 'summoner', level: 12, position: { x: 7, y: 4 }, name: 'Arch Mage D' },
      { jobId: 'knight', level: 14, position: { x: 9, y: 5 }, name: 'Commander' },
    ],
    isRequired: true,
    prerequisiteBattleIds: ['ch4_murond_entrance'],
    rewards: { gold: 5000, items: ['saveTheQueen', 'bracer'] },
  },
];

// ─── Chapters ───

export const CHAPTERS: Chapter[] = [
  { id: 'ch1', number: 1, name: 'The Meager', battles: ch1Battles },
  { id: 'ch2', number: 2, name: 'The Manipulator and the Subservient', battles: ch2Battles },
  { id: 'ch3', number: 3, name: 'The Valiant', battles: ch3Battles },
  { id: 'ch4', number: 4, name: 'Somebody to Love', battles: ch4Battles },
];

// ─── Lookup helpers ───

const battleMap = new Map<string, StoryBattle>();
for (const chapter of CHAPTERS) {
  for (const battle of chapter.battles) {
    battleMap.set(battle.id, battle);
  }
}

export function getBattle(id: string): StoryBattle | undefined {
  return battleMap.get(id);
}

export function getChapterBattles(chapterNumber: number): StoryBattle[] {
  const chapter = CHAPTERS.find((c) => c.number === chapterNumber);
  return chapter ? chapter.battles : [];
}
