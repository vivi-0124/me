/**
 * Jev に投げる「型つきの質問」を組み立てる。
 *
 * Jev は文章を書かない。選択肢・段階・確率だけを返す。
 * つまり「図にすべきか」「どの図か」「もう描いていいか」という判断だけを任せ、
 * Mermaid の文字列そのものは mermaid.ts が決定的に作る。
 * この分担のおかげで、ストリーミング中でも壊れた図が出ない。
 */

import type { Outline } from './extract.ts'
import { DIAGRAM_KINDS } from './mermaid.ts'
import type { DiagramKind } from './mermaid.ts'

/** Jev のワイヤ上の質問。boolean は `noul` という名前になる。 */
export type JevQuestion =
  | { type: 'noul'; instructions: string; criteria?: { true?: string; false?: string } }
  | { type: 'choice'; instructions: string; criteria: Record<string, string> }
  | { type: 'score'; instructions: string; criteria: string[] }

export type JevQuestions = Record<string, JevQuestion>

/** readiness の段階。低い順。decide.ts が添字で読むので順番が意味を持つ。 */
export const READINESS_LEVELS = [
  'Only a fragment so far: the shape of the answer is not visible yet.',
  'The skeleton is visible: the main steps or participants can be named.',
  'Essentially complete: a diagram drawn now would not be misleading.',
]

const KIND_CRITERIA: Record<Exclude<DiagramKind, never>, string> = {
  flowchart: 'A process, procedure, decision tree or pipeline: steps that follow one another.',
  sequence: 'Messages exchanged between two or more named participants, in time order.',
  state: 'A thing that moves between named states, with transitions and an end state.',
  mindmap: 'A topic broken into unordered parts, categories or options: structure without flow.',
  none: 'Prose, a direct answer, code, or anything a diagram would not clarify.',
}

/** Jev に渡す state。テキストは末尾だけ送る（長いほど遅く、高くなる）。 */
export function buildState(
  answerSoFar: string,
  outline: Outline,
  previousMermaid: string | null,
  maxChars = 4000,
): Record<string, unknown> {
  const text =
    answerSoFar.length > maxChars
      ? `…${answerSoFar.slice(answerSoFar.length - maxChars)}`
      : answerSoFar

  return {
    answer_so_far: text,
    still_streaming: true,
    extracted: {
      title: outline.title,
      steps: outline.nodes.map((node) => node.label),
      links: outline.links.length,
      participants: outline.actors,
      messages: outline.exchanges.map((exchange) => `${exchange.from} -> ${exchange.to}: ${exchange.text}`),
      has_mermaid_block: outline.mermaidFence !== null,
    },
    diagram_on_screen: previousMermaid,
  }
}

/**
 * 1 リクエストにまとめる質問の束。
 *
 * Jev は全部を並列に評価して 1 往復で返すので、分けて聞く理由がない。
 */
export function buildQuestions(hasPrevious: boolean): JevQuestions {
  const questions: JevQuestions = {
    diagrammable: {
      type: 'noul',
      instructions:
        'Would a diagram help a reader understand this answer? Judge the answer itself, not the extracted hints.',
      criteria: {
        true: 'It describes a process, an exchange between parties, a state machine, or a structure with parts.',
        false: 'It is prose, a one-line answer, a code walkthrough, or a list of unrelated facts.',
      },
    },
    kind: {
      type: 'choice',
      instructions: 'Which diagram fits this answer best?',
      criteria: Object.fromEntries(
        DIAGRAM_KINDS.map((kind) => [kind, KIND_CRITERIA[kind]]),
      ) as Record<string, string>,
    },
    readiness: {
      type: 'score',
      instructions:
        'The answer is still streaming. How complete is what has arrived so far, for the purpose of drawing it?',
      criteria: READINESS_LEVELS,
    },
    direction: {
      type: 'choice',
      instructions: 'Which layout reads better for this content?',
      criteria: {
        TD: 'Top to bottom: a procedure, a decision tree, many short steps.',
        LR: 'Left to right: a pipeline, a timeline, few steps with long labels.',
      },
    },
  }

  if (hasPrevious) {
    // 「前に描いた図と意味が変わったか」。
    // これが無いと 1 秒ごとに描き直してちらつく。
    questions.changed = {
      type: 'noul',
      instructions:
        'Compared with diagram_on_screen, has the answer changed enough that the diagram should be redrawn?',
      criteria: {
        true: 'New steps, new participants, or a different structure has appeared.',
        false: 'Only wording or detail was added; the diagram would look the same.',
      },
    }
  }

  return questions
}
