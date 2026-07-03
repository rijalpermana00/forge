import { join } from "node:path";
import type { CommandSpec } from "../command-specs.js";
import { substitutePaths, writeCommandFiles, type Bridge } from "./shared.js";

export function renderCursor(spec: CommandSpec): string {
  // Cursor commands are plain markdown prompt templates — no frontmatter-driven
  // shell execution or argument substitution like Claude Code. The agent has its
  // own terminal tool, so instructions tell it to run the CLI command directly.
  const body = substitutePaths(spec.instructions, (file) => `specs/<feature-name>/${file}`);

  return `# forge ${spec.name}

${spec.description}.

Run in the terminal, replacing <feature-name> with the feature currently being
worked on (infer it from context, or ask if unclear):

\`\`\`
forge ${spec.name} <feature-name>
\`\`\`

${body}
`;
}

export const cursorBridge: Bridge = {
  target: "cursor",
  write(cwd, specs) {
    const dir = join(cwd, ".cursor", "commands");
    writeCommandFiles(dir, specs, (spec) => `forge-${spec.name}.md`, renderCursor);
    return `Wrote ${dir}/ (${specs.length} commands, available as /forge-<name>)`;
  },
};
