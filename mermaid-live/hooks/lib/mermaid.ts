/**
 * Outline を Mermaid のソースに変換する純関数群。
 *
 * Mermaid はラベルの中の記号でわりと簡単に構文エラーになるので、
 * ラベルは必ず二重引用符で包み、危ない文字は HTML エンティティに逃がす。
 */

import type { Outline, OutlineNode } from './extract.ts'

/** Jev に選ばせる図の種類。増やすほど選択が鈍るので 4 つ + none に絞っている。 */
export type DiagramKind = 'flowchart' | 'sequence' | 'state' | 'mindmap' | 'none'

export type Direction = 'TD' | 'LR'

export const DIAGRAM_KINDS: readonly DiagramKind[] = [
  'flowchart',
  'sequence',
  'state',
  'mindmap',
  'none',
]

/**
 * ラベルを Mermaid に渡せる形にする。
 *
 * `"` と `#` はそれぞれ文字列とエンティティの開始なので必ず逃がす。
 * 改行はラベルの中では `<br/>` にしないと構文が壊れる。
 */
export function escapeLabel(label: string): string {
  return label
    .replace(/#/g, '#35;')
    .replace(/"/g, '#quot;')
    .replace(/[\r\n]+/g, '<br/>')
    .trim()
}

/** participant 名は引用符で包めないので、記号を落として英数字と日本語だけ残す。 */
export function safeActor(name: string): string {
  const cleaned = name.replace(/["'`:;,()（）\[\]{}<>|#]/g, '').replace(/\s+/g, '_').trim()
  return cleaned.length > 0 ? cleaned : 'actor'
}

function nodeText(node: OutlineNode): string {
  const label = `"${escapeLabel(node.label)}"`
  if (node.shape === 'diamond') return `${node.id}{${label}}`
  if (node.shape === 'round') return `${node.id}(${label})`
  return `${node.id}[${label}]`
}

function flowchart(outline: Outline, direction: Direction): string | null {
  if (outline.nodes.length === 0) return null
  const lines = [`flowchart ${direction}`]
  for (const node of outline.nodes) lines.push(`  ${nodeText(node)}`)
  for (const link of outline.links) {
    const label = link.label === null ? '' : `|"${escapeLabel(link.label)}"|`
    lines.push(`  ${link.from} -->${label} ${link.to}`)
  }
  return lines.join('\n')
}

function sequence(outline: Outline): string | null {
  if (outline.exchanges.length === 0) return null
  const lines = ['sequenceDiagram']
  for (const actor of outline.actors) lines.push(`  participant ${safeActor(actor)}`)
  for (const exchange of outline.exchanges) {
    lines.push(
      `  ${safeActor(exchange.from)}->>${safeActor(exchange.to)}: ${escapeLabel(exchange.text)}`,
    )
  }
  return lines.join('\n')
}

function state(outline: Outline): string | null {
  if (outline.nodes.length === 0) return null
  const lines = ['stateDiagram-v2']
  for (const node of outline.nodes) lines.push(`  ${node.id} : ${escapeLabel(node.label)}`)

  const hasIncoming = new Set(outline.links.map((link) => link.to))
  const hasOutgoing = new Set(outline.links.map((link) => link.from))
  const first = outline.nodes.find((node) => !hasIncoming.has(node.id))
  if (first !== undefined) lines.push(`  [*] --> ${first.id}`)

  for (const link of outline.links) {
    const label = link.label === null ? '' : ` : ${escapeLabel(link.label)}`
    lines.push(`  ${link.from} --> ${link.to}${label}`)
  }

  const last = [...outline.nodes].reverse().find((node) => !hasOutgoing.has(node.id))
  if (last !== undefined && last.id !== first?.id) lines.push(`  ${last.id} --> [*]`)
  return lines.join('\n')
}

function mindmap(outline: Outline): string | null {
  if (outline.nodes.length === 0) return null
  const root = outline.title ?? 'answer'
  const lines = ['mindmap', `  root(("${escapeLabel(root)}"))`]
  for (const node of outline.nodes) lines.push(`    ${escapeLabel(node.label)}`)
  return lines.join('\n')
}

/**
 * Mermaid ソースを組み立てる。描けないときは null。
 *
 * 応答自体が ```mermaid を持っていて、かつ閉じ終わっていれば、それをそのまま使う。
 * 閉じていない（まだ流れている）フェンスは構文が欠けているので使わない。
 */
export function toMermaid(
  outline: Outline,
  kind: DiagramKind,
  direction: Direction = 'TD',
): string | null {
  if (outline.mermaidFence !== null && outline.fenceClosed && outline.mermaidFence.length > 0) {
    return outline.mermaidFence
  }
  if (kind === 'none') return null
  if (kind === 'sequence') return sequence(outline) ?? flowchart(outline, direction)
  if (kind === 'state') return state(outline)
  if (kind === 'mindmap') return mindmap(outline)
  return flowchart(outline, direction)
}

/**
 * Jev に聞くまでもなく決まる場合の、種類の当て推量。
 *
 * API キーが無いときのフォールバックであり、キーがあるときは Jev の答えが勝つ。
 */
export function guessKind(outline: Outline): DiagramKind {
  if (outline.mermaidFence !== null) return 'flowchart'
  if (outline.exchanges.length >= 2 && outline.actors.length >= 2) return 'sequence'
  if (outline.nodes.length >= 2) return 'flowchart'
  return 'none'
}
