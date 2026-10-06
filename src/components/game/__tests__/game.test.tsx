import { render, screen } from '@testing-library/react-native';

import { Avatar } from '../../Avatar';
import { DivisionLadder } from '../DivisionLadder';
import { LeaderboardRow } from '../LeaderboardRow';
import { RankBadge } from '../RankBadge';

describe('game components', () => {
  it('exposes division progress to screen readers', async () => {
    await render(<DivisionLadder tier="gold" division={2} progress={0.62} />);
    const ladder = screen.getByRole('progressbar', { name: 'Gold II progress' });
    expect(ladder).toHaveAccessibilityValue({ now: 62, text: '62% through Gold II' });
  });

  it('labels rank badges, dropping divisions for Master and Champion', async () => {
    await render(<RankBadge tier="champion" division={1} />);
    expect(screen.getByRole('image', { name: 'Champion rank' })).toBeOnTheScreen();
  });

  it('announces the player level on avatars and shows it on large sizes', async () => {
    await render(<Avatar name="Kabir" size="lg" ring={{ tier: 'gold' }} level={12} />);
    expect(screen.getByRole('image', { name: "Kabir's avatar, level 12" })).toBeOnTheScreen();
  });
});

describe('LeaderboardRow', () => {
  it('reads out position, You and score for the signed-in player', async () => {
    await render(
      <LeaderboardRow position={4} name="Mayank Bains" score="1,820 XP" isYou movement={2} />,
    );
    expect(screen.getByLabelText('4. You, 1,820 XP')).toBeOnTheScreen();
    expect(screen.getByText('+2')).toBeOnTheScreen();
  });
});
