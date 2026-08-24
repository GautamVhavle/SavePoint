import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { ThemeProvider, ThemeToggle } from './ui';

afterEach(cleanup);

describe('ThemeToggle',()=>{it('persists an explicit accessible theme choice',async()=>{render(<ThemeProvider><ThemeToggle/></ThemeProvider>);const button=screen.getByRole('button',{name:/Switch to light theme/});await userEvent.click(button);expect(document.documentElement).toHaveAttribute('data-theme','light');expect(localStorage.getItem('savepoint-theme')).toBe('light')});

it('keeps system preference unpersisted until the user chooses',async()=>{localStorage.clear();render(<ThemeProvider><ThemeToggle/></ThemeProvider>);expect(document.documentElement).toHaveAttribute('data-theme','dark');expect(localStorage.getItem('savepoint-theme')).toBeNull()});

it('stores the opposite choice after a second toggle',async()=>{localStorage.clear();render(<ThemeProvider><ThemeToggle/></ThemeProvider>);await userEvent.click(screen.getByRole('button',{name:'Switch to light theme'}));await userEvent.click(screen.getByRole('button',{name:'Switch to dark theme'}));expect(localStorage.getItem('savepoint-theme')).toBe('dark');expect(document.documentElement).toHaveAttribute('data-theme','dark')});});
