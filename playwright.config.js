const { defineConfig } = require('@playwright/test');

const python = process.platform === 'win32' ? 'python' : 'python3';

module.exports = defineConfig({
  testDir: './tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://127.0.0.1:8000' },
  webServer: {
    command: `${python} server.py`,
    url: 'http://127.0.0.1:8000',
    reuseExistingServer: !process.env.CI,
  },
});
