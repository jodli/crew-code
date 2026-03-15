import { useState, useCallback } from "react";
import { useKeyboard } from "@opentui/react";
import type { KeyEvent } from "@opentui/core";

export interface SpawnAgentResult {
  name: string;
  task: string;
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

type Field = "name" | "task" | "model" | "cwd" | "args";
const fields: Field[] = ["name", "task", "model", "cwd", "args"];

export function SpawnAgentForm({ teamName, defaultCwd, onSubmit, onCancel }: SpawnAgentFormProps) {
  const [name, setName] = useState("");
  const [task, setTask] = useState("");
  const [modelIndex, setModelIndex] = useState(0);
  const [cwd, setCwd] = useState(defaultCwd);
  const [args, setArgs] = useState("");
  const [activeField, setActiveField] = useState<Field>("name");
  const [error, setError] = useState("");

  const handleKey = useCallback(
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

      if (key.name === "return") {
        if (!cwd.trim()) {
          setError("CWD is required");
          return;
        }
        const selectedModel = modelIndex === 0 ? "" : MODEL_OPTIONS[modelIndex];
        const extraArgs = args.trim().split(/\s+/).filter(Boolean);
        onSubmit({ name: name.trim(), task: task.trim(), model: selectedModel, cwd: cwd.trim(), extraArgs });
        return;
      }

      // Model field: left/right or h/l to cycle options
      if (activeField === "model") {
        if (key.name === "left" || key.name === "h") {
          setModelIndex((i) => (i - 1 + MODEL_OPTIONS.length) % MODEL_OPTIONS.length);
        } else if (key.name === "right" || key.name === "l") {
          setModelIndex((i) => (i + 1) % MODEL_OPTIONS.length);
        }
        return;
      }

      // Text input for other fields
      const textFields = { name, task, cwd, args } as Record<string, string>;
      const textSetters = { name: setName, task: setTask, cwd: setCwd, args: setArgs } as Record<string, (v: string) => void>;

      if (key.name === "backspace") {
        textSetters[activeField](textFields[activeField].slice(0, -1));
        setError("");
        return;
      }

      if (key.name === "space") {
        textSetters[activeField](textFields[activeField] + " ");
        setError("");
        return;
      }

      if (key.name && key.name.length === 1 && !key.ctrl && !key.meta) {
        textSetters[activeField](textFields[activeField] + key.name);
        setError("");
      }
    },
    [name, task, modelIndex, cwd, args, activeField, defaultCwd, onSubmit, onCancel, error],
  );

  useKeyboard(handleKey);

  const textLine = (field: Field, label: string, value: string) => {
    const active = activeField === field;
    const prefix = active ? "> " : "  ";
    const cursor = active ? "_" : "";
    return {
      content: `${prefix}${label} ${value}${cursor}`,
      fg: active ? "#c0caf5" : "#a9b1d6",
    };
  };

  const nameField = textLine("name", "Name: ", name);
  const taskField = textLine("task", "Task: ", task);
  const cwdField = textLine("cwd", "CWD:  ", cwd);
  const argsField = textLine("args", "Args: ", args);

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
      <text content={nameField.content} fg={nameField.fg} />
      <text content="" />
      <text content={taskField.content} fg={taskField.fg} />
      <text content="" />
      <text
        content={`${modelPrefix}Model: ${modelValue}${modelHint}`}
        fg={modelActive ? "#c0caf5" : "#a9b1d6"}
      />
      <text content="" />
      <text content={cwdField.content} fg={cwdField.fg} />
      <text content="" />
      <text content={argsField.content} fg={argsField.fg} />
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
