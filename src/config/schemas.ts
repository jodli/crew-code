import { z } from "zod";

export const AgentMemberSchema = z.object({
  agentId: z.string(),
  name: z.string(),
  agentType: z.string().optional(),
  model: z.string().optional(),
  prompt: z.string().optional(),
  color: z.string().optional(),
  planModeRequired: z.boolean().optional(),
  joinedAt: z.number(),
  tmuxPaneId: z.string(),
  cwd: z.string(),
  subscriptions: z.array(z.string()),
  backendType: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const TeamConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.number(),
  leadAgentId: z.string(),
  leadSessionId: z.string(),
  members: z.array(AgentMemberSchema),
});

export const InboxMessageSchema = z.object({
  from: z.string(),
  text: z.string(),
  summary: z.string().optional(),
  timestamp: z.string(),
  color: z.string().optional(),
  read: z.boolean(),
});

export const InboxSchema = z.array(InboxMessageSchema);
