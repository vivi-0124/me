# Raycast 拡張機能の作り方

参考: [raycast/extensions - ghq](https://github.com/raycast/extensions/tree/8a4409d03a593ea0b69b825b525c80753102a379/extensions/ghq)

Raycast 拡張機能は **TypeScript + React** で書き、Node.js 上で動く CLI (`@raycast/api` / `ray` コマンド) を通じて開発・検証・公開する。個人用として自分のRaycastだけで使う場合と、Raycast Store に公開して誰でもインストールできるようにする場合とで、必要な手順が異なる。

## 0. 前提

- macOS + [Raycast](https://raycast.com/) アプリがインストール済みであること
- Node.js (LTS推奨) がインストール済みであること
- Store公開まで行う場合は GitHub アカウントが必要（`raycast/extensions` リポジトリへのPRを作るため）

---

## 1. 個人用として作る（Storeには出さない）

### 1-1. 雛形作成

Raycast 上で `Create Extension` コマンドを実行する。

- 拡張機能名を入力（例: `Hello World`）
- テンプレート（`Detail`, `List`, `Form`, `No View` など）を選択
- 保存先の親フォルダを指定

これでテンプレート一式（`package.json`, `src/index.tsx`, `assets/` など）を含むディレクトリが生成される。

### 1-2. 開発モードで起動

```bash
cd <生成された拡張機能ディレクトリ>
npm install
npm run dev
```

- `npm run dev` で開発モード（ホットリロード・エラー表示）が有効になり、Raycast のランチャーに拡張機能が即座に反映される
- `src/index.tsx` などを編集して保存すると自動的に反映される
- ターミナルで `Ctrl + C` を押すと開発モードは終了するが、拡張機能自体はRaycastに残り続けるので、そのまま個人用ツールとして使い続けられる

### 1-3. 個人利用のポイント

- Store 審査を通す必要がないので、アイコンやREADME、カテゴリなどのメタデータ整備は最低限でよい
- `ghq` のような「自分のディレクトリ構成に依存するツール」を作る場合、`preferences`（`package.json` の `preferences` フィールド）でパスやコマンドをユーザー設定として持たせておくと使い回しやすい
- 外部コマンド（`ghq`, `git` など）を呼ぶ場合は `child_process` や `execa` などを利用する構成が一般的（`ghq` 拡張のソースが参考になる）

---

## 2. Raycast Store に公開する

個人用として動くものができたら、以下の手順でStore公開向けに整備する。

### 2-1. `package.json` の整備

- `author` に Raycast アカウント名を設定
- `license` は `MIT` を指定（Store公開の慣例）
- `@raycast/api` を最新バージョンに更新
- `categories` に該当するカテゴリを最低1つ指定（Title Case）
- `commands` の `title` は「動詞 + 名詞」構造にする（例: `Search Recent Projects`）。Apple Style Guide 準拠、一般的すぎる名前は避ける
- 拡張機能タイトル自体も機能が一目でわかる名前にする（例: `Emoji Search`）

### 2-2. アイコン・スクリーンショット

- アイコン: 512x512px PNG。ライトテーマ・ダークテーマ両対応。Raycastのデフォルトアイコンの流用は不可
- スクリーンショット: 2000x1250px PNG、最大6枚程度を推奨（Store掲載ページに表示される）
- 画像類は `media` フォルダに配置

### 2-3. ドキュメント

- 追加設定（APIキー等）が必要な場合は `README.md` に手順を記載
- 認証手順など詳細な説明が必要な場合は `help.md` を用意
- 変更履歴は `CHANGELOG.md` に記録する

### 2-4. 禁止事項・注意点

- 外部アナリティクス（トラッキング）の組み込みは禁止
- macOS の Keychain Access はセキュリティ上の理由で利用不可
- 外部バイナリを同梱・利用する場合は信頼できる配布元から取得したものであること

### 2-5. ビルド・Lint確認

```bash
npm run build   # 配布用ビルド。エラーがないか検証
npm run lint     # コードスタイル・規約チェック
```

`npm run build` は公開用のバリデーションも兼ねているため、公開前に必ず成功させる。

### 2-6. 公開コマンド実行

```bash
npm run publish
```

- `package.json` の `scripts` に `publish` が無い場合は以下を追加する

```json
"scripts": {
  "publish": "npx @raycast/api@latest publish"
}
```

- 実行するとGitHub認証が求められる
- 認証後、スクリプトが自動的に `raycast/extensions` リポジトリに向けたプルリクエストを作成する

### 2-7. 手動でPRを出す方法（より細かく制御したい場合）

1. [raycast/extensions](https://github.com/raycast/extensions) をフォーク
2. `extensions/<拡張機能名>/` 配下に自分の拡張機能一式を追加（`ghq` の例のようなディレクトリ構成に倣う）
3. 通常の手順でコミット・プッシュしてPRを作成

### 2-8. レビューと公開

- PR作成後、Raycastチームによるコードレビューが入る（命名規則・UI/UX・セキュリティ等をチェックされる）
- 指摘があれば修正して再プッシュ
- 承認されるとPRがマージされ、Raycast Store に自動的に公開される

### 2-9. 公開後

- Raycast の `Manage Extensions` コマンドで自分の拡張機能を検索
- `⌘ + ⌥ + .` でリンクをコピーし、SNSやコミュニティで共有できる

---

## 3. 個人用 → Store公開 の移行時にやることまとめ

| 項目 | 個人用 | Store公開 |
|---|---|---|
| 雛形作成 | `Create Extension` | 同左 |
| 開発 | `npm run dev` | 同左 |
| アイコン | 任意 | 512x512px PNG（ライト/ダーク） |
| README/CHANGELOG | 任意 | 必須（設定が要る場合） |
| ビルド確認 | 不要 | `npm run build` / `npm run lint` 必須 |
| 公開 | 不要（ローカルに残るだけ） | `npm run publish` → PR → レビュー → マージ |

---

## 参考リンク

- [Create Your First Extension](https://developers.raycast.com/basics/create-your-first-extension)
- [Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store)
- [Publish an Extension](https://developers.raycast.com/basics/publish-an-extension)
- [raycast/extensions リポジトリ（ghq拡張の実例）](https://github.com/raycast/extensions/tree/8a4409d03a593ea0b69b825b525c80753102a379/extensions/ghq)
