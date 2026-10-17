/**
 * mermaid-live — Claude の応答を、流れてくる途中から Mermaid で図解する Mod。
 *
 * 役割分担:
 *   turn.step  … 応答のテキストチャンクを溜める（流れは一切止めない）
 *   Jev        … 「図にすべきか」「どの図か」「もう描いていいか」を確率で答える
 *   mermaid.ts … 実際の Mermaid ソースを決定的に組み立てる
 *   ui.render  … 入力欄の上に判定と先頭数行を出す
 *   viewer     … ブラウザで本物の図を描く（.mmd の更新を SSE で流す）
 *
 * 文章生成モデルに「図にして」と頼むとストリーミング中は必ず途中で構文が壊れる。
 * Jev は文章を作らない代わりに判断だけを返すので、壊れた図が出ない。
 */

import type { Register } from 'claude-code'

import { extract } from './lib/extract.ts'
import { toMermaid } from './lib/mermaid.ts'
import type { DiagramKind, Direction } from './lib/mermaid.ts'
import { buildQuestions, buildState } from './lib/questions.ts'
import { evaluate } from './lib/jev.ts'
import { decide, decideWithoutJev } from './lib/decide.ts'
import type { Decision } from './lib/decide.ts'
import { TurnBuffer } from './lib/buffer.ts'
import { readConfig } from './lib/config.ts'
import type { Config } from './lib/config.ts'
import { bandTree, IDLE_STATUS } from './lib/band.ts'
import type { BandStatus } from './lib/band.ts'

/** Jev の 1 往復に許す時間。これを超えたらその回は捨てて次のチャンクに任せる。 */
const JEV_TIMEOUT_MS = 6000

/** 直近に描いた図のメタ情報。応答が終わった時点で「確定」に書き換えるために持つ。 */
type LastDraw = {
  kind: DiagramKind
  direction: Direction
  confidence: number
  title: string | null
}

type ModState = {
  config: Config | null
  buffer: TurnBuffer
  status: BandStatus
  mermaid: string | null
  last: LastDraw | null
  viewerStarted: boolean
  turnId: string | null
}

const mod: ModState = {
  config: null,
  buffer: new TurnBuffer(),
  status: { ...IDLE_STATUS },
  mermaid: null,
  last: null,
  viewerStarted: false,
  turnId: null,
}

function fallbackConfig(): Config {
  return readConfig({})
}

