#!/usr/bin/env node
/**
 * この Mod が 1 応答あたり Jev にいくら払うことになるかを実測する。
 *
 *   node tools/cost.ts              # 用意した日本語の応答で測る
 *   node tools/cost.ts answer.md    # 自分の文章で測る
 *
 * ネットワークには出ない。実際に送るリクエスト本文を組み立てて、
 * その文字数から見積もるだけ。docs/pricing.md の数字はこれで出している。
 */

import { readFile } from 'node:fs/promises'

import { extract } from '../hooks/lib/extract.ts'
import { buildQuestions, buildState } from '../hooks/lib/questions.ts'
import { TurnBuffer, DEFAULT_POLICY } from '../hooks/lib/buffer.ts'

/** Jev の入力単価（USD / 100万トークン）。出力は $0。 */
const USD_PER_MILLION_INPUT = 0.042

/** 応答が届く速さ。判定の間隔制限が効くかどうかがこれで変わる。 */
const MS_PER_CHAR = 20 // = 50 文字/秒

/**
 * 文字数からトークン数への換算。Jev のトークナイザは公開されていないので、
 * 日本語に厳しい側と英数中心の側で挟んで幅で出す。
 */
const RATIOS: readonly [string, number][] = [
  ['1 文字 = 1 トークン（日本語に厳しめ）', 1],
  ['3 文字 = 1 トークン（日本語混在で現実的）', 3],
  ['4 文字 = 1 トークン（英数・記号中心）', 4],
]

const SAMPLE = `# ログイン処理の流れ

ログイン処理はブラウザとサーバーの往復で成り立っています。まずフォームの値を検証し、問題がなければサーバーへ送ります。サーバーは資格情報をデータベースと照合し、一致した場合にアクセストークンを発行します。トークンは有効期限を短くしておき、更新トークンで延ばすのが一般的です。

1. ユーザーがメールアドレスとパスワードを入力する
2. ブラウザがフォームの内容を検証する
3. サーバーが資格情報を照合する
4. 一致すればアクセストークンを発行する
5. ブラウザがトークンを保存する
6. 完了

ブラウザ -> サーバー: POST /login
サーバー -> DB: ユーザーを引く
DB -> サーバー: ハッシュを返す
サーバー -> ブラウザ: 200 とトークン

トークンの寿命は短くして、更新トークンで延ばすのが普通です。保存先は localStorage ではなく、HttpOnly な Cookie にするほうが安全です。`

async function main(): Promise<void> {
  const file = process.argv[2]
  const answer = file === undefined ? SAMPLE : await readFile(file, 'utf8')

  const buffer = new TurnBuffer(DEFAULT_POLICY)
  let calls = 0
  let totalChars = 0
  let previous: string | null = null
  let clock = 0

  console.log(`応答の長さ: ${answer.length} 文字`)
  console.log(
    `判定の条件: ${DEFAULT_POLICY.minGrowth} 文字増えるごと / 最短 ${DEFAULT_POLICY.minIntervalMs}ms 間隔\n`,
  )

  for (let i = 0; i < answer.length; i += 1) {
    buffer.push(answer[i] as string)
    clock += MS_PER_CHAR
    const final = i === answer.length - 1
    if (!buffer.shouldAnalyze(clock, final)) continue

    const text = buffer.begin(clock)
    const outline = extract(text)
    const body = JSON.stringify({
      state: buildState(text, outline, previous),
      model: 'jev-latest',
      questions: buildQuestions(previous !== null),
    })

    calls += 1
    totalChars += body.length
    console.log(
      `  ${String(calls).padStart(2)} 回目: 本文 ${String(text.length).padStart(5)} 文字時点 → リクエスト ${body.length} 文字`,
    )
    // 2 回目以降は「前の図から変わったか」も聞くので、その分だけ質問が増える。
    previous = 'flowchart TD\n  n1["..."]\n  n1 --> n2'
    buffer.end()
  }

  console.log(`\n合計: ${calls} 回の評価、リクエスト本文 ${totalChars} 文字`)
  console.log(`単価: $${USD_PER_MILLION_INPUT} / 100万入力トークン（出力は $0）\n`)

  for (const [label, charsPerToken] of RATIOS) {
    const tokens = Math.round(totalChars / charsPerToken)
    const usd = (tokens / 1_000_000) * USD_PER_MILLION_INPUT
    console.log(
      `${label.padEnd(32)} ${String(tokens).padStart(7)} トークン  $${usd.toFixed(6)} / 応答  $${(usd * 1000).toFixed(3)} / 1000 応答`,
    )
  }
}

await main()
