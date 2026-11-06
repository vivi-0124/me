# Chrome Tab Search

Chrome で開いているタブを、ウィンドウをまたいで検索して切り替える Raycast 拡張機能。

## 使い方

1. Raycast で `Search Chrome Tabs` を実行する
2. 文字を打って絞り込む（タイトルと URL の部分一致。スペース区切りで AND 検索）
3. `↵` でそのタブに切り替える

ホットキーを割り当てると、すぐに呼び出せる。

## 権限

初回実行時に「Raycast が Google Chrome を制御」する許可を求められるので、許可する。拒否した場合は、システム設定 → プライバシーとセキュリティ → オートメーション で Raycast の Google Chrome をオンにする。

## 開発

```bash
npm install
npm run dev
npm run lint
npm run build
```

| パス                  | 役割                                       |
| --------------------- | ------------------------------------------ |
| `src/search-tabs.tsx` | コマンドの画面（一覧・絞り込み・切り替え） |
| `src/lib/chrome.ts`   | JXA による Chrome のタブ取得と切り替え     |
