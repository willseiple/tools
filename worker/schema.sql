CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app TEXT NOT NULL,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  iph TEXT NOT NULL,
  ts INTEGER NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS comments_app ON comments (app, hidden, ts);
CREATE INDEX IF NOT EXISTS comments_iph ON comments (iph, ts);

CREATE TABLE IF NOT EXISTS likes (
  comment_id INTEGER NOT NULL,
  voter TEXT NOT NULL,
  iph TEXT NOT NULL,
  ts INTEGER NOT NULL,
  PRIMARY KEY (comment_id, voter)
);
CREATE INDEX IF NOT EXISTS likes_iph ON likes (iph, ts);
