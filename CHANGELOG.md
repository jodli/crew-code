# Changelog

## [0.2.0](https://github.com/jodli/crew-code/compare/v0.1.6...v0.2.0) (2026-04-09)


### Features

* add DELETE /api/blueprints/:name endpoint ([71199ea](https://github.com/jodli/crew-code/commit/71199ea4ceeaf31860cb61a583e277645d77f2dd))
* add GET /api/agent-types and GET /api/models endpoints ([4efbc0d](https://github.com/jodli/crew-code/commit/4efbc0d3e7b2812b3b1a684a65626cfa2ae1945d))
* add TUI team start and API team start endpoint ([8c407b7](https://github.com/jodli/crew-code/commit/8c407b7c9bee9634e9c72e435c25370ad5b0e166))
* enrich GET /api/blueprints to return full Blueprint details ([3887a1e](https://github.com/jodli/crew-code/commit/3887a1eb9da19da42b0545b428d4aa57b43840d5))
* team-level tmux sessions and crew team start command ([fcbff3c](https://github.com/jodli/crew-code/commit/fcbff3c5519c2c6c6a8d0d4aecb14f9b703cd1ac))
* **web:** add crew card quick actions ([96c9ca8](https://github.com/jodli/crew-code/commit/96c9ca8ef730576ad31f4c346f94a6abba8b3385))
* **web:** add React Query provider with smoke test ([eb1d7fb](https://github.com/jodli/crew-code/commit/eb1d7fb206288f74072f79142fd9d053fa18af3b))
* **web:** add SSE event source hook ([bec3cf5](https://github.com/jodli/crew-code/commit/bec3cf5942ca1928459818b06e669ce8afd393d6))
* **web:** add typed API client with tests ([1ec3545](https://github.com/jodli/crew-code/commit/1ec35451ec1db2d9404ebece8f6ea236fdd2f077))
* **web:** finalize prototype-to-production conversion ([1d820ee](https://github.com/jodli/crew-code/commit/1d820eec8fdd5a9cc3ca451d4c760a8d62f39031))
* **web:** replace polling with SSE and add auto-scroll ([edc2f00](https://github.com/jodli/crew-code/commit/edc2f00efc3f575520dba9b631b9f0f754b9255f))
* **web:** wire blueprint delete, duplicate, and export actions ([b0ebe2a](https://github.com/jodli/crew-code/commit/b0ebe2aafde9080d67aebe00148eb5f7f6241138))
* **web:** wire blueprint editor with react-hook-form and API ([7c9e6e8](https://github.com/jodli/crew-code/commit/7c9e6e80de6af0f6fb346b48c24a0c151771fc4d))
* **web:** wire blueprints list to API with loading and error states ([5e04cb2](https://github.com/jodli/crew-code/commit/5e04cb21810c40d9cfd605d7d9a582597fe33231))
* **web:** wire connection health indicator to real API ([8417d4b](https://github.com/jodli/crew-code/commit/8417d4be9d86e316fab06e4a8ce8f02aad923316))
* **web:** wire crew detail mutations to API ([8aee813](https://github.com/jodli/crew-code/commit/8aee8133ac9f2821edcc6b0ffe5a1fddaa469a72))
* **web:** wire crew detail with API and real-time data ([2ed91c5](https://github.com/jodli/crew-code/commit/2ed91c5f10a736b8287f16bdddbabcdc11a871f7))
* **web:** wire crews list to API with status calculation ([0e38115](https://github.com/jodli/crew-code/commit/0e381153cf60ff8429f7c53c8133656701f5be9b))
* **web:** wire deploy dialog with API ([2ae101b](https://github.com/jodli/crew-code/commit/2ae101bc762d5bb3eb8874026ae4086b6d3ba936))


### Bug Fixes

* add crew-messages SSE event to team stream ([5b5a3ac](https://github.com/jodli/crew-code/commit/5b5a3ac7b94943aa6e0c09eefb92b2544dec90d9))
* address bugs found during manual testing ([04e4d2a](https://github.com/jodli/crew-code/commit/04e4d2af3250bb8a1f2d9d80778bf3c459d2a848))
* linter errors after prototype code changes ([e5f2353](https://github.com/jodli/crew-code/commit/e5f2353ad8fa18f0d5148a5c9df9549ae5a961bd))
* linter errors after prototype code changes ([d30cfef](https://github.com/jodli/crew-code/commit/d30cfef04b54cefc16e39ee445b880ee6c396509))
* separate web and backend typecheck configs ([8914e98](https://github.com/jodli/crew-code/commit/8914e98fc0fbba2742382207317620e07135c150))
* show full error details in TUI team start toast ([9720646](https://github.com/jodli/crew-code/commit/972064687b99498170f15847db397e6bff7405c5))
* use correct tmux target formats for session/pane/window commands ([716903f](https://github.com/jodli/crew-code/commit/716903f851759a2e70ee248e9e771308a110c2d4))
* use exact match for tmux session targeting ([2c0dd74](https://github.com/jodli/crew-code/commit/2c0dd745df5dfc9f456b578b043ba7e45df12017))
* watch process registry for team running-count updates in TUI ([0a57235](https://github.com/jodli/crew-code/commit/0a57235694e63eda4c6baf8a0d2a4725cc76e523))
* **web:** add vite/client types for import.meta.env ([0adeaa0](https://github.com/jodli/crew-code/commit/0adeaa02a60040d6bc496fe2d6314aedc4e0ad80))
* **web:** enable SSE streaming through Vite proxy ([3886ef6](https://github.com/jodli/crew-code/commit/3886ef66013112305a3409b5d5dc9131cccd103d))
* **web:** use direct EventSource with addEventListener for SSE ([f11c39a](https://github.com/jodli/crew-code/commit/f11c39aaa10aef5b8939ce1580188d555dc6a271))
* **web:** use named SSE event listeners for crew messages ([337daf0](https://github.com/jodli/crew-code/commit/337daf03d173168595a84e9e51bd52a38a008bc1))
* **web:** use single team-update SSE stream for all live data ([1f2c1e0](https://github.com/jodli/crew-code/commit/1f2c1e043fbae0c933ae3cb793805a40e27ef7de))


### Miscellaneous

* release 0.2.0 ([79b39ee](https://github.com/jodli/crew-code/commit/79b39ee2ef2f0d16adf28f2bec916955afabdc00))

## [0.1.6](https://github.com/jodli/crew-code/compare/v0.1.5...v0.1.6) (2026-03-29)


### Features

* dynamic agent type discovery and model picker ([aa0eee7](https://github.com/jodli/crew-code/commit/aa0eee75cbebcac3928daa2d55e35c24bc54beac))


### Bug Fixes

* expand tilde in cwd before spawning agent processes ([c995140](https://github.com/jodli/crew-code/commit/c995140116bfdd4e149153661a423e050d3d5ee0))
* restore per-agent cwd support in blueprints and create-agent ([2f162f8](https://github.com/jodli/crew-code/commit/2f162f8c59359d5c060f4e7b042c40e81b6d6bf8))
* sort imports in expand-home test ([eee533e](https://github.com/jodli/crew-code/commit/eee533e58ba20436a4888570a4eeeae85aef11f5))

## [0.1.5](https://github.com/jodli/crew-code/compare/v0.1.4...v0.1.5) (2026-03-22)


### Bug Fixes

* remove arm64 target from CD (same optionalDeps issue) ([fe0327c](https://github.com/jodli/crew-code/commit/fe0327c84ef45049f78d4661fe1152a38d0ac0ca))

## [0.1.4](https://github.com/jodli/crew-code/compare/v0.1.3...v0.1.4) (2026-03-22)


### Bug Fixes

* remove darwin targets from CD build matrix ([f3c46ca](https://github.com/jodli/crew-code/commit/f3c46ca019e0be8d6a272f2f8de5a78b85610e72))


### Performance

* reduce file-watcher test timeouts from 6s to 500ms ([5a75286](https://github.com/jodli/crew-code/commit/5a7528642d042e5c60994cdbba2e94939fce778f))

## [0.1.3](https://github.com/jodli/crew-code/compare/v0.1.2...v0.1.3) (2026-03-22)


### Bug Fixes

* add --format=esm to bytecode build for TLA compatibility ([04dfbd1](https://github.com/jodli/crew-code/commit/04dfbd15a7815599032432e8722f0c769f1c98be))
* combine release-please and CD into single workflow ([b9a68e8](https://github.com/jodli/crew-code/commit/b9a68e85b266d12ba97479668b5cab7173af5b09))

## [0.1.2](https://github.com/jodli/crew-code/compare/v0.1.1...v0.1.2) (2026-03-22)


### Bug Fixes

* add --format=esm to bytecode build for TLA compatibility ([04dfbd1](https://github.com/jodli/crew-code/commit/04dfbd15a7815599032432e8722f0c769f1c98be))

## [0.1.1](https://github.com/jodli/crew-code/compare/v0.1.0...v0.1.1) (2026-03-22)


### Bug Fixes

* combine release-please and CD into single workflow ([b9a68e8](https://github.com/jodli/crew-code/commit/b9a68e85b266d12ba97479668b5cab7173af5b09))

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
