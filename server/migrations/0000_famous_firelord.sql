CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`incident_id` integer,
	`user_id` integer,
	`action` text NOT NULL,
	`details` text,
	`timestamp` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`incident_id`) REFERENCES `incidents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `escalation_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text DEFAULT 'telegram' NOT NULL,
	`webhook_url` text,
	`webhook_url_vendor` text,
	`is_active` integer DEFAULT 0 NOT NULL,
	`template_open` text,
	`template_open_vendor` text,
	`template_close` text,
	`template_close_vendor` text,
	`template_open_internal_blue` text,
	`template_open_vendor_blue` text,
	`template_close_internal_blue` text,
	`template_close_vendor_blue` text,
	`template_open_internal_yellow` text,
	`template_open_vendor_yellow` text,
	`template_close_internal_yellow` text,
	`template_close_vendor_yellow` text,
	`template_open_internal_orange` text,
	`template_open_vendor_orange` text,
	`template_close_internal_orange` text,
	`template_close_vendor_orange` text,
	`template_open_internal_red` text,
	`template_open_vendor_red` text,
	`template_close_internal_red` text,
	`template_close_vendor_red` text,
	`template_open_internal_black` text,
	`template_open_vendor_black` text,
	`template_close_internal_black` text,
	`template_close_vendor_black` text,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `incidents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`case_no` text NOT NULL,
	`customer_id` integer,
	`ncal` text DEFAULT 'YELLOW' NOT NULL,
	`odp_bts` text,
	`level_support` text,
	`initial_problem` text,
	`status` text DEFAULT 'open' NOT NULL,
	`technician_id` integer,
	`root_cause` text,
	`last_action` text,
	`power_before` text,
	`power_after` text,
	`kabel` text,
	`panjang_kabel` text,
	`pic` text,
	`indikasi` text,
	`sla` text,
	`classification_id` integer,
	`start_time` text NOT NULL,
	`start_action_time` text,
	`end_time` text,
	`total_pause_duration_seconds` integer DEFAULT 0 NOT NULL,
	`duration_gross_seconds` integer,
	`duration_nett_seconds` integer,
	`created_by` integer,
	`customer_terdampak` text,
	`koordinat` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `master_customer`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`technician_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`classification_id`) REFERENCES `master_classifications`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `incidents_case_no_unique` ON `incidents` (`case_no`);--> statement-breakpoint
CREATE TABLE `master_actions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `master_classifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`klasifikasi` text NOT NULL,
	`sub_klasifikasi` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `master_customer` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_id` text NOT NULL,
	`service_id` text NOT NULL,
	`company_name` text NOT NULL,
	`brand_site` text NOT NULL,
	`address` text,
	`service_type` text,
	`grade` text,
	`support_level` text,
	`link_coverage` text,
	`sla` text,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `master_customer_customer_id_unique` ON `master_customer` (`customer_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `master_customer_service_id_unique` ON `master_customer` (`service_id`);--> statement-breakpoint
CREATE TABLE `master_distribusi` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`level_1` text NOT NULL,
	`level_2` text,
	`level_3` text,
	`level_4` text,
	`latitude` real,
	`longitude` real,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `master_technical_support` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`no` text,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`target_role` text,
	`incident_id` integer,
	`type` text NOT NULL,
	`message` text NOT NULL,
	`is_read` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`incident_id`) REFERENCES `incidents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pause_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`incident_id` integer NOT NULL,
	`pause_start` text NOT NULL,
	`pause_end` text,
	`reason` text,
	`duration_seconds` integer,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`incident_id`) REFERENCES `incidents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'technician' NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`employee_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);