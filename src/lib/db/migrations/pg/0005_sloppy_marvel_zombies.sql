CREATE TABLE "usage_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"user_id" uuid,
	"chat_id" text,
	"focus_mode" text,
	"provider_id" text,
	"model_key" text,
	"embedding_provider_id" text,
	"embedding_model_key" text,
	"optimization_mode" text,
	"response_time_ms" integer,
	"message_count" integer DEFAULT 0 NOT NULL,
	"message_chars" integer DEFAULT 0 NOT NULL,
	"source_count" integer DEFAULT 0 NOT NULL,
	"file_count" integer DEFAULT 0 NOT NULL,
	"is_error" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "usage_events_created_at_idx" ON "usage_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "usage_events_user_id_idx" ON "usage_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "usage_events_event_type_idx" ON "usage_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "usage_events_chat_id_idx" ON "usage_events" USING btree ("chat_id");