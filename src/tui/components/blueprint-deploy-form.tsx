import type { InputRenderable, KeyEvent } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Blueprint } from "../../config/blueprint-schema.ts";

interface BlueprintDeployFormProps {
  blueprint: Blueprint;
  onDeploy: (blueprint: Blueprint, teamName: string) => void;
  onBack: () => void;
}

export function BlueprintDeployForm({ blueprint, onDeploy, onBack }: BlueprintDeployFormProps) {
  const [name, setName] = useState(blueprint.name);
  const inputRef = useRef<InputRenderable>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = blueprint.name;
    }
  }, [blueprint.name]);

  const handleSubmit = useCallback(() => {
    const val = inputRef.current?.value ?? name;
    const trimmed = val.trim();
    if (!trimmed) return;
    onDeploy(blueprint, trimmed);
  }, [name, blueprint, onDeploy]);

  useKeyboard(
    useCallback(
      (key: KeyEvent) => {
        if (key.name === "escape") {
          onBack();
        }
      },
      [onBack],
    ),
  );

  return (
    <box
      position="absolute"
      top={4}
      left={4}
      width="60%"
      height={7}
      border
      borderStyle="rounded"
      borderColor="#7aa2f7"
      title={` Deploy: ${blueprint.name} `}
      backgroundColor="#1a1b26"
      padding={1}
      flexDirection="column"
      zIndex={10}
    >
      <box flexDirection="row" height={1}>
        <text content="> Team name: " fg="#c0caf5" />
        <input
          ref={inputRef}
          focused
          placeholder={blueprint.name}
          onInput={setName}
          onSubmit={() => handleSubmit()}
          flexGrow={1}
        />
      </box>
      <text content="" />
      <text content="  [Enter] deploy   [Esc] back" fg="#565f89" />
    </box>
  );
}
