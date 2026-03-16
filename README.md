# crew

CLI tool for managing [Claude Code](https://claude.ai/code) agent teams.

Wraps the experimental file-based agent teams protocol to let you create teams of Claude Code agents, spawn agents into them, send messages, and monitor status — all from the terminal. Includes an interactive TUI dashboard.

## Requirements

- [Bun](https://bun.sh) runtime
- [Claude Code](https://claude.ai/code) CLI installed
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` environment variable

## Install

```bash
git clone git@github.com:jodli/crew-code.git
cd crew-code
bun install

# Build a standalone binary to ~/.local/bin/crew
bun run build
```

Or run directly: `bun run src/main.ts <command>`

## Commands

| Command   | Description                              |
| --------- | ---------------------------------------- |
| `create`  | Create a new agent team                  |
| `spawn`   | Spawn an agent into an existing team     |
| `attach`  | Re-attach to an agent session            |
| `status`  | Show team and agent status               |
| `send`    | Send a message to an agent               |
| `inbox`   | View an agent's inbox                    |
| `remove`  | Remove a single agent from a team        |
| `destroy` | Tear down a team and its agents          |
| `doctor`  | Diagnose and fix common issues           |
| `tui`     | Launch interactive terminal dashboard    |

Use `crew <command> --help` for all available options.

## Usage

```bash
# Create a team (launches you as team-lead)
crew create --name my-team

# Spawn agents
crew spawn --team my-team --name coder --task "Implement the auth module"
crew spawn --team my-team --name reviewer --model claude-sonnet-4-6

# Check status
crew status
crew status --team my-team

# Send messages and view inbox
crew send --team my-team --agent coder --message "Focus on the login flow first"
crew inbox --team my-team --agent coder --unread

# Re-attach to a session after terminal restart
crew attach --team my-team --name coder

# Remove a single agent or destroy the whole team
crew remove --team my-team --name coder
crew destroy --team my-team

# Diagnose issues and auto-fix stale state
crew doctor --fix
```

## Passing extra args to Claude CLI

Use `--` to forward arguments to the underlying Claude process. Args are persisted per agent and restored on `attach`.

```bash
crew spawn --team my-team --name coder -- --dangerously-skip-permissions
crew attach --team my-team -- --verbose   # overrides stored args
```

## Interactive TUI

`crew tui` launches a two-panel dashboard (teams + agents) with live status polling every 2 seconds.

The TUI auto-detects the launcher backend: inside tmux it opens new tmux windows, otherwise it opens new terminal windows (ghostty, alacritty, or xdg-terminal-exec). Override with `--backend tmux|terminal`.

Key bindings: `n` new team, `s` spawn, `a` attach, `i` inbox, `m` message, `x` kill, `r` remove, `d` destroy, `?` help, `Tab` switch panels, `j/k` navigate, `q` quit.

## Development

```bash
bun test
bun run start -- <command> [options]
```

## License

MIT
