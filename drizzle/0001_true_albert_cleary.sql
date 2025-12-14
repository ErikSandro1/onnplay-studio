ALTER TABLE `users` ADD `emailVerified` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `emailVerificationToken` text;--> statement-breakpoint
ALTER TABLE `users` ADD `emailVerificationExpires` integer;