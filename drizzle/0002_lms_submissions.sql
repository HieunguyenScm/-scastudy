CREATE TABLE IF NOT EXISTS `submissions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_email` text NOT NULL,
  `week` integer NOT NULL CHECK (`week` BETWEEN 1 AND 24),
  `status` text NOT NULL DEFAULT 'in-progress',
  `title` text NOT NULL,
  `evidence` text NOT NULL DEFAULT '',
  `file_url` text,
  `assumptions` text NOT NULL DEFAULT '',
  `reflection` text NOT NULL DEFAULT '',
  `latest_version` integer NOT NULL DEFAULT 0,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(`user_email`, `week`)
);
CREATE TABLE IF NOT EXISTS `submission_versions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `submission_id` integer NOT NULL REFERENCES `submissions`(`id`),
  `user_email` text NOT NULL,
  `version` integer NOT NULL,
  `evidence` text NOT NULL,
  `file_url` text,
  `assumptions` text NOT NULL,
  `reflection` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(`submission_id`, `version`)
);
CREATE TABLE IF NOT EXISTS `mentor_reviews` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `submission_id` integer NOT NULL REFERENCES `submissions`(`id`),
  `version` integer NOT NULL,
  `user_email` text NOT NULL,
  `decision` text NOT NULL,
  `scores` text NOT NULL DEFAULT '{}',
  `strengths` text NOT NULL DEFAULT '',
  `gaps` text NOT NULL DEFAULT '',
  `feedback` text NOT NULL DEFAULT '',
  `sources` text NOT NULL DEFAULT '[]',
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `submissions_user_status_idx` ON `submissions` (`user_email`,`status`);
CREATE INDEX IF NOT EXISTS `submission_versions_user_created_idx` ON `submission_versions` (`user_email`,`created_at`);
CREATE INDEX IF NOT EXISTS `mentor_reviews_submission_created_idx` ON `mentor_reviews` (`submission_id`,`created_at`);