export const register: Register = (on) => {
  // 設定の読み出しとビューアの起動。env の名前は文字列リテラルでなければ
  // ホストが拒むので、1 つずつ書き下している。
  on('session.start', async ($, e, next) => {
    const env = {
      MERMAID_LIVE_API_KEY: await $.env.get('MERMAID_LIVE_API_KEY'),
      TYPESAFE_API_KEY: await $.env.get('TYPESAFE_API_KEY'),
      TYPESAFE_AI_API_KEY: await $.env.get('TYPESAFE_AI_API_KEY'),
      MERMAID_LIVE_MODEL: await $.env.get('MERMAID_LIVE_MODEL'),
      MERMAID_LIVE_BASE_URL: await $.env.get('MERMAID_LIVE_BASE_URL'),
      MERMAID_LIVE_DIR: await $.env.get('MERMAID_LIVE_DIR'),
      MERMAID_LIVE_PORT: await $.env.get('MERMAID_LIVE_PORT'),
      MERMAID_LIVE_VIEWER: await $.env.get('MERMAID_LIVE_VIEWER'),
      MERMAID_LIVE_MIN_GROWTH: await $.env.get('MERMAID_LIVE_MIN_GROWTH'),
      MERMAID_LIVE_MIN_INTERVAL_MS: await $.env.get('MERMAID_LIVE_MIN_INTERVAL_MS'),
      MERMAID_LIVE_THRESHOLD: await $.env.get('MERMAID_LIVE_THRESHOLD'),
    }

    const config = readConfig(env)
    mod.config = config
    mod.buffer = new TurnBuffer(config.policy)
    mod.mermaid = null
    mod.last = null
    mod.turnId = null
    mod.status = {
      ...IDLE_STATUS,
      jevEnabled: config.apiKey !== null,
      viewerUrl: config.autoViewer ? `http://127.0.0.1:${config.port}` : null,
      reason: config.apiKey === null ? 'Jev の API キーが無いので規則ベースで動きます' : '待機中',
    }

    if (config.autoViewer && !mod.viewerStarted) {
      mod.viewerStarted = true
      // --detach は自分を detached で起動し直して即終了する。
      // $.process.run は子の終了まで待つので、常駐させるにはこの形しかない。
      try {
        await $.process.run(
          [
            'node',
            `${$.plugin.root}/viewer/server.mjs`,
            '--detach',
            '--port',
            String(config.port),
            '--dir',
            config.dir,
          ],
          { timeoutMs: 10000 },
        )
        $.ui.log(`mermaid-live: ビューアを起動しました http://127.0.0.1:${config.port}`)
      } catch (error) {
        mod.viewerStarted = false
        $.ui.log(`mermaid-live: ビューアを起動できませんでした (${String(error)})`)
      }
    }

    return next(e)
  })

  // 応答が流れてくるところ。ここではチャンクを溜めて素通しするだけで、
  // 判定と書き出しは別の Promise に逃がす（ストリームを遅らせない）。
  on('turn.step', async function* ($, e, next) {
    // サブエージェントの応答まで図にすると帯が奪い合いになるので、本線だけ見る。
    if (e.agentId !== undefined) {
      return yield* next(e)
    }

    const config = mod.config ?? fallbackConfig()
    // 1 ターンに step は何回も来る（ツール呼び出しのたび）。
    // 溜めるのはターン単位なので、ターンが変わったときだけ捨てる。
    if (mod.turnId !== e.turnId) {
      mod.turnId = e.turnId
      mod.buffer.reset()
      mod.mermaid = null
      mod.last = null
    }

    /**
     * 判定の結果を書き出して帯を更新する。
     *
     * ビューアは state.json しか見ないので、.mmd と state.json を必ず対で書く。
     */
    const publish = async (mermaid: string, meta: LastDraw, final: boolean): Promise<void> => {
      const file = `${config.dir}/current.mmd`
      await $.fs.write(file, `${mermaid}\n`)
      await $.fs.write(
        `${config.dir}/state.json`,
        `${JSON.stringify(
          {
            updatedAt: await $.clock.now(),
            title: meta.title,
            kind: meta.kind,
            direction: meta.direction,
            confidence: meta.confidence,
            reason: final ? '応答が終わりました（確定）' : '応答の途中経過です',
            jev: config.apiKey !== null,
            final,
            mermaid,
          },
          null,
          2,
        )}\n`,
      )

      mod.mermaid = mermaid
      mod.last = meta
      mod.status = {
        ...mod.status,
        phase: 'drawn',
        kind: meta.kind,
        confidence: meta.confidence,
        reason: `${meta.kind} / ${meta.direction} で描画${final ? '（確定）' : '（途中）'}`,
        mermaid,
        file,
      }
      $.ui.invalidate('ui.render')
    }

    /**
     * 溜まったテキストを 1 回評価して、決まれば図を書き出す。
     *
     * `$` はこの関数の外へ渡さない（ローダーがそれを拒む）。呼び出しは全部
     * `$.noun.verb(...)` の形でこの中に書いてある。
     */
    const analyze = async (final: boolean): Promise<void> => {
      const now = await $.clock.now()

      if (!mod.buffer.shouldAnalyze(now, final)) {
        // 応答が終わったが新しい文字は増えていない、というとき。
        // 直前に描いた図はもう「途中」ではないので、確定として書き直す。
        if (final && mod.mermaid !== null && mod.last !== null) {
          await publish(mod.mermaid, mod.last, true)
        }
        return
      }

      const text = mod.buffer.begin(now)
      try {
        const outline = extract(text)

        if (outline.counts.nodes === 0 && outline.mermaidFence === null) {
          mod.status = { ...mod.status, phase: 'held', reason: '図の材料がまだ無い' }
          $.ui.invalidate('ui.render')
          return
        }

        mod.status = { ...mod.status, phase: 'thinking', reason: 'Jev に判定を依頼中' }
        $.ui.invalidate('ui.render')

        let decision: Decision
        let tokens: number | null = mod.status.tokens

        if (config.apiKey === null) {
          decision = decideWithoutJev(outline, mod.mermaid !== null)
        } else {
          const evaluation = evaluate({
            fetch: (url, init) => $.http.fetch(url, init),
            apiKey: config.apiKey,
            model: config.model,
            baseUrl: config.baseUrl,
            state: buildState(text, outline, mod.mermaid),
            questions: buildQuestions(mod.mermaid !== null),
          })
          // $.http.fetch は signal を取らないので、時間切れは race で見る。
          const timeout = $.clock.sleep(JEV_TIMEOUT_MS).then(() => 'timeout' as const)
          const settled = await Promise.race([evaluation, timeout])
          if (settled === 'timeout') {
            mod.status = { ...mod.status, phase: 'held', reason: 'Jev の応答が遅いので今回は見送り' }
            $.ui.invalidate('ui.render')
            return
          }
          decision = decide(settled, mod.mermaid !== null, config.thresholds)
          const used = (settled.usage.inputTokens ?? 0) + (settled.usage.outputTokens ?? 0)
          tokens = used > 0 ? used : tokens
        }

        mod.status = { ...mod.status, tokens }

        if (decision.action === 'keep') {
          // 意味が変わっていないので描き直さない。確定のときだけ印を更新する。
          if (final && mod.mermaid !== null && mod.last !== null) {
            await publish(mod.mermaid, mod.last, true)
          } else {
            mod.status = { ...mod.status, phase: 'drawn', confidence: decision.confidence, reason: decision.reason }
            $.ui.invalidate('ui.render')
          }
          return
        }

        if (decision.action === 'hold') {
          mod.status = { ...mod.status, phase: 'held', confidence: decision.confidence, reason: decision.reason }
          $.ui.invalidate('ui.render')
          return
        }

        const mermaid = toMermaid(outline, decision.kind, decision.direction)
        if (mermaid === null) {
          mod.status = { ...mod.status, phase: 'held', reason: 'Mermaid に落とせなかった' }
          $.ui.invalidate('ui.render')
          return
        }

        await publish(
          mermaid,
          {
            kind: decision.kind,
            direction: decision.direction,
            confidence: decision.confidence,
            title: outline.title,
          },
          final,
        )
      } catch (error) {
        mod.status = { ...mod.status, phase: 'error', reason: `失敗: ${String(error)}` }
        $.ui.invalidate('ui.render')
      } finally {
        mod.buffer.end()
      }
    }

    const stream = next(e)
    let pending: Promise<void> = Promise.resolve()

    for await (const chunk of stream) {
      if (chunk.kind === 'text' && typeof chunk.text === 'string' && chunk.text.length > 0) {
        mod.buffer.push(chunk.text)
        // 時計を見る前に、文字数だけで足切りしておく（ホストへの往復を減らす）。
        if (mod.buffer.mayAnalyze()) {
          pending = analyze(false).catch(() => undefined)
        }
      }
      yield chunk
    }

    const result = await stream.result
    await pending
    await analyze(true)
    return result
  }).catch(async function* ($, e, next) {
    // 図解の失敗でターンを落とさない。素通しに戻す。
    return yield* next(e)
  })

  // 入力欄の上の帯。描くものが何も無いときは engine に譲る。
  on('ui.render', { component: 'AbovePrompt' }, ($, e, next) => {
    if (e.surface !== 'terminal') return next(e)
    if (e.props.hasSurvey) return next(e)
    if (mod.status.phase === 'idle' && mod.mermaid === null) return next(e)

    return bandTree($.ui.resolve(e), mod.status, e.props.bodyColumns, e.props.maxRows)
  })
}
