# OpenJev（自前 / 無料）で動かす

この Mod が判定に使っているのは「System One のワイヤ API」であって、TypeSafe の
ホスト版そのものではない。同じ API を話すサーバなら向き先を変えるだけで動く。

**OpenJev** はその実装のひとつ。オープンな重みのモデルで同じインターフェースを再現した
独立プロジェクトで、TypeSafe とは無関係（提携も承認もされていない）。Jev の非公開の
モデルや学習を再現したものではない、と本人たちが明記している。

## どの OpenJev か

> **注意:** `openjev.com` はこのリポジトリを書いた環境から到達できず、中身を確認できていない。
> GitHub には **OpenJev という名前のプロジェクトが複数ある**ので、下の手順が
> `openjev.com` の指すものと一致しているとは限らない。
>
> | プロジェクト | 中身 | この Mod との相性 |
> |---|---|---|
> | [razorback16/openjev](https://github.com/razorback16/openjev) | DiffusionGemma 26B-A4B + vLLM。`POST /v1/systemone` をそのまま話す | **そのまま動く**（この文書が前提にしているもの） |
> | [ekzhang/openjev-sglang](https://github.com/ekzhang/openjev-sglang) | Qwen3.6-35B-A3B + SGLang。同じ TypeSafe/Jev の HTTP API | そのまま動くはず（未検証） |
> | [TheoLeeCJ/openjev](https://github.com/TheoLeeCJ/openjev) | SemIf に改名。ブラウザ（WebGPU）で動く研究ベースライン | API が別。アダプタが要る |
> | [daseinlabs/open-jev](https://github.com/daseinlabs/open-jev) | Apple silicon + MLX、`POST /score` | API が別。アダプタが要る |
>
> 違うものを指していた場合でも、この Mod 側の変更は「向き先とキーを設定で変えられる」
> だけなので、アダプタを 1 枚書けば済む。`hooks/lib/jev.ts` がその境界。

## 3 通りの使い方

### 1. ホスト版を無料枠で使う（GPU 不要、いちばん手軽）

OpenJev の作者が [Codiv](https://codiv.ai) でホストしている。サインアップで
**入力 100M トークンぶん無料、カード登録なし**。

```json
{
  "env": {
    "CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1",
    "MERMAID_LIVE_BASE_URL": "https://api.codiv.ai/v1",
    "MERMAID_LIVE_API_KEY": "sk-codiv-...",
    "MERMAID_LIVE_MODEL": "openjev-latest"
  }
}
```

100M トークンは、この Mod の実測（1 応答あたり 1,600〜7,600 トークン）だと
**おおよそ 13,000〜60,000 応答ぶん**にあたる。個人で使い切るのは難しい。

### 2. 自分の GPU で動かす（キー不要、完全に手元で完結）

NVIDIA GPU で 24GB 以上（NVFP4 チェックポイント）。重みは初回に約 18GB 落ちてくる。

```bash
git clone https://github.com/razorback16/openjev && cd openjev
docker compose up -d          # モデルが載ったら 127.0.0.1:8080
curl localhost:8080/v1/models
```

```json
{
  "env": {
    "CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1",
    "MERMAID_LIVE_BASE_URL": "http://127.0.0.1:8080/v1"
  }
}
```

**API キーは要らない。** OpenJev は `OPENJEV_API_KEY` が未設定なら認証を求めないので、
この Mod も既定の向き先以外を指しているときは Authorization ヘッダを送らない。

キーを付けて運用したいなら、サーバ側で `OPENJEV_API_KEY` を設定して
`MERMAID_LIVE_API_KEY` に同じ値を入れる。

### 3. すでに動かしている vLLM に乗せる

OpenJev のコンテナに `OPENJEV_UPSTREAM` を渡すと自前の vLLM を起動せず既存のものを使う。
向き先の設定は 2 と同じ。

## 本家 Jev との違いで、この Mod に効くもの

| 違い | この Mod への影響 |
|---|---|
| choice の選択肢は最大 128（本家は 255） | **なし。** `kind` は 5 択 |
| 質問は約 12 問ずつのチャンクで処理（並列なのは同じ） | **なし。** 1 回に送るのは最大 5 問 |
| `jev-latest` / `jev-preview` も受け付ける | **なし。** 既定のモデル名のままで動く |
| `usage.output_tokens` は常に 0 | **なし。** 本家も出力は課金されない |
| 混雑時は 529 | 1 回分の判定を捨てて次のチャンクに回す（実装済み） |
| 認証は既定で無し | キー無しで有効になるよう設定側で対応済み |

レイテンシは RTX PRO 6000 での実測で p50 94ms（同時実行 1）。本家の公称 70〜500ms と
同じ桁なので、ストリーミング中の判定という用途では違いが出にくい。

## 気をつけること

- **答えの質は DiffusionGemma 26B-A4B のもの。** 本家 Jev と同じ精度ではない。
  この Mod の用途（図にすべきか、どの図か）は誤っても図が出ない/余計に出るだけだが、
  自分の用途では評価してから使うこと。
- **依存している vLLM の PR は未マージ。** `vllm-project/vllm#57250` の fork を
  コミット固定で使っている。
- **独立プロジェクトであって TypeSafe 公式ではない。** 名前も含めて、
  互換を名乗っているだけ。

## 切り替えたか確認する

帯の右端と `state.json` の `provider` に、いま何を向いているかが出る。

```bash
node tools/demo.ts    # 判定: openjev @ https://api.codiv.ai/v1 のように表示される
```

| 表示 | 意味 |
|---|---|
| `jev` | TypeSafe のホスト版 |
| `openjev` | 向き先に `openjev` か `codiv` を含む |
| `custom` | それ以外の自前サーバ（`127.0.0.1` など） |
| `判定なし（規則ベース）` | キーも自前サーバも無い。無料だが精度は落ちる |
