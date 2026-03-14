import { defineCommand } from "citty";
import pc from "picocolors";
import { diagnose, applyFixes } from "../../core/doctor.ts";
import { JsonFileConfigStore } from "../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../adapters/json-file-inbox-store.ts";
import { renderError } from "../errors.ts";
import type { AppContext } from "../../types/context.ts";

const statusIcon = {
  ok: pc.green("✓"),
  warn: pc.yellow("⚠"),
  error: pc.red("✗"),
} as const;

export default defineCommand({
  meta: {
    name: "doctor",
    description: "Diagnose and fix team health issues",
  },
  args: {
    team: {
      type: "string",
      description: "Scope checks to a specific team",
      required: false,
    },
    fix: {
      type: "boolean",
      description: "Attempt to fix issues automatically",
      required: false,
    },
  },
  async run({ args }) {
    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
    };

    const result = await diagnose(ctx, { team: args.team });
    if (!result.ok) {
      console.error(renderError(result.error));
      process.exit(1);
    }

    const diagnostics = result.value;

    // Display results as checklist
    for (const diag of diagnostics) {
      const icon = statusIcon[diag.status];
      const scope = diag.team ? pc.dim(` [${diag.team}]`) : "";
      console.error(`${icon} ${diag.message}${scope}`);
      if (diag.status !== "ok" && diag.fixable) {
        console.error(pc.dim(`  → fixable with --fix`));
      }
    }

    const issues = diagnostics.filter((d) => d.status !== "ok");
    if (issues.length === 0) {
      console.error(pc.green("\nAll checks passed."));
      return;
    }

    // Apply fixes if --fix
    if (args.fix) {
      const fixable = diagnostics.filter((d) => d.fixable && d.fix);
      if (fixable.length === 0) {
        console.error(pc.yellow("\nNo auto-fixable issues found."));
        return;
      }

      console.error(pc.bold("\nApplying fixes..."));
      const fixResult = await applyFixes(ctx, diagnostics);
      if (!fixResult.ok) {
        console.error(renderError(fixResult.error));
        process.exit(1);
      }

      for (const fix of fixResult.value) {
        console.error(`${pc.green("✓")} ${fix.message}`);
      }
      console.error(pc.green(`\nFixed ${fixResult.value.length} issue(s).`));
    } else {
      const fixable = issues.filter((d) => d.fixable);
      if (fixable.length > 0) {
        console.error(
          pc.yellow(`\n${fixable.length} issue(s) can be auto-fixed. Run with --fix to repair.`),
        );
      }
    }
  },
});
