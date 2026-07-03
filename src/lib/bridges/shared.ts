import type { CommandSpec } from "../command-specs.js";

/**
 * Substitutes {{prd}}, {{brief}}, {{schema}}, {{contract}}, {{tasks}}, {{testcases}}
 * placeholders in a spec's instructions using the given path prefix function.
 */
export function substitutePaths(instructions: string, pathFor: (file: string) => string): string {
  return instructions
    .replace(/\{\{prd\}\}/g, pathFor("prd.md"))
    .replace(/\{\{brief\}\}/g, pathFor("brief.md"))
    .replace(/\{\{schema\}\}/g, pathFor("schema.dbml"))
    .replace(/\{\{contract\}\}/g, pathFor("api-contract.md"))
    .replace(/\{\{tasks\}\}/g, pathFor("tasks.md"))
    .replace(/\{\{testcases\}\}/g, pathFor("testcases.md"));
}

export function commandFileName(spec: CommandSpec, ext: string): string {
  return `${spec.name}.${ext}`;
}
