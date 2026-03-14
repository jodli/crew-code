const helpText = [
  "Keyboard Shortcuts",
  "",
  "Navigation",
  "  j / Down    Move down",
  "  k / Up      Move up",
  "",
  "Actions",
  "  n           New team (coming soon)",
  "  d           Destroy team (coming soon)",
  "",
  "General",
  "  ?           Toggle this help",
  "  q           Quit",
  "  Esc         Close overlay",
].join("\n");

export function HelpOverlay() {
  return (
    <box
      position="absolute"
      top={2}
      left={4}
      width="60%"
      height={18}
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
