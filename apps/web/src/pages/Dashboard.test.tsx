import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import fixtureRaw from '../lib/__fixtures__/public-profile.json';
import type { ApiPublicProfile } from '../types';

const mocks = vi.hoisted(() => ({
  me: vi.fn<() => Promise<unknown>>(),
}));

vi.mock('../lib/api', () => ({
  isDemoMode: false,
  ApiError: class ApiError extends Error {},
  api: { me: mocks.me },
}));

import Dashboard from './Dashboard';

const fixture = fixtureRaw as ApiPublicProfile;

// Mirror of the page's own scoring inputs, derived from the shared fixture.
const gameCount = fixture.games.length;
const reviewCount = fixture.games.filter(entry => (entry.review?.length ?? 0) > 0).length;
const featuredCount = fixture.games.filter(entry => entry.featured).length;
const healthParts = [Boolean(fixture.profile.avatar_url), Boolean(fixture.rig), gameCount > 0, reviewCount > 0, featuredCount > 0];
const score = Math.round((healthParts.filter(Boolean).length / healthParts.length) * 100);

afterEach(cleanup);

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
}

describe('Dashboard', () => {
  it('greets the curator by first name and links their public archive', async () => {
    mocks.me.mockResolvedValue(fixture);
    renderPage();
    expect(await screen.findByText(/Welcome back, Alex\./)).toBeInTheDocument();
    const archiveLink = screen.getByRole('link', { name: /View archive/ });
    expect(archiveLink).toHaveAttribute('href', '/u/alex');
  });

  it('scores archive health across avatar, rig, games, reviews, and featured', async () => {
    mocks.me.mockResolvedValue(fixture);
    renderPage();
    expect(await screen.findByText(String(score))).toBeInTheDocument();
    expect(screen.getByText(`${gameCount} game${gameCount === 1 ? '' : 's'} cataloged`)).toBeInTheDocument();
    // Checklist mirrors fixture reality: avatar done only when one exists.
    expect(screen.getByText(fixture.profile.avatar_url ? 'Avatar uploaded' : 'Upload an avatar')).toBeInTheDocument();
    expect(screen.getByText(`${reviewCount} written review${reviewCount === 1 ? '' : 's'}`)).toBeInTheDocument();
  });

  it('offers a retry panel when the archive fails to load', async () => {
    mocks.me.mockRejectedValue(new Error('offline'));
    renderPage();
    expect(await screen.findByText('Could not load your archive')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled();
  });

  it('hides studio data behind an announced skeleton while loading', () => {
    mocks.me.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading your studio…')).toBeInTheDocument();
    expect(screen.queryByText('ARCHIVE HEALTH')).not.toBeInTheDocument();
  });
});
