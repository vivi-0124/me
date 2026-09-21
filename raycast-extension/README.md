# Claude Skills (Raycast 拡張機能)

ローカルの Claude Code skill (`~/.claude/skills`) を一覧して、`/skill名` をそのままペースト・共有・削除する拡張機能。

**create / update はやらない**（編集はエディタでやる前提。フルパスをコピーして `code <paste>` で開く）。

## 使い方（macOS + Raycast アプリが必要）

```bash
cd raycast-extension
npm install
npm run dev
```

Raycast で `Search Skills` を実行。左に skill 一覧、右に frontmatter とパスが出る。

## アクション

| 操作 | ショートカット | 内容 |
| --- | --- | --- |
| Paste Slash Command | `Enter` | 最前面のアプリに `/{skill名}` をペースト |
| Copy Slash Command | `Cmd+Enter` | `/{skill名}` をコピー |
| Copy Skill Path | `Cmd+Shift+C` | skill ディレクトリのフルパス（`SKILL.md` は含まない） |
| Paste Skill Path | `Cmd+Shift+V` | 同上をペースト |
| Copy Skill Contents | `Cmd+Shift+F` | SKILL.md の全文（frontmatter 込み） |
| Paste Skill Contents | `Cmd+Opt+V` | 同上をペースト |
| Export as Zip | `Cmd+Shift+E` | skill フォルダを zip にして保存先に書き出す |
| Copy Zip to Clipboard | `Cmd+Shift+Z` | zip をクリップボードにファイルとして載せる（Slack に Cmd+V で添付） |
| Delete Skill | `Ctrl+X` | 確認ダイアログ → ディレクトリごとゴミ箱へ |

削除は `trash()` なのでゴミ箱から戻せる。zip は macOS 標準の `ditto --keepParent` で作るため、展開すると `{skill名}/SKILL.md` の階層に戻る。

## 設定 (Preferences)

- **Claude Data Folder**: 空なら `CLAUDE_CONFIG_DIR`、それも無ければ `~/.claude`
- **Zip Export Folder**: `Export as Zip` の保存先（既定 `~/Downloads`）

## 構成

| パス | 役割 |
| --- | --- |
| `src/search-skills.tsx` | コマンド本体（List + Detail + Actions） |
| `src/lib/skills.ts` | `~/.claude/skills` の走査と frontmatter パース |
| `src/lib/zip.ts` | `ditto` での zip 生成 |

skill の名前は **ディレクトリ名**を正とする（`/xxx` で呼ぶ名前がディレクトリ名のため）。frontmatter の `name` がズレている場合は詳細に警告が出る。

## スコープ

現状はユーザースコープ (`~/.claude/skills`) のみ。`Skill` 型に `scope` を持たせてあるので、プロジェクトスコープ (`.claude/skills`) は後から足せる。

## チェック

```bash
npm run lint
npm run build
```
