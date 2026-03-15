import { useCallback } from "react";
import { useKeyboard } from "@opentui/react";
import type { KeyEvent } from "@opentui/core";

interface ConfirmBarProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmBar({ message, onConfirm, onCancel }: ConfirmBarProps) {
  const handleKey = useCallback(
    (key: KeyEvent) => {
      if (key.name === "y") {
        onConfirm();
      } else if (key.name === "n" || key.name === "escape") {
        onCancel();
      }
    },
    [onConfirm, onCancel],
  );

  useKeyboard(handleKey);

  return (
    <box height={1} paddingX={1}>
      <text
        content={`${message}  [y] confirm  [n/Esc] cancel`}
        fg="#f7768e"
      />
    </box>
  );
}
