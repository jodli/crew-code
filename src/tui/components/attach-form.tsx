import { useState, useRef, useEffect, useCallback } from "react";
import { useKeyboard } from "@opentui/react";
import type { KeyEvent, InputRenderable } from "@opentui/core";

interface AttachFormProps {
  agentName: string;
  storedArgs: string[];
  onSubmit: (extraArgs: string[]) => void;
  onCancel: () => void;
}

export function AttachForm({ agentName, storedArgs, onSubmit, onCancel }: AttachFormProps) {
  const initialValue = storedArgs.join(" ");
  const [args, setArgs] = useState(initialValue);
  const inputRef = useRef<InputRenderable>(null);

  // Set initial value imperatively after mount
  useEffect(() => {
    if (inputRef.current && initialValue) {
      inputRef.current.value = initialValue;
    }
  }, []);

  const handleSubmit = useCallback(() => {
    const val = inputRef.current?.value ?? args;
    const extraArgs = val.trim().split(/\s+/).filter(Boolean);
    onSubmit(extraArgs);
  }, [args, onSubmit]);

  useKeyboard(
    useCallback((key: KeyEvent) => {
      if (key.name === "escape") {
        onCancel();
      }
    }, [onCancel]),
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
      title={` Attach: ${agentName} `}
      backgroundColor="#1a1b26"
      padding={1}
      flexDirection="column"
      zIndex={10}
    >
      <box flexDirection="row" height={1}>
        <text content="> Args: " fg="#c0caf5" />
        <input
          ref={inputRef}
          focused
          placeholder="e.g. --verbose --effort high"
          onInput={setArgs}
          onSubmit={() => handleSubmit()}
          flexGrow={1}
        />
      </box>
      <text content="" />
      <text content="  [Enter] attach   [Esc] cancel" fg="#565f89" />
    </box>
  );
}
