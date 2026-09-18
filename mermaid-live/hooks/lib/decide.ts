/**
 * Jev の答えを「描く / 待つ / 据え置く」の 3 択に落とす。
 *
 * ここが Jev を使う理由そのもの。文章生成モデルに「図にすべき？」と聞くと
 * 毎回それらしい文章が返ってきて、閾値で切ることができない。
 * Jev は確率を返すので、ちらつきも空振りも数字で止められる。
 */

import type { JevAnswer, JevResult } from './jev.ts'
import { DIAGRAM_KINDS } from './mermaid.ts'
import type { DiagramKind, Direction } from './mermaid.ts'
import { READINESS_LEVELS } from './questions.ts'
import type { Outline } from './extract.ts'
import { guessKind } from './mermaid.ts'

export type Thresholds = {
  /** これ未満なら図にしない。 */
  diagrammable: number
  /** readiness（0〜levels-1 の実数）がこれ未満なら、材料が足りないので待つ。 */
  readiness: number
  /** 選ばれた種類の確率がこれ未満なら、迷っているので待つ。 */
  kind: number
  /** 「変わったか」がこれ未満なら、前の図を据え置く。 */
  changed: number
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  diagrammable: 0.55,
  readiness: 1.0,
  kind: 0.4,
  changed: 0.5,
}

export type Decision =
  | { action: 'draw'; kind: DiagramKind; direction: Direction; confidence: number; reason: string }
  | { action: 'hold'; reason: string; confidence: number }
  | { action: 'keep'; reason: string; confidence: number }

function noul(answer: JevAnswer | undefined): number | null {
  return answer !== undefined && answer.type === 'noul' ? answer.noul : null
}

function choice(answer: JevAnswer | undefined): { value: string; probability: number } | null {
  if (answer === undefined || answer.type !== 'choice') return null
  const probability = answer.probabilities?.[answer.choice]
  return { value: answer.choice, probability: typeof probability === 'number' ? probability : 1 }
}

function score(answer: JevAnswer | undefined): number | null {
  return answer !== undefined && answer.type === 'score' ? answer.score : null
}

function asKind(value: string): DiagramKind | null {
  return (DIAGRAM_KINDS as readonly string[]).includes(value) ? (value as DiagramKind) : null
}

/** 帯に出す 0〜1 の確信度。diagrammable と種類の確率の低いほうを採る。 */
function confidenceOf(diagrammable: number | null, kindProbability: number | null): number {
  const values = [diagrammable, kindProbability].filter((value): value is number => value !== null)
  return values.length === 0 ? 0 : Math.min(...values)
}

/**
 * Jev の答えから決める。
 *
 * @param hasPrevious すでに図が出ているか。出ているなら「据え置き」が選べる。
 */
export function decide(
  result: JevResult,
  hasPrevious: boolean,
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
): Decision {
  const diagrammable = noul(result.answers.diagrammable)
  const kindAnswer = choice(result.answers.kind)
  const readiness = score(result.answers.readiness)
  const directionAnswer = choice(result.answers.direction)
  const changed = noul(result.answers.changed)

  const confidence = confidenceOf(diagrammable, kindAnswer?.probability ?? null)

  if (diagrammable !== null && diagrammable < thresholds.diagrammable) {
    return { action: 'hold', reason: `図にする価値が低い (${diagrammable.toFixed(2)})`, confidence }
  }

  const kind = kindAnswer === null ? null : asKind(kindAnswer.value)
  if (kind === null) return { action: 'hold', reason: '図の種類が決まらない', confidence }
  if (kind === 'none') return { action: 'hold', reason: '図にしないほうがよい応答', confidence }

  if (kindAnswer !== null && kindAnswer.probability < thresholds.kind) {
    return {
      action: 'hold',
      reason: `種類が割れている (${kind} ${kindAnswer.probability.toFixed(2)})`,
      confidence,
    }
  }

  if (readiness !== null && readiness < thresholds.readiness) {
    const top = READINESS_LEVELS.length - 1
    return {
      action: 'hold',
      reason: `まだ材料が足りない (${readiness.toFixed(2)}/${top})`,
      confidence,
    }
  }

  if (hasPrevious && changed !== null && changed < thresholds.changed) {
    return { action: 'keep', reason: `前の図のままでよい (${changed.toFixed(2)})`, confidence }
  }

  const direction: Direction = directionAnswer?.value === 'LR' ? 'LR' : 'TD'
  return { action: 'draw', kind, direction, confidence, reason: '描画' }
}

/**
 * API キーが無い / Jev が落ちているときの判断。
 *
 * 決定的な規則だけで動く。確信度は「Jev に聞いていない」印として 0 を返す。
 */
export function decideWithoutJev(outline: Outline, hasPrevious: boolean): Decision {
  const kind = guessKind(outline)
  if (kind === 'none') return { action: 'hold', reason: '材料なし (Jev 無効)', confidence: 0 }
  if (outline.counts.nodes < 2) return { action: 'hold', reason: 'ノードが 1 つだけ', confidence: 0 }
  if (hasPrevious && outline.counts.nodes < 3) {
    return { action: 'keep', reason: '変化が小さい (Jev 無効)', confidence: 0 }
  }
  return { action: 'draw', kind, direction: 'TD', confidence: 0, reason: '規則ベースで描画' }
}
