/**
 * Mod 全体の通し試験。
 *
 * Claude Code を立ち上げずに、`$` と Jev と turn.step のストリームを偽物に
 * 差し替えて register.ts を丸ごと動かす。ここが通れば、チャンクを溜める →
 * Jev に聞く → Mermaid を書き出す、の一本道は繋がっている。
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { register } from '../hooks/register.ts'

type Hook = (...args: unknown[]) => unknown

/** register() が登録したフックを名前で拾えるようにする偽の `on`。 */
function collector() {
  const hooks = new Map<string, Hook>()
  const on = (pattern: string, second: unknown, third?: unknown) => {
    hooks.set(pattern, (third ?? second) as Hook)
    return { catch: () => undefined }
  }
  return { hooks, on }
}

/** turn.step の下から流れてくるストリームの偽物。 */
function fakeStream(chunks: unknown[], result: unknown) {
  const generator = (async function* () {
    for (const chunk of chunks) yield chunk
    return result
  })()
  return Object.assign(generator, { result: Promise.resolve(result) })
}

type Written = Map<string, string>

function fakeEngine(written: Written, jevBody: string, env: Record<string, string>) {
  const logs: string[] = []
  const invalidated: string[] = []
  const requests: { url: string; body: unknown }[] = []
  const engine = {
    plugin: { name: 'mermaid-live', root: '/plugins/mermaid-live' },
    env: { get: async (name: string) => env[name] },
    clock: {
      now: async () => 1_000_000,
      // 負けた側の待ちがプロセスを生かしたままにしないよう unref しておく。
      sleep: (ms: number) =>
        new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, ms)
          if (typeof timer === 'object' && 'unref' in timer) timer.unref()
        }),
    },
    http: {
      fetch: async (url: string, init?: { body?: string }) => {
        requests.push({ url, body: JSON.parse(init?.body ?? '{}') })
        return { status: 200, ok: true, text: jevBody }
      },
    },
    fs: {
      write: async (path: string, text: string) => {
        written.set(path, text)
      },
    },
    process: { run: async () => ({ exitCode: 0, stdout: '', stderr: '' }) },
    ui: {
      log: (text: string) => logs.push(text),
      invalidate: (event: string) => invalidated.push(event),
      resolve: () => ({
        Box: (props: unknown) => ({ type: 'Box', props }),
        Text: (props: unknown) => ({ type: 'Text', props }),
      }),
    },
  }
  return { engine, logs, invalidated, requests }
}

const drawBody = JSON.stringify({
  model: 'jev-latest',
  answers: {
    diagrammable: { type: 'noul', noul: 0.95 },
    kind: { type: 'choice', choice: 'flowchart', probabilities: { flowchart: 0.88, none: 0.04 } },
    readiness: { type: 'score', score: 1.9 },
    direction: { type: 'choice', choice: 'TD', probabilities: { TD: 0.7, LR: 0.3 } },
  },
  usage: { input_tokens: 400, output_tokens: 8 },
})

const holdBody = JSON.stringify({
  model: 'jev-latest',
  answers: {
    diagrammable: { type: 'noul', noul: 0.05 },
    kind: { type: 'choice', choice: 'none', probabilities: { none: 0.9 } },
    readiness: { type: 'score', score: 0.2 },
  },
})

const answer = [
  '# ログインの流れ\n\n',
  '1. ユーザーがフォームに入力する\n',
  '2. サーバーが資格情報を確認する\n',
  '3. トークンを発行して返す\n',
  '4. クライアントがトークンを保存する\n',
  'これで完了です。'.repeat(20),
]

async function run(jevBody: string, env: Record<string, string>) {
  const { hooks, on } = collector()
  register(on as never, {} as never)

  const written: Written = new Map()
  const { engine, invalidated, requests } = fakeEngine(written, jevBody, env)

  const sessionStart = hooks.get('session.start')
  assert.ok(sessionStart)
  await sessionStart(engine, { hook_event_name: 'SessionStart' }, async (e: unknown) => e)

  const turnStep = hooks.get('turn.step')
  assert.ok(turnStep)
  const chunks = answer.map((text, index) => ({ kind: 'text', index, text, ref: index }))
  const stream = turnStep(
    engine,
    { turnId: 't1', index: 0, model: 'claude-opus-5', messageCount: 3 },
    () => fakeStream(chunks, { turnId: 't1', index: 0, answer: answer.join(''), toolUses: [] }),
  ) as AsyncGenerator<unknown, unknown>

  const seen: unknown[] = []
  let done = await stream.next()
  while (done.done !== true) {
    seen.push(done.value)
    done = await stream.next()
  }

  return { written, invalidated, requests, seen, result: done.value, hooks, engine }
}

