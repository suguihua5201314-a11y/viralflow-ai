CREATE TABLE `scripts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`product` text NOT NULL,
	`language` text NOT NULL,
	`country` text NOT NULL,
	`style` text NOT NULL,
	`hook` text NOT NULL,
	`alternate_hooks` text NOT NULL,
	`narration` text NOT NULL,
	`scenes` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
