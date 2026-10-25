// Suite E2E de Lockumi contra cualquier URL (por defecto producción). Uso: E2E_BASE=https://app.lockumi.com npx playwright test -c e2e
import { defineConfig, devices } from '@playwright/test'
export const BASE = (process.env.E2E_BASE || 'https://app.lockumi.com').replace(/\/$/, '')
export default defineConfig({
  testDir: './pruebas',
  testMatch: '**/*.e2e.ts',   // no *.spec/*.test: así vitest no las toma
  fullyParallel: true,
  workers: Number(process.env.E2E_WORKERS || 4),
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  outputDir: '../test-results',
  reporter: [['list'], ['html', { outputFolder: '../playwright-report', open: 'never' }], ['json', { outputFile: '../test-results/resultados.json' }]],
  use: {
    baseURL: BASE, locale: 'es-CR', timezoneId: 'America/Costa_Rica', serviceWorkers: 'block',
    screenshot: 'on', video: 'on', trace: 'retain-on-failure',
    launchOptions: process.env.E2E_CHROME ? { executablePath: process.env.E2E_CHROME } : {},
  },
  // Dos papeles en paralelo, cada uno en su propio navegador: el inquilino (demo@lockumi.com) y el dueño de prueba.
  projects: [
    { name: 'inquilino', use: { ...devices['Pixel 7'], rol: 'inquilino' } },
    { name: 'dueno', use: { ...devices['Pixel 7'], rol: 'dueno' } },
  ],
})
