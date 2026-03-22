# Changelog

## [0.1.1](https://github.com/jodli/crew-code/compare/crew-v0.1.0...crew-v0.1.1) (2026-03-22)


### Features

* add release pipeline, changelog, and install script ([3274e40](https://github.com/jodli/crew-code/commit/3274e401e2388ddd2ff8dd7ddcd702bb043701d4))

## [0.1.0](https://github.com/jodli/crew-code/releases/tag/v0.1.0) (2026-03-22)

Initial release.

### Features

* CLI with `crew team` / `crew agent` / `crew blueprint` subcommand groups
* Agent lifecycle: create → start → stop → remove with separated scaffolding and launching
* Headless agent launch via detached tmux session (`--headless`)
* Process registry with self-healing, launch mode tracking, and double-start prevention
* TUI dashboard with two-panel layout, live status, keyboard-driven workflow
* TUI launcher backends: tmux (panes) or standalone terminals (ghostty, alacritty)
* REST/SSE API server (`crew serve`) with full CRUD for teams, agents, blueprints
* SSE streams for team status and crew channel updates
* Health endpoint (`GET /api/health`) with version and uptime
* `PORT`/`HOST` env var support and graceful shutdown for API server
* Blueprints: YAML-based team templates with create, export, load, update
* Crew channel: agent-to-crew messaging via inbox protocol with `--watch` mode
* Passthrough args (`--`) forwarded to Claude CLI process
* Doctor command with auto-fix for stale state and orphaned inboxes
* Debug logging infrastructure via `CREW_DEBUG=1`
* Portable standalone binary via `bun build --compile`

### Bug Fixes

* Concurrency fixes for file-based config and inbox stores
* Input validation and signal handling with partial-failure rollback
* Stale session detection in start and doctor commands
* Dev mode binary path detection for TUI launcher commands
