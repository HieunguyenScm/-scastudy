import { env as cloudflareEnv } from "cloudflare:workers";

const env = cloudflareEnv as unknown as { DB: D1Database };

let ready: Promise<void> | null = null;

function initializeDevelopmentDatabase(): Promise<void> {
  return Promise.resolve()
    .then(() =>
      env.DB.batch([
        env.DB.prepare(`CREATE TABLE IF NOT EXISTS progress (
          user_email TEXT NOT NULL,
          week INTEGER NOT NULL CHECK (week BETWEEN 1 AND 24),
          completed INTEGER NOT NULL DEFAULT 0,
          confidence INTEGER NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 5),
          quiz_score INTEGER CHECK (quiz_score IS NULL OR quiz_score BETWEEN 0 AND 100),
          practice_mask INTEGER NOT NULL DEFAULT 0 CHECK (practice_mask BETWEEN 0 AND 7),
          reflection TEXT NOT NULL DEFAULT '' CHECK (length(reflection) <= 2000),
          mastery_status TEXT NOT NULL DEFAULT 'not-started'
            CHECK (mastery_status IN ('not-started', 'in-progress', 'completed', 'mastered')),
          review_count INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),
          last_reviewed_at TEXT,
          next_review_at TEXT,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_email, week)
        )`),
        env.DB.prepare(`CREATE TABLE IF NOT EXISTS case_studies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_email TEXT NOT NULL,
          title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
          stage TEXT NOT NULL DEFAULT 'Framing'
            CHECK (stage IN ('Framing', 'Analysis', 'Modelling', 'Recommendation', 'Portfolio-ready')),
          problem TEXT NOT NULL DEFAULT '' CHECK (length(problem) <= 5000),
          hypothesis TEXT NOT NULL DEFAULT '' CHECK (length(hypothesis) <= 5000),
          evidence TEXT NOT NULL DEFAULT '' CHECK (length(evidence) <= 8000),
          recommendation TEXT NOT NULL DEFAULT '' CHECK (length(recommendation) <= 5000),
          assignment_module INTEGER CHECK (assignment_module IS NULL OR assignment_module BETWEEN 1 AND 6),
          rubric_scores TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(rubric_scores)),
          reflection TEXT NOT NULL DEFAULT '' CHECK (length(reflection) <= 5000),
          revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
          deleted_at TEXT,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`),
        env.DB.prepare(`CREATE TABLE IF NOT EXISTS case_revisions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          case_id INTEGER NOT NULL REFERENCES case_studies(id),
          user_email TEXT NOT NULL,
          revision INTEGER NOT NULL CHECK (revision >= 1),
          title TEXT NOT NULL,
          stage TEXT NOT NULL,
          problem TEXT NOT NULL,
          hypothesis TEXT NOT NULL,
          evidence TEXT NOT NULL,
          recommendation TEXT NOT NULL,
          assignment_module INTEGER,
          rubric_scores TEXT NOT NULL CHECK (json_valid(rubric_scores)),
          reflection TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`),
        env.DB.prepare(`CREATE TABLE IF NOT EXISTS quiz_attempts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_email TEXT NOT NULL,
          module INTEGER NOT NULL CHECK (module BETWEEN 1 AND 6),
          answers TEXT NOT NULL CHECK (json_valid(answers)),
          score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
          correct INTEGER NOT NULL CHECK (correct BETWEEN 0 AND total),
          total INTEGER NOT NULL CHECK (total > 0),
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`),
        env.DB.prepare(`CREATE TABLE IF NOT EXISTS ai_daily_usage (
          user_email TEXT NOT NULL,
          usage_date TEXT NOT NULL,
          request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_email, usage_date)
        )`),
        env.DB.prepare(`CREATE TABLE IF NOT EXISTS ai_executions (
          request_id TEXT PRIMARY KEY NOT NULL,
          user_email TEXT NOT NULL,
          week INTEGER CHECK (week IS NULL OR week BETWEEN 1 AND 24),
          status TEXT NOT NULL,
          error_code TEXT,
          model TEXT,
          provider_status INTEGER,
          attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 2),
          latency_ms INTEGER NOT NULL DEFAULT 0 CHECK (latency_ms >= 0),
          input_chars INTEGER NOT NULL CHECK (input_chars >= 0),
          output_chars INTEGER NOT NULL DEFAULT 0 CHECK (output_chars >= 0),
          input_tokens INTEGER,
          output_tokens INTEGER,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`),
        env.DB.prepare(
          "CREATE INDEX IF NOT EXISTS progress_user_mastery_idx ON progress(user_email, mastery_status)",
        ),
        env.DB.prepare(
          "CREATE INDEX IF NOT EXISTS progress_user_next_review_idx ON progress(user_email, next_review_at)",
        ),
        env.DB.prepare(
          "CREATE INDEX IF NOT EXISTS case_studies_user_active_updated_idx ON case_studies(user_email, deleted_at, updated_at)",
        ),
        env.DB.prepare(
          "CREATE UNIQUE INDEX IF NOT EXISTS case_revisions_case_revision_uidx ON case_revisions(case_id, revision)",
        ),
        env.DB.prepare(
          "CREATE INDEX IF NOT EXISTS case_revisions_user_created_idx ON case_revisions(user_email, created_at)",
        ),
        env.DB.prepare(
          "CREATE INDEX IF NOT EXISTS quiz_attempts_user_module_created_idx ON quiz_attempts(user_email, module, created_at)",
        ),
        env.DB.prepare(
          "CREATE INDEX IF NOT EXISTS ai_daily_usage_date_idx ON ai_daily_usage(usage_date)",
        ),
        env.DB.prepare(
          "CREATE INDEX IF NOT EXISTS ai_executions_user_created_idx ON ai_executions(user_email, created_at)",
        ),
        env.DB.prepare(
          "CREATE INDEX IF NOT EXISTS ai_executions_status_created_idx ON ai_executions(status, created_at)",
        ),
        env.DB.prepare(`CREATE TRIGGER IF NOT EXISTS case_studies_snapshot_after_insert
          AFTER INSERT ON case_studies
          BEGIN
            INSERT INTO case_revisions (
              case_id, user_email, revision, title, stage, problem, hypothesis,
              evidence, recommendation, assignment_module, rubric_scores, reflection
            ) VALUES (
              NEW.id, NEW.user_email, NEW.revision, NEW.title, NEW.stage, NEW.problem, NEW.hypothesis,
              NEW.evidence, NEW.recommendation, NEW.assignment_module, NEW.rubric_scores, NEW.reflection
            );
          END`),
        env.DB.prepare(`CREATE TRIGGER IF NOT EXISTS case_studies_snapshot_after_revision
          AFTER UPDATE ON case_studies
          WHEN NEW.revision > OLD.revision
          BEGIN
            INSERT INTO case_revisions (
              case_id, user_email, revision, title, stage, problem, hypothesis,
              evidence, recommendation, assignment_module, rubric_scores, reflection
            ) VALUES (
              NEW.id, NEW.user_email, NEW.revision, NEW.title, NEW.stage, NEW.problem, NEW.hypothesis,
              NEW.evidence, NEW.recommendation, NEW.assignment_module, NEW.rubric_scores, NEW.reflection
            );
          END`),
        env.DB.prepare(`CREATE TRIGGER IF NOT EXISTS case_revisions_prevent_update
          BEFORE UPDATE ON case_revisions
          BEGIN
            SELECT RAISE(ABORT, 'case revisions are immutable');
          END`),
        env.DB.prepare(`CREATE TRIGGER IF NOT EXISTS case_revisions_prevent_delete
          BEFORE DELETE ON case_revisions
          BEGIN
            SELECT RAISE(ABORT, 'case revisions are immutable');
          END`),
        env.DB.prepare(`CREATE TRIGGER IF NOT EXISTS quiz_attempts_prevent_update
          BEFORE UPDATE ON quiz_attempts
          BEGIN
            SELECT RAISE(ABORT, 'quiz attempts are immutable');
          END`),
        env.DB.prepare(`CREATE TRIGGER IF NOT EXISTS quiz_attempts_prevent_delete
          BEFORE DELETE ON quiz_attempts
          BEGIN
            SELECT RAISE(ABORT, 'quiz attempts are immutable');
          END`),
      ]),
    )
    .then(() => undefined);
}

export function ensureDatabase(): Promise<void> {
  if (process.env.NODE_ENV === "production") return Promise.resolve();
  if (ready) return ready;

  const guarded = initializeDevelopmentDatabase().catch((error: unknown) => {
    ready = null;
    throw error;
  });
  ready = guarded;
  return guarded;
}
