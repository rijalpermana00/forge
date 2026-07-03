/**
 * The canonical set of spec artifacts a feature can have, defined once.
 *
 * Every other module derives its file names from here instead of hardcoding
 * them, so renaming an artifact or adding a new one is a single edit:
 *   - keys match the {{placeholder}} tokens used in command-specs.ts
 *   - values are the on-disk file names under specs/<feature>/
 */
export const SPEC_FILES = {
  brief: "brief.md",
  prd: "prd.md",
  schema: "schema.dbml",
  contract: "api-contract.md",
  tasks: "tasks.md",
  testcases: "testcases.md",
} as const;

export type SpecKey = keyof typeof SPEC_FILES;

/** All spec file names, in declaration order. */
export const SPEC_FILE_NAMES: string[] = Object.values(SPEC_FILES);
