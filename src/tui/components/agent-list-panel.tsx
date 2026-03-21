import type { AgentSummary } from "../hooks/use-agents.ts";

interface AgentListPanelProps {
  agents: AgentSummary[];
  selectedIndex: number;
  focused: boolean;
  teamName: string | null;
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

  const selected = agents[selectedIndex] ?? agents[0];

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
      {/* Compact agent list */}
      <box flexGrow={1} flexDirection="column">
        <text content={`  ${"NAME".padEnd(16)} ${"STATUS".padEnd(8)} INBOX`} fg="#565f89" />
        {agents.map((agent, i) => {
          const isSelected = i === selectedIndex;
          const prefix = isSelected && focused ? ">" : " ";
          const statusIcon = agent.status === "alive" ? "*" : ".";
          const inbox = agent.unreadCount > 0 ? `${agent.unreadCount} unread` : "-";

          const line = `${prefix} ${agent.name.padEnd(16)} ${statusIcon} ${agent.status.padEnd(6)} ${inbox}`;

          return <text key={agent.agentId} content={line} fg={isSelected ? "#c0caf5" : "#a9b1d6"} />;
        })}
      </box>

      {/* Detail section for selected agent */}
      <box height={7} border borderStyle="single" borderColor="#565f89" flexDirection="column" paddingX={1}>
        <text content={`Session  ${selected.sessionId || "-"}`} fg="#a9b1d6" />
        <text content={`CWD      ${selected.cwd}`} fg="#a9b1d6" />
        <text content={`Model    ${selected.model || "(default)"}`} fg="#a9b1d6" />
        <text content={`Args     ${selected.extraArgs?.length ? selected.extraArgs.join(" ") : "-"}`} fg="#a9b1d6" />
        <text content={`PID      ${selected.processId || "-"}`} fg="#565f89" />
      </box>
    </box>
  );
}
