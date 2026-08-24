import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Stars } from './Stars';

afterEach(cleanup);

describe('Stars', () => {
  it('announces the precise rating for screen readers', () => {
    render(<Stars value={4.5} />);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Rated 4.5 out of 5');
  });

  it('fills stars by rounded half-step value', () => {
    const { container, rerender } = render(<Stars value={4.4} />);
    const filled = countFilled(container);
    expect(filled).toBe(4);
    rerender(<Stars value={4.6} />);
    expect(countFilled(container)).toBe(5);
  });

  it('shows an unrated placeholder instead of stars', () => {
    cleanup();
    render(<Stars value={null} />);
    expect(screen.getByText('Unrated')).toBeInTheDocument();
  });
});

function countFilled(container: HTMLElement): number {
  return [...container.querySelectorAll('svg')].filter(svg => svg.getAttribute('fill') === 'currentColor').length;
}
