import type { createAgent } from '@metacubexd/agent'

export async function pickFreePort(): Promise<number> {
  const listener = Deno.listen({ hostname: '127.0.0.1', port: 0 })
  try {
    return (listener.addr as Deno.NetAddr).port
  } finally {
    listener.close()
  }
}

export function makeToken(bytes = 24): string {
  const value = crypto.getRandomValues(new Uint8Array(bytes))
  return Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  )
}

export type Agent = ReturnType<typeof createAgent>
