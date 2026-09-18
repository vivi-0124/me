/**
 * Claude の応答テキストから「図の材料」を取り出す純関数群。
 *
 * ここではモデルを一切呼ばない。ストリーミング中に何度も走るので、
 * 速くて決定的であることを優先する。何の図にするか（種類）を決めるのは
 * Jev の仕事で、このファイルは「描ける材料が何本あるか」だけを答える。
 */

/** ノードの形。分岐はひし形、終端は角丸、それ以外は四角。 */
export type NodeShape = 'box' | 'round' | 'diamond'

export type OutlineNode = {
  id: string
  label: string
  shape: NodeShape
}

export type OutlineLink = {
  from: string
  to: string
  label: string | null
}

/** 「A -> B: メッセージ」の形。sequenceDiagram の材料になる。 */
export type Exchange = {
  from: string
  to: string
  text: string
}

export type Outline = {
  title: string | null
  nodes: OutlineNode[]
  links: OutlineLink[]
  actors: string[]
  exchanges: Exchange[]
  /** 応答自体が ```mermaid を含んでいたら、その中身。 */
  mermaidFence: string | null
  /** その ```mermaid が閉じ終わっているか。ストリーミング中は false になる。 */
  fenceClosed: boolean
  /** 材料の量。gating のヒントとして Jev にも渡す。 */
  counts: {
    nodes: number
    links: number
    exchanges: number
    actors: number
  }
}

const ARROW = /\s*(?:-+>|=+>|→|⇒|=>)\s*/
const ARROW_TEST = /(?:-+>|=+>|→|⇒)/

/** 見出し。`## 手順` の類。 */
const HEADING = /^(#{1,6})\s+(.+?)\s*#*$/
/** 番号付きリスト。`1. ` `1) ` `(1) ` を拾う。 */
const ORDERED = /^(\s*)\(?(\d+)[.)]\s+(.+)$/
/** 箇条書き。`- ` `* ` `+ ` `・` を拾う。 */
const BULLET = /^(\s*)(?:[-*+]|・)\s+(.+)$/

/** 分岐っぽい言い回し。日本語と英語の両方を見る。 */
const BRANCH = /(もし|の場合|ならば|なら$|かどうか|どちらか|判定|分岐|\?$|？$|^if\b|\bwhether\b|\bor not\b)/i
/** 終端っぽい言い回し。 */
const TERMINAL = /(完了|終了|おわり|終わり|done$|finish|complete$|end$)/i

/**
 * ラベルとして使えるようにマークダウンの飾りを落とす。
 *
 * `**太字**`、`` `コード` ``、`[文字](url)` を素の文字にして、
 * 長すぎるものは切る。切るのは図が横に伸びすぎないようにするため。
 */
export function cleanLabel(raw: string, max = 48): string {
  let text = raw.trim()
  text = text.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
  text = text.replace(/`{1,3}([^`]*)`{1,3}/g, '$1')
  text = text.replace(/\*\*([^*]*)\*\*/g, '$1')
  text = text.replace(/\*([^*]*)\*/g, '$1')
  text = text.replace(/__([^_]*)__/g, '$1')
  text = text.replace(/~~([^~]*)~~/g, '$1')
  text = text.replace(/\s+/g, ' ').trim()
  text = text.replace(/[。．.:：、,;；]+$/, '')
  if (text.length > max) text = text.slice(0, max - 1) + '…'
  return text
}

/** 同じことを言っている行をまとめるための正規化キー。 */
function keyOf(label: string): string {
  return label.toLowerCase().replace(/[\s　"'`（）()「」【】]/g, '')
}

function shapeOf(label: string): NodeShape {
  if (BRANCH.test(label)) return 'diamond'
  if (TERMINAL.test(label)) return 'round'
  return 'box'
}

type FenceScan = {
  body: string
  mermaid: string | null
  closed: boolean
}

/**
 * コードフェンスを本文から切り離す。
 *
 * ```mermaid は「すでに答えが図になっている」ので最優先で拾う。
 * それ以外の言語のフェンスは、中身の記号が矢印に誤検出されるので本文から捨てる。
 * ストリーミング中は閉じフェンスがまだ来ていないことがあるので、
 * 閉じたかどうかを `closed` で持ち帰る。
 */
