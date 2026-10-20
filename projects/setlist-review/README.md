# setlist-review（みんなでセトリふりかえり）

ライブのセトリと MC に、ファン仲間と1項目ずつコメントできる Web アプリ。GitHub のレビューコメントのように、曲や MC の横の 💬 から書き込む。

公開先: https://setlist-review.vivi-0124.workers.dev

## できること

- 誰でもページを作れる。入力するのは曲名だけ。番号は自動で付き、MC とアンコールはボタンで入れる。MC で話したことや感想は、みんながコメントで書く
- X やメモのセトリをまとめて貼ると、曲・MC・アンコールに分けて取りこむ（読み方は `shared/parse.ts` の先頭）
- ページを作った人には「編集用リンク」（`/e/<slug>/edit#key=...`）を渡す。作ったブラウザは自動で覚える
- 見る人・コメントする人は登録なし。ニックネームだけ
- 自分のコメントは同じブラウザから直せる・消せる（直したら「(編集済み)」と出る）。ページを作った人は、そのページのどのコメントでも消せる（荒らし対策）
- 「自分のコメントか」は、ブラウザごとの合言葉（`x-owner-token` ヘッダ）で見分ける。URL には乗せない
- セトリを編集しても（曲名を直す・並べかえる・足す）、曲と MC のコメントはそのまま残る。消した項目へのコメントは「その他のコメント」に出る

## 構成

Vue 3 + shadcn-vue（Tailwind CSS v4）の SPA と、Hono の API を、1つの Cloudflare Worker で配信する。データは D1。

| 場所 | 中身 |
| --- | --- |
| `src/pages/` | 画面（トップ・ライブのページ・作る/編集・404） |
| `src/components/timeline/` | セトリと MC の縦タイムライン（ライブのページと編集プレビューで共通） |
| `src/components/comments/` | GitHub のレビューコメント風のコメント欄 |
| `src/components/ui/` | shadcn-vue のコンポーネント |
| `src/composables/useEventComments.ts` | 1ページ分のコメントの状態。ページで provide、各コメント欄で inject |
| `src/components/SetlistEditor.vue` | セトリの入力欄（曲名だけ書く。MC・アンコールはボタンで入れる） |
| `src/lib/setlist-rows.ts` | 入力欄の行と、保存する項目の変換。行が id を持つので、曲名を直してもコメントが外れない |
| `shared/parse.ts` | 貼り付けられたセトリの文章を読み取る。番号の付け直しもここ |
| `worker/index.ts` | API（Hono）と、/e/* の OGP タイトル差し込み |
| `migrations/` | D1 のテーブル |
| `tools/seed-event.ts` | 決まった slug でページを作る SQL を出す |

## 手元で動かす

```sh
npm install
npm test           # セトリ読み取りのテスト
npm run typecheck
npm run dev        # http://localhost:5173（Vite と Worker と手元の D1 が一緒に動く）
```

## 公開する

```sh
npm run deploy     # ビルド → D1 のマイグレーション → 公開
```
