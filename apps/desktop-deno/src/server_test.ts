import { createApp } from 'h3'
import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@1'
import { createDesktopHandler } from './server.ts'

async function fixture() {
  const uiDir = await Deno.makeTempDir({ prefix: 'meow-ui-' })
  await Deno.writeTextFile(`${uiDir}/index.html`, '<h1>Meow</h1>')
  return {
    uiDir,
    handler: createDesktopHandler({
      uiDir,
      agentRouter: createApp(),
      controlToken: 'control-token',
      clashUrl: 'http://127.0.0.1:9090',
      clashSecret: 'clash-secret',
      platform: 'linux',
    }),
  }
}

Deno.test(
  'desktop bridge exposes native frame and runtime credentials',
  async () => {
    const { handler, uiDir } = await fixture()
    try {
      const response = await handler(new Request('http://localhost/config.js'))
      const script = await response.text()

      assertEquals(response.headers.get('cache-control'), 'no-store')
      assertStringIncludes(script, 'nativeFrame: true')
      assertStringIncludes(script, 'control-token')
      assertStringIncludes(script, 'clash-secret')
    } finally {
      await Deno.remove(uiDir, { recursive: true })
    }
  },
)

Deno.test('static handler serves the SPA and supports HEAD', async () => {
  const { handler, uiDir } = await fixture()
  try {
    const page = await handler(new Request('http://localhost/proxies'))
    const head = await handler(
      new Request('http://localhost/', { method: 'HEAD' }),
    )

    assertEquals(await page.text(), '<h1>Meow</h1>')
    assertEquals(page.headers.get('content-security-policy') !== null, true)
    assertEquals(await head.text(), '')
  } finally {
    await Deno.remove(uiDir, { recursive: true })
  }
})
