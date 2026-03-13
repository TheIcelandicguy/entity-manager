import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [
      'custom_components/entity_manager/frontend/tests/vitest.setup.js',
    ],
    include: [
      'custom_components/entity_manager/frontend/tests/**/*.test.js',
    ],
  },
});
