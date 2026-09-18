/**
 * プロンプトのすぐ上（AbovePrompt）に出す帯の組み立て。
 *
 * 端末に Mermaid の絵そのものは描けないので、ここに出すのは
 * 「いまどう判断しているか」と Mermaid ソースの先頭数行。
 * 絵を見たいときはビューア（ブラウザ）を開く。
 */

import type { DiagramKind } from './mermaid.ts'

export type Phase = 'idle' | 'thinking' | 'drawn' | 'held' | 'error'

export type BandStatus = {
  phase: Phase
  kind: DiagramKind | null
  confidence: number
  reason: string
  mermaid: string | null
  file: string | null
  viewerUrl: string | null
  jevEnabled: boolean
  tokens: number | null
}

export const IDLE_STATUS: BandStatus = {
  phase: 'idle',
  kind: null,
  confidence: 0,
  reason: '待機中',
  mermaid: null,
  file: null,
  viewerUrl: null,
  jevEnabled: false,
  tokens: null,
}

/** 確率を 10 段のバーにする。Jev の確率をそのまま目で見るための表示。 */
export function confidenceBar(value: number, width = 10): string {
  const clamped = Math.max(0, Math.min(1, value))
  const filled = Math.round(clamped * width)
  return `${'█'.repeat(filled)}${'░'.repeat(width - filled)} ${clamped.toFixed(2)}`
}

const PHASE_LABEL: Record<Phase, string> = {
  idle: '待機',
  thinking: '判定中',
  drawn: '描画',
  held: '保留',
  error: 'エラー',
}

const PHASE_COLOR: Record<Phase, string> = {
  idle: 'gray',
  thinking: 'yellow',
  drawn: 'green',
  held: 'yellow',
  error: 'red',
}

/** 帯に入れる Mermaid ソースの行数（多いと入力欄が押し上げられる）。 */
export function previewLines(mermaid: string | null, maxLines: number, columns: number): string[] {
  if (mermaid === null) return []
  const lines = mermaid.split('\n')
  const shown = lines.slice(0, maxLines).map((line) => {
    const trimmed = line.replace(/\t/g, '  ')
    return trimmed.length > columns - 4 ? `${trimmed.slice(0, columns - 5)}…` : trimmed
  })
  if (lines.length > maxLines) shown.push(`… 他 ${lines.length - maxLines} 行`)
  return shown
}

/**
 * 要素コンストラクタ。props の型は面ごとに違うので、ここでは中身を見ない。
 * 返り値 `R` は `$.ui.resolve(e)` が返すテーブルから推論させる。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ElementFn<R> = (props: any) => R

type ElementTable<R> = {
  Box: ElementFn<R>
  Text: ElementFn<R>
}

/**
 * 帯の描画ツリーを組み立てる。
 *
 * 要素コンストラクタを引数で受け取るので、テストでは差し替えられる。
 * Mod の中では `$.ui.resolve(e)` が返すテーブルをそのまま渡す。
 */
export function bandTree<R>(
  elements: ElementTable<R>,
  status: BandStatus,
  columns: number,
  maxRows: number,
): R {
  const { Box, Text } = elements
  const width = Math.max(24, columns)
  const previewRoom = Math.max(0, Math.min(8, maxRows - 4))

  const header: R[] = [
    Text({ color: PHASE_COLOR[status.phase], bold: true, children: [`mermaid-live ${PHASE_LABEL[status.phase]}`] }),
    Text({ dimColor: true, children: ['  '] }),
    Text({ color: 'cyan', children: [status.kind ?? '-'] }),
    Text({ dimColor: true, children: ['  '] }),
    Text({ dimColor: true, children: [confidenceBar(status.confidence)] }),
  ]

  if (!status.jevEnabled) {
    header.push(Text({ dimColor: true, children: ['  '] }))
    header.push(Text({ color: 'yellow', children: ['Jev 無効'] }))
  }

  const rows: R[] = [Box({ flexDirection: 'row', children: header })]
  rows.push(Text({ dimColor: true, wrap: 'truncate-end', children: [status.reason] }))

  const preview = previewLines(status.mermaid, previewRoom, width)
  if (preview.length > 0) {
    rows.push(
      Box({
        flexDirection: 'column',
        marginTop: 1,
        children: preview.map((line) => Text({ dimColor: true, wrap: 'truncate-end', children: [line] })),
      }),
    )
  }

  const footer: string[] = []
  if (status.file !== null) footer.push(status.file)
  if (status.viewerUrl !== null) footer.push(status.viewerUrl)
  if (status.tokens !== null) footer.push(`${status.tokens} tok`)
  if (footer.length > 0) {
    rows.push(Text({ dimColor: true, wrap: 'truncate-end', children: [footer.join('  ·  ')] }))
  }

  return Box({
    flexDirection: 'column',
    borderStyle: 'round',
    borderDimColor: true,
    paddingX: 1,
    width,
    children: rows,
  })
}
