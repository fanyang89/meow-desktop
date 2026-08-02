import { spawnSync } from 'node:child_process'

const result = spawnSync('pnpm', ['exec', 'nuxt', 'generate'], {
  env: {
    ...process.env,
    MCXD_DISABLE_PWA: 'true',
    NUXT_APP_BASE_URL: './',
  },
  shell: process.platform === 'win32',
  stdio: 'inherit',
})

if (result.error) throw result.error
process.exit(result.status ?? 1)
