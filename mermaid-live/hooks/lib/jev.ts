/**
 * Jev（TypeSafe AI の System One モデル）のクライアント。
 *
 * ワイヤ形式は POST {baseUrl}/systemone に
 *   { state, model, questions: { <id>: { type, instructions, criteria? } } }
 * を送ると
 *   { model, answers: { <id>: { type:'noul'|'choice'|'score', ... } }, usage }
 * が返る、というだけのもの。
 *
 * fetch は引数で受け取る。Mod の中では node を import できず `$.http.fetch` しか
 * 使えないため、その形（{ status, ok, headers, text }）に合わせてある。
 */

import type { JevQuestions } from './questions.ts'

export const JEV_BASE_URL = 'https://api.typesafe.ai/v1'
export const JEV_DEFAULT_MODEL = 'jev-latest'

/** `$.http.fetch` が返す形。 */
export type HttpResponseLike = {
  status: number
  ok: boolean
  headers?: Record<string, string>
  text: string
}

export type FetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<HttpResponseLike>

export type NoulAnswer = { type: 'noul'; noul: number; confidence?: number }
export type ChoiceAnswer = {
  type: 'choice'
  choice: string
  probabilities?: Record<string, number>
  confidence?: number
}
export type ScoreAnswer = {
  type: 'score'
  score: number
  probabilities?: Record<string, number>
  confidence?: number
}
export type JevAnswer = NoulAnswer | ChoiceAnswer | ScoreAnswer

export type JevResult = {
  answers: Record<string, JevAnswer>
  model: string | null
  usage: { inputTokens: number | null; outputTokens: number | null }
}

export class JevError extends Error {
  readonly status: number | null
  constructor(message: string, status: number | null = null) {
    super(message)
    this.name = 'JevError'
    this.status = status
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** エラー本文から読める 1 文を取り出す。422 は detail にぶら下がる。 */
export function errorMessage(body: string, status: number): string {
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    return body.trim().length > 0 ? body.trim() : `Jev returned HTTP ${status}.`
  }
  if (isRecord(parsed)) {
    for (const key of ['detail', 'message', 'error']) {
      const value = parsed[key]
      if (typeof value === 'string' && value.length > 0) return value
      if (value !== null && typeof value === 'object') return JSON.stringify(value)
    }
  }
  return body.trim().length > 0 ? body.trim() : `Jev returned HTTP ${status}.`
}

/** 1 つの答えを検証して型を付ける。形が違えば null（その質問だけ捨てる）。 */
export function parseAnswer(raw: unknown): JevAnswer | null {
  if (!isRecord(raw)) return null
  const confidence = typeof raw.confidence === 'number' ? raw.confidence : undefined
  if (raw.type === 'noul' && typeof raw.noul === 'number') {
    return { type: 'noul', noul: raw.noul, ...(confidence === undefined ? {} : { confidence }) }
  }
  if (raw.type === 'choice' && typeof raw.choice === 'string') {
    const probabilities = isRecord(raw.probabilities)
      ? (raw.probabilities as Record<string, number>)
      : undefined
    return {
      type: 'choice',
      choice: raw.choice,
      ...(probabilities === undefined ? {} : { probabilities }),
      ...(confidence === undefined ? {} : { confidence }),
    }
  }
  if (raw.type === 'score' && typeof raw.score === 'number') {
    const probabilities = isRecord(raw.probabilities)
      ? (raw.probabilities as Record<string, number>)
      : undefined
    return {
      type: 'score',
      score: raw.score,
      ...(probabilities === undefined ? {} : { probabilities }),
      ...(confidence === undefined ? {} : { confidence }),
    }
  }
  return null
}

export function parseResult(body: string, status: number): JevResult {
  let payload: unknown
  try {
    payload = JSON.parse(body)
  } catch {
    throw new JevError('Jev returned a body that is not JSON.', status)
  }
  if (!isRecord(payload) || !isRecord(payload.answers)) {
    throw new JevError('Jev returned a response without an "answers" object.', status)
  }

  const answers: Record<string, JevAnswer> = {}
  for (const [id, raw] of Object.entries(payload.answers)) {
    const answer = parseAnswer(raw)
    if (answer !== null) answers[id] = answer
  }

  const usage = isRecord(payload.usage) ? payload.usage : {}
  return {
    answers,
    model: typeof payload.model === 'string' ? payload.model : null,
    usage: {
      inputTokens: typeof usage.input_tokens === 'number' ? usage.input_tokens : null,
      outputTokens: typeof usage.output_tokens === 'number' ? usage.output_tokens : null,
    },
  }
}

export type EvaluateOptions = {
  fetch: FetchLike
  apiKey: string
  state: unknown
  questions: JevQuestions
  model?: string
  baseUrl?: string
}

/** 質問をまとめて 1 往復で評価する。 */
export async function evaluate(options: EvaluateOptions): Promise<JevResult> {
  const baseUrl = (options.baseUrl ?? JEV_BASE_URL).replace(/\/+$/, '')
  const url = `${baseUrl}/systemone`
  const body = JSON.stringify({
    state: options.state,
    model: options.model ?? JEV_DEFAULT_MODEL,
    questions: options.questions,
  })

  const response = await options.fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${options.apiKey}`,
      'content-type': 'application/json',
    },
    body,
  })

  if (!response.ok) throw new JevError(errorMessage(response.text, response.status), response.status)
  return parseResult(response.text, response.status)
}
