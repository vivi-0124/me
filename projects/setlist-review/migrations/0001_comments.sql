CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  -- 書いた本人だけが消せるように、ブラウザごとの合言葉を持たせる
  owner_token TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX comments_event ON comments (event_id, created_at);
