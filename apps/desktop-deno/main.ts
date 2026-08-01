import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createAgent } from '@metacubexd/agent'
import { installBundledKernel } from './src/kernel.ts'
import { bootstrapRuntimePaths, runtimePaths } from './src/paths.ts'
import { makeToken, pickFreePort } from './src/runtime.ts'
import { createDesktopHandler } from './src/server.ts'

async function main(): Promise<void> {
  const appDir = fileURLToPath(new URL('.', import.meta.url))
  const resourcesDir = join(appDir, 'resources')
  const trayIconPath = fileURLToPath(
    new URL('../desktop/resources/tray.png', import.meta.url),
  )
  const uiDir = fileURLToPath(
    new URL(
      Deno.build.standalone
        ? './resources/ui/'
        : '../../packages/ui/.output/public/',
      import.meta.url,
    ),
  )
  const paths = runtimePaths()

  await bootstrapRuntimePaths(paths, join(resourcesDir, 'default-config.yaml'))
  const binaryPath = await installBundledKernel(paths, resourcesDir)
  const clashPort = await pickFreePort()
  const mixedPort = await pickFreePort()
  const controlToken = makeToken()
  const clashSecret = makeToken()
  const clashUrl = `http://127.0.0.1:${clashPort}`

  const agent = createAgent({
    binaryPath,
    homeDir: paths.homeDir,
    profilesDir: paths.profilesDir,
    activeConfigPath: paths.activeConfigPath,
    agentToken: controlToken,
    externalController: `127.0.0.1:${clashPort}`,
    secret: clashSecret,
    mixedPort,
  })

  const desktopHandler = createDesktopHandler({
    uiDir,
    agentRouter: agent.router,
    controlToken,
    clashUrl,
    clashSecret,
    platform: process.platform,
  })
  let markServerReady: () => void
  const serverReady = new Promise<void>((resolve) => {
    markServerReady = resolve
  })
  let serverReadyMarked = false
  const handler = async (request: Request): Promise<Response> => {
    const response = await desktopHandler(request)
    if (!serverReadyMarked && response.status < 400) {
      serverReadyMarked = true
      setTimeout(markServerReady, 0)
    }
    return response
  }
  const server = Deno.serve({ hostname: '127.0.0.1', port: 0 }, handler)
  console.error('[meow] loopback server started')
  if (Deno.env.get('MEOW_HEADLESS') === '1') {
    console.error('[meow] headless smoke ready')
    await server.finished
    return
  }
  await serverReady
  console.error('[meow] initial server response completed')
  const win = new Deno.BrowserWindow({
    title: 'Meow',
    width: 1180,
    height: 760,
  })
  console.error('[meow] browser window created')
  win.show()
  console.error('[meow] browser window shown')
  if (!win.isVisible()) throw new Error('Failed to show the main window')
  console.error('[meow] browser window visibility confirmed')
  win.focus()
  console.error('[meow] browser window focused')

  let quitting = false
  let cleanedUp = false

  async function cleanup(): Promise<void> {
    if (cleanedUp) return
    cleanedUp = true
    await agent.supervisor.dispose()
    agent.scheduler.stop()
    await server.shutdown()
  }

  async function quit(): Promise<void> {
    if (quitting) return
    quitting = true
    tray.destroy()
    await cleanup()
    Deno.exit(0)
  }

  win.addEventListener('close', (event) => {
    if (quitting) return
    event.preventDefault()
    win.hide()
  })

  const tray = new Deno.Tray()
  console.error('[meow] tray created')
  tray.setIcon(await Deno.readFile(trayIconPath))
  console.error('[meow] tray icon loaded')
  tray.setTooltip('Meow')
  tray.setMenu([
    { item: { id: 'open', label: 'Open', enabled: true } },
    'separator',
    { item: { id: 'start', label: 'Start Kernel', enabled: true } },
    { item: { id: 'stop', label: 'Stop Kernel', enabled: true } },
    'separator',
    { item: { id: 'quit', label: 'Quit', enabled: true } },
  ])
  tray.addEventListener('click', () => {
    win.show()
    win.focus()
  })
  tray.addEventListener('menuclick', (event) => {
    if (event.detail.id === 'open') {
      win.show()
      win.focus()
    } else if (event.detail.id === 'start') {
      void agent.supervisor.start()
    } else if (event.detail.id === 'stop') {
      void agent.supervisor.stop()
    } else if (event.detail.id === 'quit') {
      void quit()
    }
  })

  Deno.dock.addEventListener('reopen', () => {
    win.show()
    win.focus()
  })

  agent.scheduler.start()
  console.error('[meow] startup complete')
  void agent.supervisor.start().catch((error: unknown) => {
    console.error('Failed to start bundled kernel:', error)
  })

  if (Deno.build.os !== 'windows') {
    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      Deno.addSignalListener(signal, () => void quit())
    }
  }
}

void main().catch((error: unknown) => {
  console.error('Failed to start Meow:', error)
  Deno.exit(1)
})
