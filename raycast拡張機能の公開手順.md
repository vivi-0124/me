# Claude Skills を Raycast Store に公開する手順

`raycast-extension/` を Store に出すための残作業。**コードと Store 用メタデータは準備済み**で、残りは Mac 上でしかできない作業。

## 準備済み

- `package.json`: `license: MIT` / `categories: ["Developer Tools"]` / 説明文を英語化（Store は英語が前提）
- `CHANGELOG.md`: `## [Initial Version] - {PR_MERGE_DATE}` 形式。`{PR_MERGE_DATE}` はマージ時に自動で日付に置換される
- `README.md`: 英語。そのまま Store のページ本文になる
- `assets/icon.png`: 512x512 PNG（スラッシュコマンドのアイコン）

## 残作業（Mac が必要）

### 1. `author` を Raycast アカウント名にする

`package.json` の `"author"` は **GitHub 名ではなく Raycast のユーザー名**。違うとレビューで指摘される。

```bash
# Raycast の Account 設定で確認したユーザー名に書き換える
```

### 2. スクリーンショットを撮る

- Raycast の **Window Capture** コマンドを使う（自動で 2000x1250 になる）
- `raycast-extension/metadata/` フォルダに置く（フォルダ名は `metadata` 固定）
- 最低 1 枚、3 枚程度あると良い。左右 2 ペインが見える状態、zip 共有、削除確認ダイアログあたり

### 3. アイコンを差し替える（任意）

今のアイコンはコードで生成したもの。気に入らなければ 512x512 PNG で作り直して `assets/icon.png` を置き換える。

### 4. 動作確認

```bash
cd raycast-extension
npm install
npm run dev     # 実際に一通り触る
npm run lint
npm run build
```

### 5. 公開

```bash
npm run publish
```

- `raycast/extensions` リポジトリに自動で fork + PR が作られる（GitHub アカウントが必要）
- Raycast チームのレビューが入り、指摘があれば同じブランチに push して対応する
- マージされると Store に載る

## 注意

- Store には既に `Skills`（keito4）や `PromptCast for Claude & Codex` など skill を扱う拡張がある。「何が違うのか」をレビューで聞かれる可能性があるので、PR 説明に「ユーザースコープの skill を選んで `/name` をペースト・zip 共有・ゴミ箱削除に特化。create/update はやらない」と書いておく
- 公開すると `raycast-extension/` の中身が `raycast/extensions` リポジトリに入る。以後の更新もあちらへの PR で行う
