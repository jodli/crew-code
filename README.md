# crew

CLI tool for managing [Claude Code](https://claude.ai/code) agent teams from the terminal.

<!-- TODO: add screenshot/GIF of TUI dashboard here -->

## Quick Start

```bash
# Install
curl -fsSL https://raw.githubusercontent.com/jodli/crew-code/main/install.sh | bash

# Create a team and agents
crew team create my-team
crew agent create my-team --name coder --agent-type team-lead
crew agent create my-team --name reviewer --model claude-sonnet-4-6

# Start agents
crew agent start my-team --name coder
crew agent start my-team --name reviewer --headless

# Send a message, read responses
crew agent send my-team --name coder --message "Implement the auth module"
crew team messages my-team --watch

# Or use the interactive dashboard
crew tui
```

## Requirements

- [Claude Code](https://claude.ai/code) CLI installed
- Linux or macOS (Windows is not supported)
- [tmux](https://github.com/tmux/tmux) for headless mode (`--headless`) and TUI tmux backend

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/jodli/crew-code/main/install.sh | bash
```

Or build from source ([Bun](https://bun.sh) required):

```bash
git clone git@github.com:jodli/crew-code.git
cd crew-code
bun install
bun run build   # outputs standalone binary to dist/crew
```

## Usage

```bash
# Check what's running
crew team list
crew agent list my-team

# Start an agent interactively
crew agent start my-team --name coder

# Start an agent in the background (tmux)
crew agent start my-team --name coder --headless

# Forward args to the underlying Claude process (persisted per agent)
crew agent create my-team --name coder -- --dangerously-skip-permissions

# Save a team as a reusable blueprint, deploy later
crew blueprint export my-team
crew blueprint load review-team

# Start the REST/SSE API
crew serve

# Diagnose and auto-fix stale state
crew doctor --fix
```

Use `crew --help` and `crew <command> --help` for all available options.

## TUI

`crew tui` launches a dashboard with live agent status. Auto-detects tmux (opens panes) or standalone terminals (ghostty, alacritty). Override with `--backend tmux|terminal`.

Keybindings: `n` create, `a` start, `i` inbox, `m` send, `x` stop, `r` remove, `d` remove team, `b` blueprint, `?` help, `Tab` switch panels, `q` quit.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | Set to `1` to enable agent teams (required) |
| `CREW_TEAMS_DIR` | Override default teams directory (`~/.claude/teams/`) |
| `CREW_DEBUG` | Set to `1` to enable debug logging to stderr |
| `PORT` | Port for `crew serve` (default: 3117) |
| `HOST` | Host for `crew serve` (default: localhost) |

## Development

```bash
bun install
bun test
bun run typecheck
bun run lint
CREW_DEBUG=1 bun run src/main.ts team list   # verbose output for debugging
```

## License

MIT
