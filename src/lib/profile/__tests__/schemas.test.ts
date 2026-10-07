import {
  birthYearSchema,
  bodyweightSchema,
  heightCmSchema,
  heightFeetInchesSchema,
  usernameSchema,
} from '../schemas';

const firstError = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.success ? undefined : r.error?.issues[0]?.message;

describe('profile schemas', () => {
  it('accepts valid usernames and explains invalid ones', () => {
    expect(usernameSchema.safeParse('asha_lifts99').success).toBe(true);
    expect(firstError(usernameSchema.safeParse('as'))).toBe('At least 3 characters.');
    expect(firstError(usernameSchema.safeParse('Asha'))).toMatch(/lowercase/);
    expect(firstError(usernameSchema.safeParse('a'.repeat(21)))).toBe('20 characters at most.');
  });

  it('blocks under-13s by birth year', () => {
    const schema = birthYearSchema(new Date('2026-10-06'));
    expect(schema.safeParse('2013').success).toBe(true);
    expect(firstError(schema.safeParse('2014'))).toMatch(/at least 13/);
    expect(firstError(schema.safeParse(''))).toBe('Enter the year you were born.');
    expect(firstError(schema.safeParse('85'))).toBe('Enter a 4-digit year.');
  });

  it('validates height in cm or feet and inches', () => {
    expect(heightCmSchema.parse('176')).toBe(176);
    expect(firstError(heightCmSchema.safeParse(''))).toBe('Enter your height.');
    expect(heightFeetInchesSchema.parse({ feet: '5', inches: '10' })).toBe(177.8);
    expect(heightFeetInchesSchema.safeParse({ feet: '5', inches: '12' }).success).toBe(false);
  });

  it('converts bodyweight to kg and range-checks it in kg', () => {
    expect(bodyweightSchema('kg').parse('72,5')).toBe(72.5);
    expect(bodyweightSchema('lb').parse('160')).toBe(72.57);
    // 30 is a plausible kg value but 30 lb (13.6 kg) is not.
    expect(bodyweightSchema('lb').safeParse('30').success).toBe(false);
    expect(firstError(bodyweightSchema('kg').safeParse(''))).toBe('Enter your bodyweight.');
  });
});
