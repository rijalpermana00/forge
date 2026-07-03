import type { CommandSpec } from "../command-specs.js";
import { substitutePaths } from "./shared.js";

export function renderClaude(spec: CommandSpec): string {
  const allowedTools =
    spec.name === "verify" ? `Bash(forge verify:*), Read` : `Bash(forge ${spec.name}:*), Read, Edit`;

  const body = substitutePaths(spec.instructions, (file) => `specs/$ARGUMENTS/${file}`);

  return `---
allowed-tools: ${allowedTools}
argument-hint: ${spec.argumentHint}
description: ${spec.description}
---
Run: !\`forge ${spec.name} $ARGUMENTS\`

${body}
`;
}
