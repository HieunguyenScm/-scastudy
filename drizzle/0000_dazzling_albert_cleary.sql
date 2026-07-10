CREATE TABLE `case_studies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`title` text NOT NULL,
	`stage` text DEFAULT 'Framing' NOT NULL,
	`problem` text DEFAULT '' NOT NULL,
	`hypothesis` text DEFAULT '' NOT NULL,
	`evidence` text DEFAULT '' NOT NULL,
	`recommendation` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `progress` (
	`user_email` text NOT NULL,
	`week` integer NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`confidence` integer DEFAULT 0 NOT NULL,
	`quiz_score` integer,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_email`, `week`)
);
