import { fireEvent, render, screen } from '@testing-library/react-native';

import { isOptionalMuscle, muscles, type Muscle } from '@/lib/exercises/taxonomy';
import { DIVISIONS } from '@/lib/game/ranks';
import { rankColors, rankTiers } from '@/theme';

import { BodyMap } from '../body/BodyMap';
import { BODY_PATHS } from '../body/paths';
import { DonutChart } from '../charts/DonutChart';
import { LineChart } from '../charts/LineChart';
import { RankBadge } from '../game/RankBadge';
import { rankArt } from '../game/artRegistry';
import { badgeArt } from '../game/badges';

describe('rank badges', () => {
  it('registers an original badge for every tier', () => {
    for (const tier of rankTiers) expect(rankArt[tier]).toBe(badgeArt[tier]);
  });

  it.each(rankTiers)('renders %s at every division', async (tier) => {
    for (const division of [undefined, ...DIVISIONS]) {
      await render(<RankBadge tier={tier} division={division} size={48} />);
      expect(screen.getByRole('image')).toBeOnTheScreen();
    }
  });
});

describe('BodyMap', () => {
  const shown = muscles.filter((m) => !isOptionalMuscle(m));

  it.each(['male', 'female'] as const)(
    'maps every canonical muscle for the %s outline',
    (outline) => {
      const drawn = new Set(
        [...BODY_PATHS[outline].front, ...BODY_PATHS[outline].back]
          .map((p) => p.muscle)
          .filter((m) => m && !isOptionalMuscle(m)),
      );
      expect([...drawn].sort()).toEqual([...shown].sort());
    },
  );

  it('colours muscles by value and reports presses', async () => {
    const onPress = jest.fn();
    await render(
      <BodyMap<number>
        values={{ quads: 600 }}
        colourScale={() => rankColors.platinum.base}
        side="front"
        width={200}
        onMusclePress={onPress}
        accessibilityLabel="Muscle ranks"
      />,
    );
    // The licensed drawing has independent fragments for each leg.
    const quads = screen.getAllByTestId('muscle-quads');
    expect(quads).toHaveLength(BODY_PATHS.male.front.filter((p) => p.muscle === 'quads').length);
    const abs = screen.getAllByTestId('muscle-abs');
    for (const quad of quads) expect(quad.props.fill).toEqual(quads[0]?.props.fill);
    expect(quads[0]?.props.fill).not.toEqual(abs[0]?.props.fill);
    for (const quad of quads) await fireEvent.press(quad as never);
    expect(onPress).toHaveBeenCalledTimes(quads.length);
    for (const call of onPress.mock.calls) expect(call).toEqual<[Muscle]>(['quads']);
    expect(screen.getByRole('image', { name: 'Muscle ranks' })).toBeOnTheScreen();
  });
});

describe('charts', () => {
  it('labels the line chart and the donut for screen readers', async () => {
    await render(<LineChart data={[{ x: 1, y: 2 }]} accessibilityLabel="Bench rising" />);
    expect(screen.getByRole('image', { name: 'Bench rising' })).toBeOnTheScreen();
    await render(
      <DonutChart
        slices={[{ key: 'legs', value: 2, color: rankColors.gold.base }]}
        accessibilityLabel="Legs 100%"
      />,
    );
    expect(screen.getByRole('image', { name: 'Legs 100%' })).toBeOnTheScreen();
  });
});
