import { z } from 'zod';

export const MCPRemoteConfigSchema = z.object({
  url: z.string().url().describe('The URL of the MCP SSE endpoint'),
  headers: z.record(z.string(), z.string()).optional(),
});

export const MCPStdioConfigSchema = z.object({
  command: z.string().min(1).describe('Executable command to start the MCP server'),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
});

export const MCPServerConfigSchema = z.union([
  MCPRemoteConfigSchema,
  MCPStdioConfigSchema,
]);

export type MCPRemoteConfig = z.infer<typeof MCPRemoteConfigSchema>;
export type MCPStdioConfig = z.infer<typeof MCPStdioConfigSchema>;
export type MCPServerConfig = MCPRemoteConfig | MCPStdioConfig;

export type MCPToolInfo = {
  name: string;
  description: string;
  inputSchema?: {
    type?: unknown;
    properties?: Record<string, unknown>;
    required?: string[];
  };
};

export type MCPServerInfo = {
  id: string;
  name: string;
  config?: MCPServerConfig;
  visibility: 'public' | 'private';
  enabled: boolean;
  userId: string;
  status: 'connected' | 'disconnected' | 'loading' | 'authorizing';
  error?: unknown;
  toolInfo: MCPToolInfo[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type McpServerInsert = {
  id?: string;
  name: string;
  config: MCPServerConfig;
  userId: string;
  visibility?: 'public' | 'private';
};

export type McpServerSelect = {
  id: string;
  name: string;
  config: MCPServerConfig;
  userId: string;
  visibility: 'public' | 'private';
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type MCPRepository = {
  save(server: McpServerInsert): Promise<McpServerSelect>;
  selectById(id: string): Promise<McpServerSelect | null>;
  selectAll(): Promise<McpServerSelect[]>;
  selectByServerName(name: string): Promise<McpServerSelect | null>;
  deleteById(id: string): Promise<void>;
  updateVisibility(id: string, visibility: 'public' | 'private'): Promise<void>;
};

export type McpOAuthSession = {
  id: string;
  mcpServerId: string;
  serverUrl: string;
  clientInfo?: Record<string, unknown>;
  tokens?: Record<string, unknown>;
  codeVerifier?: string;
  state?: string;
  createdAt: Date;
  updatedAt: Date;
};

