import { test } from 'node:test'
import assert from 'node:assert/strict'

import { cleanLabel, extract, scanFences } from '../hooks/lib/extract.ts'

test('マークダウンの飾りを落としてラベルにする', () => {
  assert.equal(cleanLabel('**トークン**を `localStorage` に保存する。'), 'トークンを localStorage に保存する')
  assert.equal(cleanLabel('[MDN](https://developer.mozilla.org) を読む'), 'MDN を読む')
  assert.equal(cleanLabel('a'.repeat(80)).length, 48)
})

test('番号付きリストを順番どおりの手順にする', () => {
  const outline = extract('1. 入力を受け取る\n2. 配列にする\n3. リストに返す\n')
  assert.deepEqual(
    outline.nodes.map((node) => node.label),
    ['入力を受け取る', '配列にする', 'リストに返す'],
  )
  assert.deepEqual(
    outline.links.map((link) => `${link.from}->${link.to}`),
    ['n1->n2', 'n2->n3'],
  )
})

test('分岐と終端の形を言い回しから決める', () => {
  const outline = extract('1. トークンが有効かどうか\n2. 完了\n')
  assert.equal(outline.nodes[0]?.shape, 'diamond')
  assert.equal(outline.nodes[1]?.shape, 'round')
})

test('矢印行を接続として拾い、ラベル付きはやり取りにもする', () => {
  const outline = extract('ブラウザ -> サーバー: POST /login\nサーバー -> DB\n')
  assert.deepEqual(outline.actors, ['ブラウザ', 'サーバー'])
  assert.deepEqual(outline.exchanges, [{ from: 'ブラウザ', to: 'サーバー', text: 'POST /login' }])
  assert.equal(outline.links.length, 2)
  assert.equal(outline.links[1]?.label, null)
})

test('矢印の連鎖を隣り合う組に割る', () => {
  const outline = extract('取得 → 整形 → 表示\n')
  assert.equal(outline.nodes.length, 3)
  assert.equal(outline.links.length, 2)
})

test('同じラベルは 1 つのノードにまとめる', () => {
  const outline = extract('A -> B\nB -> A\n')
  assert.equal(outline.nodes.length, 2)
})

test('閉じた mermaid フェンスはそのまま持ち帰る', () => {
  const outline = extract('説明です。\n\n```mermaid\nflowchart TD\n  a --> b\n```\n')
  assert.equal(outline.mermaidFence, 'flowchart TD\n  a --> b')
  assert.equal(outline.fenceClosed, true)
})

test('閉じていない mermaid フェンスは未完として印をつける', () => {
  const outline = extract('```mermaid\nflowchart TD\n  a -->')
  assert.equal(outline.fenceClosed, false)
  assert.equal(outline.mermaidFence, 'flowchart TD\n  a -->')
})

test('mermaid 以外のコードフェンスは本文から外す', () => {
  const { body } = scanFences('前\n```js\nconst a = b => c\n```\n後\n')
  assert.equal(body.includes('=>'), false)
  assert.equal(body.includes('前'), true)
  assert.equal(body.includes('後'), true)
})

test('箇条書きしか無いときは箇条書きを手順に使う', () => {
  const outline = extract('# 題\n\n- 一つ目\n- 二つ目\n')
  assert.equal(outline.title, '題')
  assert.equal(outline.nodes.length, 2)
})

test('材料が無い応答は空の Outline になる', () => {
  const outline = extract('はい、そのとおりです。\n')
  assert.equal(outline.counts.nodes, 0)
  assert.equal(outline.mermaidFence, null)
})
