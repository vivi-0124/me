#!/usr/bin/env node
/**
 * mermaid-live のビューア。依存ゼロ（Node の標準モジュールだけ）。
 *
 *   node viewer/server.mjs [--port 4737] [--dir .claude/mermaid-live] [--detach]
 *
 * Mod が書く <dir>/state.json を見張って、変わったら SSE でブラウザに流す。
 * ブラウザ側が CDN の Mermaid で実際の図を描く。
 *
 * --detach は自分自身を detached で起動し直して即終了する。
 * Mod からは $.process.run で呼ばれるが、これは子の終了まで待つ呼び出しなので、
 * 常駐させるにはいったん親が抜ける必要がある。
 */

import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { readFile, mkdir, stat } from 'node:fs/promises'
import { watch } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))

/** `--key value` と `--flag` を読む素朴なパーサ。 */
function parseArgs(argv) {
  const args = { port: 4737, dir: '.claude/mermaid-live', detach: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--detach') args.detach = true
    else if (arg === '--port') args.port = Number(argv[(i += 1)]) || args.port
    else if (arg === '--dir') args.dir = argv[(i += 1)] ?? args.dir
  }
  return args
}

const args = parseArgs(process.argv.slice(2))

if (args.detach) {
  // 自分を detached で起動し直して、親はすぐ抜ける。
  const child = spawn(
    process.execPath,
    [fileURLToPath(import.meta.url), '--port', String(args.port), '--dir', args.dir],
    { detached: true, stdio: 'ignore' },
  )
  child.unref()
  process.exit(0)
}

const stateDir = resolve(process.cwd(), args.dir)
const statePath = join(stateDir, 'state.json')

/** 直近の state.json。読めなければ「まだ何もない」を返す。 */
async function readState() {
  try {
    const text = await readFile(statePath, 'utf8')
    return JSON.parse(text)
  } catch {
    return { updatedAt: 0, mermaid: null, kind: null, confidence: 0, reason: 'まだ図はありません' }
  }
}

/** つながっている SSE クライアント。 */
const clients = new Set()

function broadcast(payload) {
  const line = `data: ${JSON.stringify(payload)}\n\n`
  for (const client of clients) {
    try {
      client.write(line)
    } catch {
      clients.delete(client)
    }
  }
}

let lastSent = ''

async function pushIfChanged() {
  const state = await readState()
  const serialized = JSON.stringify(state)
  if (serialized === lastSent) return
  lastSent = serialized
  broadcast(state)
}

async function startWatching() {
  await mkdir(stateDir, { recursive: true })
  try {
    watch(stateDir, () => {
      void pushIfChanged()
    })
  } catch {
    // fs.watch が使えない環境（一部のネットワークFS）ではポーリングだけで動く。
  }
  // fs.watch は取りこぼすことがあるので、ポーリングも併用する。
  setInterval(() => {
    void pushIfChanged()
  }, 700).unref?.()
  // 心拍。プロキシに切られないように。
  setInterval(() => {
    for (const client of clients) {
      try {
        client.write(': ping\n\n')
      } catch {
        clients.delete(client)
      }
    }
  }, 20000).unref?.()
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)

  if (url.pathname === '/events') {
    response.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    })
    response.write('retry: 2000\n\n')
    clients.add(response)
    const state = await readState()
    response.write(`data: ${JSON.stringify(state)}\n\n`)
    request.on('close', () => clients.delete(response))
    return
  }

  if (url.pathname === '/state') {
    const state = await readState()
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify(state))
    return
  }

  if (url.pathname === '/current.mmd') {
    const state = await readState()
    response.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' })
    response.end(state.mermaid ?? '')
    return
  }

  if (url.pathname === '/' || url.pathname === '/index.html') {
    try {
      const html = await readFile(join(HERE, 'index.html'), 'utf8')
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      response.end(html)
    } catch (error) {
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
      response.end(String(error))
    }
    return
  }

  response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
  response.end('not found')
})

server.on('error', (error) => {
  // すでに誰かが同じポートで待っている = 前のセッションのビューアが生きている。
  // 自動起動から何度呼ばれても静かに終わるのが正しい。
  if (error && error.code === 'EADDRINUSE') process.exit(0)
  console.error(`mermaid-live viewer: ${error}`)
  process.exit(1)
})

server.listen(args.port, '127.0.0.1', async () => {
  await startWatching()
  try {
    await stat(statePath)
  } catch {
    // state.json はまだ無くてよい。Mod が最初の図を書いた時点で流れ始める。
  }
  console.log(`mermaid-live viewer: http://127.0.0.1:${args.port} (watching ${statePath})`)
})
