import { useState, useCallback } from "react";
import { useKeyboard } from "@opentui/react";
import type { KeyEvent } from "@opentui/core";

export interface SpawnAgentResult {
  name: string;
  systemPrompt: string;
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

const MODEL_OPTIONS = [
  "(default)",
  "claude-sonnet-4-6",
  "claude-opus-4-6",
  "claude-haiku-4-5-20251001",
] as const;

type Field = "name" | "systemPrompt" | "model" | "cwd" | "args";
const fields: Field[] = ["name", "systemPrompt", "model", "cwd", "args"];

export function SpawnAgentForm({ teamName, defaultCwd, onSubmit, onCancel }: SpawnAgentFormProps) {
  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
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
    onSubmit({ name: name.trim(), systemPrompt: systemPrompt.trim(), model: selectedModel, cwd: cwd.trim(), extraArgs });
  }, [name, systemPrompt, modelIndex, cwd, args, onSubmit]);

  useKeyboard(
    useCallback((key: KeyEvent) => {
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

      // Model field: left/right or h/l to cycle options, Enter to submit
      if (activeField === "model") {
        if (key.name === "left" || key.name === "h") {
          setModelIndex((i) => (i - 1 + MODEL_OPTIONS.length) % MODEL_OPTIONS.length);
        } else if (key.name === "right" || key.name === "l") {
          setModelIndex((i) => (i + 1) % MODEL_OPTIONS.length);
        } else if (key.name === "return") {
          handleSubmit();
        }
      }
    }, [activeField, onCancel, handleSubmit]),
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
          onSubmit={handleSubmit}
          flexGrow={1}
          fg={active ? "#c0caf5" : "#a9b1d6"}
        />
      </box>
    );
  };

  const modelActive = activeField === "model";
  const modelPrefix = modelActive ? "> " : "  ";
  const modelValue = MODEL_OPTIONS[modelIndex];
  const modelHint = modelActive ? "  <-/-> to change" : "";

  return (
    <box
      position="absolute"
      top={3}
      left={4}
      width="60%"
      height={error ? 18 : 16}
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
      {textInputRow("systemPrompt", " Prompt: ", "system prompt", handleInput(setSystemPrompt))}
      <text content="" />
      <text
        content={`${modelPrefix} Model: ${modelValue}${modelHint}`}
        fg={modelActive ? "#c0caf5" : "#a9b1d6"}
      />
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
