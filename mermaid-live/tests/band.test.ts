import { test } from 'node:test'
import assert from 'node:assert/strict'

import { bandTree, confidenceBar, previewLines, IDLE_STATUS } from '../hooks/lib/band.ts'

test('確率をバーにする', () => {
  assert.equal(confidenceBar(0, 4), '░░░░ 0.00')
  assert.equal(confidenceBar(1, 4), '████ 1.00')
  assert.equal(confidenceBar(0.5, 4), '██░░ 0.50')
  assert.equal(confidenceBar(4, 4), '████ 1.00')
})

test('先頭数行だけ出して残りは件数で示す', () => {
  const source = ['flowchart TD', ' a', ' b', ' c', ' d'].join('\n')
  const lines = previewLines(source, 2, 80)
  assert.deepEqual(lines, ['flowchart TD', ' a', '… 他 3 行'])
})

test('長い行は端末幅で切る（枠と余白の 4 桁を残す）', () => {
  const lines = previewLines(`x${'y'.repeat(100)}`, 1, 20)
  assert.equal(lines[0]?.length, 16)
  assert.ok(lines[0]?.endsWith('…'))
})

test('図が無ければ preview も無い', () => {
  assert.deepEqual(previewLines(null, 5, 80), [])
})

test('描画ツリーを組み立てる', () => {
  const made: string[] = []
  const elements = {
    Box: (props: Record<string, unknown>) => {
      made.push('Box')
      return { type: 'Box', props }
    },
    Text: (props: Record<string, unknown>) => {
      made.push('Text')
      return { type: 'Text', props }
    },
  }
  const tree = bandTree(
    elements,
    { ...IDLE_STATUS, phase: 'drawn', kind: 'flowchart', confidence: 0.8, mermaid: 'flowchart TD\n a', file: 'x.mmd' },
    60,
    12,
  ) as { type: string; props: Record<string, unknown> }

  assert.equal(tree.type, 'Box')
  assert.equal(tree.props.borderStyle, 'round')
  assert.equal(tree.props.width, 60)
  assert.ok(made.includes('Text'))
})
