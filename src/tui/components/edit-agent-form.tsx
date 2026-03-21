import type { InputRenderable, KeyEvent } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentSummary } from "../hooks/use-agents.ts";

interface EditAgentFormProps {
  teamName: string;
  agent: AgentSummary;
  onSubmit: (updates: { model?: string; prompt?: string; color?: string; extraArgs?: string[] }) => void;
  onCancel: () => void;
}

const MODEL_OPTIONS = ["(default)", "claude-sonnet-4-6", "claude-opus-4-6", "claude-haiku-4-5-20251001"] as const;

type Field = "model" | "prompt" | "color" | "args";
const fields: Field[] = ["model", "prompt", "color", "args"];

export function EditAgentForm({ teamName: _teamName, agent, onSubmit, onCancel }: EditAgentFormProps) {
  const initialModelIndex = agent.model ? MODEL_OPTIONS.indexOf(agent.model as (typeof MODEL_OPTIONS)[number]) : 0;

  const [modelIndex, setModelIndex] = useState(initialModelIndex >= 0 ? initialModelIndex : 0);
  const [prompt, setPrompt] = useState(agent.prompt ?? "");
  const [color, setColor] = useState(agent.color ?? "");
  const [args, setArgs] = useState((agent.extraArgs ?? []).join(" "));
  const [activeField, setActiveField] = useState<Field>("model");

  const promptRef = useRef<InputRenderable>(null);
  const colorRef = useRef<InputRenderable>(null);
  const argsRef = useRef<InputRenderable>(null);

  useEffect(() => {
    if (promptRef.current && agent.prompt) promptRef.current.value = agent.prompt;
    if (colorRef.current && agent.color) colorRef.current.value = agent.color;
    if (argsRef.current && agent.extraArgs?.length) argsRef.current.value = agent.extraArgs.join(" ");
  }, [agent.color, agent.extraArgs?.join, agent.extraArgs?.length, agent.prompt]);

  const handleSubmit = useCallback(() => {
    const selectedModel = modelIndex === 0 ? undefined : MODEL_OPTIONS[modelIndex];
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
  }, [modelIndex, prompt, color, args, onSubmit]);

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
  const modelPrefix = modelActive ? "> " : "  ";
  const modelHint = modelActive ? "  <-/-> to change" : "";

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
      <text
        content={`${modelPrefix} Model: ${MODEL_OPTIONS[modelIndex]}${modelHint}`}
        fg={modelActive ? "#c0caf5" : "#a9b1d6"}
      />
      <text content="" />
      {textInputRow("prompt", " Prompt: ", "system prompt", promptRef, setPrompt)}
      <text content="" />
      {textInputRow("color", " Color:  ", "e.g. #7aa2f7", colorRef, setColor)}
      <text content="" />
      {textInputRow("args", " Args:   ", "e.g. --verbose --effort high", argsRef, setArgs)}
      <text content="" />
      <text content="  [Enter] save   [Tab] next field   [Esc] cancel" fg="#565f89" />
    </box>
  );
}
