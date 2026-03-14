import type { TeamSummary } from "../hooks/use-teams.ts";

interface TeamListPanelProps {
  teams: TeamSummary[];
  selectedIndex: number;
  focused: boolean;
}

export function TeamListPanel({ teams, selectedIndex, focused }: TeamListPanelProps) {
  const borderColor = focused ? "#7aa2f7" : "#565f89";

  if (teams.length === 0) {
    return (
      <box
        flexGrow={1}
        border
        borderStyle="rounded"
        borderColor={borderColor}
        title=" Teams "
        padding={1}
        flexDirection="column"
      >
        <text content="No teams found." fg="#565f89" />
        <text content='Press "n" to create one.' fg="#565f89" />
      </box>
    );
  }

  return (
    <box
      flexGrow={1}
      border
      borderStyle="rounded"
      borderColor={borderColor}
      title=" Teams "
      flexDirection="column"
      paddingX={1}
    >
      {teams.map((team, i) => {
        const isSelected = i === selectedIndex;
        const prefix = isSelected && focused ? ">" : " ";
        const aliveColor =
          team.aliveCount === team.agentCount
            ? "#9ece6a" // all alive = green
            : team.aliveCount > 0
              ? "#e0af68" // some alive = yellow
              : "#565f89"; // none alive = dim

        const label = `${prefix} ${team.name} (${team.aliveCount}/${team.agentCount})`;

        return (
          <text
            key={team.name}
            content={label}
            fg={isSelected ? "#c0caf5" : "#a9b1d6"}
          />
        );
      })}
    </box>
  );
}
