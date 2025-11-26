CREATE TABLE IF NOT EXISTS "chats" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"focusMode" text NOT NULL,
	"files" jsonb DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"chatId" text NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"messageId" text NOT NULL,
	"content" text,
	"sources" jsonb DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS "messages_chatId_idx" ON "messages" ("chatId");
