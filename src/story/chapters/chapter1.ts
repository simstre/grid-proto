// ─── Chapter 1: The Meager — Story Scripts ───

import { registerDialogueScript } from '@/story/dialogue';
import type { DialogueScript } from '@/story/dialogue';
import { registerCutscene } from '@/story/cutscene';
import type { Cutscene } from '@/story/cutscene';

// ════════════════════════════════════════════
// Orbonne Monastery
// ════════════════════════════════════════════

const orbonnePreBattle: DialogueScript = [
  {
    id: 'orb_pre_1',
    speaker: 'Ramza',
    text: 'The monastery should be just ahead. Commander Harken ordered us to escort the priestess safely inside.',
  },
  {
    id: 'orb_pre_2',
    speaker: 'Delita',
    text: 'Strange that they would send cadets for a simple escort. Something about this feels wrong.',
  },
  {
    id: 'orb_pre_3',
    speaker: 'Ramza',
    text: 'You worry too much. It is a training exercise, nothing more.',
  },
  {
    id: 'orb_pre_4',
    speaker: 'Bandit Leader',
    text: 'There they are! Grab the priestess — the rest of you, cut down anyone who resists!',
  },
  {
    id: 'orb_pre_5',
    speaker: 'Ramza',
    text: 'Bandits at the monastery gates? Delita, form up! Protect the priestess at all costs!',
  },
];

const orbonnePostBattle: DialogueScript = [
  {
    id: 'orb_post_1',
    speaker: 'Delita',
    text: 'Those were no ordinary bandits. Their blades were military-issue. Someone sent them here.',
  },
  {
    id: 'orb_post_2',
    speaker: 'Ramza',
    text: 'We should report this to the Akademy. For now, the priestess is safe. That is what matters.',
  },
  {
    id: 'orb_post_3',
    speaker: 'Delita',
    text: 'Is it? I wonder who stands to gain from an attack on the church...',
  },
];

// ════════════════════════════════════════════
// Magic City Gariland
// ════════════════════════════════════════════

const garilandPreBattle: DialogueScript = [
  {
    id: 'gar_pre_1',
    speaker: 'Instructor Daravon',
    text: 'Cadets, we have received reports of thieves ransacking the market district. This will serve as your field examination.',
  },
  {
    id: 'gar_pre_2',
    speaker: 'Ramza',
    text: 'A field exam against real criminals? Is the city guard not handling this?',
  },
  {
    id: 'gar_pre_3',
    speaker: 'Instructor Daravon',
    text: 'The guard is stretched thin since the war ended. Ivalice has no shortage of desperate men turning to banditry. Consider this a lesson in the world that awaits you.',
  },
  {
    id: 'gar_pre_4',
    speaker: 'Delita',
    text: 'Desperate men... I know something about that. Let us end this quickly so no one else gets hurt.',
  },
];

const garilandPostBattle: DialogueScript = [
  {
    id: 'gar_post_1',
    speaker: 'Ramza',
    text: 'They surrendered without much fight once their leader fell. These are starving commoners, not soldiers.',
  },
  {
    id: 'gar_post_2',
    speaker: 'Delita',
    text: 'The war created them. Noble houses feasted while the people who bled for them were cast aside. Do not expect me to celebrate this victory.',
  },
];

// ════════════════════════════════════════════
// Sweegy Woods
// ════════════════════════════════════════════

const sweegyPreBattle: DialogueScript = [
  {
    id: 'swe_pre_1',
    speaker: 'Ramza',
    text: 'The road through the woods is the fastest route to Dorter. We should reach the trade city by nightfall.',
  },
  {
    id: 'swe_pre_2',
    speaker: 'Delita',
    text: 'Wait — do you hear that? The birds have gone silent.',
  },
  {
    id: 'swe_pre_3',
    speaker: 'Brigand Captain',
    text: 'Akademy brats, wandering into our territory! Take everything they have — their gear will fetch a fine price!',
  },
  {
    id: 'swe_pre_4',
    speaker: 'Ramza',
    text: 'An ambush! Watch the trees — archers could be hiding in the canopy! Stay close and fight through!',
  },
];

const sweegyPostBattle: DialogueScript = [
  {
    id: 'swe_post_1',
    speaker: 'Delita',
    text: 'That captain had a military insignia hidden under his cloak. These brigands were once soldiers — from the Order of the Northern Sky.',
  },
  {
    id: 'swe_post_2',
    speaker: 'Ramza',
    text: 'My father\'s order? That cannot be. Why would veterans of the Fifty Years\' War resort to highway robbery?',
  },
  {
    id: 'swe_post_3',
    speaker: 'Delita',
    text: 'Because your father is dead, Ramza, and the promises made to them died with him. The nobility has a short memory.',
  },
];

/** Mid-battle trigger: enemy reinforcements at turn 3 */
const sweegyMidBattle: DialogueScript = [
  {
    id: 'swe_mid_1',
    speaker: 'Brigand Scout',
    text: 'More of them came through the east pass! Surround them — do not let any escape!',
  },
  {
    id: 'swe_mid_2',
    speaker: 'Ramza',
    text: 'Reinforcements from the east! Tighten the formation — we cannot afford to be flanked!',
  },
];

// ════════════════════════════════════════════
// Dorter Trade City
// ════════════════════════════════════════════

