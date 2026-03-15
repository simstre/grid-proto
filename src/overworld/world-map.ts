// ─── World Map Navigation ───

import type { GameState } from '@/story/story-flags';

// ─── Types ───

export type WorldNodeType = 'story_battle' | 'town' | 'random_encounter' | 'locked';

export interface WorldMapNode {
  id: string;
  name: string;
  type: WorldNodeType;
  position: { x: number; y: number };  // display coordinates (percentage-based 0–100)
  connectedNodes: string[];
  chapter: number;
  battleId?: string;  // if type is 'story_battle', the campaign battle id
}

// ─── World map layout ───

const WORLD_MAP_NODES: WorldMapNode[] = [
  // Chapter 1 nodes
  {
    id: 'orbonne',
    name: 'Orbonne Monastery',
    type: 'story_battle',
    position: { x: 15, y: 80 },
    connectedNodes: ['mandalia'],
    chapter: 1,
    battleId: 'ch1_orbonne',
  },
  {
    id: 'mandalia',
    name: 'Mandalia Plain',
    type: 'random_encounter',
    position: { x: 25, y: 70 },
    connectedNodes: ['orbonne', 'gariland'],
    chapter: 1,
  },
  {
    id: 'gariland',
    name: 'Magic City Gariland',
    type: 'story_battle',
    position: { x: 35, y: 60 },
    connectedNodes: ['mandalia', 'sweegy_path'],
    chapter: 1,
    battleId: 'ch1_gariland',
  },
  {
    id: 'sweegy_path',
    name: 'Araguay Woods',
    type: 'random_encounter',
    position: { x: 45, y: 50 },
    connectedNodes: ['gariland', 'sweegy'],
    chapter: 1,
  },
  {
    id: 'sweegy',
    name: 'Sweegy Woods',
    type: 'story_battle',
    position: { x: 50, y: 40 },
    connectedNodes: ['sweegy_path', 'dorter_road'],
    chapter: 1,
    battleId: 'ch1_sweegy',
  },
  {
    id: 'dorter_road',
    name: 'Lenalian Plateau',
    type: 'random_encounter',
    position: { x: 55, y: 35 },
    connectedNodes: ['sweegy', 'dorter'],
    chapter: 1,
  },
  {
    id: 'dorter',
    name: 'Dorter Trade City',
    type: 'story_battle',
    position: { x: 65, y: 30 },
    connectedNodes: ['dorter_road', 'igros_town'],
    chapter: 1,
    battleId: 'ch1_dorter',
  },

  // Chapter 1 town
  {
    id: 'igros_town',
    name: 'Igros Castle Town',
    type: 'town',
    position: { x: 20, y: 55 },
    connectedNodes: ['dorter', 'zirekile_path'],
    chapter: 1,
  },

  // Chapter 2 nodes
  {
    id: 'zirekile_path',
    name: 'Bariaus Hill',
    type: 'random_encounter',
    position: { x: 30, y: 40 },
    connectedNodes: ['igros_town', 'zirekile'],
    chapter: 2,
  },
  {
    id: 'zirekile',
    name: 'Zirekile Falls',
    type: 'story_battle',
    position: { x: 40, y: 30 },
    connectedNodes: ['zirekile_path', 'zaland_path'],
    chapter: 2,
    battleId: 'ch2_zirekile',
  },
  {
    id: 'zaland_path',
    name: 'Bariaus Valley',
    type: 'random_encounter',
    position: { x: 50, y: 25 },
    connectedNodes: ['zirekile', 'zaland'],
    chapter: 2,
  },
  {
    id: 'zaland',
    name: 'Zaland Fort City',
    type: 'story_battle',
    position: { x: 60, y: 20 },
    connectedNodes: ['zaland_path', 'goland'],
    chapter: 2,
    battleId: 'ch2_zaland',
  },
  {
    id: 'goland',
    name: 'Goland Coal City',
    type: 'story_battle',
    position: { x: 70, y: 15 },
    connectedNodes: ['zaland', 'lionel_town'],
    chapter: 2,
    battleId: 'ch2_goland',
  },

  // Chapter 2 town
  {
    id: 'lionel_town',
    name: 'Lionel Castle Town',
    type: 'town',
    position: { x: 75, y: 25 },
    connectedNodes: ['goland', 'yardow_path'],
    chapter: 2,
  },

  // Chapter 3 nodes
  {
    id: 'yardow_path',
    name: 'Yuguo Woods',
    type: 'random_encounter',
    position: { x: 80, y: 35 },
    connectedNodes: ['lionel_town', 'yardow'],
    chapter: 3,
  },
  {
    id: 'yardow',
    name: 'Yardow Fort City',
    type: 'story_battle',
    position: { x: 85, y: 45 },
    connectedNodes: ['yardow_path', 'riovanes_gate'],
    chapter: 3,
    battleId: 'ch3_yardow',
  },
  {
    id: 'riovanes_gate',
    name: 'Riovanes Castle Gate',
    type: 'story_battle',
    position: { x: 80, y: 55 },
    connectedNodes: ['yardow', 'riovanes_roof'],
    chapter: 3,
    battleId: 'ch3_riovanes_gate',
  },
  {
    id: 'riovanes_roof',
    name: 'Riovanes Castle Rooftop',
    type: 'story_battle',
    position: { x: 75, y: 60 },
    connectedNodes: ['riovanes_gate', 'riovanes_town'],
    chapter: 3,
    battleId: 'ch3_riovanes_roof',
  },

  // Chapter 3 town
  {
    id: 'riovanes_town',
    name: 'Riovanes Town',
    type: 'town',
    position: { x: 70, y: 65 },
    connectedNodes: ['riovanes_roof', 'bethla_path'],
    chapter: 3,
  },

  // Chapter 4 nodes
  {
    id: 'bethla_path',
    name: 'Dogoula Pass',
    type: 'random_encounter',
    position: { x: 60, y: 70 },
    connectedNodes: ['riovanes_town', 'bethla'],
    chapter: 4,
  },
  {
    id: 'bethla',
    name: 'Bethla Garrison South Wall',
    type: 'story_battle',
    position: { x: 50, y: 75 },
    connectedNodes: ['bethla_path', 'murond'],
    chapter: 4,
    battleId: 'ch4_bethla_south',
  },
  {
    id: 'murond',
    name: 'Murond Holy Place',
    type: 'story_battle',
    position: { x: 40, y: 80 },
    connectedNodes: ['bethla', 'graveyard'],
    chapter: 4,
    battleId: 'ch4_murond_entrance',
  },
  {
    id: 'graveyard',
    name: 'Graveyard of Airships',
    type: 'story_battle',
    position: { x: 30, y: 85 },
    connectedNodes: ['murond'],
    chapter: 4,
    battleId: 'ch4_graveyard',
  },
];

