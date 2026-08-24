import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ToastProvider } from '../components/ui';
import Onboarding from './Onboarding';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <ToastProvider>
          <Onboarding />
        </ToastProvider>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe('Onboarding', () => {
  it('gates Continue until the identity fields validate', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    const continueButton = screen.getByRole('button', { name: /Continue/ });
    expect(continueButton).toBeDisabled();
    await user.type(screen.getByPlaceholderText('Nova Reyes'), 'Nova');
    await user.type(screen.getByPlaceholderText('nova'), 'nova');
    expect(continueButton).toBeEnabled();
  });

  it('sanitizes the handle to lowercase archive-safe characters', async () => {
    const user = userEvent.setup();
    renderPage();
    const handle = screen.getByPlaceholderText('nova');
    await user.type(handle, 'Nova Reyes!');
    // Spaces and punctuation are stripped live; letters are lowercased.
    expect(handle).toHaveValue('novareyes');
  });

  it('flags too-short names with an associated, announced error', async () => {
    const user = userEvent.setup();
    renderPage();
    const name = screen.getByPlaceholderText('Nova Reyes');
    await user.type(name, 'N');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('At least 2 characters.')).toHaveAttribute('id', 'display-name-error');
    await user.type(name, 'ova');
    expect(name).toHaveAttribute('aria-invalid', 'false');
  });

  it('advances steps with Enter once the form is valid', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByPlaceholderText('Nova Reyes'), 'Nova Reyes');
    await user.type(screen.getByPlaceholderText('nova'), 'nova');
    await user.keyboard('{Enter}');
    // Step content animates in, so wait for it rather than asserting sync.
    expect(await screen.findByText('Set your curator signal')).toBeInTheDocument();
    expect(await screen.findByText('Step 2 of 3')).toBeInTheDocument();
  });

  it('walks back and forward through all three steps', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByPlaceholderText('Nova Reyes'), 'Nova Reyes');
    await user.type(screen.getByPlaceholderText('nova'), 'nova');
    await user.click(screen.getByRole('button', { name: /Continue/ }));
    await user.click(await screen.findByRole('button', { name: /Continue/ }));
    expect(await screen.findByText(/Your archive URL is ready/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByText('Step 2 of 3')).toBeInTheDocument();
  });

  it('copies the archive URL from the finish step', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    renderPage();
    await user.type(screen.getByPlaceholderText('Nova Reyes'), 'Nova Reyes');
    await user.type(screen.getByPlaceholderText('nova'), 'nova');
    await user.click(screen.getByRole('button', { name: /Continue/ }));
    await user.click(await screen.findByRole('button', { name: /Continue/ }));
    await user.click(await screen.findByRole('button', { name: /Copy link/ }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/u/nova'));
    expect(await screen.findByText('Archive URL copied.')).toBeInTheDocument();
  });
});
