export type CrewError =
  | { kind: "team_not_found"; team: string }
  | { kind: "agent_already_exists"; agent: string; team: string }
  | { kind: "config_corrupt"; team: string; detail: string }
  | { kind: "config_not_found"; path: string }
  | { kind: "file_read_failed"; path: string; detail: string }
  | { kind: "file_write_failed"; path: string; detail: string }
  | { kind: "lock_failed"; path: string; detail: string }
  | { kind: "json_parse_failed"; path: string; detail: string }
  | { kind: "schema_validation_failed"; path: string; detail: string }
  | { kind: "claude_not_installed" }
  | { kind: "launch_failed"; detail: string }
  | { kind: "preflight_failed"; detail: string }
  | { kind: "spawn_failed"; detail: string }
  | { kind: "team_already_exists"; team: string }
  | { kind: "agent_not_found"; agent: string; team: string }
  | { kind: "no_session_id"; agent: string; team: string }
  | { kind: "lead_already_exists"; team: string }
  | { kind: "stale_session"; agent: string; team: string }
  | { kind: "blueprint_not_found"; name: string }
  | { kind: "blueprint_invalid"; name: string; detail: string }
  | { kind: "blueprint_already_exists"; name: string }
  | { kind: "invalid_name"; name: string; label: string }
  | { kind: "tmux_not_found" };
