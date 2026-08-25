import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Stars } from './Stars';

afterEach(cleanup);

describe('Stars', () => {
  it('announces the precise rating for screen readers', () => {
    render(<Stars value={4.5} />);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Rated 4.5 out of 5');
  });

  it('fills stars fractionally instead of rounding up', () => {
    const { container } = render(<Stars value={4.5} />);
    expect(fillWidths(container)).toEqual(['100%', '100%', '100%', '100%', '50%']);
  });

  it('omits the lit layer for stars below the rating', () => {
    render(<Stars value={2} />);
    expect(fillWidths(screen.getByRole('img'))).toEqual(['100%', '100%']);
  });

  it('shows an unrated placeholder instead of stars', () => {
    render(<Stars value={null} />);
    expect(screen.getByText('Unrated')).toBeInTheDocument();
  });
});

function fillWidths(container: HTMLElement): string[] {
  return [...container.querySelectorAll<HTMLElement>('span.overflow-hidden')].map(el => el.style.width);
}
