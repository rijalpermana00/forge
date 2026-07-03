import type { CommandSpec } from "../command-specs.js";
import { substitutePaths } from "./shared.js";

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
