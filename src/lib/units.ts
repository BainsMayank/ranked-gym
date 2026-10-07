/**
 * Unit conversion. The database always stores kilograms and centimetres; the UI converts on the way
 * in and out using the user's `units` preference (kg pairs with cm, lb with ft/in).
 */

export const weightUnits = ['kg', 'lb'] as const;
export type WeightUnit = (typeof weightUnits)[number];

/** Exact by definition (international avoirdupois pound). */
export const KG_PER_LB = 0.45359237;
export const CM_PER_INCH = 2.54;
const INCHES_PER_FOOT = 12;

/** Rounds to `step` (e.g. 0.1 or 0.5) without floating-point tails like 72.30000000000001. */
export function roundTo(value: number, step: number): number {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  return Number((Math.round(value / step) * step).toFixed(decimals));
}

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

/** A stored kg value in the user's unit, rounded for display (0.1 by default). */
export function fromKg(kg: number, unit: WeightUnit, step = 0.1): number {
  return roundTo(unit === 'kg' ? kg : kgToLb(kg), step);
}

/** A value typed in the user's unit, converted to kg for storage (kept to 0.01 kg, the DB scale). */
export function toKg(value: number, unit: WeightUnit): number {
  return roundTo(unit === 'kg' ? value : lbToKg(value), 0.01);
}

/** "72.5 kg" / "159.8 lb". */
export function formatWeight(kg: number, unit: WeightUnit, step = 0.1): string {
  return `${fromKg(kg, unit, step)} ${unit}`;
}

export interface FeetInches {
  feet: number;
  inches: number;
}

/** Whole feet and inches rounded to the nearest inch (178 cm → 5 ft 10 in). */
export function cmToFeetInches(cm: number): FeetInches {
  const totalInches = Math.round(cm / CM_PER_INCH);
  return {
    feet: Math.floor(totalInches / INCHES_PER_FOOT),
    inches: totalInches % INCHES_PER_FOOT,
  };
}

/** Feet and inches to cm, kept to one decimal (the DB scale). */
export function feetInchesToCm({ feet, inches }: FeetInches): number {
  return roundTo((feet * INCHES_PER_FOOT + inches) * CM_PER_INCH, 0.1);
}

/** "178 cm" for kg users, "5′10″" for lb users. */
export function formatHeight(cm: number, unit: WeightUnit): string {
  if (unit === 'kg') return `${Math.round(cm)} cm`;
  const { feet, inches } = cmToFeetInches(cm);
  return `${feet}′${inches}″`;
}
