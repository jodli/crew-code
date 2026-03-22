const helpText = [
  "Keyboard Shortcuts",
  "",
  "Navigation",
  "  j / Down    Move down",
  "  k / Up      Move up",
  "  Tab         Switch panel",
  "  Enter / l   Focus agents panel",
  "  h           Focus teams panel",
  "",
  "Teams Panel",
  "  n           Create team",
  "  b           Load blueprint",
  "  e           Update team description",
  "  d           Remove team",
  "",
  "Agents Panel",
  "  n           Create agent",
  "  a / Enter   Attach to agent",
  "  e           Update agent properties",
  "  x           Kill agent",
  "  r           Remove agent",
  "  i           Open inbox",
  "  m           Send message",
  "",
  "General",
  "  ?           Toggle this help",
  "  q           Quit",
  "  Esc         Close overlay / cancel",
].join("\n");

export function HelpOverlay() {
  return (
    <box
      position="absolute"
      top={2}
      left={4}
      width="60%"
      height={28}
      border
      borderStyle="rounded"
      borderColor="#7aa2f7"
      title=" Help "
      backgroundColor="#1a1b26"
      padding={1}
      zIndex={10}
    >
      <text content={helpText} fg="#a9b1d6" />
    </box>
  );
}
