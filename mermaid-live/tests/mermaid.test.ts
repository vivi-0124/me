import { test } from 'node:test'
import assert from 'node:assert/strict'

import { extract } from '../hooks/lib/extract.ts'
import { escapeLabel, guessKind, safeActor, toMermaid } from '../hooks/lib/mermaid.ts'

test('Mermaid を壊す文字を逃がす', () => {
  assert.equal(escapeLabel('a"b'), 'a#quot;b')
  assert.equal(escapeLabel('#1 を見る'), '#35;1 を見る')
  assert.equal(escapeLabel('一行目\n二行目'), '一行目<br/>二行目')
})

test('participant 名から記号を落とす', () => {
  assert.equal(safeActor('ブラウザ (Chrome)'), 'ブラウザ_Chrome')
  assert.equal(safeActor(':::'), 'actor')
})

test('flowchart は向きとノードの形を反映する', () => {
  const outline = extract('1. 受け取る\n2. 有効かどうか\n3. 完了\n')
  const source = toMermaid(outline, 'flowchart', 'LR') ?? ''
  assert.match(source, /^flowchart LR/)
  assert.match(source, /n2\{"有効かどうか"\}/)
  assert.match(source, /n3\("完了"\)/)
  assert.match(source, /n1 --> n2/)
})

test('sequence は participant とメッセージを出す', () => {
  const outline = extract('ブラウザ -> サーバー: GET /\nサーバー -> ブラウザ: 200\n')
  const source = toMermaid(outline, 'sequence') ?? ''
  assert.match(source, /^sequenceDiagram/)
  assert.match(source, /participant ブラウザ/)
  assert.match(source, /ブラウザ->>サーバー: GET \//)
})

test('やり取りが無いのに sequence を選ばれたら flowchart に落とす', () => {
  const outline = extract('1. 一つ目\n2. 二つ目\n')
  const source = toMermaid(outline, 'sequence') ?? ''
  assert.match(source, /^flowchart/)
})

test('state は開始と終了の印を足す', () => {
  const outline = extract('1. 未ログイン\n2. 認証中\n3. ログイン済み\n')
  const source = toMermaid(outline, 'state') ?? ''
  assert.match(source, /^stateDiagram-v2/)
  assert.match(source, /\[\*\] --> n1/)
  assert.match(source, /n3 --> \[\*\]/)
})

test('none は何も描かない', () => {
  assert.equal(toMermaid(extract('1. a\n2. b\n'), 'none'), null)
})

test('材料が無ければ null', () => {
  assert.equal(toMermaid(extract('ただの文章です'), 'flowchart'), null)
})

test('閉じた mermaid フェンスがあればそれを使う', () => {
  const outline = extract('```mermaid\nflowchart TD\n  a --> b\n```\n')
  assert.equal(toMermaid(outline, 'sequence'), 'flowchart TD\n  a --> b')
})

test('閉じていない mermaid フェンスは使わない', () => {
  const outline = extract('```mermaid\nflowchart TD\n  a -->')
  // 未完のフェンスを出すと構文エラーの図がちらつくので、材料から組み直すか諦める。
  assert.equal(toMermaid(outline, 'flowchart'), null)
})

test('Jev が無いときの当て推量', () => {
  assert.equal(guessKind(extract('A -> B: x\nB -> A: y\n')), 'sequence')
  assert.equal(guessKind(extract('1. a\n2. b\n')), 'flowchart')
  assert.equal(guessKind(extract('こんにちは')), 'none')
})
