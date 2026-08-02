import { cpSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const desktopRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = resolve(desktopRoot, '../../packages/ui/.output/public')
const destination = resolve(desktopRoot, 'renderer')

rmSync(destination, { force: true, recursive: true })
cpSync(source, destination, { recursive: true })
