import type { KeyEvent } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useCallback, useState } from "react";

export interface SpawnAgentResult {
  name: string;
  agentType: string;
  prompt: string;
  model: string;
  cwd: string;
  extraArgs: string[];
}

interface SpawnAgentFormProps {
  teamName: string;
  defaultCwd: string;
  onSubmit: (opts: SpawnAgentResult) => void;
  onCancel: () => void;
}

const AGENT_TYPE_OPTIONS = ["general-purpose", "team-lead"] as const;

const MODEL_OPTIONS = ["(default)", "claude-sonnet-4-6", "claude-opus-4-6", "claude-haiku-4-5-20251001"] as const;

type Field = "name" | "agentType" | "prompt" | "model" | "cwd" | "args";
const fields: Field[] = ["name", "agentType", "prompt", "model", "cwd", "args"];

export function SpawnAgentForm({ teamName, defaultCwd, onSubmit, onCancel }: SpawnAgentFormProps) {
  const [name, setName] = useState("");
  const [agentTypeIndex, setAgentTypeIndex] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [modelIndex, setModelIndex] = useState(0);
  const [cwd, setCwd] = useState(defaultCwd);
  const [args, setArgs] = useState("");
  const [activeField, setActiveField] = useState<Field>("name");
  const [error, setError] = useState("");

  const handleSubmit = useCallback(() => {
    if (!cwd.trim()) {
      setError("CWD is required");
      return;
    }
    const selectedModel = modelIndex === 0 ? "" : MODEL_OPTIONS[modelIndex];
    const extraArgs = args.trim().split(/\s+/).filter(Boolean);
    onSubmit({
      name: name.trim(),
      agentType: AGENT_TYPE_OPTIONS[agentTypeIndex],
      prompt: prompt.trim(),
      model: selectedModel,
      cwd: cwd.trim(),
      extraArgs,
    });
  }, [name, agentTypeIndex, prompt, modelIndex, cwd, args, onSubmit]);

  useKeyboard(
    useCallback(
      (key: KeyEvent) => {
        if (key.name === "escape") {
          onCancel();
          return;
        }

        if (key.name === "tab") {
          const idx = fields.indexOf(activeField);
          const next = key.shift
            ? fields[(idx - 1 + fields.length) % fields.length]
            : fields[(idx + 1) % fields.length];
          setActiveField(next);
          return;
        }

        // Cycling selectors: agentType and model
        if (activeField === "agentType") {
          if (key.name === "left" || key.name === "h") {
            setAgentTypeIndex((i) => (i - 1 + AGENT_TYPE_OPTIONS.length) % AGENT_TYPE_OPTIONS.length);
          } else if (key.name === "right" || key.name === "l") {
            setAgentTypeIndex((i) => (i + 1) % AGENT_TYPE_OPTIONS.length);
          } else if (key.name === "return") {
            handleSubmit();
          }
        }

        if (activeField === "model") {
          if (key.name === "left" || key.name === "h") {
            setModelIndex((i) => (i - 1 + MODEL_OPTIONS.length) % MODEL_OPTIONS.length);
          } else if (key.name === "right" || key.name === "l") {
            setModelIndex((i) => (i + 1) % MODEL_OPTIONS.length);
          } else if (key.name === "return") {
            handleSubmit();
          }
        }
      },
      [activeField, onCancel, handleSubmit],
    ),
  );

  const handleInput = (setter: (v: string) => void) => (val: string) => {
    setter(val);
    setError("");
  };

  const textInputRow = (field: Field, label: string, placeholder: string, onInput: (val: string) => void) => {
    const active = activeField === field;
    const prefix = active ? "> " : "  ";
    return (
      <box flexDirection="row" height={1}>
        <text content={`${prefix}${label}`} fg={active ? "#c0caf5" : "#a9b1d6"} />
        <input
          focused={active}
          placeholder={placeholder}
          onInput={onInput}
          onSubmit={() => handleSubmit()}
          flexGrow={1}
        />
      </box>
    );
  };

  const selectorRow = (field: Field, label: string, value: string) => {
    const active = activeField === field;
    const prefix = active ? "> " : "  ";
    const hint = active ? "  <-/-> to change" : "";
    return <text content={`${prefix} ${label} ${value}${hint}`} fg={active ? "#c0caf5" : "#a9b1d6"} />;
  };

  return (
    <box
      position="absolute"
      top={3}
      left={4}
      width="60%"
      height={error ? 20 : 18}
      border
      borderStyle="rounded"
      borderColor="#7aa2f7"
      title={` Spawn Agent into: ${teamName} `}
      backgroundColor="#1a1b26"
      padding={1}
      flexDirection="column"
      zIndex={10}
    >
      {textInputRow("name", " Name:  ", "agent name", handleInput(setName))}
      <text content="" />
      {selectorRow("agentType", "Type: ", AGENT_TYPE_OPTIONS[agentTypeIndex])}
      <text content="" />
      {textInputRow("prompt", " Prompt: ", "system prompt", handleInput(setPrompt))}
      <text content="" />
      {selectorRow("model", "Model:", MODEL_OPTIONS[modelIndex])}
      <text content="" />
      {textInputRow("cwd", " CWD:   ", defaultCwd, handleInput(setCwd))}
      <text content="" />
      {textInputRow("args", " Args:  ", "e.g. --verbose --effort high", handleInput(setArgs))}
      <text content="" />
      {error ? (
        <>
          <text content={`  ${error}`} fg="#f7768e" />
          <text content="" />
        </>
      ) : null}
      <text content="  [Enter] spawn   [Tab] next field   [Esc] cancel" fg="#565f89" />
    </box>
  );
}
