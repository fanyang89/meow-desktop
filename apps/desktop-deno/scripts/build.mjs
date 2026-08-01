#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { cpSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const rootDir = resolve(appDir, '../..')
const stagedUiDir = resolve(appDir, 'resources/ui')
const uiDir = resolve(rootDir, 'packages/ui/.output/public')

function flag(name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? fallback : (process.argv[index + 1] ?? fallback)
}

const hostTarget = {
  darwin:
    process.arch === 'arm64' ? 'aarch64-apple-darwin' : 'x86_64-apple-darwin',
  linux:
    process.arch === 'arm64'
      ? 'aarch64-unknown-linux-gnu'
      : 'x86_64-unknown-linux-gnu',
  win32:
    process.arch === 'arm64'
      ? 'aarch64-pc-windows-msvc'
      : 'x86_64-pc-windows-msvc',
}[process.platform]

const target = flag('target', hostTarget)
if (!target) throw new Error(`unsupported host platform: ${process.platform}`)

const targetInfo = {
  'aarch64-apple-darwin': {
    os: 'darwin',
    arch: 'arm64',
    ext: '.app',
    icon: '../desktop/build/icon.icns',
  },
  'x86_64-apple-darwin': {
    os: 'darwin',
    arch: 'x64',
    ext: '.app',
    icon: '../desktop/build/icon.icns',
  },
  'aarch64-pc-windows-msvc': {
    os: 'win32',
    arch: 'arm64',
    ext: '.msi',
    icon: '../desktop/build/icon.ico',
  },
  'x86_64-pc-windows-msvc': {
    os: 'win32',
    arch: 'x64',
    ext: '.msi',
    icon: '../desktop/build/icon.ico',
  },
  'aarch64-unknown-linux-gnu': {
    os: 'linux',
    arch: 'arm64',
    ext: '.AppImage',
    icon: '../desktop/build/icon.png',
  },
  'x86_64-unknown-linux-gnu': {
    os: 'linux',
    arch: 'x64',
    ext: '.AppImage',
    icon: '../desktop/build/icon.png',
  },
}[target]
if (!targetInfo) throw new Error(`unsupported target: ${target}`)

const output = resolve(
  rootDir,
  flag('output', `dist/deno/${target}/Meow${targetInfo.ext}`),
)

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, NUXT_TELEMETRY_DISABLED: '1' },
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run('pnpm', ['--filter', '@metacubexd/ui', 'generate:desktop'], rootDir)
rmSync(stagedUiDir, { recursive: true, force: true })
cpSync(uiDir, stagedUiDir, { recursive: true })
run(
  'deno',
  [
    'run',
    '-A',
    'scripts/fetch-mihomo.mjs',
    '--os',
    targetInfo.os,
    '--arch',
    targetInfo.arch,
    '--force',
  ],
  appDir,
)

run(
  'deno',
  [
    'desktop',
    '-A',
    '--no-check',
    '--config',
    'deno.json',
    '--node-modules-dir=none',
    '--exclude-unused-npm',
    '--frozen',
    '--target',
    target,
    '--icon',
    targetInfo.icon,
    '--output',
    output,
    '--include',
    'resources',
    '--include',
    '../desktop/resources/tray.png',
    'main.ts',
  ],
  appDir,
)
