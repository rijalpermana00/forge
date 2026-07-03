export interface CommandSpec {
  name: string; // forge subcommand, e.g. "schema"
  argumentHint: string; // e.g. "[feature-name]"
  description: string;
  requiresPrd: boolean;
  /**
   * Body instructions telling the AI what to draft after the CLI scaffold runs.
   * Use {{prd}}, {{brief}}, {{schema}}, {{contract}}, {{tasks}}, {{testcases}}
   * as placeholders — each bridge renderer substitutes its own path convention.
   */
  instructions: string;
}

export const COMMAND_SPECS: CommandSpec[] = [
  {
    name: "smelt",
    argumentHint: "[feature-name]",
    description: "Extract raw requirements into a grounding brief, then draft the PRD",
    requiresPrd: false,
    instructions:
      "This command is interactive — it prompts for goal, actors, constraints, and " +
      "out-of-scope items in the terminal. Once it completes, read {{brief}} and " +
      "draft {{prd}} following the structure already stubbed there. Do not invent " +
      "scope, actors, or rules that aren't grounded in the brief — if something's " +
      "missing, ask what to clarify instead of guessing.",
  },
  {
    name: "schema",
    argumentHint: "[feature-name]",
    description: "Scaffold schema.dbml, then draft it from prd.md",
    requiresPrd: true,
    instructions:
      "Read {{prd}} and fill {{schema}} with tables, columns, and relationships that " +
      "are directly traceable to entities, actors, or business rules in the PRD. " +
      "Follow existing DBML conventions in this repo (multi-tenant RLS pattern, " +
      "tenant_id scoping, Drizzle-compatible types) if a reference schema exists " +
      "elsewhere in the project.",
  },
  {
    name: "contract",
    argumentHint: "[feature-name]",
    description: "Scaffold api-contract.md, then draft it from prd.md",
    requiresPrd: true,
    instructions:
      "Read {{prd}} and fill {{contract}}. Use exactly this format per endpoint, " +
      "one block per endpoint, no deviation:\n\n" +
      "Title: [short name]\n" +
      "endpoint: [METHOD] [path]\n" +
      "Request: [params/body]\n" +
      "Response: [full JSON example]\n" +
      "Note: [only if needed]",
  },
  {
    name: "tasks",
    argumentHint: "[feature-name]",
    description: "Scaffold tasks.md, then draft it from prd.md",
    requiresPrd: true,
    instructions:
      "Read {{prd}} and {{schema}} (if present), then fill {{tasks}}. Sequence " +
      "strictly: data/schema tasks before logic tasks before UI tasks. Call out any " +
      "dependency inversion explicitly rather than silently reordering — if the PRD " +
      "implies model or logic work before its data source exists, flag it instead of " +
      "hiding it.",
  },
  {
    name: "testcase",
    argumentHint: "[feature-name]",
    description: "Scaffold testcases.md, then draft it from prd.md",
    requiresPrd: true,
    instructions:
      "Read {{prd}} and fill {{testcases}}. Use exactly this table format, one row " +
      "per scenario, do not change columns:\n\n" +
      "| No | Test Scenario | Test Case | Test Type | Expected Result | Actual Result | Status | Remark |\n" +
      "| ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ |\n\n" +
      "Test Type must be exactly **Positive** or **Negative** (bolded). Actual Result " +
      "and Status stay as `-` until QA runs them manually.",
  },
  {
    name: "verify",
    argumentHint: "[feature-name]",
    description: "Check spec completeness and report gaps",
    requiresPrd: false,
    instructions:
      "Summarize the command output in one or two sentences. If anything is missing " +
      "or has unresolved [TODO] markers, say exactly which file and what's needed — " +
      "don't just say 'some files are incomplete.'",
  },
];
