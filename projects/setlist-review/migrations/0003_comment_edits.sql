-- コメントを書いた本人が編集したときの日時。編集していなければ NULL
ALTER TABLE comments ADD COLUMN edited_at TEXT;
