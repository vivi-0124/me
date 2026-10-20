# setlist-review（みんなでセトリふりかえり）

ライブのセトリと MC に、ファン仲間と1項目ずつコメントできる Web アプリ。GitHub のレビューコメントのように、曲や MC の横の 💬 から書き込む。

公開先: https://setlist-review.vivi-0124.workers.dev

## できること

- 誰でもページを作れる。セトリと MC は、X やメモに書いた文章をそのまま貼れば読み取る（書き方は `public/js/parse.js` の先頭）
- ページを作った人には「編集用リンク」（`/e/<slug>/edit#key=...`）を渡す。作ったブラウザは自動で覚える
- 見る人・コメントする人は登録なし。ニックネームだけ
- 自分のコメントは同じブラウザから消せる。ページを作った人は、そのページのどのコメントでも消せる（荒らし対策）
- セトリを編集しても、文が同じ項目・書き直しただけの項目のコメントはそのまま残る。消えた項目へのコメントは「その他のコメント」に出る

## 構成

| 場所 | 中身 |
| --- | --- |
| `public/index.html` | トップ |
| `public/edit.html` | ページを作る・編集する（`/new`, `/e/<slug>/edit`） |
| `public/event.html` | ライブのページ（`/e/<slug>`） |
| `public/js/parse.js` | セトリの文章を読み取る。項目の id の引き継ぎもここ |
| `src/index.js` | API と URL の振り分け（Cloudflare Workers） |
| `migrations/` | D1 のテーブル |
| `tools/seed-event.js` | 決まった slug でページを作る SQL を出す |

## 手元で動かす

```sh
npm install
npm test
npm run dev   # http://localhost:8787
```

## 公開する

```sh
npm run deploy
```
