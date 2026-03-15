// ─── Zodiac Compatibility System ───

export enum ZodiacSign {
  Aries = 0,
  Taurus = 1,
  Gemini = 2,
  Cancer = 3,
  Leo = 4,
  Virgo = 5,
  Libra = 6,
  Scorpio = 7,
  Sagittarius = 8,
  Capricorn = 9,
  Aquarius = 10,
  Pisces = 11,
}

export type ZodiacCompat = 'best' | 'good' | 'neutral' | 'bad' | 'worst';

const COMPAT_MULTIPLIERS: Record<ZodiacCompat, number> = {
  best:    1.25,
  good:    1.10,
  neutral: 1.00,
  bad:     0.90,
  worst:   0.75,
};

/**
 * FFT zodiac compatibility table.
 * Signs at distance 4 are "best", distance 2/10 are "good",
 * distance 6 are "worst", distance 3/9 are "bad", rest neutral.
 * Same sign is neutral.
 */
function getCompatType(sign1: ZodiacSign, sign2: ZodiacSign): ZodiacCompat {
  if (sign1 === sign2) return 'neutral';

  const diff = Math.abs(sign1 - sign2);
  const distance = Math.min(diff, 12 - diff);

  switch (distance) {
    case 4:  return 'best';
    case 2:
    case 10: return 'good';
    case 6:  return 'worst';
    case 3:
    case 9:  return 'bad';
    default: return 'neutral';
  }
}

/**
 * Get the zodiac compatibility multiplier between two signs.
 * Returns a value like 1.25 (best) through 0.75 (worst).
 */
export function getZodiacCompat(sign1: ZodiacSign, sign2: ZodiacSign): number {
  const compat = getCompatType(sign1, sign2);
  return COMPAT_MULTIPLIERS[compat];
}

/**
 * Get the compatibility type label between two signs.
 */
export function getZodiacCompatType(sign1: ZodiacSign, sign2: ZodiacSign): ZodiacCompat {
  return getCompatType(sign1, sign2);
}

export const ALL_ZODIAC_SIGNS: ZodiacSign[] = [
  ZodiacSign.Aries,
  ZodiacSign.Taurus,
  ZodiacSign.Gemini,
  ZodiacSign.Cancer,
  ZodiacSign.Leo,
  ZodiacSign.Virgo,
  ZodiacSign.Libra,
  ZodiacSign.Scorpio,
  ZodiacSign.Sagittarius,
  ZodiacSign.Capricorn,
  ZodiacSign.Aquarius,
  ZodiacSign.Pisces,
];
