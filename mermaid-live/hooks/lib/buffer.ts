/**
 * ストリーム中のテキストを溜めて、いつ Jev に聞くかを決める。
 *
 * turn.step のフックはチャンクが届くたびに走る。そこで毎回 Jev を呼ぶと
 * 1 ターンで何十往復もしてしまうので、「前回から N 文字増えて、かつ M ミリ秒
 * 経った」ときだけ聞く。応答が終わった瞬間（final）は必ず 1 回聞く。
 */

export type BufferPolicy = {
  /** 前回の評価から最低これだけ文字が増えるまで聞かない。 */
  minGrowth: number
  /** 前回の評価から最低これだけミリ秒空ける。 */
  minIntervalMs: number
  /** これより短い応答は最後まで図にしない。 */
  minLength: number
}

export const DEFAULT_POLICY: BufferPolicy = {
  minGrowth: 240,
  minIntervalMs: 1200,
  minLength: 120,
}

export class TurnBuffer {
  #text = ''
  #analyzedLength = 0
  #analyzedAt = 0
  #inFlight = false
  readonly #policy: BufferPolicy

  constructor(policy: BufferPolicy = DEFAULT_POLICY) {
    this.#policy = policy
  }

  get text(): string {
    return this.#text
  }

  get length(): number {
    return this.#text.length
  }

  get inFlight(): boolean {
    return this.#inFlight
  }

  push(chunk: string): void {
    this.#text += chunk
  }

  reset(): void {
    this.#text = ''
    this.#analyzedLength = 0
    this.#analyzedAt = 0
    this.#inFlight = false
  }

  /**
   * 時計を見ずに分かる範囲の足切り。
   *
   * turn.step のフックはチャンクごとに走るので、`$.clock.now()`（ホストへの
   * 往復）を毎回叩かないための前段。ここが false なら時刻を見る必要もない。
   */
  mayAnalyze(final = false): boolean {
    if (this.#inFlight) return false
    if (this.#text.length < this.#policy.minLength) return false
    if (final) return this.#text.length > this.#analyzedLength
    return this.#text.length - this.#analyzedLength >= this.#policy.minGrowth
  }

  /**
   * いま Jev に聞くべきか。
   *
   * @param now 現在時刻（ms）。`$.clock.now()` の値を渡す。
   * @param final 応答が終わった直後か。終わったなら間隔の条件を飛ばす。
   */
  shouldAnalyze(now: number, final = false): boolean {
    if (!this.mayAnalyze(final)) return false
    if (final) return true
    return now - this.#analyzedAt >= this.#policy.minIntervalMs
  }

  /** 評価を始める。開始時点の本文を返す（その後に届いた分は次回に回る）。 */
  begin(now: number): string {
    this.#inFlight = true
    this.#analyzedAt = now
    this.#analyzedLength = this.#text.length
    return this.#text
  }

  /** 評価が終わった（成功・失敗どちらでも必ず呼ぶ）。 */
  end(): void {
    this.#inFlight = false
  }
}
