import { test } from 'node:test'
import assert from 'node:assert/strict'

import { providerOf, readConfig } from '../hooks/lib/config.ts'

test('キーも自前サーバも無ければ判定を呼ばない', () => {
  const config = readConfig({})
  assert.equal(config.enabled, false)
  assert.equal(config.apiKey, null)
  assert.equal(config.provider, 'jev')
  assert.equal(config.baseUrl, 'https://api.typesafe.ai/v1')
})

test('キーがあれば本家の Jev を呼ぶ', () => {
  const config = readConfig({ TYPESAFE_API_KEY: 'ts-abc' })
  assert.equal(config.enabled, true)
  assert.equal(config.apiKey, 'ts-abc')
  assert.equal(config.provider, 'jev')
})

test('自前のサーバを向けたらキー無しでも呼ぶ', () => {
  // 自分で立てた OpenJev は既定で認証を要求しない（OPENJEV_API_KEY が未設定）。
  const config = readConfig({ MERMAID_LIVE_BASE_URL: 'http://127.0.0.1:8080/v1' })
  assert.equal(config.enabled, true)
  assert.equal(config.apiKey, null)
  assert.equal(config.baseUrl, 'http://127.0.0.1:8080/v1')
  assert.equal(config.provider, 'custom')
})

test('自前サーバでもキーを渡せば使う', () => {
  const config = readConfig({
    MERMAID_LIVE_BASE_URL: 'https://api.codiv.ai/v1',
    MERMAID_LIVE_API_KEY: 'sk-codiv-xyz',
  })
  assert.equal(config.enabled, true)
  assert.equal(config.apiKey, 'sk-codiv-xyz')
  assert.equal(config.provider, 'openjev')
})

test('向き先から実装の見当をつける', () => {
  assert.equal(providerOf('https://api.typesafe.ai/v1', true), 'jev')
  assert.equal(providerOf('https://api.typesafe.ai/v1', false), 'jev')
  assert.equal(providerOf('https://api.codiv.ai/v1', false), 'openjev')
  assert.equal(providerOf('http://openjev.local:8080/v1', false), 'openjev')
  assert.equal(providerOf('http://127.0.0.1:8080/v1', false), 'custom')
})

test('モデル名は差し替えられる（OpenJev は jev-latest も受けるが明示もできる）', () => {
  assert.equal(readConfig({}).model, 'jev-latest')
  assert.equal(readConfig({ MERMAID_LIVE_MODEL: 'openjev-latest' }).model, 'openjev-latest')
})

test('空文字の baseUrl は既定に戻す', () => {
  const config = readConfig({ MERMAID_LIVE_BASE_URL: '   ' })
  assert.equal(config.baseUrl, 'https://api.typesafe.ai/v1')
  assert.equal(config.enabled, false)
})
