import { test } from 'node:test'
import assert from 'node:assert/strict'

import { errorMessage, evaluate, JevError, parseAnswer, parseResult } from '../hooks/lib/jev.ts'
import type { FetchLike } from '../hooks/lib/jev.ts'
import { buildQuestions, buildState } from '../hooks/lib/questions.ts'
import { extract } from '../hooks/lib/extract.ts'

const answersBody = JSON.stringify({
  model: 'jev-2026-09-15',
  answers: {
    diagrammable: { type: 'noul', noul: 0.94, confidence: 0.81 },
    kind: { type: 'choice', choice: 'flowchart', probabilities: { flowchart: 0.7, none: 0.3 } },
    readiness: { type: 'score', score: 1.78, probabilities: { '0': 0, '1': 0.22, '2': 0.78 } },
  },
  usage: { input_tokens: 812, output_tokens: 12 },
})

test('答えの 3 つの型を読む', () => {
  assert.deepEqual(parseAnswer({ type: 'noul', noul: 0.5 }), { type: 'noul', noul: 0.5 })
  assert.equal(parseAnswer({ type: 'choice', choice: 'a' })?.type, 'choice')
  assert.equal(parseAnswer({ type: 'score', score: 2 })?.type, 'score')
  assert.equal(parseAnswer({ type: 'noul' }), null)
  assert.equal(parseAnswer('noul'), null)
})

test('レスポンス全体を読む', () => {
  const result = parseResult(answersBody, 200)
  assert.equal(result.model, 'jev-2026-09-15')
  assert.equal(result.usage.inputTokens, 812)
  const kind = result.answers.kind
  assert.equal(kind?.type === 'choice' ? kind.choice : null, 'flowchart')
})

test('answers が無い応答は投げる', () => {
  assert.throws(() => parseResult('{"model":"x"}', 200), JevError)
  assert.throws(() => parseResult('not json', 200), JevError)
})

test('エラー本文から 1 文を取り出す', () => {
  assert.equal(errorMessage('{"detail":"bad key"}', 401), 'bad key')
  assert.equal(errorMessage('', 500), 'Jev returned HTTP 500.')
})

test('送るリクエストが System One のワイヤ形式になっている', async () => {
  let seen: { url: string; init: unknown } | null = null
  const fakeFetch: FetchLike = async (url, init) => {
    seen = { url, init }
    return { status: 200, ok: true, text: answersBody }
  }

  const outline = extract('1. 受け取る\n2. 返す\n')
  await evaluate({
    fetch: fakeFetch,
    apiKey: 'sk-test',
    state: buildState('1. 受け取る\n2. 返す\n', outline, null),
    questions: buildQuestions(false),
  })

  assert.ok(seen !== null)
  const call = seen as unknown as { url: string; init: { method: string; headers: Record<string, string>; body: string } }
  assert.equal(call.url, 'https://api.typesafe.ai/v1/systemone')
  assert.equal(call.init.method, 'POST')
  assert.equal(call.init.headers.authorization, 'Bearer sk-test')

  const body = JSON.parse(call.init.body)
  assert.equal(body.model, 'jev-latest')
  assert.deepEqual(Object.keys(body.questions).sort(), ['diagrammable', 'direction', 'kind', 'readiness'])
  assert.equal(body.questions.diagrammable.type, 'noul')
  assert.equal(body.questions.kind.type, 'choice')
  assert.ok(Array.isArray(body.questions.readiness.criteria))
  assert.equal(body.state.extracted.steps.length, 2)
})

test('図が出ているときだけ「変わったか」を聞く', () => {
  assert.equal('changed' in buildQuestions(false), false)
  assert.equal('changed' in buildQuestions(true), true)
})

test('長い応答は末尾だけ送る', () => {
  const long = 'あ'.repeat(9000)
  const state = buildState(long, extract('1. a\n2. b\n'), null, 1000)
  assert.equal((state.answer_so_far as string).length, 1001)
})

test('HTTP エラーは JevError になる', async () => {
  const fakeFetch: FetchLike = async () => ({ status: 401, ok: false, text: '{"detail":"no key"}' })
  await assert.rejects(
    () => evaluate({ fetch: fakeFetch, apiKey: 'x', state: {}, questions: buildQuestions(false) }),
    (error: unknown) => error instanceof JevError && error.status === 401,
  )
})
