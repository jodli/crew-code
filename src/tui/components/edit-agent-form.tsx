import type { InputRenderable, KeyEvent } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AgentSummary } from "../hooks/use-agents.ts";

interface EditAgentFormProps {
  teamName: string;
  agent: AgentSummary;
  modelOptions: readonly string[];
  onSubmit: (updates: { model?: string; prompt?: string; color?: string; extraArgs?: string[] }) => void;
  onCancel: () => void;
}

const CUSTOM_MODEL_LABEL = "custom...";

type Field = "model" | "prompt" | "color" | "args";
const fields: Field[] = ["model", "prompt", "color", "args"];

export function EditAgentForm({ teamName: _teamName, agent, modelOptions, onSubmit, onCancel }: EditAgentFormProps) {
  const allModelOptions = useMemo(() => [...modelOptions, CUSTOM_MODEL_LABEL], [modelOptions]);

  const initialModelIndex = agent.model ? allModelOptions.indexOf(agent.model) : 0;
  const isInitialCustom = agent.model ? initialModelIndex < 0 : false;

  const [modelIndex, setModelIndex] = useState(
    isInitialCustom ? allModelOptions.length - 1 : Math.max(0, initialModelIndex),
  );
  const [customModel, setCustomModel] = useState(isInitialCustom ? (agent.model ?? "") : "");
  const [prompt, setPrompt] = useState(agent.prompt ?? "");
  const [color, setColor] = useState(agent.color ?? "");
  const [args, setArgs] = useState((agent.extraArgs ?? []).join(" "));
  const [activeField, setActiveField] = useState<Field>("model");

  const isCustomModel = modelIndex === allModelOptions.length - 1;

  const promptRef = useRef<InputRenderable>(null);
  const colorRef = useRef<InputRenderable>(null);
  const argsRef = useRef<InputRenderable>(null);
  const customModelRef = useRef<InputRenderable>(null);

  useEffect(() => {
    if (promptRef.current && agent.prompt) promptRef.current.value = agent.prompt;
    if (colorRef.current && agent.color) colorRef.current.value = agent.color;
    if (argsRef.current && agent.extraArgs?.length) argsRef.current.value = agent.extraArgs.join(" ");
    if (customModelRef.current && isInitialCustom && agent.model) customModelRef.current.value = agent.model;
  }, [agent.color, agent.extraArgs?.join, agent.extraArgs?.length, agent.prompt, agent.model, isInitialCustom]);

  const handleSubmit = useCallback(() => {
    let selectedModel: string | undefined;
    if (isCustomModel) {
      const val = customModelRef.current?.value ?? customModel;
      selectedModel = val.trim() || undefined;
    } else {
      selectedModel = modelIndex === 0 ? undefined : allModelOptions[modelIndex];
    }
    const promptVal = promptRef.current?.value ?? prompt;
    const colorVal = colorRef.current?.value ?? color;
    const argsVal = argsRef.current?.value ?? args;
    const extraArgs = argsVal.trim().split(/\s+/).filter(Boolean);
    onSubmit({
      model: selectedModel,
      prompt: promptVal.trim() || undefined,
      color: colorVal.trim() || undefined,
      extraArgs: extraArgs.length > 0 ? extraArgs : undefined,
    });
  }, [modelIndex, isCustomModel, customModel, allModelOptions, prompt, color, args, onSubmit]);

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
      [activeField, onCancel, handleSubmit, allModelOptions.length, isCustomModel],
    ),
  );

  const textInputRow = (
    field: Field,
    label: string,
    placeholder: string,
    ref: React.RefObject<InputRenderable | null>,
    onInput: (val: string) => void,
  ) => {
    const active = activeField === field;
    const prefix = active ? "> " : "  ";
    return (
      <box flexDirection="row" height={1}>
        <text content={`${prefix}${label}`} fg={active ? "#c0caf5" : "#a9b1d6"} />
        <input
          ref={ref}
          focused={active}
          placeholder={placeholder}
          onInput={onInput}
          onSubmit={() => handleSubmit()}
          flexGrow={1}
        />
      </box>
    );
  };

  const modelActive = activeField === "model";

  const modelField = isCustomModel ? (
    textInputRow("model", " Model: ", "e.g. claude-opus-4-6[1m]", customModelRef, setCustomModel)
  ) : (
    <text
      content={`${modelActive ? "> " : "  "} Model: ${allModelOptions[modelIndex]}${modelActive ? "  <-/-> to change" : ""}`}
      fg={modelActive ? "#c0caf5" : "#a9b1d6"}
    />
  );

  return (
    <box
      position="absolute"
      top={3}
      left={4}
      width="60%"
      height={14}
      border
      borderStyle="rounded"
      borderColor="#7aa2f7"
      title={` Edit Agent: ${agent.name} [${agent.agentType}] `}
      backgroundColor="#1a1b26"
      padding={1}
      flexDirection="column"
      zIndex={10}
    >
      {modelField}
      <text content="" />
      {textInputRow("prompt", " Prompt: ", "system prompt", promptRef, setPrompt)}
      <text content="" />
      {textInputRow("color", " Color:  ", "e.g. #7aa2f7", colorRef, setColor)}
      <text content="" />
      {textInputRow("args", " Args:   ", "e.g. --verbose --effort high", argsRef, setArgs)}
      <text content="" />
      <text
        content={
          isCustomModel && activeField === "model"
            ? "  [Enter] save   [Tab] next field   [Esc] back to selector"
            : "  [Enter] save   [Tab] next field   [Esc] cancel"
        }
        fg="#565f89"
      />
    </box>
  );
}
