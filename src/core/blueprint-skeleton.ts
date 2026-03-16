export function generateSkeleton(name: string): string {
  return `# crew blueprint: ${name}
# Load with: crew blueprint load ${name}

name: ${name}
description: ""

agents:
  - name: agent-1
    systemPrompt: |
      Describe this agent's role in the team.
      The agent will wait for instructions after receiving this prompt.
    # model: claude-sonnet-4-6
    # color: blue
    # extraArgs: ["--verbose"]

  # - name: agent-2
  #   systemPrompt: |
  #     Another agent's role description.
  #   model: claude-opus-4-6
  #   color: red
`;
}
