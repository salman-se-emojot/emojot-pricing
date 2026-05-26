import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.js'],
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['js/**/*.js'],
      exclude: ['js/app.js', 'js/admin/**'],
    },
  },
});
