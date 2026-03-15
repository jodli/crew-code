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

  const handleSubmit = useCallback(() => {
    if (!message.trim()) return;
    onSubmit(message.trim());
  }, [message, onSubmit]);

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
      title={` Send to: ${agentName} @ ${teamName} `}
      backgroundColor="#1a1b26"
      padding={1}
      flexDirection="column"
      zIndex={10}
    >
      <box flexDirection="row" height={1}>
        <text content="> Message: " fg="#c0caf5" />
        <input
          focused
          placeholder="type your message..."
          onInput={setMessage}
          onSubmit={handleSubmit}
          flexGrow={1}
          fg="#c0caf5"
        />
      </box>
      <text content="" />
      <text content="  [Enter] send   [Esc] cancel" fg="#565f89" />
    </box>
  );
}