// ─── Node lookup ───

const nodeMap = new Map<string, WorldMapNode>();
for (const node of WORLD_MAP_NODES) {
  nodeMap.set(node.id, node);
}

// ─── WorldMap class ───

export class WorldMap {
  private nodes: WorldMapNode[] = WORLD_MAP_NODES;
  private currentNodeId: string = 'orbonne';

  get currentNode(): WorldMapNode {
    return nodeMap.get(this.currentNodeId)!;
  }

  getAllNodes(): WorldMapNode[] {
    return this.nodes;
  }

  getNode(nodeId: string): WorldMapNode | undefined {
    return nodeMap.get(nodeId);
  }

  /**
   * Get nodes the player can currently visit based on game state.
   */
  getAvailableNodes(gameState: GameState): WorldMapNode[] {
    return this.nodes.filter((node) => this.isNodeAccessible(node.id, gameState));
  }

  /**
   * Move the player to a different node.
   * Returns true if travel was successful.
   */
  travelTo(nodeId: string, gameState: GameState): boolean {
    if (!this.isNodeAccessible(nodeId, gameState)) return false;

    // Must be connected to current node
    const current = nodeMap.get(this.currentNodeId);
    if (!current) return false;

    if (!current.connectedNodes.includes(nodeId)) {
      // Also allow travel to any previously visited / unlocked connected node
      // by checking if there's a path through accessible nodes
      return false;
    }

    this.currentNodeId = nodeId;
    return true;
  }

  /**
   * Check whether a node is accessible given the current game state.
   * A node is accessible if:
   * - Its chapter <= current chapter
   * - For story battles: all prerequisite battles are completed
   */
  isNodeAccessible(nodeId: string, gameState: GameState): boolean {
    const node = nodeMap.get(nodeId);
    if (!node) return false;

    // Chapter lock
    if (node.chapter > gameState.currentChapter) return false;

    // Story battles require prerequisites
    if (node.type === 'story_battle' && node.battleId) {
      const { getBattle } = require('@/data/campaign');
      const battle = getBattle(node.battleId);
      if (battle) {
        for (const prereqId of battle.prerequisiteBattleIds) {
          if (!gameState.completedBattles.has(prereqId)) return false;
        }
      }
    }

    return true;
  }

  setCurrentNode(nodeId: string): void {
    this.currentNodeId = nodeId;
  }

  getCurrentNodeId(): string {
    return this.currentNodeId;
  }
}

export const worldMap = new WorldMap();
