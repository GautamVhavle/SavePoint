/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { display: ['Space Grotesk', 'Inter', 'sans-serif'], mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'] },
      colors: { ink: 'rgb(var(--ink) / <alpha-value>)', canvas: 'rgb(var(--canvas) / <alpha-value>)', panel: 'rgb(var(--panel) / <alpha-value>)' },
      boxShadow: { glow: '0 0 40px rgba(58, 225, 255, .14)', card: '0 24px 80px rgba(0,0,0,.22)' },
    },
  },
  plugins: [],
};
