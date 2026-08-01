import { assertEquals } from 'jsr:@std/assert@1'
import { defaultDataRoot, runtimePaths } from './paths.ts'

Deno.test('defaultDataRoot resolves each supported platform', () => {
  assertEquals(
    defaultDataRoot('linux', { HOME: '/home/me' }),
    '/home/me/.local/share/meow',
  )
  assertEquals(
    defaultDataRoot('darwin', { HOME: '/Users/me' }),
    '/Users/me/Library/Application Support/Meow',
  )
  assertEquals(
    defaultDataRoot('windows', {
      LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local',
    }),
    'C:\\Users\\me\\AppData\\Local\\Meow',
  )
})

Deno.test('runtimePaths keeps writable state under one root', () => {
  const paths = runtimePaths('/data/meow')
  assertEquals(paths.activeConfigPath, '/data/meow/mihomo-home/config.yaml')
  assertEquals(paths.kernelDir, '/data/meow/kernels/v1.19.29')
})
