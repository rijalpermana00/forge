import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CommandSpec } from "../command-specs.js";
import { SPEC_FILES } from "../spec-files.js";

/**
 * A bridge renders the shared COMMAND_SPECS into one AI tool's native format
 * and writes them into that tool's expected location. Each target owns its own
 * directory + file-naming convention here, so adding a new bridge is a new
 * module + one registry entry — no edits to the dispatcher (Open/Closed).
 */
export interface Bridge {
  target: string;
  /** Write this target's files under `cwd`; return a one-line summary to log. */
  write(cwd: string, specs: CommandSpec[]): string;
}

/**
 * Substitutes {{prd}}, {{brief}}, {{schema}}, {{contract}}, {{tasks}},
 * {{testcases}} placeholders in a spec's instructions using the given path
 * prefix function. The token set is derived from SPEC_FILES so it can't drift
 * from the canonical artifact list.
 */
export function substitutePaths(instructions: string, pathFor: (file: string) => string): string {
  let out = instructions;
  for (const [key, file] of Object.entries(SPEC_FILES)) {
    out = out.replaceAll(`{{${key}}}`, pathFor(file));
  }
  return out;
}

/**
 * Shared IO for per-command bridges (claude/cursor/windsurf): ensure `dir`
 * exists, then render + write one file per spec. `fileName` and `render` are
 * the only things that vary between those targets.
 */
export function writeCommandFiles(
  dir: string,
  specs: CommandSpec[],
  fileName: (spec: CommandSpec) => string,
  render: (spec: CommandSpec) => string
): void {
  mkdirSync(dir, { recursive: true });
  for (const spec of specs) {
    writeFileSync(join(dir, fileName(spec)), render(spec), "utf-8");
  }
}
