export function generateSkeleton(name: string): string {
  return `# crew blueprint: ${name}
# Load with: crew blueprint load ${name}

name: ${name}
description: ""

agents:
  - name: team-lead
    agentType: team-lead

  - name: agent-1
    agentType: general-purpose
    prompt: |
      Describe this agent's role in the team.
      The agent will wait for instructions after receiving this prompt.
    # model: claude-sonnet-4-6
    # color: blue
    # cwd: ~/repos/my-project
    # extraArgs: ["--verbose"]

  # - name: agent-2
  #   agentType: general-purpose
  #   prompt: |
  #     Another agent's role description.
  #   model: claude-opus-4-6
  #   color: red
`;
}
