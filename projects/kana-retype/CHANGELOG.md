# Kana Retype Changelog

## [対象アプリを一覧から選べるようにした] - 2026-10-27

- `Manage Terminal Apps` コマンドを追加した。インストール済みのアプリをアイコン付きで複数選択して、元の文字を消してから打ち直すアプリを決められる
- 設定画面で bundle ID を打つ Terminal Apps 欄は廃止した
- Cursor・VS Code Insiders・VSCodium・Windsurf も、選べば VS Code と同じ消し方（→ のあと BackSpace）にした

## [VS Code に対応] - 2026-10-27

- VS Code では → で選択を末尾に畳んでから、文字数ぶん BackSpace で消して打ち直すようにした。エディタと統合ターミナルのどちらでも元の文字が残らない

## [ターミナルで元の文字が残る問題を修正] - 2026-10-27

- ターミナル（Terminal・iTerm2・Ghostty・Orca など）では、元の文字を BackSpace で消してから打ち直すようにした。選択範囲が表示上のものでしかなく、打っても置き換わらなかったため
- 対象にするアプリを設定（Terminal Apps）で追加できるようにした

## [Initial Version] - 2026-10-27

- 選択中のローマ字を、かなキー（key code 104）を押してから同じキーで打ち直すコマンドを追加した
- 選択が無いとき、英数字と記号以外の文字を含むときは HUD で知らせてキーを送らないようにした
