import { useState, useRef, useEffect, useCallback } from "react";
import { useKeyboard } from "@opentui/react";
import type { KeyEvent, InputRenderable } from "@opentui/core";

interface EditTeamFormProps {
  teamName: string;
  currentDescription: string;
  onSubmit: (description: string) => void;
  onCancel: () => void;
}

export function EditTeamForm({ teamName, currentDescription, onSubmit, onCancel }: EditTeamFormProps) {
  const [description, setDescription] = useState(currentDescription);
  const inputRef = useRef<InputRenderable>(null);

  useEffect(() => {
    if (inputRef.current && currentDescription) {
      inputRef.current.value = currentDescription;
    }
  }, []);

  const handleSubmit = useCallback(() => {
    const val = inputRef.current?.value ?? description;
    onSubmit(val.trim());
  }, [description, onSubmit]);

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
      title={` Edit Team: ${teamName} `}
      backgroundColor="#1a1b26"
      padding={1}
      flexDirection="column"
      zIndex={10}
    >
      <box flexDirection="row" height={1}>
        <text content="> Description: " fg="#c0caf5" />
        <input
          ref={inputRef}
          focused
          placeholder="team description"
          onInput={setDescription}
          onSubmit={handleSubmit}
          flexGrow={1}
          fg="#c0caf5"
        />
      </box>
      <text content="" />
      <text content="  [Enter] save   [Esc] cancel" fg="#565f89" />
    </box>
  );
}
