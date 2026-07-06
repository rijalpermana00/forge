import { join } from "node:path";
import type { CommandSpec } from "../command-specs.js";
import { substitutePaths, writeCommandFiles, type Bridge } from "./shared.js";

export function renderClaude(spec: CommandSpec): string {
  const allowedTools = spec.readOnly
    ? `Bash(forge ${spec.name}:*), Read`
    : spec.writesCode
      ? `Bash(forge ${spec.name}:*), Read, Write, Edit`
      : `Bash(forge ${spec.name}:*), Read, Edit`;

  // Use $1 (first positional arg), not $ARGUMENTS, for path substitution —
  // $ARGUMENTS is the whole trailing string (e.g. "my-feature --mode fe" for
  // blueprint), so it's only safe to embed in the Bash invocation line below,
  // not inline as a directory name.
  const body = substitutePaths(spec.instructions, (file) => `specs/$1/${file}`);

  return `---
allowed-tools: ${allowedTools}
argument-hint: ${spec.argumentHint}
description: ${spec.description}
---
Run: !\`forge ${spec.name} $ARGUMENTS\`

${body}
`;
}

export const claudeBridge: Bridge = {
  target: "claude",
  write(cwd, specs) {
    const dir = join(cwd, ".claude", "commands", "forge");
    writeCommandFiles(dir, specs, (spec) => `${spec.name}.md`, renderClaude);
    return `Wrote ${dir}/ (${specs.length} commands, available as /forge:<name>)`;
  },
};
