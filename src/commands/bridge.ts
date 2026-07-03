import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { COMMAND_SPECS } from "../lib/command-specs.js";
import { renderClaude } from "../lib/bridges/claude.js";
import { renderCursor } from "../lib/bridges/cursor.js";
import { renderWindsurf } from "../lib/bridges/windsurf.js";
import { renderGeneric } from "../lib/bridges/generic.js";

export type BridgeTarget = "claude" | "cursor" | "windsurf" | "generic";

export function bridge(target: string, cwd: string = process.cwd()): void {
  switch (target) {
    case "claude": {
      const dir = join(cwd, ".claude", "commands", "forge");
      mkdirSync(dir, { recursive: true });
      for (const spec of COMMAND_SPECS) {
        writeFileSync(join(dir, `${spec.name}.md`), renderClaude(spec), "utf-8");
      }
      console.log(`Wrote ${dir}/ (${COMMAND_SPECS.length} commands, available as /forge:<name>)`);
      break;
    }
    case "cursor": {
      const dir = join(cwd, ".cursor", "commands");
      mkdirSync(dir, { recursive: true });
      for (const spec of COMMAND_SPECS) {
        writeFileSync(join(dir, `forge-${spec.name}.md`), renderCursor(spec), "utf-8");
      }
      console.log(`Wrote ${dir}/ (${COMMAND_SPECS.length} commands, available as /forge-<name>)`);
      break;
    }
    case "windsurf": {
      const dir = join(cwd, ".windsurf", "workflows");
      mkdirSync(dir, { recursive: true });
      for (const spec of COMMAND_SPECS) {
        writeFileSync(join(dir, `forge-${spec.name}.md`), renderWindsurf(spec), "utf-8");
      }
      console.log(`Wrote ${dir}/ (${COMMAND_SPECS.length} workflows, available as /forge-<name>)`);
      break;
    }
    case "generic": {
      const path = join(cwd, "AGENTS.md");
      writeFileSync(path, renderGeneric(COMMAND_SPECS), "utf-8");
      console.log(`Wrote ${path} — point any AI tool at this file for the forge workflow.`);
      break;
    }
    default:
      console.error(`Unknown bridge target "${target}". Valid targets: claude, cursor, windsurf, generic.`);
      process.exitCode = 1;
  }
}
