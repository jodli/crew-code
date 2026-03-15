export interface AgentMember {
  agentId: string;
  name: string;
  agentType?: string;
  model?: string;
  prompt?: string;
  color?: string;
  planModeRequired?: boolean;
  joinedAt: number;
  processId: string;
  cwd: string;
  subscriptions: string[];
  isActive?: boolean;
  sessionId?: string;
}

export interface TeamConfig {
  name: string;
  description?: string;
  createdAt: number;
  leadAgentId: string;
  leadSessionId: string;
  members: AgentMember[];
}

export interface LaunchOptions {
  agentId: string;
  agentName: string;
  teamName: string;
  cwd: string;
  color?: string;
  parentSessionId?: string;
  model?: string;
  sessionId?: string;
  extraArgs?: string[];
}

export interface InboxMessage {
  from: string;
  text: string;
  summary?: string;
  timestamp: string;
  color?: string;
  read: boolean;
}
