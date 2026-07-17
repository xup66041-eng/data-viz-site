ALTER TABLE `tasks` ADD `assignee` varchar(100);--> statement-breakpoint
ALTER TABLE `tasks` ADD `dueDate` timestamp;--> statement-breakpoint
ALTER TABLE `tasks` ADD `priority` varchar(20) DEFAULT 'normal';