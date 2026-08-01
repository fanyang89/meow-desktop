import { assertEquals, assertMatch } from 'jsr:@std/assert@1'
import { makeToken, pickFreePort } from './runtime.ts'

Deno.test('makeToken returns the requested entropy as hex', () => {
  assertMatch(makeToken(24), /^[0-9a-f]{48}$/)
})

Deno.test('pickFreePort returns a bindable TCP port', async () => {
  const port = await pickFreePort()
  const listener = Deno.listen({ hostname: '127.0.0.1', port })
  assertEquals((listener.addr as Deno.NetAddr).port, port)
  listener.close()
})
