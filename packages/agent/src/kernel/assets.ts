export const MIHOMO_VERSION = process.env.MIHOMO_VERSION ?? 'v1.19.29'

const BUNDLED_SHA256: Record<string, string> = {
  'darwin-amd64':
    'b43980c9bbcf10911f264662a8be4fdf4c95f4567244d6824c3f5365bab0e7d9',
  'darwin-arm64':
    '4dc25df9e899f14161911302a8ee5fc9e202ed9c976fc405bf82c50ff27466ca',
  'linux-amd64':
    '5612e698e96c8b8ad15abc4c0a4f098eba9234354b4f248cb97f2528e215b094',
  'linux-arm64':
    '9a868b5e4e0ad91d9d71e1b41b0cfce78aaba44360c30df74a723f8e3926a86c',
  'windows-amd64':
    '322aaa5957ba9e72afdda9b71cc4329f691d2d45ec39e70bbca3f7bf5aa93d52',
  'windows-arm64':
    'f71736f9c2a17abb8909a726c69ac55279d0cb43d1d9f2c85afdbb70a0f326a3',
}

const OS_MAP: Record<string, 'linux' | 'darwin' | 'windows'> = {
  linux: 'linux',
  darwin: 'darwin',
  win32: 'windows',
  windows: 'windows',
}

const ARCH_MAP: Record<string, 'amd64' | 'arm64'> = {
  x64: 'amd64',
  amd64: 'amd64',
  arm64: 'arm64',
}

export interface MihomoAsset {
  name: string
  url: string
  ext: 'gz' | 'zip'
  binName: 'mihomo' | 'mihomo.exe'
  /**
   * The entry to extract from a `.zip` (Windows). It is the UN-versioned full
   * name inside the archive (e.g. `mihomo-windows-amd64-compatible.exe`), which
   * differs from the output `binName` (`mihomo.exe`). Undefined for `.gz`.
   */
  zipEntry?: string
  /** SHA-256 of the pinned release archive. Undefined for version overrides. */
  sha256?: string
}

export function mihomoAsset(
  os: string,
  arch: string,
  version: string = MIHOMO_VERSION,
): MihomoAsset {
  const o = OS_MAP[os]
  if (!o) throw new Error(`unsupported os: ${os}`)
  const a = ARCH_MAP[arch]
  if (!a) throw new Error(`unsupported arch: ${arch}`)

  const ext = o === 'windows' ? 'zip' : 'gz'
  const variant = a === 'amd64' ? '-compatible' : ''
  const name = `mihomo-${o}-${a}${variant}-${version}.${ext}`
  return {
    name,
    url: `https://github.com/MetaCubeX/mihomo/releases/download/${version}/${name}`,
    ext,
    binName: o === 'windows' ? 'mihomo.exe' : 'mihomo',
    zipEntry: ext === 'zip' ? `mihomo-${o}-${a}${variant}.exe` : undefined,
    sha256:
      version === MIHOMO_VERSION ? BUNDLED_SHA256[`${o}-${a}`] : undefined,
  }
}
