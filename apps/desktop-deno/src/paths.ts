import { posix, win32 } from 'node:path'

export interface RuntimePaths {
  root: string
  homeDir: string
  profilesDir: string
  activeConfigPath: string
  kernelDir: string
}

export function defaultDataRoot(
  os = Deno.build.os,
  env: Record<string, string | undefined> = Deno.env.toObject(),
): string {
  const join = os === 'windows' ? win32.join : posix.join
  const home = env.HOME ?? env.USERPROFILE
  if (os === 'windows') {
    const base = env.LOCALAPPDATA ?? env.APPDATA ?? home
    if (!base) throw new Error('Cannot resolve Windows application data path')
    return join(base, 'Meow')
  }
  if (!home) throw new Error('HOME is not set')
  if (os === 'darwin')
    return join(home, 'Library', 'Application Support', 'Meow')
  return join(env.XDG_DATA_HOME ?? join(home, '.local', 'share'), 'meow')
}

export function runtimePaths(root = defaultDataRoot()): RuntimePaths {
  const join = Deno.build.os === 'windows' ? win32.join : posix.join
  const homeDir = join(root, 'mihomo-home')
  return {
    root,
    homeDir,
    profilesDir: join(homeDir, 'profiles'),
    activeConfigPath: join(homeDir, 'config.yaml'),
    kernelDir: join(root, 'kernels', 'v1.19.29'),
  }
}

export async function bootstrapRuntimePaths(
  paths: RuntimePaths,
  defaultConfigPath: string,
): Promise<void> {
  await Deno.mkdir(paths.profilesDir, { recursive: true })
  await Deno.mkdir(paths.kernelDir, { recursive: true })
  try {
    await Deno.stat(paths.activeConfigPath)
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error
    await Deno.copyFile(defaultConfigPath, paths.activeConfigPath)
  }
}
