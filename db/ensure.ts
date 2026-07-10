import { env } from "cloudflare:workers";

let ready: Promise<void> | null = null;

export function ensureDatabase() {
  if (!ready) {
    ready = env.DB.batch([
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS progress (
        user_email TEXT NOT NULL,
        week INTEGER NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        confidence INTEGER NOT NULL DEFAULT 0,
        quiz_score INTEGER,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_email, week)
      )`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS case_studies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT NOT NULL,
        title TEXT NOT NULL,
        stage TEXT NOT NULL DEFAULT 'Framing',
        problem TEXT NOT NULL DEFAULT '',
        hypothesis TEXT NOT NULL DEFAULT '',
        evidence TEXT NOT NULL DEFAULT '',
        recommendation TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`),
      env.DB.prepare(
        "CREATE INDEX IF NOT EXISTS case_studies_user_updated_idx ON case_studies(user_email, updated_at DESC)",
      ),
    ]).then(() => undefined);
  }
  return ready;
}
