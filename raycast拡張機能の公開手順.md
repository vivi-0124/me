# Claude Skills を org の Private Store に公開する手順

`raycast-extension/` を **vivi-1610 org のプライベートストア**に出す手順。`switch` 拡張と同じやり方。

## 準備済み（`package.json`）

```json
"author": "vivi-0124",
"owner": "vivi-1610",
"access": "private",
"platforms": ["macOS"],
"license": "MIT",
"categories": ["Developer Tools"]
```

- `owner` に org ハンドルを入れると private 扱いになる（`access: "private"` は明示指定）
- public ストアと違い **レビューも PR も不要**。`raycast/extensions` には出ない
- そのため metadata/スクリーンショットも不要。説明文が日本語のままで問題ない
- `CHANGELOG.md` は日付を直接書く（`{PR_MERGE_DATE}` は公開ストアの PR 用なので使わない）

org ハンドルが分からなくなったら、Raycast の **Manage Organization** コマンド → 右上で org を選択 → **Copy Organization Handle**。

## 公開

```bash
cd raycast-extension
npm install
npm run dev     # 実際に一通り触って確認
npm run lint
npm run build
npm run publish
```

- `npm run publish` の前に、Raycast に org メンバーとしてログインしている必要がある
- 公開すると org のメンバーだけが Raycast の Store タブからインストールできる
- 更新するときも同じく `npm run publish` を叩くだけ（`CHANGELOG.md` に追記してから）

## 注意

- ソースは GitHub の自分のリポジトリに置いたままでよい。Raycast 側にビルド結果が上がる
- 後から公開ストアに出したくなったら `access: "public"` にして `npm run publish` → `raycast/extensions` への PR になる。その場合は英語の説明文・スクリーンショット・レビュー対応が必要
