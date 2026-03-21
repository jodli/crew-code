import type { KeyEvent } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useCallback, useEffect, useState } from "react";
import { getBlueprint } from "../../actions/get-blueprint.ts";
import { listBlueprints } from "../../actions/list-blueprints.ts";
import type { Blueprint } from "../../config/blueprint-schema.ts";
import type { AppContext } from "../../types/context.ts";

interface BlueprintLoadFormProps {
  ctx: AppContext;
  onSubmit: (blueprint: Blueprint) => void;
  onCancel: () => void;
}

export function BlueprintLoadForm({ ctx, onSubmit, onCancel }: BlueprintLoadFormProps) {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const namesResult = await listBlueprints(ctx);
      if (!namesResult.ok) {
        setError("Failed to list blueprints");
        setLoading(false);
        return;
      }

      const loaded: Blueprint[] = [];
      for (const name of namesResult.value) {
        const bp = await getBlueprint(ctx, name);
        if (bp.ok) loaded.push(bp.value);
      }
      setBlueprints(loaded);
      setLoading(false);
    })();
  }, [ctx]);

  useKeyboard(
    useCallback(
      (key: KeyEvent) => {
        if (key.name === "escape") {
          onCancel();
          return;
        }

        if (key.name === "up" || key.name === "k") {
          setSelectedIndex((i) => Math.max(0, i - 1));
        } else if (key.name === "down" || key.name === "j") {
          setSelectedIndex((i) => Math.min(blueprints.length - 1, i + 1));
        } else if (key.name === "return") {
          if (blueprints[selectedIndex]) {
            onSubmit(blueprints[selectedIndex]);
          }
        }
      },
      [blueprints, selectedIndex, onSubmit, onCancel],
    ),
  );

  const maxVisible = 8;
  const start = Math.max(0, selectedIndex - Math.floor(maxVisible / 2));
  const visible = blueprints.slice(start, start + maxVisible);

  return (
    <box
      position="absolute"
      top={3}
      left={4}
      width="60%"
      height={loading || error ? 6 : Math.min(blueprints.length + 6, maxVisible + 6)}
      border
      borderStyle="rounded"
      borderColor="#7aa2f7"
      title=" Load Blueprint "
      backgroundColor="#1a1b26"
      padding={1}
      flexDirection="column"
      zIndex={10}
    >
      {loading ? (
        <text content="  Loading blueprints..." fg="#565f89" />
      ) : error ? (
        <text content={`  ${error}`} fg="#f7768e" />
      ) : blueprints.length === 0 ? (
        <text content="  No blueprints found. Create one with: crew blueprint new <name>" fg="#565f89" />
      ) : (
        <>
          {visible.map((bp, i) => {
            const globalIndex = start + i;
            const selected = globalIndex === selectedIndex;
            const prefix = selected ? "> " : "  ";
            const agents = `${bp.agents.length} agent${bp.agents.length !== 1 ? "s" : ""}`;
            const desc = bp.description ? ` — ${bp.description}` : "";
            return (
              <text
                key={bp.name}
                content={`${prefix}${bp.name} (${agents})${desc}`}
                fg={selected ? "#c0caf5" : "#a9b1d6"}
              />
            );
          })}
          <text content="" />
          <text content="  [Enter] load   [j/k] navigate   [Esc] cancel" fg="#565f89" />
        </>
      )}
    </box>
  );
}
