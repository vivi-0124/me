# Jev の料金と、この Mod の実際のコスト

最終確認: 2026-09-18

## 要点

| | |
|---|---|
| 入力 | **$0.042 / 100万トークン** |
| 出力 | **$0**（課金されない） |
| コンテキスト | 32,000 トークン |
| レイテンシ | 70〜500ms（エンドツーエンド） |
| レート制限 | 250,000 トークン/秒、1,200 リクエスト/分（`jev-1.13`） |
| 提供状況 | 早期アクセス（ウェイトリスト制、2026-09-15 開始） |

出力が無料なのは販促ではなく構造上の話で、Jev は自己回帰的にトークンを生成しないため、課金できる出力トークンがそもそも存在しない。

TypeSafe 自身がこの価格は補助されている可能性があり、今後下がると見込んでいるとしている。

## 質問を増やしても state は 1 回ぶん

1 リクエストの中の質問はすべて**同じ state に対して並列に**評価される。state のトークンは 1 回しか課金されず、質問を足したときに増えるのはその質問自身の `instructions` と `criteria` の分だけ。

この Mod が `diagrammable` / `kind` / `readiness` / `direction` / `changed` の 5 問を 1 往復にまとめているのはこのため。分けて聞くと state を 5 回送ることになり、5 倍払うことになる。

ちらつき防止に効いている `changed` を足したコストは、実質 40 トークンぶん程度。

## この Mod の実測コスト

`tools/cost.ts` が、実際に送るリクエスト本文を組み立てて文字数を数える（ネットワークには出ない）。

```bash
node tools/cost.ts              # 用意した日本語の応答
node tools/cost.ts answer.md    # 自分の文章で
```

既定の設定（240 文字増えるごと / 最短 1200ms 間隔、50 文字/秒で届く想定）での結果:

| 応答の長さ | 評価の回数 | 送信文字数 | 1 応答あたり | 1000 応答あたり |
|---|---|---|---|---|
| 438 文字 | 2 回 | 4,861 | $0.00007 | **$0.07** |
| 1,597 文字 | 7 回 | 22,739 | $0.00032 | **$0.32** |

Jev のトークナイザは公開されていないので、ここでは「3 文字 = 1 トークン」で換算している。日本語に厳しい「1 文字 = 1 トークン」で見積もっても 1000 応答で $0.20 / $0.96 の範囲に収まる。

**1 日 100 応答を毎日使っても月 $1〜3 程度。**

## コストは応答の長さに対して二次で伸びる

毎回「それまでの本文」を送り直すので、応答が長くなると **評価の回数** と **1 回あたりの長さ** が両方増える。

歯止めは `hooks/lib/questions.ts` の `buildState` にある 4000 文字の上限で、これを超える応答では 1 回あたりの送信量が頭打ちになる。

高いと感じたときに効くつまみ（効く順）:

| 環境変数 | 既定値 | 上げると |
|---|---|---|
| `MERMAID_LIVE_MIN_GROWTH` | `240` | 評価の回数が減る。一番効く |
| `MERMAID_LIVE_MIN_INTERVAL_MS` | `1200` | 速く届く応答で回数が減る |
| `MERMAID_LIVE_THRESHOLD` | `0.55` | 描き始めが遅くなる（回数自体は減らない） |

`buildState` の `maxChars`（既定 4000）を下げるのも効くが、判断材料を削ることになるので最後の手段。

## 普通の LLM に同じ判定をさせた場合

1,597 文字の応答（入力 7,580 トークン、出力は 1 回 80 トークンと仮定）で比べると:

| | 1 応答あたり | Jev 比 |
|---|---|---|
| **Jev**（$0.042 / $0） | $0.00032 | 1x |
| Claude Haiku 4.5（$1 / $5 per 1M） | 約 $0.0104 | 約 33 倍 |
| Claude Sonnet 5（$2 / $10 per 1M） | 約 $0.0208 | 約 65 倍 |
| Claude Opus 5（$5 / $25 per 1M） | 約 $0.0519 | 約 163 倍 |

価格差以上に効くのは、返ってくるものの形の違い:

- LLM は文章を返すので**パースが要る**。ストリーミング中に壊れた JSON が来る余地がある
- **確率が返らない**ので「0.92 なら描く / 0.31 なら待つ」という閾値の切り方ができない
- レイテンシが桁違い（Jev は 70〜500ms）

判定だけを切り出して専用のモデルに投げる、という設計はここで報われている。

なお、プロンプトキャッシュを効かせれば LLM 側の入力コストは下げられるが、この Mod が送る state は毎回伸びる末尾なので、効きは限定的。

## 誰が払うのか

**この Mod を動かしているマシンの環境変数に入っているキーの持ち主。** Mod はローカルで動き、`$.env.get('TYPESAFE_API_KEY')` で読んだキーで TypeSafe に直接リクエストする。

- Claude Code の利用料とは**完全に別勘定**で、TypeSafe から直接請求される
- キーが未設定なら Jev は 1 度も呼ばれず、規則ベースで動く（料金ゼロ）
- キーは `~/.claude/settings.json` の `env` に置く。**リポジトリ側の `.claude/settings.json` に書くとコミットされる**

## 出典と、確認できていないこと

**一次ソース（[docs.typesafe.ai](https://docs.typesafe.ai)、[console.typesafe.ai](https://console.typesafe.ai/keys)）では直接確認できていない。** 上の数字は複数の二次情報が一致したものを採用している。実際に課金が発生する前にコンソールで確認すること。無料枠の有無についても情報が見つかっていない。

- [OpenRouter: TypeSafe Jev Latest](https://openrouter.ai/~typesafe/jev-latest)
- [Vercel AI Gateway: Jev](https://vercel.com/ai-gateway/models/jev)
- [Developers Digest — Benchmarked and Priced](https://www.developersdigest.tech/blog/typesafe-jev-system-one-models-release-guide-2026)
- [lilting.ch — $0.042/1M Decision Model](https://lilting.ch/en/articles/typesafe-ai-jev-system-one-model)
- [orcarouter — Speed and Cost Explained](https://www.orcarouter.ai/blog/jev-typesafe-system-one-what-we-know)
- [DataCamp — System One models](https://www.datacamp.com/blog/system-one-models-jev)

Claude の料金は Anthropic の第一者 API レート。
