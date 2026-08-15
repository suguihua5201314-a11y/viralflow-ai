CREATE TABLE `monitor_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`handle` text NOT NULL,
	`market` text NOT NULL,
	`product` text NOT NULL,
	`url` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `monitor_accounts_handle_unique` ON `monitor_accounts` (`handle`);--> statement-breakpoint
CREATE UNIQUE INDEX `monitor_accounts_url_unique` ON `monitor_accounts` (`url`);