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
    # model: sonnet
    # color: blue
    # cwd: ~/repos/my-project
    # extraArgs: ["--verbose"]

  # - name: agent-2
  #   agentType: general-purpose
  #   prompt: |
  #     Another agent's role description.
  #   model: opus
  #   color: red
`;
}
