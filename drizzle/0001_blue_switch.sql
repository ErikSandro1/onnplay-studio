CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transmissionId` int NOT NULL,
	`userId` int,
	`userName` varchar(100) NOT NULL,
	`userRole` enum('host','moderator','guest','viewer') NOT NULL DEFAULT 'viewer',
	`message` text NOT NULL,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`isBlocked` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mixer_presets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`channelLevels` json NOT NULL,
	`eqSettings` json,
	`compressorSettings` json,
	`effectsSettings` json,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mixer_presets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scenes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` enum('camera','screen','media','overlay') NOT NULL DEFAULT 'camera',
	`config` json,
	`thumbnailUrl` text,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scenes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `streaming_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`platform` varchar(50) NOT NULL,
	`label` varchar(100),
	`streamKey` text,
	`rtmpUrl` text,
	`isEnabled` boolean NOT NULL DEFAULT true,
	`lastUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `streaming_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transmission_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`platforms` json NOT NULL,
	`status` enum('scheduled','live','ended','cancelled') NOT NULL DEFAULT 'scheduled',
	`durationSeconds` int DEFAULT 0,
	`peakViewers` int DEFAULT 0,
	`totalViewers` int DEFAULT 0,
	`avgBitrate` int,
	`recordingUrl` text,
	`thumbnailUrl` text,
	`startedAt` timestamp,
	`endedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transmission_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','operator','moderator') NOT NULL DEFAULT 'user';