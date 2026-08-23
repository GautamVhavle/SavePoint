import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ThemeProvider, ThemeToggle } from './ui';
describe('ThemeToggle',()=>{it('persists an explicit accessible theme choice',async()=>{render(<ThemeProvider><ThemeToggle/></ThemeProvider>);const button=screen.getByRole('button',{name:/Switch to light theme/});await userEvent.click(button);expect(document.documentElement).toHaveAttribute('data-theme','light');expect(localStorage.getItem('savepoint-theme')).toBe('light')})});
