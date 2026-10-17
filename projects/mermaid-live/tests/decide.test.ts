import { test } from 'node:test'
import assert from 'node:assert/strict'

import { decide, decideWithoutJev, DEFAULT_THRESHOLDS } from '../hooks/lib/decide.ts'
import type { JevResult } from '../hooks/lib/jev.ts'
import { extract } from '../hooks/lib/extract.ts'

function result(answers: JevResult['answers']): JevResult {
  return { answers, model: 'jev-latest', usage: { inputTokens: null, outputTokens: null } }
}

const good = {
  diagrammable: { type: 'noul', noul: 0.92 },
  kind: { type: 'choice', choice: 'flowchart', probabilities: { flowchart: 0.8, none: 0.2 } },
  readiness: { type: 'score', score: 1.9 },
  direction: { type: 'choice', choice: 'LR', probabilities: { LR: 0.6, TD: 0.4 } },
} as JevResult['answers']

test('確率がそろえば描く', () => {
  const decision = decide(result(good), false)
  assert.equal(decision.action, 'draw')
  assert.equal(decision.action === 'draw' ? decision.kind : null, 'flowchart')
  assert.equal(decision.action === 'draw' ? decision.direction : null, 'LR')
})

test('図にする価値が低ければ描かない', () => {
  const decision = decide(result({ ...good, diagrammable: { type: 'noul', noul: 0.2 } }), false)
  assert.equal(decision.action, 'hold')
})

test('none が選ばれたら描かない', () => {
  const answers = { ...good, kind: { type: 'choice', choice: 'none', probabilities: { none: 0.9 } } }
  assert.equal(decide(result(answers as JevResult['answers']), false).action, 'hold')
})

test('種類が割れていたら待つ', () => {
  const answers = {
    ...good,
    kind: { type: 'choice', choice: 'flowchart', probabilities: { flowchart: 0.34, sequence: 0.33 } },
  }
  const decision = decide(result(answers as JevResult['answers']), false)
  assert.equal(decision.action, 'hold')
  assert.match(decision.reason, /割れて/)
})

test('材料が足りなければ待つ', () => {
  const decision = decide(result({ ...good, readiness: { type: 'score', score: 0.4 } }), false)
  assert.equal(decision.action, 'hold')
  assert.match(decision.reason, /材料/)
})

test('意味が変わっていなければ前の図を据え置く（ちらつき防止）', () => {
  const answers = { ...good, changed: { type: 'noul', noul: 0.1 } }
  const decision = decide(result(answers as JevResult['answers']), true)
  assert.equal(decision.action, 'keep')
})

test('意味が変わっていれば描き直す', () => {
  const answers = { ...good, changed: { type: 'noul', noul: 0.9 } }
  assert.equal(decide(result(answers as JevResult['answers']), true).action, 'draw')
})

test('閾値は差し替えられる', () => {
  const answers = { ...good, diagrammable: { type: 'noul', noul: 0.6 } }
  const strict = { ...DEFAULT_THRESHOLDS, diagrammable: 0.8 }
  assert.equal(decide(result(answers as JevResult['answers']), false, strict).action, 'hold')
  assert.equal(decide(result(answers as JevResult['answers']), false).action, 'draw')
})

test('答えが欠けていても落ちない', () => {
  assert.equal(decide(result({}), false).action, 'hold')
})

test('Jev 無しの規則ベース', () => {
  assert.equal(decideWithoutJev(extract('1. a\n2. b\n3. c\n'), false).action, 'draw')
  assert.equal(decideWithoutJev(extract('こんにちは'), false).action, 'hold')
  assert.equal(decideWithoutJev(extract('1. a\n2. b\n'), true).action, 'keep')
})
