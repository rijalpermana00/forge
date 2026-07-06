import { type SpecKey } from "./spec-files.js";

export type BlueprintMode = "fe" | "backend" | "fullstack";

/**
 * Which spec artifacts apply to each mode. `brief`/`prd` and `tasks`/`testcases`
 * are universal — `schema` only makes sense where a data layer is being built,
 * `mockup` only where a UI is being built.
 */
export const MODE_ARTIFACTS: Record<BlueprintMode, SpecKey[]> = {
  fe: ["brief", "prd", "mockup", "contract", "tasks", "testcases"],
  backend: ["brief", "prd", "schema", "contract", "tasks", "testcases"],
  fullstack: ["brief", "prd", "schema", "contract", "mockup", "tasks", "testcases"],
};

export function isValidMode(mode: string): mode is BlueprintMode {
  return mode === "fe" || mode === "backend" || mode === "fullstack";
}