export function scanFences(text: string): FenceScan {
  const lines = text.split('\n')
  const body: string[] = []
  let mermaid: string | null = null
  let closed = true

  let inFence = false
  let fenceLang = ''
  let buffer: string[] = []

  for (const line of lines) {
    const open = /^\s*```+\s*([A-Za-z0-9_-]*)\s*$/.exec(line)
    if (!inFence && open) {
      inFence = true
      fenceLang = (open[1] ?? '').toLowerCase()
      buffer = []
      continue
    }
    if (inFence && /^\s*```+\s*$/.test(line)) {
      if (fenceLang === 'mermaid') {
        mermaid = buffer.join('\n').trim()
        closed = true
      }
      inFence = false
      fenceLang = ''
      buffer = []
      continue
    }
    if (inFence) {
      buffer.push(line)
      continue
    }
    body.push(line)
  }

  // 閉じないまま終わった = まだ流れている途中。
  if (inFence && fenceLang === 'mermaid') {
    mermaid = buffer.join('\n').trim()
    closed = false
  }

  return { body: body.join('\n'), mermaid, closed }
}

type Builder = {
  nodes: OutlineNode[]
  index: Map<string, string>
}

function addNode(builder: Builder, rawLabel: string): string | null {
  const label = cleanLabel(rawLabel)
  if (label.length === 0) return null
  const key = keyOf(label)
  if (key.length === 0) return null
  const known = builder.index.get(key)
  if (known !== undefined) return known
  const id = `n${builder.nodes.length + 1}`
  builder.index.set(key, id)
  builder.nodes.push({ id, label, shape: shapeOf(label) })
  return id
}

/** `A -> B -> C` を隣り合う組に割る。 */
function arrowChain(line: string): string[] {
  return line
    .split(ARROW)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

/**
 * 応答テキストから Outline を作る。
 *
 * 拾うのは 4 種類だけ:
 *   1. ```mermaid フェンス（あればそれが答え）
 *   2. `A -> B` の矢印行（`: メッセージ` 付きなら登場人物のやり取りとして扱う）
 *   3. 番号付きリスト（手順の並び）
 *   4. 箇条書きと見出し（リストが無いときの代わり）
 */
export function extract(text: string): Outline {
  const { body, mermaid, closed } = scanFences(text)
  const builder: Builder = { nodes: [], index: new Map() }
  const links: OutlineLink[] = []
  const exchanges: Exchange[] = []
  const ordered: string[] = []
  const bullets: string[] = []
  const headings: string[] = []
  let title: string | null = null

  for (const line of body.split('\n')) {
    if (line.trim().length === 0) continue

    if (ARROW_TEST.test(line)) {
      // `A -> B: メッセージ` はやり取り、`A -> B` はただの接続。
      const [flow, ...rest] = line.split(/:\s+|：/)
      const message = cleanLabel(rest.join(': '))
      const parts = arrowChain(flow ?? '')
      if (parts.length >= 2) {
        for (let i = 0; i + 1 < parts.length; i += 1) {
          const from = addNode(builder, parts[i] ?? '')
          const to = addNode(builder, parts[i + 1] ?? '')
          if (from === null || to === null) continue
          links.push({ from, to, label: message.length > 0 ? message : null })
          if (message.length > 0) {
            exchanges.push({
              from: cleanLabel(parts[i] ?? '', 24),
              to: cleanLabel(parts[i + 1] ?? '', 24),
              text: message,
            })
          }
        }
        continue
      }
    }

    const heading = HEADING.exec(line)
    if (heading !== null) {
      const label = cleanLabel(heading[2] ?? '')
      if (title === null && (heading[1] ?? '').length <= 2) title = label
      else if (label.length > 0) headings.push(label)
      continue
    }

    const orderedItem = ORDERED.exec(line)
    if (orderedItem !== null) {
      ordered.push(orderedItem[3] ?? '')
      continue
    }

    const bulletItem = BULLET.exec(line)
    if (bulletItem !== null) {
      bullets.push(bulletItem[2] ?? '')
      continue
    }
  }

  // 手順の並びは「番号付き > 箇条書き > 見出し」の優先順で 1 つだけ採る。
  // 3 つ混ぜると同じ話が二重にノードになって図が汚れる。
  const sequence = ordered.length >= 2 ? ordered : bullets.length >= 2 ? bullets : headings
  const stepIds: string[] = []
  for (const item of sequence) {
    const id = addNode(builder, item)
    if (id !== null) stepIds.push(id)
  }
  for (let i = 0; i + 1 < stepIds.length; i += 1) {
    const from = stepIds[i] as string
    const to = stepIds[i + 1] as string
    const already = links.some((link) => link.from === from && link.to === to)
    if (!already) links.push({ from, to, label: null })
  }

  const actors: string[] = []
  for (const exchange of exchanges) {
    if (!actors.includes(exchange.from)) actors.push(exchange.from)
    if (!actors.includes(exchange.to)) actors.push(exchange.to)
  }

  return {
    title,
    nodes: builder.nodes,
    links,
    actors,
    exchanges,
    mermaidFence: mermaid,
    fenceClosed: closed,
    counts: {
      nodes: builder.nodes.length,
      links: links.length,
      exchanges: exchanges.length,
      actors: actors.length,
    },
  }
}
