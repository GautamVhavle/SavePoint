import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoverImage, ThemeProvider, ThemeToggle, ToastProvider, useToast } from './ui';

afterEach(cleanup);

function ToastTrigger({ message, tone }: { message: string; tone?: 'success' | 'error' }) {
  const { show } = useToast();
  return <button type="button" onClick={() => show(message, tone)}>Show</button>;
}

describe('ThemeToggle',()=>{it('persists an explicit accessible theme choice',async()=>{render(<ThemeProvider><ThemeToggle/></ThemeProvider>);const button=screen.getByRole('button',{name:/Switch to light theme/});await userEvent.click(button);expect(document.documentElement).toHaveAttribute('data-theme','light');expect(localStorage.getItem('savepoint-theme')).toBe('light')});

it('keeps system preference unpersisted until the user chooses',async()=>{localStorage.clear();render(<ThemeProvider><ThemeToggle/></ThemeProvider>);expect(document.documentElement).toHaveAttribute('data-theme','dark');expect(localStorage.getItem('savepoint-theme')).toBeNull()});

it('stores the opposite choice after a second toggle',async()=>{localStorage.clear();render(<ThemeProvider><ThemeToggle/></ThemeProvider>);await userEvent.click(screen.getByRole('button',{name:'Switch to light theme'}));await userEvent.click(screen.getByRole('button',{name:'Switch to dark theme'}));expect(localStorage.getItem('savepoint-theme')).toBe('dark');expect(document.documentElement).toHaveAttribute('data-theme','dark')});});

describe('ToastProvider', () => {
  it('shows a dismissible announcement', async () => {
    render(<ToastProvider><ToastTrigger message="Archive saved" /></ToastProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Show' }));
    expect(screen.getByRole('status')).toHaveTextContent('Archive saved');
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.queryByText('Archive saved')).toBeNull();
  });

  it('auto-dismisses after 3.5 seconds', () => {
    vi.useFakeTimers();
    try {
      render(<ToastProvider><ToastTrigger message="Link copied" /></ToastProvider>);
      act(() => { fireEvent.click(screen.getByRole('button', { name: 'Show' })); });
      expect(screen.getByRole('status')).toHaveTextContent('Link copied');
      act(() => { vi.advanceTimersByTime(3500); });
      expect(screen.queryByText('Link copied')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('replaces an in-flight toast instead of stacking a second one', async () => {
    function SecondTrigger() {
      const { show } = useToast();
      return <button type="button" onClick={() => show('Second', 'error')}>Second</button>;
    }
    render(<ToastProvider><ToastTrigger message="First" /><SecondTrigger /></ToastProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Show' }));
    await userEvent.click(screen.getByRole('button', { name: 'Second' }));
    const statuses = screen.getAllByRole('status');
    expect(statuses).toHaveLength(1);
    expect(statuses[0]).toHaveTextContent('Second');
  });
});

describe('CoverImage', () => {
  it('renders lazy art with the provided alt text by default', () => {
    const { container } = render(<CoverImage src="https://img.test/cover.jpg" alt="Elden Ring cover artwork" />);
    const image = screen.getByRole('img', { name: 'Elden Ring cover artwork' });
    expect(image).toHaveAttribute('loading', 'lazy');
    // Hidden until the bytes arrive so the gradient never flashes half-loaded art.
    expect(image.className).toContain('opacity-0');
    expect(container.firstChild).toHaveClass('bg-gradient-to-br');
  });

  it('loads priority art eagerly', () => {
    const { container } = render(<CoverImage src="https://img.test/banner.jpg" alt="" priority />);
    expect(container.querySelector('img')).toHaveAttribute('loading', 'eager');
  });

  it('falls back to the gradient container when art fails to load', () => {
    const { container } = render(<CoverImage src="https://img.test/broken.jpg" alt="Broken art" />);
    const image = screen.getByRole('img', { name: 'Broken art' });
    act(() => { image.dispatchEvent(new Event('error')); });
    expect(container.querySelector('img')).toBeNull();
  });
});
