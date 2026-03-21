# crew

CLI tool for managing [Claude Code](https://claude.ai/code) agent teams from the terminal.

<!-- TODO: add screenshot/GIF of TUI dashboard here -->

## Quick Start

```bash
# Install
git clone git@github.com:jodli/crew-code.git
cd crew-code && bun install

# Create a team and spawn agents
crew create --name my-team
crew spawn --team my-team --name coder
crew spawn --team my-team --name reviewer --model claude-sonnet-4-6

# Send a message, read responses
crew send --team my-team --agent coder --message "Implement the auth module"
crew messages --team my-team --watch

# Or use the interactive dashboard
crew tui
```

## Requirements

- [Bun](https://bun.sh) runtime
- [Claude Code](https://claude.ai/code) CLI installed

## Install

```bash
git clone git@github.com:jodli/crew-code.git
cd crew-code
bun install
bun run build   # outputs standalone binary to dist/crew
```

Or run directly: `bun run src/main.ts <command>`

## Usage

```bash
# Check what's running
crew status --team my-team

# Re-attach to an agent after terminal restart
crew attach --team my-team --name coder

# Forward args to the underlying Claude process (persisted per agent)
crew spawn --team my-team --name coder -- --dangerously-skip-permissions

# Save a team as a reusable blueprint, deploy later
crew blueprint save --team my-team
crew blueprint load review-team

# Start the REST/SSE API
crew serve

# Diagnose and auto-fix stale state
crew doctor --fix
```

Use `crew --help` and `crew <command> --help` for all available options.

## TUI

`crew tui` launches a dashboard with live agent status. Auto-detects tmux (opens panes) or standalone terminals (ghostty, alacritty). Override with `--backend tmux|terminal`.

Keybindings: `n` create, `s` spawn, `a` attach, `i` inbox, `m` message, `x` kill, `r` remove, `d` destroy, `?` help, `Tab` switch panels, `q` quit.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | Set to `1` to enable agent teams (required) |
| `CREW_TEAMS_DIR` | Override default teams directory (`~/.claude/teams/`) |
| `CREW_DEBUG` | Set to `1` to enable debug logging to stderr |

## Development

```bash
bun test
bun run typecheck
bun run lint
CREW_DEBUG=1 crew status   # verbose output for debugging
```

## License

MIT
