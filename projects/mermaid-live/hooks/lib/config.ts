/**
 * 環境変数から設定を作る。Mod からは `$.env.get()` で読んだ値を渡す。
 */

import { DEFAULT_THRESHOLDS } from './decide.ts'
import type { Thresholds } from './decide.ts'
import { DEFAULT_POLICY } from './buffer.ts'
import type { BufferPolicy } from './buffer.ts'
import { JEV_BASE_URL, JEV_DEFAULT_MODEL } from './jev.ts'

/** 読む環境変数の名前。register.ts がこの順で `$.env.get` する。 */
export const ENV_KEYS = [
  'MERMAID_LIVE_API_KEY',
  'TYPESAFE_API_KEY',
  'TYPESAFE_AI_API_KEY',
  'MERMAID_LIVE_MODEL',
  'MERMAID_LIVE_BASE_URL',
  'MERMAID_LIVE_DIR',
  'MERMAID_LIVE_PORT',
  'MERMAID_LIVE_VIEWER',
  'MERMAID_LIVE_MIN_GROWTH',
  'MERMAID_LIVE_MIN_INTERVAL_MS',
  'MERMAID_LIVE_THRESHOLD',
] as const

export type EnvBag = Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>

export type Config = {
  apiKey: string | null
  model: string
  baseUrl: string
  /** .mmd と state.json を書く場所。セッションの作業ディレクトリからの相対。 */
  dir: string
  port: number
  /** ビューアを自動で起動するか。 */
  autoViewer: boolean
  policy: BufferPolicy
  thresholds: Thresholds
}

function numberOr(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback
  const parsed = Number(value.trim())
  return Number.isFinite(parsed) ? parsed : fallback
}

function truthy(value: string | undefined): boolean {
  if (value === undefined) return false
  const normalized = value.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

export function readConfig(env: EnvBag): Config {
  const apiKey =
    env.MERMAID_LIVE_API_KEY?.trim() ??
    env.TYPESAFE_API_KEY?.trim() ??
    env.TYPESAFE_AI_API_KEY?.trim() ??
    ''

  // 1 つの閾値で全部を上下させる簡易つまみ。個別に変えたい人は decide.ts の既定値を読む。
  const dial = env.MERMAID_LIVE_THRESHOLD === undefined ? null : numberOr(env.MERMAID_LIVE_THRESHOLD, 0)
  const thresholds: Thresholds =
    dial === null
      ? DEFAULT_THRESHOLDS
      : {
          diagrammable: dial,
          kind: Math.max(0, dial - 0.15),
          readiness: DEFAULT_THRESHOLDS.readiness,
          changed: DEFAULT_THRESHOLDS.changed,
        }

  return {
    apiKey: apiKey.length > 0 ? apiKey : null,
    model: env.MERMAID_LIVE_MODEL?.trim() || JEV_DEFAULT_MODEL,
    baseUrl: env.MERMAID_LIVE_BASE_URL?.trim() || JEV_BASE_URL,
    dir: env.MERMAID_LIVE_DIR?.trim() || '.claude/mermaid-live',
    port: numberOr(env.MERMAID_LIVE_PORT, 4737),
    autoViewer: truthy(env.MERMAID_LIVE_VIEWER),
    policy: {
      minGrowth: numberOr(env.MERMAID_LIVE_MIN_GROWTH, DEFAULT_POLICY.minGrowth),
      minIntervalMs: numberOr(env.MERMAID_LIVE_MIN_INTERVAL_MS, DEFAULT_POLICY.minIntervalMs),
      minLength: DEFAULT_POLICY.minLength,
    },
    thresholds,
  }
}
