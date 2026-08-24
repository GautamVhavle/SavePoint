import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  guide: vi.fn(),
}));

vi.mock('../../lib/api', () => ({
  isDemoMode: true,
  ApiError: class ApiError extends Error {},
  api: { guide: mocks.guide },
}));

import { Guide } from './Guide';

afterEach(cleanup);

describe('Guide', () => {
  beforeEach(() => {
    mocks.guide.mockReset();
  });

  it('fills the question box when a suggestion chip is clicked', async () => {
    const user = userEvent.setup();
    render(<Guide handle="nova" />);
    await user.click(screen.getByRole('button', { name: /deepest hours/ }));
    const box = screen.getByLabelText('YOUR QUESTION');
    expect(box).toHaveValue(/deepest hours/);
  });

  it('asks the guide for the current profile and renders the answer', async () => {
    mocks.guide.mockResolvedValue({ answer: 'Play Outer Wilds next.' });
    const user = userEvent.setup();
    render(<Guide handle="nova" />);
    await user.click(screen.getByRole('button', { name: /Ask Guide/ }));
    await waitFor(() => expect(screen.getByText('Play Outer Wilds next.')).toBeInTheDocument());
    expect(mocks.guide).toHaveBeenCalledWith('nova', expect.stringContaining('play'), expect.anything());
    // Suggestions make way for the answer.
    expect(screen.queryByRole('button', { name: /deepest hours/ })).toBeNull();
  });

  it('survives upstream failures with an in-place recovery message', async () => {
    mocks.guide.mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();
    render(<Guide handle="nova" />);
    await user.click(screen.getByRole('button', { name: /Ask Guide/ }));
    expect(await screen.findByText(/lost its signal/)).toBeInTheDocument();
  });
});
