# crew

CLI tool for managing [Claude Code](https://claude.ai/code) agent teams.

Wraps the experimental file-based agent teams protocol to let you create teams of Claude Code agents, spawn agents into them, send messages, and monitor status — all from the terminal.

## Requirements

- [Bun](https://bun.sh) runtime
- [Claude Code](https://claude.ai/code) CLI installed
- [tmux](https://github.com/tmux/tmux) for agent session management
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
| `attach`  | Attach to a running agent session        |
| `status`  | Show team and agent status               |
| `send`    | Send a message to an agent               |
| `inbox`   | View an agent's inbox                    |
| `destroy` | Tear down a team and its agents          |
| `doctor`  | Diagnose common setup issues             |

## Usage

```bash
# Create a team with agents
crew create --name my-team --agents "planner,coder,reviewer"

# Spawn a single agent into an existing team
crew spawn --name my-team --agent coder --task "Implement the auth module"

# Check status
crew status --name my-team

# Send a message to an agent
crew send --name my-team --to coder --message "Focus on the login flow first"

# Attach to an agent's tmux session
crew attach --name my-team --agent coder

# Clean up
crew destroy --name my-team
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
