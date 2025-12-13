CREATE TABLE `active_transmissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` enum('live','paused','ended') NOT NULL DEFAULT 'live',
	`inviteCode` varchar(32) NOT NULL,
	`viewerCount` int NOT NULL DEFAULT 0,
	`participantCount` int NOT NULL DEFAULT 0,
	`platforms` json,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `active_transmissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `active_transmissions_inviteCode_unique` UNIQUE(`inviteCode`)
);
--> statement-breakpoint
CREATE TABLE `transmission_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transmissionId` int NOT NULL,
	`guestEmail` varchar(320),
	`guestName` varchar(100),
	`status` enum('pending','accepted','rejected','expired') NOT NULL DEFAULT 'pending',
	`token` varchar(64) NOT NULL,
	`acceptedAt` timestamp,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transmission_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `transmission_invites_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `transmission_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transmissionId` int NOT NULL,
	`userId` int,
	`name` varchar(100) NOT NULL,
	`email` varchar(320),
	`role` enum('host','guest','moderator') NOT NULL DEFAULT 'guest',
	`status` enum('connected','disconnected','speaking') NOT NULL DEFAULT 'disconnected',
	`audioEnabled` boolean NOT NULL DEFAULT true,
	`videoEnabled` boolean NOT NULL DEFAULT true,
	`connectedAt` timestamp,
	`disconnectedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transmission_participants_id` PRIMARY KEY(`id`)
);
