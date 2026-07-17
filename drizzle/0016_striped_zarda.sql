ALTER TABLE `cards` ADD `updateFrequency` enum('monthly','quarterly','yearly','none') DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `cards` ADD `lastUpdatedAt` timestamp;