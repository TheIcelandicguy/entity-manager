import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    // vitest.setup.js reads the panel from disk with node:fs. In the default web
    // transform mode Vite replaces node: built-ins with browser stubs, and the
    // suite dies before any test with "fileURLToPath is not a function".
    testTransformMode: { ssr: ['**/*'] },
    setupFiles: [
      'custom_components/entity_manager/frontend/tests/vitest.setup.js',
    ],
    include: [
      'custom_components/entity_manager/frontend/tests/**/*.test.js',
    ],
  },
});
