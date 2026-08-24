import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCountUp } from './countup';

afterEach(cleanup);

function Target({ value }: { value: number }) {
  return <span data-testid="out">{useCountUp(value)}</span>;
}

describe('useCountUp', () => {
  it('settles exactly on the target value', async () => {
    render(<Target value={80} />);
    await vi.waitFor(() => expect(screen.getByTestId('out')).toHaveTextContent('80'), { timeout: 2000 });
  });

  it('snaps instantly when reduced motion is requested', () => {
    const realMatchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      ...realMatchMedia(query),
      matches: query.includes('prefers-reduced-motion'),
    })) as unknown as typeof window.matchMedia;
    render(<Target value={80} />);
    // No animation frames needed: the target renders on first paint.
    expect(screen.getByTestId('out')).toHaveTextContent('80');
  });
});