const dorterPreBattle: DialogueScript = [
  {
    id: 'dor_pre_1',
    speaker: 'Ramza',
    text: 'So this is Dorter. The merchant guilds control this city, and from the look of things, they have hired their own private army.',
  },
  {
    id: 'dor_pre_2',
    speaker: 'Delita',
    text: 'Those archers on the rooftops are not merchants. This is a blockade. Someone does not want us reaching the capital.',
  },
  {
    id: 'dor_pre_3',
    speaker: 'Guild Enforcer',
    text: 'Akademy cadets have no authority here. Turn back now, or we will make an example of you for the next fools who try to pass.',
  },
  {
    id: 'dor_pre_4',
    speaker: 'Ramza',
    text: 'We carry orders from Commander Harken himself. Stand aside, or face the consequences.',
  },
  {
    id: 'dor_pre_5',
    speaker: 'Guild Enforcer',
    text: 'Harken? That old man has no reach beyond the Akademy walls. Archers — loose!',
  },
];

const dorterPostBattle: DialogueScript = [
  {
    id: 'dor_post_1',
    speaker: 'Ramza',
    text: 'We broke through, but at what cost? Those enforcers fought like trained soldiers, not hired thugs.',
  },
  {
    id: 'dor_post_2',
    speaker: 'Delita',
    text: 'Ramza... I found documents on their captain. Orders bearing the seal of House Larg. Your own brother\'s patron.',
  },
  {
    id: 'dor_post_3',
    speaker: 'Ramza',
    text: 'That is... impossible. Why would Dycedarg involve himself with guild enforcers?',
  },
  {
    id: 'dor_post_4',
    speaker: 'Delita',
    text: 'Open your eyes. The noble houses are playing a game, and we are the pieces. The question is whether you will keep pretending otherwise.',
  },
];

// ════════════════════════════════════════════
// Register all scripts
// ════════════════════════════════════════════

export function registerChapter1Scripts(): void {
  // Pre-battle
  registerDialogueScript('ch1_orbonne_pre', orbonnePreBattle);
  registerDialogueScript('ch1_gariland_pre', garilandPreBattle);
  registerDialogueScript('ch1_sweegy_pre', sweegyPreBattle);
  registerDialogueScript('ch1_dorter_pre', dorterPreBattle);

  // Post-battle
  registerDialogueScript('ch1_orbonne_post', orbonnePostBattle);
  registerDialogueScript('ch1_gariland_post', garilandPostBattle);
  registerDialogueScript('ch1_sweegy_post', sweegyPostBattle);
  registerDialogueScript('ch1_dorter_post', dorterPostBattle);

  // Mid-battle triggers
  registerDialogueScript('ch1_sweegy_mid_reinforcements', sweegyMidBattle);

  // ─── Cutscenes ───

  const orbonneCutscene: Cutscene = {
    id: 'cs_ch1_orbonne_pre',
    name: 'Orbonne Monastery - Arrival',
    steps: [
      { action: 'fade', params: { target: 1, duration: 0.5 } },
      { action: 'wait', params: { duration: 0.5 } },
      { action: 'fade', params: { target: 0, duration: 1 } },
      { action: 'dialogue', params: { scriptId: 'ch1_orbonne_pre' } },
      { action: 'set_flag', params: { flag: 'ch1_orbonne_intro_seen', value: true } },
    ],
  };

  const garilandCutscene: Cutscene = {
    id: 'cs_ch1_gariland_pre',
    name: 'Gariland - Field Exam',
    steps: [
      { action: 'fade', params: { target: 1, duration: 0.5 } },
      { action: 'fade', params: { target: 0, duration: 0.8 } },
      { action: 'dialogue', params: { scriptId: 'ch1_gariland_pre' } },
      { action: 'set_flag', params: { flag: 'ch1_gariland_intro_seen', value: true } },
    ],
  };

  const sweegyCutscene: Cutscene = {
    id: 'cs_ch1_sweegy_pre',
    name: 'Sweegy Woods - Ambush',
    steps: [
      { action: 'fade', params: { target: 1, duration: 0.3 } },
      { action: 'fade', params: { target: 0, duration: 0.6 } },
      { action: 'camera_pan', params: { x: 7, y: 5, duration: 1.5 } },
      { action: 'dialogue', params: { scriptId: 'ch1_sweegy_pre' } },
      { action: 'set_flag', params: { flag: 'ch1_sweegy_intro_seen', value: true } },
    ],
  };

  const dorterCutscene: Cutscene = {
    id: 'cs_ch1_dorter_pre',
    name: 'Dorter Trade City - Blockade',
    steps: [
      { action: 'fade', params: { target: 1, duration: 0.5 } },
      { action: 'fade', params: { target: 0, duration: 1 } },
      { action: 'camera_pan', params: { x: 9, y: 4, duration: 2 } },
      { action: 'dialogue', params: { scriptId: 'ch1_dorter_pre' } },
      { action: 'set_flag', params: { flag: 'ch1_dorter_intro_seen', value: true } },
    ],
  };

  registerCutscene(orbonneCutscene);
  registerCutscene(garilandCutscene);
  registerCutscene(sweegyCutscene);
  registerCutscene(dorterCutscene);

  // Post-battle cutscenes
  registerCutscene({
    id: 'cs_ch1_orbonne_post',
    name: 'Orbonne Monastery - Aftermath',
    steps: [
      { action: 'dialogue', params: { scriptId: 'ch1_orbonne_post' } },
      { action: 'set_flag', params: { flag: 'ch1_orbonne_complete', value: true } },
      { action: 'fade', params: { target: 1, duration: 1 } },
    ],
  });

  registerCutscene({
    id: 'cs_ch1_dorter_post',
    name: 'Dorter Trade City - Revelations',
    steps: [
      { action: 'dialogue', params: { scriptId: 'ch1_dorter_post' } },
      { action: 'set_flag', params: { flag: 'ch1_dorter_complete', value: true } },
      { action: 'set_flag', params: { flag: 'ch1_conspiracy_revealed', value: true } },
      { action: 'fade', params: { target: 1, duration: 1.5 } },
    ],
  });
}
