import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  preview: { port: 4173 },
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', css: true, exclude: ['e2e/**', 'node_modules/**'] },
  build: {
    // Modern baseline: less transpile overhead, faster parsing.
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // Check vendor families most-specific first; gsap stays out so its
          // dynamic import forms an on-demand chunk.
          if (id.includes('@auth0')) return 'auth0';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('/gsap/')) return 'gsap';
          if (id.includes('/react/') || id.includes('react-dom') || id.includes('scheduler') || id.includes('react-router')) return 'framework';
          if (id.includes('@tanstack')) return 'query';
        },
      },
    },
  },
});
