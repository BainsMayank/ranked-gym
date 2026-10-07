import {
  cmToFeetInches,
  feetInchesToCm,
  formatHeight,
  formatWeight,
  fromKg,
  kgToLb,
  lbToKg,
  roundTo,
  toKg,
} from '../units';

describe('roundTo', () => {
  it('rounds to a step without floating-point tails', () => {
    expect(roundTo(72.30000000000001, 0.1)).toBe(72.3);
    expect(roundTo(72.26, 0.5)).toBe(72.5);
    expect(roundTo(1.005, 0.01)).toBe(1);
    expect(roundTo(177.8, 1)).toBe(178);
  });
});

describe('weight', () => {
  it('converts kg and lb both ways', () => {
    expect(kgToLb(100)).toBeCloseTo(220.462, 3);
    expect(lbToKg(225)).toBeCloseTo(102.058, 3);
    expect(lbToKg(kgToLb(83.4))).toBeCloseTo(83.4, 10);
  });

  it('shows stored kg in the user unit', () => {
    expect(fromKg(72.5, 'kg')).toBe(72.5);
    expect(fromKg(72.5, 'lb')).toBe(159.8);
    expect(fromKg(100, 'lb', 0.5)).toBe(220.5);
  });

  it('stores typed values as kg to 0.01', () => {
    expect(toKg(72.5, 'kg')).toBe(72.5);
    expect(toKg(160, 'lb')).toBe(72.57);
    expect(toKg(45, 'lb')).toBe(20.41);
  });

  it('survives a round trip within display precision', () => {
    for (const lb of [95, 132.2, 159.8, 225, 405]) {
      expect(fromKg(toKg(lb, 'lb'), 'lb')).toBe(lb);
    }
  });

  it('formats with the unit', () => {
    expect(formatWeight(72.5, 'kg')).toBe('72.5 kg');
    expect(formatWeight(72.5, 'lb')).toBe('159.8 lb');
  });
});

describe('height', () => {
  it('converts cm to whole feet and inches', () => {
    expect(cmToFeetInches(178)).toEqual({ feet: 5, inches: 10 });
    expect(cmToFeetInches(152.4)).toEqual({ feet: 5, inches: 0 });
    // 182.6 cm is 71.9 in, which rounds up into the next foot.
    expect(cmToFeetInches(182.6)).toEqual({ feet: 6, inches: 0 });
  });

  it('converts feet and inches to cm', () => {
    expect(feetInchesToCm({ feet: 5, inches: 10 })).toBe(177.8);
    expect(feetInchesToCm({ feet: 6, inches: 0 })).toBe(182.9);
    expect(feetInchesToCm({ feet: 4, inches: 11 })).toBe(149.9);
  });

  it('round-trips feet and inches exactly', () => {
    for (let total = 48; total <= 90; total++) {
      const fi = { feet: Math.floor(total / 12), inches: total % 12 };
      expect(cmToFeetInches(feetInchesToCm(fi))).toEqual(fi);
    }
  });

  it('formats per unit system', () => {
    expect(formatHeight(177.8, 'kg')).toBe('178 cm');
    expect(formatHeight(177.8, 'lb')).toBe('5′10″');
  });
});
