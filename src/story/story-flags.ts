// ─── Story Progression & Game State ───

import { CHAPTERS, getChapterBattles } from '@/data/campaign';
import type { PlayerInventory } from '@/overworld/shop';
import { createStartingInventory } from '@/overworld/shop';
import { Roster, createStartingRoster } from '@/overworld/roster';

// ─── Types ───

export interface GameState {
  currentChapter: number;
  completedBattles: Set<string>;
  currentNode: string;
  roster: Roster;
  inventory: PlayerInventory;
  storyFlags: Record<string, boolean>;
  playtime: number;  // in seconds
}

// ─── Factory ───

/**
 * Create a fresh new-game state with starting roster and inventory.
 */
export function createNewGameState(): GameState {
  return {
    currentChapter: 1,
    completedBattles: new Set<string>(),
    currentNode: 'orbonne',
    roster: createStartingRoster(),
    inventory: createStartingInventory(500),
    storyFlags: {},
    playtime: 0,
  };
}

// ─── Chapter advancement ───

/**
 * Check whether all required battles in the current chapter are done,
 * allowing the player to advance to the next chapter.
 */
export function canAdvanceChapter(state: GameState): boolean {
  const battles = getChapterBattles(state.currentChapter);
  const requiredBattles = battles.filter((b) => b.isRequired);

  for (const battle of requiredBattles) {
    if (!state.completedBattles.has(battle.id)) return false;
  }

  return true;
}

/**
 * Advance to the next chapter if possible.
 * Returns true if the chapter was advanced.
 */
export function advanceChapter(state: GameState): boolean {
  if (!canAdvanceChapter(state)) return false;
  if (state.currentChapter >= CHAPTERS.length) return false;

  state.currentChapter += 1;
  return true;
}

// ─── Serialization (LocalStorage) ───

const SAVE_KEY = 'fft-tactics-save';

interface SerializedGameState {
  currentChapter: number;
  completedBattles: string[];
  currentNode: string;
  rosterUnits: ReturnType<Roster['getAllUnits']>;
  inventory: PlayerInventory;
  storyFlags: Record<string, boolean>;
  playtime: number;
}

/**
 * Save game state to LocalStorage.
 */
export function saveGameState(state: GameState): void {
  const serialized: SerializedGameState = {
    currentChapter: state.currentChapter,
    completedBattles: Array.from(state.completedBattles),
    currentNode: state.currentNode,
    rosterUnits: state.roster.getAllUnits(),
    inventory: state.inventory,
    storyFlags: state.storyFlags,
    playtime: state.playtime,
  };

  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(serialized));
  } catch {
    console.error('Failed to save game state');
  }
}

/**
 * Load game state from LocalStorage.
 * Returns null if no save exists or data is corrupt.
 */
export function loadGameState(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;

    const data: SerializedGameState = JSON.parse(raw);

    const roster = new Roster();
    for (const unit of data.rosterUnits) {
      roster.addUnit(unit);
    }

    return {
      currentChapter: data.currentChapter,
      completedBattles: new Set(data.completedBattles),
      currentNode: data.currentNode,
      roster,
      inventory: data.inventory,
      storyFlags: data.storyFlags ?? {},
      playtime: data.playtime ?? 0,
    };
  } catch {
    console.error('Failed to load game state');
    return null;
  }
}

/**
 * Delete the saved game.
 */
export function deleteSaveData(): void {
  localStorage.removeItem(SAVE_KEY);
}
