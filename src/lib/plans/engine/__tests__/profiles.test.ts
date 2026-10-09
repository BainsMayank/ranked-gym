import { generatePlan } from '../generate';
import { renderPlan } from '../render';
import { ctx, library, NOW } from '../__fixtures__/library';
import { PROFILES } from '../__fixtures__/profiles';

/**
 * The 10 reference profiles from docs/PLAN_ENGINE.md, rendered as text. A change to the engine
 * shows up here as a readable diff: review it like code.
 */
describe.each(PROFILES)('%s', (_name, input) => {
  const plan = generatePlan(input, ctx, { now: NOW });

  it('generates the expected plan', () => {
    expect(renderPlan(plan, library)).toMatchSnapshot();
  });

  it('explains itself', () => {
    expect(plan.explanation.map((s) => `${s.title}: ${s.body}`).join('\n\n')).toMatchSnapshot();
  });
});
