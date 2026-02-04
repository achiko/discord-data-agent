-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

--> statement-breakpoint
CREATE TABLE "guilds" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"icon_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"guild_id" varchar(32) NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"topic" text,
	"category_id" varchar(32),
	"category" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"discriminator" text,
	"avatar_url" text,
	"is_bot" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"channel_id" varchar(32) NOT NULL,
	"user_id" varchar(32) NOT NULL,
	"content" text NOT NULL,
	"timestamp" timestamp NOT NULL,
	"edited_timestamp" timestamp,
	"type" text NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"reference_id" varchar(32),
	"attachments_json" jsonb,
	"embeds_json" jsonb,
	"reactions_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_embeddings" (
	"message_id" varchar(32) NOT NULL,
	"chunk_index" integer DEFAULT 0 NOT NULL,
	"chunk_text" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "message_embeddings_message_id_chunk_index_pk" PRIMARY KEY("message_id","chunk_index")
);
--> statement-breakpoint
CREATE TABLE "export_runs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "export_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"guild_id" varchar(32),
	"channel_id" varchar(32),
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"message_count" integer,
	"last_message_id" varchar(32),
	"since_date" timestamp,
	"status" text DEFAULT 'running' NOT NULL,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "message_embeddings" ADD CONSTRAINT "message_embeddings_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "export_runs" ADD CONSTRAINT "export_runs_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "export_runs" ADD CONSTRAINT "export_runs_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "channels_guild_id_idx" ON "channels" USING btree ("guild_id");
--> statement-breakpoint
CREATE INDEX "messages_channel_id_idx" ON "messages" USING btree ("channel_id");
--> statement-breakpoint
CREATE INDEX "messages_user_id_idx" ON "messages" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "messages_timestamp_idx" ON "messages" USING btree ("timestamp");
--> statement-breakpoint
CREATE INDEX "messages_content_search_idx" ON "messages" USING gin (to_tsvector('english', "content"));
--> statement-breakpoint
CREATE INDEX "export_runs_channel_id_idx" ON "export_runs" USING btree ("channel_id");
--> statement-breakpoint
CREATE INDEX "export_runs_guild_id_idx" ON "export_runs" USING btree ("guild_id");
