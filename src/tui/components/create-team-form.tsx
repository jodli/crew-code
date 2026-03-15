import { useState, useCallback } from "react";
import { useKeyboard } from "@opentui/react";
import type { KeyEvent } from "@opentui/core";

interface CreateTeamFormProps {
  defaultCwd: string;
  onSubmit: (name: string, cwd: string, extraArgs: string[]) => void;
  onCancel: () => void;
}

type Field = "name" | "cwd" | "args";
const fields: Field[] = ["name", "cwd", "args"];

export function CreateTeamForm({ defaultCwd, onSubmit, onCancel }: CreateTeamFormProps) {
  const [name, setName] = useState("");
  const [cwd, setCwd] = useState(defaultCwd);
  const [args, setArgs] = useState("");
  const [activeField, setActiveField] = useState<Field>("name");
  const [error, setError] = useState("");

  const handleSubmit = useCallback(() => {
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
  }, [name, cwd, args, onSubmit]);

  useKeyboard(
    useCallback((key: KeyEvent) => {
      if (key.name === "escape") {
        onCancel();
        return;
      }
      if (key.name === "tab") {
        setActiveField((f) => {
          const idx = fields.indexOf(f);
          return key.shift
            ? fields[(idx - 1 + fields.length) % fields.length]
            : fields[(idx + 1) % fields.length];
        });
      }
    }, [onCancel]),
  );

  const handleInput = (setter: (v: string) => void) => (val: string) => {
    setter(val);
    setError("");
  };

  const fieldRow = (field: Field, label: string, placeholder: string, onInput: (val: string) => void) => {
    const active = activeField === field;
    const prefix = active ? "> " : "  ";
    return (
      <box flexDirection="row" height={1}>
        <text content={`${prefix}${label}`} fg={active ? "#c0caf5" : "#a9b1d6"} />
        <input
          focused={active}
          placeholder={placeholder}
          onInput={onInput}
          onSubmit={handleSubmit}
          flexGrow={1}
          fg={active ? "#c0caf5" : "#a9b1d6"}
        />
      </box>
    );
  };

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
      {fieldRow("name", " Name: ", "team name", handleInput(setName))}
      <text content="" />
      {fieldRow("cwd", " CWD:  ", defaultCwd, handleInput(setCwd))}
      <text content="" />
      {fieldRow("args", " Args: ", "e.g. --verbose --effort high", handleInput(setArgs))}
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
