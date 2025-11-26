CREATE TABLE IF NOT EXISTS "mcp_server" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL,
    "config" jsonb NOT NULL,
    "enabled" boolean NOT NULL DEFAULT true,
    "user_id" uuid NOT NULL REFERENCES "user" ("id") ON DELETE cascade,
    "visibility" text NOT NULL DEFAULT 'private',
    "created_at" timestamp NOT NULL DEFAULT NOW(),
    "updated_at" timestamp NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "mcp_server_custom_instructions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "user" ("id") ON DELETE cascade,
    "mcp_server_id" uuid NOT NULL REFERENCES "mcp_server" ("id") ON DELETE cascade,
    "prompt" text,
    "created_at" timestamp NOT NULL DEFAULT NOW(),
    "updated_at" timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT "mcp_server_custom_instructions_user_id_mcp_server_id_unique" UNIQUE ("user_id", "mcp_server_id")
);

CREATE TABLE IF NOT EXISTS "mcp_server_tool_custom_instructions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "user" ("id") ON DELETE cascade,
    "tool_name" text NOT NULL,
    "mcp_server_id" uuid NOT NULL REFERENCES "mcp_server" ("id") ON DELETE cascade,
    "prompt" text,
    "created_at" timestamp NOT NULL DEFAULT NOW(),
    "updated_at" timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT "mcp_server_tool_custom_instructions_user_id_tool_name_mcp_server_id_unique" UNIQUE ("user_id", "tool_name", "mcp_server_id")
);

CREATE TABLE IF NOT EXISTS "mcp_oauth_session" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "mcp_server_id" uuid NOT NULL REFERENCES "mcp_server" ("id") ON DELETE cascade,
    "server_url" text NOT NULL,
    "client_info" jsonb,
    "tokens" jsonb,
    "code_verifier" text,
    "state" text UNIQUE,
    "created_at" timestamp NOT NULL DEFAULT NOW(),
    "updated_at" timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "mcp_oauth_session_server_id_idx"
    ON "mcp_oauth_session" ("mcp_server_id");

CREATE INDEX IF NOT EXISTS "mcp_oauth_session_state_idx"
    ON "mcp_oauth_session" ("state");
