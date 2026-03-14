# crew

CLI tool for managing [Claude Code](https://claude.ai/code) agent teams.

Wraps the experimental file-based agent teams protocol to let you create teams of Claude Code agents, spawn agents into them, send messages, and monitor status — all from the terminal.

## Requirements

- [Bun](https://bun.sh) runtime
- [Claude Code](https://claude.ai/code) CLI installed
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` environment variable

## Install

```bash
# Clone and install dependencies
git clone git@github.com:jodli/crew-code.git
cd crew-code
bun install

# Build a standalone binary to ~/.local/bin/crew
bun run build
```

Or run directly without building:

```bash
bun run src/main.ts <command>
```

## Commands

| Command   | Description                              |
| --------- | ---------------------------------------- |
| `create`  | Create a new agent team                  |
| `spawn`   | Spawn an agent into an existing team     |
| `attach`  | Re-attach to an agent session            |
| `status`  | Show team and agent status               |
| `send`    | Send a message to an agent               |
| `inbox`   | View an agent's inbox                    |
| `destroy` | Tear down a team and its agents          |
| `doctor`  | Diagnose common setup issues             |

## Usage

```bash
# Create a team (launches you as team-lead)
crew create --name my-team

# Spawn an agent into an existing team
crew spawn --team my-team --name coder --task "Implement the auth module"

# Check status
crew status

# Send a message to an agent
crew send --team my-team --agent coder --message "Focus on the login flow first"

# Re-attach to a previous session after a terminal restart
crew attach --team my-team

# Clean up
crew destroy --team my-team
```

## Development

```bash
# Run tests
bun test

# Run directly
bun run start -- <command> [options]
```

## License

MIT
