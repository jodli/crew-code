import type { Blueprint } from "@crew/config/blueprint-schema.ts";
import { useState } from "react";

type DeployState = "idle" | "deploying" | "success";

export function DeployDialog({ blueprint, onClose }: { blueprint: Blueprint; onClose: () => void }) {
  const [teamName, setTeamName] = useState(blueprint.name);
  const [state, setState] = useState<DeployState>("idle");
  const [logs, setLogs] = useState<string[]>([]);

  const handleDeploy = (start: boolean) => {
    setState("deploying");
    setLogs([]);

    const steps = [
      `Creating team "${teamName}"`,
      ...blueprint.agents.map((a) => `Adding agent "${a.name}"`),
      ...(start ? [`Starting ${blueprint.agents.length} agents`] : []),
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setLogs((prev) => [...prev, steps[i]]);
        i++;
      } else {
        clearInterval(interval);
        setState("success");
      }
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        aria-label="Close dialog"
      />
      <div className="relative w-[480px] bg-bg-surface border border-border rounded-lg shadow-[0_24px_64px_rgba(0,0,0,0.5)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-text">Deploy blueprint</h2>
            <p className="text-sm text-text-muted mt-0.5 font-mono">{blueprint.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text transition-colors text-lg leading-none"
          >
            &#10005;
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {state === "idle" && (
            <div className="space-y-4">
              <div>
                <label htmlFor="deploy-team-name" className="block text-xs font-medium text-text-muted mb-1.5">
                  Team name
                </label>
                <input
                  id="deploy-team-name"
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full h-9 px-3 text-sm font-mono bg-bg-elevated border border-border rounded-md text-text focus:outline-none focus:border-border-focus transition-colors"
                />
              </div>

              <fieldset>
                <legend className="text-xs font-medium text-text-muted mb-2">Agents ({blueprint.agents.length})</legend>
                <div className="space-y-1">
                  {blueprint.agents.map((agent) => (
                    <label
                      key={agent.name}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-bg-hover cursor-pointer transition-colors"
                    >
                      <input type="checkbox" defaultChecked className="accent-accent" />
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: agent.color || "#3b3f52" }}
                      />
                      <span className="text-sm font-mono text-text">{agent.name}</span>
                      <span className="text-xs text-text-muted">{agent.agentType}</span>
                      {agent.model && <span className="ml-auto text-xs font-mono text-text-muted">{agent.model}</span>}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {(state === "deploying" || state === "success") && (
            <div className="space-y-1 font-mono text-sm">
              {logs.map((log) => (
                <div key={log} className="flex items-center gap-2 text-text-secondary py-0.5">
                  <span className="text-success/70">&#10003;</span>
                  {log}
                </div>
              ))}
              {state === "deploying" && <div className="text-text-muted animate-pulse py-0.5">...</div>}
              {state === "success" && (
                <div className="mt-4 px-4 py-3 rounded-md bg-success/8 border border-success/15 text-sm text-success/90">
                  Team "{teamName}" ready.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
          {state === "idle" && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="h-8 px-4 text-sm text-text-muted rounded-md hover:bg-bg-hover transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeploy(false)}
                className="h-8 px-4 text-sm font-medium text-text-secondary border border-border rounded-md hover:bg-bg-hover transition-colors"
              >
                Deploy only
              </button>
              <button
                type="button"
                onClick={() => handleDeploy(true)}
                className="h-8 px-4 text-sm font-medium text-bg bg-accent rounded-md hover:bg-accent-hover active:scale-[0.98] transition-all duration-150"
              >
                Deploy + Start
              </button>
            </>
          )}
          {state === "deploying" && <span className="text-sm text-text-muted">Deploying...</span>}
          {state === "success" && (
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-4 text-sm font-medium text-bg bg-accent rounded-md hover:bg-accent-hover transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
