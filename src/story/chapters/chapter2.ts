// ─── Chapter 2: The Manipulator and the Subservient — Story Scripts ───

import { registerDialogueScript } from '@/story/dialogue';
import type { DialogueScript } from '@/story/dialogue';
import { registerCutscene } from '@/story/cutscene';
import type { Cutscene } from '@/story/cutscene';

// ════════════════════════════════════════════
// Zirekile Falls
// ════════════════════════════════════════════

const zirekilePreBattle: DialogueScript = [
  {
    id: 'zir_pre_1',
    speaker: 'Ramza',
    text: 'The princess was last seen near these falls. If the Northern Sky has taken her, we must act before they cross the river.',
  },
  {
    id: 'zir_pre_2',
    speaker: 'Agrias',
    text: 'I am Agrias, captain of the Lionsguard. The princess is my charge. If you truly mean to help, then ready your weapons — they are already here.',
  },
  {
    id: 'zir_pre_3',
    speaker: 'Northern Sky Knight',
    text: 'No witnesses. Cut them all down and bring the girl to Lord Goltana.',
  },
];

const zirekilePostBattle: DialogueScript = [
  {
    id: 'zir_post_1',
    speaker: 'Agrias',
    text: 'You fight well for a cadet. The princess is safe for now, but these soldiers bore the crest of Duke Goltana. War is coming, whether the church admits it or not.',
  },
  {
    id: 'zir_post_2',
    speaker: 'Ramza',
    text: 'Then we must reach the capital before either side forces the king\'s hand. Will you join us, Agrias?',
  },
];

// ════════════════════════════════════════════
// Zaland Fort City
// ════════════════════════════════════════════

const zalandPreBattle: DialogueScript = [
  {
    id: 'zal_pre_1',
    speaker: 'Mustadio',
    text: 'Please — they are after the artifact my father discovered! If they get their hands on it, the church will have a weapon that could level entire cities!',
  },
  {
    id: 'zal_pre_2',
    speaker: 'Ramza',
    text: 'We cannot let that happen. Agrias, take the left flank. I will break through the center. Mustadio, stay behind us and use that crossbow.',
  },
  {
    id: 'zal_pre_3',
    speaker: 'Agrias',
    text: 'Those sentinels are temple knights. The church is directly involved — be ready for consecrated blades and healing magic.',
  },
];

// ════════════════════════════════════════════
// Goland Coal City
// ════════════════════════════════════════════

const golandPreBattle: DialogueScript = [
  {
    id: 'gol_pre_1',
    speaker: 'Ramza',
    text: 'Delita... you are alive? I saw you fall at the fortress. I mourned you for months.',
  },
  {
    id: 'gol_pre_2',
    speaker: 'Delita',
    text: 'I survived, but the man you knew did not. I serve Duke Goltana now. Turn back, Ramza. This path leads only to ruin.',
  },
  {
    id: 'gol_pre_3',
    speaker: 'Ramza',
    text: 'You would side with the man who started this war? Delita, what happened to you?',
  },
  {
    id: 'gol_pre_4',
    speaker: 'Delita',
    text: 'I learned what you refuse to accept — that justice belongs to whoever has the strength to claim it. Farewell, old friend.',
  },
];

const golandPostBattle: DialogueScript = [
  {
    id: 'gol_post_1',
    speaker: 'Agrias',
    text: 'He let us live. Your friend could have brought reinforcements, but he withdrew. Whatever game he is playing, he still cares for you.',
  },
  {
    id: 'gol_post_2',
    speaker: 'Ramza',
    text: 'Or he needs us alive for his own purposes. I do not know which possibility frightens me more.',
  },
];

// ════════════════════════════════════════════
// Register all scripts
// ════════════════════════════════════════════

export function registerChapter2Scripts(): void {
  // Pre-battle
  registerDialogueScript('ch2_zirekile_pre', zirekilePreBattle);
  registerDialogueScript('ch2_zaland_pre', zalandPreBattle);
  registerDialogueScript('ch2_goland_pre', golandPreBattle);

  // Post-battle
  registerDialogueScript('ch2_zirekile_post', zirekilePostBattle);
  registerDialogueScript('ch2_goland_post', golandPostBattle);

  // ─── Cutscenes ───

  registerCutscene({
    id: 'cs_ch2_zirekile_pre',
    name: 'Zirekile Falls - Rescue',
    steps: [
      { action: 'fade', params: { target: 1, duration: 0.5 } },
      { action: 'fade', params: { target: 0, duration: 1 } },
      { action: 'dialogue', params: { scriptId: 'ch2_zirekile_pre' } },
      { action: 'set_flag', params: { flag: 'ch2_agrias_joined', value: true } },
    ],
  });

  registerCutscene({
    id: 'cs_ch2_zaland_pre',
    name: 'Zaland Fort - The Artifact',
    steps: [
      { action: 'fade', params: { target: 1, duration: 0.3 } },
      { action: 'fade', params: { target: 0, duration: 0.8 } },
      { action: 'dialogue', params: { scriptId: 'ch2_zaland_pre' } },
      { action: 'set_flag', params: { flag: 'ch2_mustadio_joined', value: true } },
    ],
  });

  registerCutscene({
    id: 'cs_ch2_goland_pre',
    name: 'Goland Coal City - Betrayal',
    steps: [
      { action: 'fade', params: { target: 1, duration: 0.5 } },
      { action: 'fade', params: { target: 0, duration: 1 } },
      { action: 'dialogue', params: { scriptId: 'ch2_goland_pre' } },
      { action: 'set_flag', params: { flag: 'ch2_delita_betrayal', value: true } },
    ],
  });

  registerCutscene({
    id: 'cs_ch2_goland_post',
    name: 'Goland Coal City - Aftermath',
    steps: [
      { action: 'dialogue', params: { scriptId: 'ch2_goland_post' } },
      { action: 'set_flag', params: { flag: 'ch2_complete', value: true } },
      { action: 'fade', params: { target: 1, duration: 1.5 } },
    ],
  });
}
