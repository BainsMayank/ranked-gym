import { render, screen, userEvent } from '@testing-library/react-native';

import { Button } from '../Button';

describe('Button', () => {
  it('renders its label and is exposed as an accessible button', async () => {
    await render(<Button label="Start workout" onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Start workout' })).toBeOnTheScreen();
  });

  it('calls onPress when pressed', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<Button label="Save" onPress={onPress} />);
    await user.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows a spinner, reports busy, and ignores presses while loading', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<Button label="Save" onPress={onPress} loading />);
    const button = screen.getByRole('button', { name: 'Save' });

    expect(screen.getByTestId('button-spinner')).toBeOnTheScreen();
    expect(screen.queryByText('Save')).toBeNull();
    expect(button).toBeBusy();
    expect(button).toBeDisabled();

    await user.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
