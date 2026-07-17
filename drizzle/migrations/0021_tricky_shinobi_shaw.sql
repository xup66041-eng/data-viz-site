CREATE TABLE `cardTables` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cardId` int NOT NULL,
	`title` varchar(200) DEFAULT '',
	`columns` text NOT NULL,
	`rows` text NOT NULL,
	`order` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cardTables_id` PRIMARY KEY(`id`)
);
