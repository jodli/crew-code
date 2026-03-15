import { useState, useCallback } from "react";
import { useKeyboard } from "@opentui/react";
import type { KeyEvent } from "@opentui/core";

interface CreateTeamFormProps {
  defaultCwd: string;
  onSubmit: (name: string, cwd: string) => void;
  onCancel: () => void;
}

type Field = "name" | "cwd";

export function CreateTeamForm({ defaultCwd, onSubmit, onCancel }: CreateTeamFormProps) {
  const [name, setName] = useState("");
  const [cwd, setCwd] = useState(defaultCwd);
  const [activeField, setActiveField] = useState<Field>("name");
  const [error, setError] = useState("");

  const handleKey = useCallback(
    (key: KeyEvent) => {
      if (key.name === "escape") {
        onCancel();
        return;
      }

      if (key.name === "tab") {
        setActiveField((f) => (f === "name" ? "cwd" : "name"));
        return;
      }

      if (key.name === "return") {
        if (!name.trim()) {
          setError("Name is required");
          return;
        }
        if (!cwd.trim()) {
          setError("CWD is required");
          return;
        }
        onSubmit(name.trim(), cwd.trim());
        return;
      }

      // Text input handling
      const setter = activeField === "name" ? setName : setCwd;
      const value = activeField === "name" ? name : cwd;

      if (key.name === "backspace") {
        setter(value.slice(0, -1));
        setError("");
        return;
      }

      // Only accept printable characters
      if (key.name && key.name.length === 1 && !key.ctrl && !key.meta) {
        setter(value + key.name);
        setError("");
      }
    },
    [name, cwd, activeField, onSubmit, onCancel],
  );

  useKeyboard(handleKey);

  const nameLabel = activeField === "name" ? "> Name:" : "  Name:";
  const cwdLabel = activeField === "cwd" ? "> CWD: " : "  CWD: ";

  return (
    <box
      position="absolute"
      top={4}
      left={4}
      width="60%"
      height={error ? 10 : 9}
      border
      borderStyle="rounded"
      borderColor="#7aa2f7"
      title=" Create Team "
      backgroundColor="#1a1b26"
      padding={1}
      flexDirection="column"
      zIndex={10}
    >
      <text
        content={`${nameLabel} ${name}${activeField === "name" ? "_" : ""}`}
        fg={activeField === "name" ? "#c0caf5" : "#a9b1d6"}
      />
      <text content="" />
      <text
        content={`${cwdLabel} ${cwd}${activeField === "cwd" ? "_" : ""}`}
        fg={activeField === "cwd" ? "#c0caf5" : "#a9b1d6"}
      />
      <text content="" />
      {error ? (
        <>
          <text content={`  ${error}`} fg="#f7768e" />
          <text content="" />
        </>
      ) : null}
      <text content="  [Enter] create   [Tab] next field   [Esc] cancel" fg="#565f89" />
    </box>
  );
}
