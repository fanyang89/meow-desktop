#!/usr/bin/env node
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mihomoAsset } from '@metacubexd/agent/kernel/assets'
import { fetchKernel } from '@metacubexd/agent/kernel/fetch-kernel'

const here = dirname(fileURLToPath(import.meta.url))
const resourcesDir = join(here, '..', 'resources')

function flag(name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? fallback : (process.argv[index + 1] ?? fallback)
}

const os = flag('os', process.platform)
const arch = flag('arch', process.arch)
const target = `${os}-${arch}`
const markerPath = join(resourcesDir, '.mihomo-target')
const binaryPath = join(resourcesDir, mihomoAsset(os, arch).binName)

if (
  !process.argv.includes('--force') &&
  existsSync(binaryPath) &&
  existsSync(markerPath) &&
  readFileSync(markerPath, 'utf8').trim() === target
) {
  console.log(`[fetch-mihomo] already staged for ${target}`)
  process.exit(0)
}

console.log(`[fetch-mihomo] staging ${target}`)
const binaryName = os === 'win32' || os === 'windows' ? 'mihomo.exe' : 'mihomo'
rmSync(join(resourcesDir, binaryName === 'mihomo' ? 'mihomo.exe' : 'mihomo'), {
  force: true,
})
await fetchKernel(os, arch, resourcesDir)
writeFileSync(markerPath, `${target}\n`)
console.log(`[fetch-mihomo] staged ${binaryPath}`)
