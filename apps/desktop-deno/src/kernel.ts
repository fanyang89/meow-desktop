import type { RuntimePaths } from './paths.ts'
import { basename, join } from 'node:path'

const VERSION = 'v1.19.29'

function hex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

async function sha256(bytes: Uint8Array): Promise<string> {
  return hex(
    await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes).buffer),
  )
}

export async function installBundledKernel(
  paths: RuntimePaths,
  resourcesDir: string,
): Promise<string> {
  const name = Deno.build.os === 'windows' ? 'mihomo.exe' : 'mihomo'
  const source = join(resourcesDir, name)
  const target = join(paths.kernelDir, name)
  const digestPath = `${target}.sha256`
  const sourceBytes = await Deno.readFile(source).catch((error) => {
    throw new Error(
      `Bundled ${VERSION} kernel is missing at ${source}: ${error instanceof Error ? error.message : String(error)}`,
    )
  })
  const digest = await sha256(sourceBytes)

  let installedDigest = ''
  try {
    installedDigest = (await Deno.readTextFile(digestPath)).trim()
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error
  }

  if (installedDigest !== digest) {
    const temporary = `${target}.${crypto.randomUUID()}.tmp`
    await Deno.writeFile(temporary, sourceBytes, { mode: 0o755 })
    await Deno.rename(temporary, target)
    await Deno.writeTextFile(digestPath, `${digest}\n`)
  }
  if (Deno.build.os !== 'windows') await Deno.chmod(target, 0o755)

  const marker = (
    await Deno.readTextFile(join(resourcesDir, '.mihomo-target'))
  ).trim()
  if (!marker) throw new Error(`Missing target marker for ${basename(source)}`)
  return target
}
