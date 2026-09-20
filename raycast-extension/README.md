# Hello World (Raycast 拡張機能テンプレート)

Raycast 拡張機能の最小テンプレート。`view` コマンドと `no-view` コマンド、環境設定 (preferences) の例が入っている。

## 使い方（macOS + Raycast アプリが必要）

```bash
cd raycast-extension
npm install
npm run dev    # 開発モード。Raycast に読み込まれ、保存でホットリロード
```

Raycast のランチャーで `Search Items` / `Show Message` を検索すると実行できる。
`Ctrl + C` で開発モードを終了しても拡張機能は Raycast に残る。

## 構成

| パス | 役割 |
| --- | --- |
| `package.json` | 拡張機能のメタデータ。`commands` が各コマンド定義、`preferences` がユーザー設定 |
| `src/search-items.tsx` | `mode: "view"` のコマンド。`List` で一覧表示 |
| `src/show-message.tsx` | `mode: "no-view"` のコマンド。トーストのみ表示 |
| `assets/icon.png` | 512x512 のアイコン（仮。差し替えること） |

`commands[].name` と `src/<name>.tsx` のファイル名が対応している。コマンドを増やすときは
`package.json` に定義を足し、同名のファイルを `src/` に作る。

`Preferences.SearchItems` などの型は `npm run dev` / `npm run build` 時に
`raycast-env.d.ts` として自動生成される（gitignore 済み）。

## チェック

```bash
npm run lint
npm run fix-lint
npm run build
```

## 公開する場合

```bash
npm run publish
```

公開前に `author` を Raycast アカウント名にし、アイコン・スクリーンショット・`categories` を整えること。
詳細は [../raycast拡張機能の作り方.md](../raycast拡張機能の作り方.md) を参照。
