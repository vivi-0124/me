# Raycast 調査: スニペット機能とコマンド作成

Clipy のスニペットのように「フォルダごとにコマンド（ホットキー）を持つスニペット拡張」を作るための事前調査。
拡張機能そのものではなく、Raycast 側の 2 つの仕組みを調べた。

1. 標準機能 **Snippets** の動き（真似る対象）
2. 標準機能 **Window Management** のような「ユーザーがコマンドを作成する」仕組み

## 前提: Raycast 本体のソースは読めない

- Raycast 本体（Snippets / Window Management / Quicklinks などの標準機能）は **クローズドソース**。
- 公開されていて読めるのは次のもの。今回はこれらを根拠にした。
  - `@raycast/api` の型定義（`types/index.d.ts`、v2.4.1）
  - `@raycast/utils` の実装（`dist/module.js`、v2.3.1。`createDeeplink` の中身）
  - 開発者ドキュメント（`raycast/extensions` リポジトリの `docs/`）
  - Raycast Manual の「Dynamic Placeholders」ページ（原文のコピーを参照）
  - Store に出ている拡張のソース（`google-chrome-profiles` / `browsers-profiles` / `promptlab`）

---

## 1. スニペット機能

### 1-1. データ構造

API の `Snippet` 型（`Action.CreateSnippet` に渡すもの）がそのまま標準スニペットのフィールドになっている。

```ts
interface Snippet {
  text: string;      // 本文（プレースホルダー入り）
  name?: string;     // 名前
  keyword?: string;  // 自動展開のキーワード
}
```

- 標準スニペットには **フォルダ（グループ）の概念がない**。今回の拡張ではここを足すことになる。
- 保存先は Raycast 内部の DB で、拡張からは読み書きできない。読み書きの手段は次の 2 つだけ。
  - `Action.CreateSnippet`: 入力済みの「Create Snippet」画面を開く（保存は利用者が押す）
  - `launchCommand({ ownerOrAuthorName: "raycast", extensionName: "snippets", name: "create-snippet", type: LaunchType.UserInitiated, context: { name, text, keyword } })`（API 1.53.0 で追加）
- 一覧を取得する API はない。拡張で扱うスニペットは **拡張側で自前で保存する**（`LocalStorage` か `environment.supportPath` の JSON）。

### 1-2. 貼り付けの動き

標準の「Search Snippets」は **Enter で Raycast を閉じ、最前面アプリに貼り付ける**。拡張では次で同じことができる。

| やりたいこと | API |
| --- | --- |
| リストから Enter で貼り付け | `<Action.Paste content={text} />`（既定タイトル "Paste in Active App"） |
| no-view コマンドから貼り付け | `await closeMainWindow(); await Clipboard.paste(text);` |
| コピーだけ | `<Action.CopyToClipboard content={text} />` / `Clipboard.copy` |
| 貼り付け後の処理（よく使う順の並べ替えなど） | `Action.Paste` の `onPaste` |

- `Clipboard.paste` の引数は `string | number | Clipboard.Content`。`{ html }` も渡せるのでリッチテキストも貼れる。

### 1-3. Dynamic Placeholders（標準スニペットの仕様）

Raycast Manual の原文から、スニペットで使えるものだけを抜き出した。

| プレースホルダー | 動き | 拡張での再現方法 |
| --- | --- | --- |
| `{clipboard}` | 最後にコピーしたテキスト。無ければ空になる | `Clipboard.readText()` |
| `{clipboard offset=1}` | 1 つ前の履歴（2 なら 3 つ前） | `Clipboard.readText({ offset })`。**API は最大 5 まで** |
| `{snippet name="…"}` | 別のスニペットを埋め込む。埋め込み先が別のスニペットを参照していれば不可（入れ子は 1 段まで） | 自前の保存データを名前で引く。入れ子は 1 段まで |
| `{cursor}` | 貼り付け後にカーソルをこの位置へ移動。1 スニペットに 1 つまで | ※下の「`{cursor}` の再現」を参照 |
| `{date}` / `{time}` / `{datetime}` / `{day}` | 現在の日付・時刻・日時・曜日（書式はシステム設定に従う） | `Intl.DateTimeFormat`（`dateStyle` / `timeStyle` / `weekday`） |
| `{date format="yyyy-MM-dd"}` | 書式を自分で指定（Unicode の日付パターン。`'...'` で囲むと文字列そのまま） | `date-fns` の `format` がほぼ互換。`Z` など一部のトークンは違うので対応表が要る |
| `{date offset="+3M -5d"}` | 日付をずらす。`m`=分、`h`=時、`d`=日、`M`=月、`y`=年（大文字小文字を区別）。`+ 2d` のように記号の後に空白は入れられない | `date-fns` の `add` / `sub` |
| `{uuid}` | 大文字の UUID | `crypto.randomUUID().toUpperCase()` |
| `{argument}` | 実行前に入力欄を出す。**3 つまで** | ※下の「`{argument}` の再現」を参照 |
| `{argument name="x" default="y" options="a, b"}` | 同じ name の引数は同じ値で置き換わる。default を付けると任意入力になり、options を付けると選択式になる | 同上 |

