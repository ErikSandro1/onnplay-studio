CREATE TABLE `active_transmissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'live' NOT NULL,
	`inviteCode` text NOT NULL,
	`viewerCount` integer DEFAULT 0 NOT NULL,
	`participantCount` integer DEFAULT 0 NOT NULL,
	`platforms` text,
	`startedAt` integer NOT NULL,
	`endedAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `active_transmissions_inviteCode_unique` ON `active_transmissions` (`inviteCode`);--> statement-breakpoint
CREATE TABLE `broadcast_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`transmissionId` integer,
	`durationMinutes` integer DEFAULT 0 NOT NULL,
	`startedAt` integer NOT NULL,
	`endedAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`transmissionId` integer NOT NULL,
	`userId` integer,
	`userName` text NOT NULL,
	`userRole` text DEFAULT 'viewer' NOT NULL,
	`message` text NOT NULL,
	`isDeleted` integer DEFAULT false NOT NULL,
	`isBlocked` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mixer_presets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`channelLevels` text NOT NULL,
	`eqSettings` text,
	`compressorSettings` text,
	`effectsSettings` text,
	`isDefault` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scenes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'camera' NOT NULL,
	`config` text,
	`thumbnailUrl` text,
	`sortOrder` integer DEFAULT 0,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `streaming_configs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`platform` text NOT NULL,
	`label` text,
	`streamKey` text,
	`rtmpUrl` text,
	`isEnabled` integer DEFAULT true NOT NULL,
	`lastUsedAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transmission_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`platforms` text NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`durationSeconds` integer DEFAULT 0,
	`peakViewers` integer DEFAULT 0,
	`totalViewers` integer DEFAULT 0,
	`avgBitrate` integer,
	`recordingUrl` text,
	`thumbnailUrl` text,
	`startedAt` integer,
	`endedAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transmission_invites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`transmissionId` integer NOT NULL,
	`guestEmail` text,
	`guestName` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`token` text NOT NULL,
	`acceptedAt` integer,
	`expiresAt` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transmission_invites_token_unique` ON `transmission_invites` (`token`);--> statement-breakpoint
CREATE TABLE `transmission_participants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`transmissionId` integer NOT NULL,
	`userId` integer,
	`name` text NOT NULL,
	`email` text,
	`role` text DEFAULT 'guest' NOT NULL,
	`status` text DEFAULT 'disconnected' NOT NULL,
	`audioEnabled` integer DEFAULT true NOT NULL,
	`videoEnabled` integer DEFAULT true NOT NULL,
	`connectedAt` integer,
	`disconnectedAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `usage_tracking` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`month` text NOT NULL,
	`totalMinutes` integer DEFAULT 0 NOT NULL,
	`limitMinutes` integer DEFAULT 300 NOT NULL,
	`lastUpdatedAt` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`openId` text NOT NULL,
	`name` text,
	`email` text,
	`loginMethod` text,
	`role` text DEFAULT 'user' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`lastSignedIn` integer NOT NULL,
	`plan` text DEFAULT 'free' NOT NULL,
	`subscriptionStartedAt` integer,
	`stripeSubscriptionId` text,
	`stripeCustomerId` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_openId_unique` ON `users` (`openId`);