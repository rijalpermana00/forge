import { join } from "node:path";
import type { CommandSpec } from "../command-specs.js";
import { substitutePaths, writeCommandFiles, type Bridge } from "./shared.js";

export function renderWindsurf(spec: CommandSpec): string {
  const body = substitutePaths(spec.instructions, (file) => `specs/<feature-name>/${file}`);

  return `---
name: forge-${spec.name}
description: ${spec.description}
auto_execute_steps:
  - run_command
  - read_file
---
# forge ${spec.name}

Steps:

1. Run \`forge ${spec.name} <feature-name>\` in the terminal — replace
   <feature-name> with the feature currently being worked on (infer from
   context, or ask if unclear).
2. ${body.replace(/\n/g, "\n   ")}
`;
}

export const windsurfBridge: Bridge = {
  target: "windsurf",
  write(cwd, specs) {
    const dir = join(cwd, ".windsurf", "workflows");
    writeCommandFiles(dir, specs, (spec) => `forge-${spec.name}.md`, renderWindsurf);
    return `Wrote ${dir}/ (${specs.length} workflows, available as /forge-<name>)`;
  },
};
