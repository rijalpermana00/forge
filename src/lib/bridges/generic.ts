import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CommandSpec } from "../command-specs.js";
import { substitutePaths, type Bridge } from "./shared.js";

export function renderGeneric(specs: CommandSpec[]): string {
  const sections = specs
    .map((spec) => {
      const body = substitutePaths(spec.instructions, (file) => `specs/<feature-name>/${file}`);
      return `## forge ${spec.name}

${spec.description}.

\`\`\`
forge ${spec.name} <feature-name>
\`\`\`

${body}`;
    })
    .join("\n\n---\n\n");

  return `# Agent Instructions — forge spec workflow

This project uses the \`forge\` CLI for spec-driven development. Whichever AI
tool you're using, follow this workflow: run the \`forge\` command in the
terminal, then draft the resulting stub file grounded in the feature's
\`prd.md\`. Never invent scope, entities, or rules that aren't traceable back
to the PRD.

Replace <feature-name> below with the actual feature folder under \`specs/\`.

---

${sections}
`;
}

export const genericBridge: Bridge = {
  target: "generic",
  write(cwd, specs) {
    const path = join(cwd, "AGENTS.md");
    writeFileSync(path, renderGeneric(specs), "utf-8");
    return `Wrote ${path} — point any AI tool at this file for the forge workflow.`;
  },
};
