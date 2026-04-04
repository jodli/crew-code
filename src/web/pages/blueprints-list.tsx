import type { Blueprint } from "@crew/config/blueprint-schema.ts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { stringify } from "yaml";
import { DeployDialog } from "../components/blueprint/deploy-dialog.tsx";
import { Dropdown } from "../components/shared/dropdown.tsx";
import { ErrorBanner } from "../components/shared/error-banner.tsx";
import { PageSkeleton } from "../components/shared/skeleton.tsx";
import { useToast } from "../components/shared/toast.tsx";
import { createBlueprint, deleteBlueprint, getBlueprints } from "../lib/api-client.ts";

export function BlueprintsListPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [deployTarget, setDeployTarget] = useState<Blueprint | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: blueprints,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["blueprints"],
    queryFn: getBlueprints,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBlueprint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blueprints"] });
      toast("success", "Blueprint deleted");
    },
    onError: (err) => toast("error", err instanceof Error ? err.message : "Delete failed"),
  });

  const duplicateMutation = useMutation({
    mutationFn: (bp: Blueprint) => createBlueprint({ ...bp, name: `${bp.name}-copy` }),
    onSuccess: (_, bp) => {
      queryClient.invalidateQueries({ queryKey: ["blueprints"] });
      toast("success", `Duplicated "${bp.name}"`);
      navigate(`/blueprints/${bp.name}-copy`);
    },
    onError: (err) => toast("error", err instanceof Error ? err.message : "Duplicate failed"),
  });

  if (isLoading) return <PageSkeleton />;

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <ErrorBanner message={error instanceof Error ? error.message : "Failed to load blueprints"} />
      </div>
    );
  }

  const data = blueprints ?? [];
  const filtered = data.filter(
    (bp) =>
      bp.name.toLowerCase().includes(search.toLowerCase()) ||
      bp.description?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleExportYaml = (bp: Blueprint) => {
    const yaml = stringify({ name: bp.name, description: bp.description, agents: bp.agents }, { lineWidth: 100 });
    navigator.clipboard.writeText(yaml).then(
      () => toast("success", `Copied ${bp.name}.yaml to clipboard`),
      () => toast("error", "Failed to copy to clipboard"),
    );
  };

  const handleDuplicate = (bp: Blueprint) => {
    duplicateMutation.mutate(bp);
  };

  const handleDelete = (bp: Blueprint) => {
    deleteMutation.mutate(bp.name);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.04em] text-text">Blueprints</h1>
          <p className="text-sm text-text-muted mt-1">
            {filtered.length} template{filtered.length !== 1 ? "s" : ""} available
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/blueprints/new")}
          className="h-9 px-4 text-sm font-medium text-bg bg-accent rounded-md hover:bg-accent-hover active:scale-[0.98] transition-all duration-150"
        >
          New blueprint
        </button>
      </div>

      {data.length > 3 && (
        <input
          type="text"
          placeholder="Filter blueprints..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 px-3 mb-6 text-sm bg-bg-surface border border-border rounded-md text-text placeholder:text-text-muted/50 focus:outline-none focus:border-border-focus transition-colors"
        />
      )}

      <div className="space-y-3">
        {filtered.map((bp) => (
          <BlueprintCard
            key={bp.name}
            blueprint={bp}
            onEdit={() => navigate(`/blueprints/${bp.name}`)}
            onDeploy={() => setDeployTarget(bp)}
            onExport={() => handleExportYaml(bp)}
            onDuplicate={() => handleDuplicate(bp)}
            onDelete={() => handleDelete(bp)}
          />
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-16">
          {search ? (
            <p className="text-text-muted">Nothing matches "{search}".</p>
          ) : (
            <div>
              <p className="text-text-muted mb-4">No blueprints yet.</p>
              <button
                type="button"
                onClick={() => navigate("/blueprints/new")}
                className="h-9 px-4 text-sm font-medium text-bg bg-accent rounded-md hover:bg-accent-hover transition-colors"
              >
                Create your first blueprint
              </button>
            </div>
          )}
        </div>
      )}

      {deployTarget && <DeployDialog blueprint={deployTarget} onClose={() => setDeployTarget(null)} />}
    </div>
  );
}

function BlueprintCard({
  blueprint: bp,
  onEdit,
  onDeploy,
  onExport,
  onDuplicate,
  onDelete,
}: {
  blueprint: Blueprint;
  onEdit: () => void;
  onDeploy: () => void;
  onExport: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="group bg-bg-surface border border-border rounded-lg hover:border-border-focus/30 transition-colors duration-150 relative">
      <button type="button" onClick={onEdit} className="w-full text-left p-4 cursor-pointer">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="min-w-0">
            <h3 className="text-base font-semibold tracking-[-0.02em] text-text font-mono truncate">{bp.name}</h3>
            {bp.description && <p className="text-sm text-text-secondary mt-0.5 line-clamp-1">{bp.description}</p>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {bp.agents.map((agent) => (
            <div
              key={agent.name}
              className="inline-flex items-center gap-1.5 text-xs text-text-muted bg-bg/60 px-2 py-1 rounded"
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: agent.color || "#3b3f52" }} />
              <span className="font-mono">{agent.name}</span>
              {agent.model && <span className="text-text-muted/60">{agent.model}</span>}
              {agent.agentType === "team-lead" && <span className="text-warning/50 text-[10px]">&#9733;</span>}
            </div>
          ))}
        </div>
      </button>

      {/* Actions — positioned over the card, outside the main button */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-100 shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDeploy();
          }}
          className="h-8 px-3 text-sm font-medium text-bg bg-accent rounded-md hover:bg-accent-hover active:scale-[0.98] transition-all duration-150"
        >
          Deploy
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="h-8 px-3 text-sm text-text-muted rounded-md hover:text-text-secondary hover:bg-bg-hover transition-colors duration-100"
        >
          Edit
        </button>
        <Dropdown
          trigger={
            <button
              type="button"
              className="h-8 w-8 flex items-center justify-center text-text-muted rounded-md hover:text-text-secondary hover:bg-bg-hover transition-colors"
            >
              &#8943;
            </button>
          }
          items={[
            { label: "Duplicate", onSelect: onDuplicate },
            { label: "Export YAML", onSelect: onExport },
            {
              label: confirmDelete ? "Confirm delete" : "Delete",
              danger: true,
              onSelect: () => {
                if (confirmDelete) {
                  onDelete();
                  setConfirmDelete(false);
                } else {
                  setConfirmDelete(true);
                  setTimeout(() => setConfirmDelete(false), 3000);
                }
              },
            },
          ]}
        />
      </div>
    </div>
  );
}
