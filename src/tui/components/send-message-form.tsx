import { useState, useCallback } from "react";
import { useKeyboard } from "@opentui/react";
import type { KeyEvent } from "@opentui/core";

interface SendMessageFormProps {
  teamName: string;
  agentName: string;
  onSubmit: (message: string) => void;
  onCancel: () => void;
}

export function SendMessageForm({ teamName, agentName, onSubmit, onCancel }: SendMessageFormProps) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleKey = useCallback(
    (key: KeyEvent) => {
      if (key.name === "escape") {
        onCancel();
        return;
      }

      if (key.name === "return") {
        if (!message.trim()) {
          setError("Message cannot be empty");
          return;
        }
        onSubmit(message.trim());
        return;
      }

      if (key.name === "backspace") {
        setMessage((m) => m.slice(0, -1));
        setError("");
        return;
      }

      if (key.name && key.name.length === 1 && !key.ctrl && !key.meta) {
        setMessage((m) => m + key.name);
        setError("");
      }
    },
    [message, onSubmit, onCancel],
  );

  useKeyboard(handleKey);

  return (
    <box
      position="absolute"
      top={4}
      left={4}
      width="60%"
      height={error ? 9 : 8}
      border
      borderStyle="rounded"
      borderColor="#7aa2f7"
      title={` Send to: ${agentName} @ ${teamName} `}
      backgroundColor="#1a1b26"
      padding={1}
      flexDirection="column"
      zIndex={10}
    >
      <text content={`> Message: ${message}_`} fg="#c0caf5" />
      <text content="" />
      {error ? (
        <>
          <text content={`  ${error}`} fg="#f7768e" />
          <text content="" />
        </>
      ) : null}
      <text content="  [Enter] send   [Esc] cancel" fg="#565f89" />
    </box>
  );
}
