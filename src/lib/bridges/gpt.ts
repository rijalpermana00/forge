import { join } from "node:path";
import type { CommandSpec } from "../command-specs.js";
import { substitutePaths, writeCommandFiles, type Bridge } from "./shared.js";

export function renderGpt(spec: CommandSpec): string {
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

Use this prompt in GPT/ChatGPT while working in the project repository.

${featureStep}

\`\`\`
${command}
\`\`\`

${bodyStep}. ${body.replace(/\n/g, "\n   ")}
`;
}

export const gptBridge: Bridge = {
  target: "gpt",
  write(cwd, specs) {
    const dir = join(cwd, ".gpt", "commands");
    writeCommandFiles(dir, specs, (spec) => `forge-${spec.name}.md`, renderGpt);
    return `Wrote ${dir}/ (${specs.length} GPT prompt files, use as /forge-<name> reference prompts)`;
  },
};
