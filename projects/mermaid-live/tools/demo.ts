#!/usr/bin/env node
/**
 * Claude Code を立ち上げずにビューアの動きを見るためのデモ。
 *
 *   node viewer/server.mjs &        # 別のターミナルで
 *   node tools/demo.ts              # 応答が流れてくる様子を再現する
 *   node tools/demo.ts answer.md    # 自分の文章で試す
 *
 * Mod の中で走っているのと同じ extract → 判定 → toMermaid を、
 * `$` の代わりに node の fs と fetch を使って回しているだけ。
 */

import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

import { extract } from '../hooks/lib/extract.ts'
import { toMermaid } from '../hooks/lib/mermaid.ts'
import { buildQuestions, buildState } from '../hooks/lib/questions.ts'
import { evaluate } from '../hooks/lib/jev.ts'
import { decide, decideWithoutJev } from '../hooks/lib/decide.ts'
import type { Decision } from '../hooks/lib/decide.ts'
import { TurnBuffer } from '../hooks/lib/buffer.ts'
import { readConfig } from '../hooks/lib/config.ts'

const SAMPLE = `# ログイン処理の流れ

ざっくり言うと、ブラウザとサーバーの往復が 2 回あります。

1. ユーザーがメールアドレスとパスワードを入力する
2. ブラウザがフォームの内容を検証する
3. サーバーが資格情報を照合する
4. 一致すればアクセストークンを発行する
5. ブラウザがトークンを保存する
6. 完了

やり取りだけ取り出すとこうなります。

ブラウザ -> サーバー: POST /login
サーバー -> DB: ユーザーを引く
DB -> サーバー: ハッシュを返す
サーバー -> ブラウザ: 200 とトークン

トークンの寿命は短くして、更新トークンで延ばすのが普通です。
`

async function main(): Promise<void> {
  const file = process.argv[2]
  const answer = file === undefined ? SAMPLE : await readFile(file, 'utf8')

  const config = readConfig({
    MERMAID_LIVE_API_KEY: process.env.MERMAID_LIVE_API_KEY,
    TYPESAFE_API_KEY: process.env.TYPESAFE_API_KEY,
    TYPESAFE_AI_API_KEY: process.env.TYPESAFE_AI_API_KEY,
    MERMAID_LIVE_DIR: process.env.MERMAID_LIVE_DIR,
    MERMAID_LIVE_MIN_GROWTH: process.env.MERMAID_LIVE_MIN_GROWTH ?? '80',
    MERMAID_LIVE_MIN_INTERVAL_MS: process.env.MERMAID_LIVE_MIN_INTERVAL_MS ?? '0',
  })

  const dir = resolve(process.cwd(), config.dir)
  await mkdir(dir, { recursive: true })
  console.log(`mermaid-live demo: ${dir} に書き出します (Jev: ${config.apiKey === null ? '無効' : '有効'})`)

  const buffer = new TurnBuffer(config.policy)
  let previous: string | null = null

  // 実際のストリームに近づけるため、1 行ずつ流し込む。
  const lines = answer.split('\n').map((line) => `${line}\n`)
  for (const [index, line] of lines.entries()) {
    buffer.push(line)
    const final = index === lines.length - 1
    const now = Date.now()
    if (!buffer.shouldAnalyze(now, final)) {
      await sleep(60)
      continue
    }

    const text = buffer.begin(now)
    const outline = extract(text)

    let decision: Decision
    if (config.apiKey === null) {
      decision = decideWithoutJev(outline, previous !== null)
    } else {
      const result = await evaluate({
        fetch: async (url, init) => {
          const response = await fetch(url, init)
          return { status: response.status, ok: response.ok, text: await response.text() }
        },
        apiKey: config.apiKey,
        model: config.model,
        baseUrl: config.baseUrl,
        state: buildState(text, outline, previous),
        questions: buildQuestions(previous !== null),
      })
      decision = decide(result, previous !== null, config.thresholds)
    }
    buffer.end()

    console.log(`  ${String(index).padStart(2, ' ')}行目: ${decision.action} — ${decision.reason}`)
    if (decision.action !== 'draw') {
      await sleep(120)
      continue
    }

    const mermaid = toMermaid(outline, decision.kind, decision.direction)
    if (mermaid === null) continue
    previous = mermaid

    await writeFile(resolve(dir, 'current.mmd'), `${mermaid}\n`)
    await writeFile(
      resolve(dir, 'state.json'),
      `${JSON.stringify(
        {
          updatedAt: Date.now(),
          title: outline.title,
          kind: decision.kind,
          direction: decision.direction,
          confidence: decision.confidence,
          reason: final ? '応答が終わりました（確定）' : '応答の途中経過です',
          jev: config.apiKey !== null,
          final,
          mermaid,
        },
        null,
        2,
      )}\n`,
    )
    await sleep(400)
  }

  console.log('mermaid-live demo: 終わりました。')
}

await main()