**修飾子**（全プレースホルダー共通）: `{clipboard | trim | uppercase}` のようにつなげて書ける。

- `uppercase` / `lowercase` / `trim` / `percent-encode` / `json-stringify`
- `raw`: 既定の整形（Quicklink での percent-encode など）を外す

`{selection}` と `{browser-tab}` は AI Commands 専用なので、スニペットでは再現しなくてよい（付けるなら `getSelectedText()` で実装できる）。

#### `{cursor}` の再現

`Clipboard.paste` にはカーソルの位置を指定する方法がない。次の手順で真似る。

1. `{cursor}` を取り除いた本文を貼り付ける
2. `{cursor}` より後ろの文字数 N を数える
3. `runAppleScript` で System Events から `key code 123`（←）を N 回送る

注意点:

- Raycast にアクセシビリティ権限が必要（Window Management を使っていれば許可済みのはず）。
- 改行や自動インデントが入るエディタでは位置がずれることがある。
- 貼り付け直後は少し待つ必要がある。

#### `{argument}` の再現

標準機能では検索バーに入力欄が並ぶが、拡張では入力欄の数を動的に変えられない（manifest の `arguments` は固定で、しかも最大 3 つ）。
そこで、引数付きのスニペットを選んだら `Form` を push して引数を入力させ、送信したら貼り付ける。

- options 付き → `Form.Dropdown`
- default 付き → 初期値を入れておく

### 1-4. 拡張では真似できないもの

| 標準機能 | 理由 | 代わりの手段 |
| --- | --- | --- |
| **キーワード自動展開**（入力中に `;;sig` などと打つと置き換わる） | 拡張には全体のキー入力を監視する API がない。background コマンドは一定間隔で起動するだけで、常駐できない | 拡張のスニペットを `Action.CreateSnippet` で標準スニペットに書き出す（1 件ずつ保存画面を開く）。書き出した後は標準機能として展開される |
| 履歴を無制限にさかのぼる `{clipboard offset=N}` | API は offset 5 まで | 5 を超えたらエラーを出すか、空にする |

---

## 2. コマンドの作成（Window Management のような仕組み）

### 2-1. 標準機能はどうしているか

- Window Management の「Create Window Management Command」（Pro 機能）や、Quicklinks / Snippets / Script Commands は、**Raycast 本体がユーザー作成の項目をルート検索のコマンドとして登録**している。これらには Hotkey と Alias を付けられる。
- この登録処理は本体のネイティブコードで行われていて、拡張から呼べる API はない。

### 2-2. 拡張のコマンドは静的

- 拡張のコマンドは `package.json` の `commands` に書いたものだけ。実行中に増やす API はない。
- 実行中に変えられるのは `updateCommandMetadata({ subtitle })` の **subtitle だけ**（title は変えられない）。
- `disabledByDefault` で最初は無効にしておけるが、無効のコマンドはディープリンクからも起動できない。

### 2-3. 実現方法 A（本命）: Quicklink → ディープリンク → 拡張のコマンド

「ユーザーが作ったコマンドにホットキーを付ける」体験は、**Quicklink** で作れる。

- Quicklink は Raycast 本体に登録されるルート項目なので、標準機能と同じく **Hotkey / Alias を付けられる**。
- Quicklink の link には `raycast://` のディープリンクを入れられる。
- ディープリンクの `context` にフォルダ ID を入れておけば、コマンド側で `props.launchContext` から受け取れる。

ディープリンクの形式（開発者ドキュメント「Deeplinks」）:

```
raycast://extensions/<owner-or-author>/<extension-name>/<command-name>?launchType=userInitiated&context=<URLエンコードしたJSON>
```

`@raycast/utils` の `createDeeplink` の実装を読んだ結果は次のとおり。

