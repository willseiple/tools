CREATE TABLE IF NOT EXISTS ratings (
  app TEXT NOT NULL,
  voter TEXT NOT NULL,
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  iph TEXT NOT NULL,
  ts INTEGER NOT NULL,
  PRIMARY KEY (app, voter)
);
CREATE INDEX IF NOT EXISTS ratings_iph ON ratings (app, iph, ts);

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
