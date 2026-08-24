import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  preview: { port: 4173 },
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', css: true, exclude: ['e2e/**', 'node_modules/**'] },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('framer-motion') || id.includes('/gsap/')) return 'motion';
          if (id.includes('/react/') || id.includes('react-dom') || id.includes('scheduler') || id.includes('react-router')) return 'framework';
          if (id.includes('@tanstack')) return 'query';
          if (id.includes('@auth0')) return 'auth0';
        },
      },
    },
  },
});
