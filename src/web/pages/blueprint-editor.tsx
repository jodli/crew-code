import { type Blueprint, type BlueprintAgent, BlueprintSchema } from "@crew/config/blueprint-schema.ts";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useLocation, useParams } from "wouter";
import { parse, stringify } from "yaml";
import { z } from "zod";
import { DeployDialog } from "../components/blueprint/deploy-dialog.tsx";
import { ErrorBanner } from "../components/shared/error-banner.tsx";
import { PageSkeleton } from "../components/shared/skeleton.tsx";
import { useToast } from "../components/shared/toast.tsx";
import { createBlueprint, getAgentTypes, getBlueprint, getModels, updateBlueprint } from "../lib/api-client.ts";

/** Stricter schema for the editor form — requires non-empty name. */
const EditorSchema = BlueprintSchema.extend({
  name: z.string().min(1, "Blueprint name is required"),
});

type ViewMode = "form" | "yaml";

function emptyAgent(n: number): BlueprintAgent {
  return { name: `agent-${n}`, agentType: "general-purpose", prompt: "" };
}

function emptyBlueprint(): Blueprint {
  return { name: "", description: "", agents: [{ name: "team-lead", agentType: "team-lead" }] };
}

function blueprintToYaml(bp: Blueprint): string {
  const clean = {
    name: bp.name,
    ...(bp.description ? { description: bp.description } : {}),
    agents: bp.agents.map((a) => {
      const o: Record<string, unknown> = { name: a.name };
      if (a.agentType) o.agentType = a.agentType;
      if (a.model) o.model = a.model;
      if (a.color) o.color = a.color;
      if (a.cwd) o.cwd = a.cwd;
      if (a.prompt) o.prompt = a.prompt;
      if (a.extraArgs?.length) o.extraArgs = a.extraArgs;
      return o;
    }),
  };
  return stringify(clean, { lineWidth: 100 });
}