test('チャンクは一つも落とさずに素通しする', async () => {
  const { seen } = await run(drawBody, { TYPESAFE_API_KEY: 'sk-test' })
  assert.equal(seen.length, answer.length)
  assert.equal((seen[0] as { text: string }).text, answer[0])
})

test('Jev が描けと言えば .mmd と state.json を書く', async () => {
  const { written, requests } = await run(drawBody, { TYPESAFE_API_KEY: 'sk-test' })

  assert.ok(requests.length >= 1)
  assert.equal(requests[0]?.url, 'https://api.typesafe.ai/v1/systemone')

  const mermaid = written.get('.claude/mermaid-live/current.mmd')
  assert.ok(mermaid, 'current.mmd が書かれていない')
  assert.match(mermaid, /^flowchart TD/)
  assert.match(mermaid, /ユーザーがフォームに入力する/)

  const state = JSON.parse(written.get('.claude/mermaid-live/state.json') ?? '{}')
  assert.equal(state.kind, 'flowchart')
  assert.equal(state.title, 'ログインの流れ')
  assert.equal(state.final, true)
  assert.equal(state.jev, true)
})

test('Jev が「図にしなくてよい」と言えば何も書かない', async () => {
  const { written } = await run(holdBody, { TYPESAFE_API_KEY: 'sk-test' })
  assert.equal(written.size, 0)
})

test('API キーが無ければ Jev を呼ばずに規則ベースで描く', async () => {
  const { written, requests } = await run(drawBody, {})
  assert.equal(requests.length, 0)
  assert.match(written.get('.claude/mermaid-live/current.mmd') ?? '', /^flowchart TD/)
  const state = JSON.parse(written.get('.claude/mermaid-live/state.json') ?? '{}')
  assert.equal(state.jev, false)
})

test('書き出し先は環境変数で変えられる', async () => {
  const { written } = await run(drawBody, {
    TYPESAFE_API_KEY: 'sk-test',
    MERMAID_LIVE_DIR: 'docs/diagrams',
  })
  assert.ok(written.has('docs/diagrams/current.mmd'))
})

test('図が更新されたら帯に再描画を頼む', async () => {
  const { invalidated } = await run(drawBody, { TYPESAFE_API_KEY: 'sk-test' })
  assert.ok(invalidated.includes('ui.render'))
})

test('帯は現在の状態を描く', async () => {
  const { hooks, engine } = await run(drawBody, { TYPESAFE_API_KEY: 'sk-test' })
  const render = hooks.get('ui.render')
  assert.ok(render)
  const tree = render(
    engine,
    {
      surface: 'terminal',
      component: 'AbovePrompt',
      requestId: 'band',
      props: { hasSurvey: false, isWorking: false, maxRows: 12, bodyColumns: 80 },
    },
    () => 'engine-own',
  ) as { type: string }
  assert.equal(tree.type, 'Box')
})

test('サブエージェントの応答には手を出さない', async () => {
  const { hooks, on } = collector()
  register(on as never, {} as never)
  const written: Written = new Map()
  const { engine } = fakeEngine(written, drawBody, { TYPESAFE_API_KEY: 'sk-test' })

  const turnStep = hooks.get('turn.step')
  assert.ok(turnStep)
  const stream = turnStep(
    engine,
    { turnId: 't2', index: 0, model: 'claude-opus-5', messageCount: 2, agentId: 'agent-1' },
    () => fakeStream(answer.map((text, index) => ({ kind: 'text', index, text })), { answer: '' }),
  ) as AsyncGenerator<unknown, unknown>

  let done = await stream.next()
  while (done.done !== true) done = await stream.next()
  assert.equal(written.size, 0)
})

test('自前の OpenJev を向けると、キー無しでそこを叩く', async () => {
  const { written, requests } = await run(drawBody, {
    MERMAID_LIVE_BASE_URL: 'http://127.0.0.1:8080/v1',
  })

  assert.equal(requests.length >= 1, true)
  assert.equal(requests[0]?.url, 'http://127.0.0.1:8080/v1/systemone')

  const state = JSON.parse(written.get('.claude/mermaid-live/state.json') ?? '{}')
  assert.equal(state.jev, true)
  assert.equal(state.provider, 'custom')
  assert.match(written.get('.claude/mermaid-live/current.mmd') ?? '', /^flowchart TD/)
})

test('Codiv のホスト版を向けると openjev として記録される', async () => {
  const { written, requests } = await run(drawBody, {
    MERMAID_LIVE_BASE_URL: 'https://api.codiv.ai/v1',
    MERMAID_LIVE_API_KEY: 'sk-codiv-test',
  })

  assert.equal(requests[0]?.url, 'https://api.codiv.ai/v1/systemone')
  const state = JSON.parse(written.get('.claude/mermaid-live/state.json') ?? '{}')
  assert.equal(state.provider, 'openjev')
})
