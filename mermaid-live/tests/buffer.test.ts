import { test } from 'node:test'
import assert from 'node:assert/strict'

import { TurnBuffer } from '../hooks/lib/buffer.ts'

const policy = { minGrowth: 100, minIntervalMs: 1000, minLength: 50 }

test('短すぎるうちは評価しない', () => {
  const buffer = new TurnBuffer(policy)
  buffer.push('あ'.repeat(10))
  assert.equal(buffer.shouldAnalyze(10_000), false)
})

test('十分に伸びたら評価する', () => {
  const buffer = new TurnBuffer(policy)
  buffer.push('あ'.repeat(200))
  assert.equal(buffer.shouldAnalyze(10_000), true)
})

test('間隔が空くまで次の評価をしない', () => {
  const buffer = new TurnBuffer(policy)
  buffer.push('あ'.repeat(200))
  buffer.begin(10_000)
  buffer.end()
  buffer.push('い'.repeat(200))
  assert.equal(buffer.shouldAnalyze(10_500), false)
  assert.equal(buffer.shouldAnalyze(11_000), true)
})

test('評価中は重ねて走らせない', () => {
  const buffer = new TurnBuffer(policy)
  buffer.push('あ'.repeat(200))
  buffer.begin(10_000)
  buffer.push('い'.repeat(500))
  assert.equal(buffer.shouldAnalyze(99_999), false)
  buffer.end()
  assert.equal(buffer.shouldAnalyze(99_999), true)
})

test('応答が終わったときは間隔も伸びも無視して 1 回だけ評価する', () => {
  const buffer = new TurnBuffer(policy)
  buffer.push('あ'.repeat(60))
  assert.equal(buffer.shouldAnalyze(0, true), true)
  buffer.begin(0)
  buffer.end()
  assert.equal(buffer.shouldAnalyze(0, true), false)
})

test('時計を見る前の足切りが効く', () => {
  const buffer = new TurnBuffer(policy)
  buffer.push('あ'.repeat(60))
  assert.equal(buffer.mayAnalyze(), false)
  buffer.push('あ'.repeat(200))
  assert.equal(buffer.mayAnalyze(), true)
})

test('ターンが変わればまっさらに戻る', () => {
  const buffer = new TurnBuffer(policy)
  buffer.push('あ'.repeat(200))
  buffer.begin(1000)
  buffer.reset()
  assert.equal(buffer.length, 0)
  assert.equal(buffer.inFlight, false)
})
