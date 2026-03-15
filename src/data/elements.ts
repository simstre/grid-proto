// ─── Element System ───

export enum Element {
  Fire = 'fire',
  Ice = 'ice',
  Lightning = 'lightning',
  Wind = 'wind',
  Earth = 'earth',
  Water = 'water',
  Holy = 'holy',
  Dark = 'dark',
}

export type ElementAffinity = 'weak' | 'resist' | 'absorb' | 'null';

/**
 * Per-unit element affinities.
 * Only elements that differ from neutral need to be listed.
 */
export type ElementAffinityMap = Partial<Record<Element, ElementAffinity>>;

/**
 * Get the damage multiplier for an element hitting a target with the given affinities.
 * - weak:   +25% damage  (1.25)
 * - resist: -50% damage  (0.50)
 * - absorb: heals instead (-1.0)
 * - null:   no damage     (0.0)
 * - neutral: normal       (1.0)
 */
export function getElementMultiplier(
  element: Element | null,
  affinities: ElementAffinityMap
): number {
  if (!element) return 1.0;

  const affinity = affinities[element];
  if (!affinity) return 1.0;

  switch (affinity) {
    case 'weak':   return 1.25;
    case 'resist': return 0.50;
    case 'absorb': return -1.0;
    case 'null':   return 0.0;
  }
}

/** All elements in order */
export const ALL_ELEMENTS: Element[] = [
  Element.Fire,
  Element.Ice,
  Element.Lightning,
  Element.Wind,
  Element.Earth,
  Element.Water,
  Element.Holy,
  Element.Dark,
];
