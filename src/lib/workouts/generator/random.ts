/** Seeded random numbers in [0, 1) (mulberry32): the same seed gives the same workout. */
export type Rng = () => number;

export function createRng(seed: number): Rng {
  let a = Math.floor(seed) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh seed for "Reroll". */
export function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
