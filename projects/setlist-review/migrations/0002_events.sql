-- ライブ1回分のページ。slug が URL（/e/<slug>）になる
CREATE TABLE events (
  slug TEXT PRIMARY KEY,
  -- 編集用の合言葉は、そのままでは持たずにハッシュだけ持つ
  edit_key_hash TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  venue TEXT NOT NULL DEFAULT '',
  -- 作った人が貼ったセトリの文章（編集画面に戻すため）
  source TEXT NOT NULL DEFAULT '',
  -- source を読み取った結果。画面はこれを描く
  items TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