export function BlueprintEditorPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ name: string }>();
  const isNew = !params.name;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // --- Data fetching ---
  const blueprintQuery = useQuery({
    queryKey: ["blueprints", params.name],
    queryFn: () => getBlueprint(params.name!),
    enabled: !isNew,
  });

  const agentTypesQuery = useQuery({
    queryKey: ["agent-types"],
    queryFn: getAgentTypes,
  });

  const modelsQuery = useQuery({
    queryKey: ["models"],
    queryFn: getModels,
  });

  // --- Form ---
  const form = useForm<Blueprint>({
    resolver: zodResolver(EditorSchema),
    defaultValues: isNew ? emptyBlueprint() : undefined,
    values: blueprintQuery.data ?? undefined,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "agents",
  });

  const [selected, setSelected] = useState(0);
  const [mode, setMode] = useState<ViewMode>("form");
  const [yamlText, setYamlText] = useState("");
  const [yamlError, setYamlError] = useState<string | null>(null);
  const [deployOpen, setDeployOpen] = useState(false);

  const isDirty = form.formState.isDirty;
  const watchedAgents = form.watch("agents");
  const watchedName = form.watch("name");
  const agent = watchedAgents?.[selected] ?? null;

  const watchedDescription = form.watch("description");

  const currentYaml = useMemo(() => {
    if (!watchedAgents?.length) return "";
    return blueprintToYaml({ name: watchedName, description: watchedDescription, agents: watchedAgents });
  }, [watchedAgents, watchedName, watchedDescription]);

  // --- Save mutation ---
  const saveMutation = useMutation({
    mutationFn: async (data: Blueprint) => {
      if (isNew) {
        return createBlueprint(data);
      }
      return updateBlueprint(params.name!, { description: data.description, agents: data.agents });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blueprints"] });
      form.reset(form.getValues());
      toast("success", `Saved "${form.getValues("name")}"`);
    },
    onError: (err) => {
      toast("error", err instanceof Error ? err.message : "Save failed");
    },
  });

  const handleSave = form.handleSubmit(
    (data) => saveMutation.mutate(data),
    (errors) => {
      // Validation failed — show toast for first error
      if (errors.name) {
        toast("error", "Blueprint name is required");
      } else if (errors.agents) {
        const msg =
          typeof errors.agents.root?.message === "string"
            ? errors.agents.root.message
            : "At least one agent is required";
        toast("error", msg);
      }
    },
  );

  // --- Agent add/remove ---
  const addAgent = () => {
    append(emptyAgent(fields.length));
    setSelected(fields.length);
  };

  const removeAgent = (i: number) => {
    if (fields.length <= 1) return;
    remove(i);
    setSelected(Math.max(0, selected >= i ? selected - 1 : selected));
  };

  // --- YAML toggle ---
  const toYaml = () => {
    setYamlText(currentYaml);
    setYamlError(null);
    setMode("yaml");
  };

  const toForm = () => {
    if (yamlText !== currentYaml) {
      try {
        const parsed = parse(yamlText);
        if (!parsed?.name || !Array.isArray(parsed.agents) || parsed.agents.length < 1) {
          setYamlError("Needs name and at least one agent");
          return;
        }
        form.reset(parsed as Blueprint, { keepDefaultValues: true });
      } catch (e) {
        setYamlError(`Parse error: ${e instanceof Error ? e.message : "unknown"}`);
        return;
      }
    }
    setYamlError(null);
    setMode("form");
  };

  // --- Loading / error states for edit mode ---
  if (!isNew && blueprintQuery.isLoading) return <PageSkeleton />;
  if (!isNew && blueprintQuery.error) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <ErrorBanner
          message={blueprintQuery.error instanceof Error ? blueprintQuery.error.message : "Failed to load blueprint"}
        />
      </div>
    );
  }

  const agentTypes = agentTypesQuery.data ?? [];
  const models = modelsQuery.data ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Editor toolbar */}
      <div className="flex items-center gap-3 px-6 h-12 shrink-0 border-b border-border">
        <a href="/" className="text-sm text-text-muted hover:text-text transition-colors">
          Blueprints
        </a>
        <span className="text-text-muted/40">/</span>
        <span className="text-sm font-semibold tracking-[-0.02em] text-text">{isNew ? "New" : watchedName}</span>
        {isDirty && <span className="text-xs text-warning/70 font-medium">unsaved</span>}

        <div className="flex-1" />

        {/* Form / YAML toggle */}
        <div className="flex bg-bg rounded-md border border-border overflow-hidden">
          <button
            type="button"
            onClick={mode === "yaml" ? toForm : undefined}
            className={`px-3 py-1 text-sm transition-colors ${
              mode === "form" ? "bg-bg-active text-text font-medium" : "text-text-muted hover:text-text-secondary"
            }`}
          >
            Form
          </button>
          <button
            type="button"
            onClick={mode === "form" ? toYaml : undefined}
            className={`px-3 py-1 text-sm transition-colors ${
              mode === "yaml" ? "bg-bg-active text-text font-medium" : "text-text-muted hover:text-text-secondary"
            }`}
          >
            YAML
          </button>
        </div>

        <button
          type="button"
          onClick={() => handleSave()}
          disabled={saveMutation.isPending}
          className="h-8 px-4 text-sm font-medium text-text-secondary border border-border rounded-md hover:bg-bg-hover transition-colors"
        >
          {saveMutation.isPending ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setDeployOpen(true)}
          className="h-8 px-4 text-sm font-medium text-bg bg-accent rounded-md hover:bg-accent-hover active:scale-[0.98] transition-all duration-150"
        >
          Deploy
        </button>
      </div>

      {mode === "form" ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Left: agent list */}
          <div className="w-56 shrink-0 border-r border-border flex flex-col bg-bg">
            {/* Blueprint meta */}
            <div className="p-4 space-y-3 border-b border-border">
              <div>
                <label htmlFor="bp-name" className="block text-xs font-medium text-text-muted mb-1">
                  Name
                </label>
                <input
                  id="bp-name"
                  type="text"
                  {...form.register("name")}
                  placeholder="my-blueprint"
                  className="w-full h-8 px-2.5 text-sm font-mono bg-bg-surface border border-border rounded-md text-text placeholder:text-text-muted/40 focus:outline-none focus:border-border-focus transition-colors"
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-error mt-1">{form.formState.errors.name.message || "Name is required"}</p>
                )}
              </div>
              <div>
                <label htmlFor="bp-description" className="block text-xs font-medium text-text-muted mb-1">
                  Description
                </label>
                <input
                  id="bp-description"
                  type="text"
                  {...form.register("description")}
                  placeholder="Optional"
                  className="w-full h-8 px-2.5 text-sm bg-bg-surface border border-border rounded-md text-text placeholder:text-text-muted/40 focus:outline-none focus:border-border-focus transition-colors"
                />
              </div>
            </div>

            {/* Agents header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wide">Agents</span>
              <button
                type="button"
                onClick={addAgent}
                className="text-xs text-accent hover:text-accent-hover transition-colors"
              >
                + Add
              </button>
            </div>

            {/* Agent list */}
            <div className="flex-1 overflow-auto px-2 pb-2">
              {fields.map((field, i) => {
                const a = watchedAgents?.[i] ?? field;
                return (
                  <div
                    key={field.id}
                    className={`group flex items-center gap-2 rounded-md transition-colors duration-100 mb-0.5 ${
                      selected === i ? "bg-bg-active text-text" : "text-text-secondary hover:bg-bg-hover"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(i)}
                      className="flex items-center gap-2 px-2.5 py-2 min-w-0 flex-1 w-full text-left cursor-pointer"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: a.color || "#3b3f52" }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-mono truncate">{a.name || "unnamed"}</div>
                        <div className="text-xs text-text-muted truncate">{a.agentType || "general-purpose"}</div>
                      </div>
                      {a.agentType === "team-lead" && <span className="text-warning/60 text-xs shrink-0">&#9733;</span>}
                    </button>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAgent(i)}
                        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-error transition-all text-xs shrink-0 pr-2.5"
                      >
                        &#10005;
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: agent detail */}
          {agent && (
            <div className="flex-1 overflow-auto bg-bg-surface">
              <div className="max-w-2xl px-8 py-6 space-y-5">
                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.02em] text-text mb-4">
                    {agent.name || "Unnamed agent"}
                  </h2>
                </div>

                <Field label="Name" htmlFor="agent-name">
                  <input
                    id="agent-name"
                    type="text"
                    {...form.register(`agents.${selected}.name`)}
                    className="w-full h-9 px-3 text-sm font-mono bg-bg-elevated border border-border rounded-md text-text focus:outline-none focus:border-border-focus transition-colors"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Type" htmlFor="agent-type">
                    <select
                      id="agent-type"
                      {...form.register(`agents.${selected}.agentType`)}
                      className="w-full h-9 px-3 text-sm bg-bg-elevated border border-border rounded-md text-text focus:outline-none focus:border-border-focus appearance-none cursor-pointer transition-colors"
                    >
                      {agentTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Model" htmlFor="agent-model">
                    <select
                      id="agent-model"
                      value={agent.model || "(default)"}
                      onChange={(e) =>
                        form.setValue(
                          `agents.${selected}.model`,
                          e.target.value === "(default)" ? undefined : e.target.value,
                          { shouldDirty: true },
                        )
                      }
                      className="w-full h-9 px-3 text-sm bg-bg-elevated border border-border rounded-md text-text focus:outline-none focus:border-border-focus appearance-none cursor-pointer transition-colors"
                    >
                      {models.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-[120px_1fr] gap-4">
                  <Field label="Color" htmlFor="agent-color">
                    <div className="flex items-center gap-2">
                      <input
                        id="agent-color"
                        type="color"
                        value={agent.color || "#565f89"}
                        onChange={(e) =>
                          form.setValue(`agents.${selected}.color`, e.target.value, { shouldDirty: true })
                        }
                        className="w-9 h-9 rounded-md border border-border bg-bg-elevated cursor-pointer p-1"
                      />
                      <input
                        type="text"
                        value={agent.color || ""}
                        onChange={(e) =>
                          form.setValue(`agents.${selected}.color`, e.target.value, { shouldDirty: true })
                        }
                        placeholder="#hex"
                        className="flex-1 h-9 px-2.5 text-xs font-mono bg-bg-elevated border border-border rounded-md text-text placeholder:text-text-muted/40 focus:outline-none focus:border-border-focus transition-colors"
                      />
                    </div>
                  </Field>
                  <Field label="Working directory" htmlFor="agent-cwd">
                    <input
                      id="agent-cwd"
                      type="text"
                      value={agent.cwd || ""}
                      onChange={(e) =>
                        form.setValue(`agents.${selected}.cwd`, e.target.value || undefined, { shouldDirty: true })
                      }
                      placeholder="~/repos/project"
                      className="w-full h-9 px-3 text-sm font-mono bg-bg-elevated border border-border rounded-md text-text placeholder:text-text-muted/40 focus:outline-none focus:border-border-focus transition-colors"
                    />
                  </Field>
                </div>

                <Field label="Extra args" htmlFor="agent-extra-args">
                  <input
                    id="agent-extra-args"
                    type="text"
                    value={agent.extraArgs?.join(" ") || ""}
                    onChange={(e) =>
                      form.setValue(
                        `agents.${selected}.extraArgs`,
                        e.target.value ? e.target.value.split(/\s+/) : undefined,
                        { shouldDirty: true },
                      )
                    }
                    placeholder="--verbose --model sonnet"
                    className="w-full h-9 px-3 text-sm font-mono bg-bg-elevated border border-border rounded-md text-text placeholder:text-text-muted/40 focus:outline-none focus:border-border-focus transition-colors"
                  />
                </Field>

                <Field label="Prompt" htmlFor="agent-prompt">
                  <textarea
                    id="agent-prompt"
                    {...form.register(`agents.${selected}.prompt`)}
                    placeholder="Describe the agent's role and responsibilities..."
                    rows={16}
                    className="w-full px-3 py-3 text-sm font-mono leading-relaxed bg-bg-elevated border border-border rounded-md text-text placeholder:text-text-muted/40 focus:outline-none focus:border-border-focus resize-y transition-colors"
                  />
                </Field>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* YAML mode */
        <div className="flex-1 flex flex-col overflow-hidden bg-bg-surface">
          {yamlError && (
            <div className="mx-8 mt-6 px-4 py-2.5 rounded-md bg-error/10 border border-error/20 text-sm text-error/90">
              {yamlError}
            </div>
          )}
          <div className="flex-1 p-8">
            <textarea
              value={yamlText}
              onChange={(e) => {
                setYamlText(e.target.value);
                setYamlError(null);
              }}
              spellCheck={false}
              className="w-full h-full px-4 py-4 text-sm font-mono leading-relaxed bg-bg border border-border rounded-md text-text focus:outline-none focus:border-border-focus resize-none transition-colors"
            />
          </div>
        </div>
      )}

      {deployOpen && <DeployDialog blueprint={form.getValues()} onClose={() => setDeployOpen(false)} />}
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-text-muted mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
