import { useState, useCallback } from "react";
import { useKeyboard } from "@opentui/react";
import type { KeyEvent } from "@opentui/core";

interface CreateTeamFormProps {
  defaultCwd: string;
  onSubmit: (name: string, cwd: string, extraArgs: string[]) => void;
  onCancel: () => void;
}

type Field = "name" | "cwd" | "args";

export function CreateTeamForm({ defaultCwd, onSubmit, onCancel }: CreateTeamFormProps) {
  const [name, setName] = useState("");
  const [cwd, setCwd] = useState(defaultCwd);
  const [args, setArgs] = useState("");
  const [activeField, setActiveField] = useState<Field>("name");
  const [error, setError] = useState("");
  const fields: Field[] = ["name", "cwd", "args"];

  const handleKey = useCallback(
    (key: KeyEvent) => {
      if (key.name === "escape") {
        onCancel();
        return;
      }

      if (key.name === "tab") {
        setActiveField((f) => {
          const idx = fields.indexOf(f);
          const next = key.shift
            ? fields[(idx - 1 + fields.length) % fields.length]
            : fields[(idx + 1) % fields.length];
          return next;
        });
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
        const extraArgs = args.trim().split(/\s+/).filter(Boolean);
        onSubmit(name.trim(), cwd.trim(), extraArgs);
        return;
      }

      // Text input handling
      const textFields: Record<Field, string> = { name, cwd, args };
      const textSetters: Record<Field, (v: string) => void> = { name: setName, cwd: setCwd, args: setArgs };
      const setter = textSetters[activeField];
      const value = textFields[activeField];

      if (key.name === "backspace") {
        setter(value.slice(0, -1));
        setError("");
        return;
      }

      if (key.name === "space") {
        setter(value + " ");
        setError("");
        return;
      }

      // Only accept printable characters
      if (key.name && key.name.length === 1 && !key.ctrl && !key.meta) {
        setter(value + key.name);
        setError("");
      }
    },
    [name, cwd, args, activeField, onSubmit, onCancel],
  );

  useKeyboard(handleKey);

  const nameLabel = activeField === "name" ? "> Name:" : "  Name:";
  const cwdLabel = activeField === "cwd" ? "> CWD: " : "  CWD: ";
  const argsLabel = activeField === "args" ? "> Args:" : "  Args:";

  return (
    <box
      position="absolute"
      top={4}
      left={4}
      width="60%"
      height={error ? 12 : 11}
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
      <text
        content={`${argsLabel} ${args}${activeField === "args" ? "_" : ""}`}
        fg={activeField === "args" ? "#c0caf5" : "#a9b1d6"}
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
