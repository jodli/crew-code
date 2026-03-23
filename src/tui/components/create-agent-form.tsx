import type { KeyEvent } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useCallback, useMemo, useState } from "react";

export interface CreateAgentResult {
  name: string;
  agentType: string;
  prompt: string;
  model: string;
  cwd: string;
  extraArgs: string[];
}

interface CreateAgentFormProps {
  teamName: string;
  defaultCwd: string;
  agentTypeOptions: string[];
  modelOptions: readonly string[];
  onSubmit: (opts: CreateAgentResult) => void;
  onCancel: () => void;
}

const CUSTOM_MODEL_LABEL = "custom...";

type Field = "name" | "agentType" | "prompt" | "model" | "cwd" | "args";
const fields: Field[] = ["name", "agentType", "prompt", "model", "cwd", "args"];

export function CreateAgentForm({
  teamName,
  defaultCwd,
  agentTypeOptions,
  modelOptions,
  onSubmit,
  onCancel,
}: CreateAgentFormProps) {
  const allModelOptions = useMemo(() => [...modelOptions, CUSTOM_MODEL_LABEL], [modelOptions]);

  const [name, setName] = useState("");
  const [agentTypeIndex, setAgentTypeIndex] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [modelIndex, setModelIndex] = useState(0);
  const [customModel, setCustomModel] = useState("");
  const [cwd, setCwd] = useState(defaultCwd);
  const [args, setArgs] = useState("");
  const [activeField, setActiveField] = useState<Field>("name");
  const [error, setError] = useState("");

  const isCustomModel = modelIndex === allModelOptions.length - 1;

  const handleSubmit = useCallback(() => {
    if (!cwd.trim()) {
      setError("CWD is required");
      return;
    }
    let selectedModel: string;
    if (isCustomModel) {
      selectedModel = customModel.trim();
    } else {
      selectedModel = modelIndex === 0 ? "" : allModelOptions[modelIndex];
    }
    const extraArgs = args.trim().split(/\s+/).filter(Boolean);
    onSubmit({
      name: name.trim(),
      agentType: agentTypeOptions[agentTypeIndex],
      prompt: prompt.trim(),
      model: selectedModel,
      cwd: cwd.trim(),
      extraArgs,
    });
  }, [
    name,
    agentTypeIndex,
    agentTypeOptions,
    prompt,
    modelIndex,
    isCustomModel,
    customModel,
    allModelOptions,
    cwd,
    args,
    onSubmit,
  ]);

  useKeyboard(
    useCallback(
      (key: KeyEvent) => {
        if (key.name === "escape") {
          if (isCustomModel && activeField === "model") {
            setModelIndex(0);
            setCustomModel("");
            return;
          }
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

        // Cycling selectors: agentType and model (when not in custom mode)
        if (activeField === "agentType") {
          if (key.name === "left" || key.name === "h") {
            setAgentTypeIndex((i) => (i - 1 + agentTypeOptions.length) % agentTypeOptions.length);
          } else if (key.name === "right" || key.name === "l") {
            setAgentTypeIndex((i) => (i + 1) % agentTypeOptions.length);
          } else if (key.name === "return") {
            handleSubmit();
          }
        }

        if (activeField === "model" && !isCustomModel) {
          if (key.name === "left" || key.name === "h") {
            setModelIndex((i) => (i - 1 + allModelOptions.length) % allModelOptions.length);
          } else if (key.name === "right" || key.name === "l") {
            setModelIndex((i) => (i + 1) % allModelOptions.length);
          } else if (key.name === "return") {
            handleSubmit();
          }
        }
      },
      [activeField, onCancel, handleSubmit, agentTypeOptions.length, allModelOptions.length, isCustomModel],
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

  const modelField = isCustomModel
    ? textInputRow("model", " Model: ", "e.g. claude-opus-4-6[1m]", handleInput(setCustomModel))
    : selectorRow("model", "Model:", allModelOptions[modelIndex]);

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
      title={` Create Agent in: ${teamName} `}
      backgroundColor="#1a1b26"
      padding={1}
      flexDirection="column"
      zIndex={10}
    >
      {textInputRow("name", " Name:  ", "agent name", handleInput(setName))}
      <text content="" />
      {selectorRow("agentType", "Type: ", agentTypeOptions[agentTypeIndex])}
      <text content="" />
      {textInputRow("prompt", " Prompt: ", "system prompt", handleInput(setPrompt))}
      <text content="" />
      {modelField}
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
      <text
        content={
          isCustomModel && activeField === "model"
            ? "  [Enter] create   [Tab] next field   [Esc] back to selector"
            : "  [Enter] create   [Tab] next field   [Esc] cancel"
        }
        fg="#565f89"
      />
    </box>
  );
}