```js
// owner-or-author は package.json の owner || author
function getOwnerOrAuthorName() {
  const packageJSON = JSON.parse(readFileSync(join(environment.assetsPath, "..", "package.json"), "utf8"));
  return packageJSON.owner || packageJSON.author;
}
// arguments / context は JSON.stringify → encodeURIComponent
if (options.context) params += "&context=" + encodeURIComponent(JSON.stringify(options.context));
```

- このリポジトリの拡張は `owner: "vivi-1610"`（org のプライベート拡張）なので、owner 部分は `vivi-1610` になる。`createDeeplink` を使えば自動でそうなる。
- ドキュメントの型説明には `context` が載っていないが、型定義（`CreateExtensionDeeplinkBaseOptions.context`）にも実装にもある。

#### Store にある前例

- **google-chrome-profiles**: プロファイルごとに `Action.CreateQuicklink` で `raycast://extensions/frouo/<ext>/open-profile?context=...` を作る。`open-profile` は no-view のコマンドで、`launchContext` が無ければ「Quicklink から起動してください」というトーストを出す。
- **browsers-profiles**: `raycast://extensions/skydiver/browsers-profiles/index?context=...` をコピーさせる方式。
- **promptlab**: ユーザーが作ったコマンドごとに `Action.CreateQuicklink` を出している。

#### Quicklink の作り方

```tsx
<Action.CreateQuicklink
  title="Create Folder Command"
  quicklink={{
    name: `Snippets: ${folder.name}`,
    link: createDeeplink({ command: "open-folder", context: { folderId: folder.id } }),
  }}
/>
```

- 入力済みの「Create Quicklink」画面が開くので、利用者が保存する。
- ホットキー（例: `⌘G`）は Raycast の設定で、Quicklink の項目に利用者が割り当てる。**API からはホットキーを設定できない。**
- 画面を経由せずに開く方法もある: `launchCommand({ ownerOrAuthorName: "raycast", extensionName: "raycast", name: "create-quicklink", type: LaunchType.UserInitiated, context: { name, link } })`

#### 注意点（実機で確認が必要）

- **ディープリンクの確認ダイアログ**: ディープリンクで起動すると、Raycast が確認ダイアログを出す。初回に「常に実行」を選べば、以後は出ないはず。ホットキー運用に支障がないか、実機で確認する。
- 受け側のコマンド（`open-folder`）もルート検索に出てしまう（隠す方法はない）。google-chrome-profiles と同じく、`launchContext` が無いときはフォルダ選択のリストを出すのが良さそう。

### 2-4. 実現方法 B（予備）: スロット式の固定コマンド

確認ダイアログが邪魔な場合の代わり。

- `package.json` に `folder-1` 〜 `folder-10` のようなコマンドを並べておき、全部 `disabledByDefault: true` にする。
- 拡張の中でスロットとフォルダを対応づけ（`LocalStorage`）、`updateCommandMetadata({ subtitle: "git" })` でどのフォルダかを表示する。
- ホットキーは普通のコマンドとして直接割り当てられるので、確認ダイアログは出ない。
- 欠点: 数に上限がある、title は変えられない、利用者が有効化する手間がかかる。

---

## 3. 例に当てはめた構成案

```
create-folder コマンド（view）   … フォルダを作る。Action.CreateQuicklink で「フォルダ用コマンド」を作る
  └ git フォルダ  ──Quicklink(⌘G)──▶ raycast://extensions/vivi-1610/<ext>/open-folder?context={"folderId":"git"}
       ├ スニペット1
       └ スニペット2
open-folder コマンド（view）     … launchContext.folderId のスニペットだけを List に出す
                                   Enter = プレースホルダーを展開して Action.Paste
                                   {argument} があれば Form を push してから貼り付け
```

- 保存: `supportPath/snippets.json`（`{ folders: [{ id, name, snippets: [{ id, name, text, keyword? }] }] }`）
- 他に付けるとよいアクション: 「標準スニペットに書き出す」（`Action.CreateSnippet`。キーワード展開はこれで補う）
- Clipy との対応
  - フォルダのホットキー = Quicklink のホットキー
  - メニューからの選択 = `List` からの選択

## 4. 実機で確認すること

1. Quicklink に入れた `raycast://extensions/vivi-1610/...` をホットキーで実行したとき、確認ダイアログが「常に実行」で出なくなるか
2. `Clipboard.paste` の後、元のクリップボードの内容とクリップボード履歴がどうなるか（標準スニペットと同じ動きか）
3. `{cursor}` を ← キー送信で真似たとき、主なアプリ（エディタ・ブラウザ・Slack）で正しく動くか
