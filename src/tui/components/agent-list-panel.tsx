import type { AgentSummary } from "../hooks/use-agents.ts";

interface AgentListPanelProps {
  agents: AgentSummary[];
  selectedIndex: number;
  focused: boolean;
  teamName: string | null;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 2) + ".." : s;
}

export function AgentListPanel({ agents, selectedIndex, focused, teamName }: AgentListPanelProps) {
  const borderColor = focused ? "#7aa2f7" : "#565f89";
  const title = teamName ? ` Agents in: ${teamName} ` : " Agents ";

  if (!teamName) {
    return (
      <box
        flexGrow={2}
        border
        borderStyle="rounded"
        borderColor={borderColor}
        title={title}
        padding={1}
        flexDirection="column"
      >
        <text content="Select a team." fg="#565f89" />
      </box>
    );
  }

  if (agents.length === 0) {
    return (
      <box
        flexGrow={2}
        border
        borderStyle="rounded"
        borderColor={borderColor}
        title={title}
        padding={1}
        flexDirection="column"
      >
        <text content="No agents in this team." fg="#565f89" />
        <text content='Press "s" to spawn one.' fg="#565f89" />
      </box>
    );
  }

  // Header
  const header = `  ${"NAME".padEnd(14)} ${"STATUS".padEnd(8)} ${"SESSION".padEnd(14)} CWD`;

  return (
    <box
      flexGrow={2}
      border
      borderStyle="rounded"
      borderColor={borderColor}
      title={title}
      flexDirection="column"
      paddingX={1}
    >
      <text content={header} fg="#565f89" />
      {agents.map((agent, i) => {
        const isSelected = i === selectedIndex && focused;
        const prefix = isSelected ? ">" : " ";
        const statusIcon = agent.status === "alive" ? "*" : ".";
        const statusColor = agent.status === "alive" ? "#9ece6a" : "#f7768e";
        const session = agent.sessionId ? truncate(agent.sessionId, 12) : "-";
        const cwd = truncate(agent.cwd, 20);

        const line = `${prefix} ${agent.name.padEnd(14)} ${statusIcon} ${agent.status.padEnd(6)} ${session.padEnd(14)} ${cwd}`;

        return (
          <text
            key={agent.agentId}
            content={line}
            fg={isSelected ? "#c0caf5" : "#a9b1d6"}
          />
        );
      })}
    </box>
  );
}
