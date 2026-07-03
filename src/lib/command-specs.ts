export interface CommandSpec {
  name: string; // forge subcommand, e.g. "schema"
  argumentHint: string; // e.g. "[feature-name]"
  description: string;
  requiresPrd: boolean;
  /** True for commands that only inspect/report — the AI reads, never edits. */
  readOnly: boolean;
  /**
   * Body instructions telling the AI what to draft after the CLI scaffold runs.
   * Use {{prd}}, {{brief}}, {{schema}}, {{contract}}, {{tasks}}, {{testcases}}
   * as placeholders — each bridge renderer substitutes its own path convention.
   */
  instructions: string;
}

// Prepended to every command that drafts a spec, so project conventions in
// specs/RULES.md always take precedence over forge's built-in defaults.
const GROUND_IN_RULES =
  "If specs/RULES.md exists, read it first and follow those project conventions — " +
  "they override any defaults described below. ";

export const COMMAND_SPECS: CommandSpec[] = [
  {
    name: "scan",
    argumentHint: "(no arguments — scans the whole project)",
    description: "Inventory the existing codebase structure into specs/CODEBASE.md",
    requiresPrd: false,
    readOnly: true,
    instructions:
      "This command scans the existing project deterministically (no code is " +
      "interpreted) and writes specs/CODEBASE.md — a factual inventory of the detected " +
      "stack, file statistics, existing schema and API files, and the directory tree. " +
      "After it runs, read specs/CODEBASE.md and use it as grounding: when drafting " +
      "schemas, contracts, or tasks later, reuse the conventions, entities, and files " +
      "that already exist here instead of inventing new ones. Don't echo the whole file " +
      "back — just confirm the stack and the spec-relevant files you found.",
  },
  {
    name: "rules",
    argumentHint: "(no arguments — scaffolds specs/RULES.md)",
    description: "Scaffold specs/RULES.md — project conventions the AI follows when drafting",
    requiresPrd: false,
    readOnly: false,
    instructions:
      "This command scaffolds specs/RULES.md — a project-level conventions file " +
      "(tech stack, naming, module structure, API/response format, data, validation, " +
      "security, testing, docs, tooling). After it runs, help the user fill the [TODO] " +
      "sections: infer what you can from specs/CODEBASE.md and the existing code, and " +
      "ask about anything you can't. Keep each rule factual and enforceable. Once " +
      "filled, every other forge drafting command must obey these rules.",
  },
  {
    name: "smelt",
    argumentHint: "[feature-name]",
    description: "Extract raw requirements into a grounding brief, then draft the PRD",
    requiresPrd: false,
    readOnly: false,
    instructions:
      GROUND_IN_RULES +
      "This command has two input modes. Default: it prompts for goal, actors, " +
      "constraints, and out-of-scope items in the terminal. With --from <file>: it " +
      "stages an existing BRD/requirements document verbatim in the feature folder as " +
      "source-brd.<ext> (extension preserved — .md, .pdf, .docx, …) and leaves " +
      "'[TODO: extract from source-brd.<ext>]' markers in {{brief}}. If a source-brd.* " +
      "file exists, read it (if your tool can't open that format — e.g. .docx — say so " +
      "and ask the user to export it to Markdown or PDF) and replace each marker in " +
      "{{brief}} with the value extracted from the document, citing the BRD section it " +
      "came from so every requirement stays traceable. Then read {{brief}} and draft " +
      "{{prd}} following the structure already stubbed there. Do not invent scope, " +
      "actors, or rules that aren't grounded in the brief or the BRD — if something's " +
      "missing, ask what to clarify instead of guessing.",
  },
  {
    name: "schema",
    argumentHint: "[feature-name]",
    description: "Scaffold schema.dbml, then draft it from prd.md",
    requiresPrd: true,
    readOnly: false,
    instructions:
      GROUND_IN_RULES +
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
    readOnly: false,
    instructions:
      GROUND_IN_RULES +
      "Read {{prd}} and fill {{contract}}. Use exactly this format per endpoint, " +
      "one block per endpoint, no deviation:\n\n" +
      "Title: [short name]\n" +
      "endpoint: [METHOD] [path]\n" +
      "Request: [params/body]\n" +
      "Response: [full JSON example]\n" +
      "Note: [only if needed]",
  },
  {
    name: "mockup",
    argumentHint: "[feature-name]",
    description: "Scaffold mockup.html, then draft it from prd.md",
    requiresPrd: true,
    readOnly: false,
    instructions:
      GROUND_IN_RULES +
      "Read {{prd}} and fill {{mockup}} — a throwaway wireframe (plain HTML/CSS, no " +
      "framework, no build step) covering the screens/states implied by the PRD's user " +
      "stories: primary view, secondary views or modals, and empty/loading/error states " +
      "where the PRD calls for them. This is for reviewing flow and layout, not visual " +
      "design or production markup — don't invent screens, fields, or copy that aren't " +
      "traceable to the PRD.",
  },
  {
    name: "tasks",
    argumentHint: "[feature-name]",
    description: "Scaffold tasks.md, then draft it from prd.md",
    requiresPrd: true,
    readOnly: false,
    instructions:
      GROUND_IN_RULES +
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
    readOnly: false,
    instructions:
      GROUND_IN_RULES +
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
    readOnly: true,
    instructions:
      "Summarize the command output in one or two sentences. If anything is missing " +
      "or has unresolved [TODO] markers, say exactly which file and what's needed — " +
      "don't just say 'some files are incomplete.'",
  },
];
