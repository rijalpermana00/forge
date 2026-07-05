import { join } from "node:path";
import type { CommandSpec } from "../command-specs.js";
import { substitutePaths, writeCommandFiles, type Bridge } from "./shared.js";

export function renderCodex(spec: CommandSpec): string {
  const body = substitutePaths(spec.instructions, (file) => `specs/<feature-name>/${file}`);
  const hasFeatureArg = !spec.argumentHint.startsWith("(");
  const command = `forge ${spec.name}${hasFeatureArg ? " <feature-name>" : ""}`;
  const featureStep = hasFeatureArg
    ? "1. Identify the active feature folder under `specs/`. If it is unclear, ask for\n" +
      "   the feature name before continuing.\n" +
      "2. Run this command in the project terminal, replacing <feature-name>:\n"
    : "1. Run this command in the project terminal:\n";
  const bodyStep = hasFeatureArg ? "3" : "2";

  return `# forge ${spec.name}

${spec.description}.

Use this prompt with Codex while working in the shared repository workspace.

${featureStep}

\`\`\`
${command}
\`\`\`

${bodyStep}. ${body.replace(/\n/g, "\n   ")}
`;
}

export const codexBridge: Bridge = {
  target: "codex",
  write(cwd, specs) {
    const dir = join(cwd, ".codex", "commands");
    writeCommandFiles(dir, specs, (spec) => `forge-${spec.name}.md`, renderCodex);
    return `Wrote ${dir}/ (${specs.length} Codex prompt files, use as /forge-<name> reference prompts)`;
  },
};
