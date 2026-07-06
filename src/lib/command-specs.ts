export interface CommandSpec {
  name: string; // forge subcommand, e.g. "schema"
  argumentHint: string; // e.g. "[feature-name]"
  description: string;
  requiresPrd: boolean;
  /** True for commands that only inspect/report — the AI reads, never edits. */
  readOnly: boolean;
  /** True for commands where the AI writes application code outside specs/ — needs Write, not just Edit. */
  writesCode?: boolean;
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
    name: "blueprint",
    argumentHint: "[feature-name] --mode <fe|backend|fullstack> [--from <file>...]",
    description:
      "Generate the full spec set (brief, prd, schema, contract, tasks, testcases, rules) for a mode; " +
      "omit the feature name to backfill every registered feature",
    requiresPrd: false,
    readOnly: false,
    instructions:
      GROUND_IN_RULES +
      "With a feature name, this command creates or backfills that one feature's spec " +
      "set, scoped to --mode: fe scaffolds brief, prd, api-contract, tasks, testcases " +
      "(no schema — a frontend consumes an existing API, it doesn't define the data " +
      "layer); backend scaffolds brief, prd, schema, api-contract, tasks, testcases; " +
      "fullstack scaffolds all of them, schema included. mockup.html is never " +
      "auto-scaffolded by this command in any mode — run `forge mockup <feature>` " +
      "on demand for a wireframe stub, or drop a design export straight into the " +
      "feature folder as mockup.<ext> (mockup.png, mockup.pdf, ...); either satisfies " +
      "the mockup artifact for `forge verify`, and it's advisory only — never blocks a " +
      "feature from going active. The mode is recorded in specs/INDEX.md the first time " +
      "a feature is blueprinted, and reused on every later run for that feature " +
      "regardless of --mode. It also scaffolds specs/RULES.md if that doesn't exist yet, " +
      "and skips any file that's already present instead of overwriting it.\n\n" +
      "For a brand-new feature (no brief.md yet), it has two input modes: with --from " +
      "<file>... (repeatable), it stages each file verbatim into the feature folder as " +
      "source-<original-filename> and leaves '[TODO: extract from ...]' markers in " +
      "{{brief}} for you to fill from those files, citing where each value came from so " +
      "requirements stay traceable; without --from, it prompts interactively in the " +
      "terminal for goal, actors, constraints, and out-of-scope items instead — let that " +
      "prompt run and relay the user's answers rather than answering on their behalf.\n\n" +
      "Without a feature name, this backfills every feature already registered in " +
      "specs/INDEX.md using each row's own recorded Mode — only missing files are " +
      "written, nothing already drafted is touched. Use this after adding new project " +
      "conventions, or after new features were registered by someone else, to catch " +
      "every feature's spec set up.\n\n" +
      "Whichever path ran, read every grounding file available (staged source files, " +
      "{{brief}}, {{prd}}, specs/RULES.md) and fill each scaffolded stub in dependency " +
      "order — brief, then prd, then schema (if scaffolded), then api-contract, then " +
      "tasks, then testcases — so later files can reference entities and endpoints " +
      "defined earlier. Use the same fixed formats the individual commands use: the " +
      "Title/endpoint/Request/Response/Note block per endpoint in api-contract.md, and " +
      "the No/Test Scenario/Test Case/Test Type/Expected Result/" +
      "Actual Result/Status/Remark table in testcases.md (Test Type must be exactly " +
      "**Positive** or **Negative**, Actual Result and Status stay `-`). Do not invent " +
      "scope, entities, or endpoints that aren't traceable to the grounding material — " +
      "if something's missing, ask instead of guessing.",
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
    description: "Scaffold mockup.html, then draft it from prd.md — or skip it if a design export already exists",
    requiresPrd: true,
    readOnly: false,
    instructions:
      GROUND_IN_RULES +
      "If the feature folder already has a mockup.* file (mockup.png, mockup.pdf, a " +
      "designer's export, ...), the CLI leaves it alone and skips writing mockup.html — " +
      "nothing more to do here. Otherwise, read {{prd}} and fill {{mockup}} — a throwaway " +
      "wireframe (plain HTML/CSS, no framework, no build step) covering the " +
      "screens/states implied by the PRD's user stories: primary view, secondary views " +
      "or modals, and empty/loading/error states where the PRD calls for them. This is " +
      "for reviewing flow and layout, not visual design or production markup — don't " +
      "invent screens, fields, or copy that aren't " +
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
    name: "implement",
    argumentHint: "[feature-name]",
    description: "Work through tasks.md and write the actual code for the feature",
    requiresPrd: true,
    readOnly: false,
    writesCode: true,
    instructions:
      GROUND_IN_RULES +
      "This command doesn't scaffold a spec file — it checks that {{tasks}} exists " +
      "and reports which grounding files (prd, schema, contract, tasks, testcases, " +
      "mockup, RULES.md) are present. Read all of them, then implement the feature: " +
      "follow {{tasks}}'s sequencing literally (data/schema before logic before UI, " +
      "don't reorder around a missing dependency — flag it instead), match {{schema}} " +
      "for the data layer and {{contract}} exactly for endpoint shapes, use {{mockup}} " +
      "only as a layout/flow reference (not final markup), and don't invent scope, " +
      "fields, or endpoints that aren't traceable to {{prd}}. Once implemented, run " +
      "through {{testcases}} manually and report which rows pass so the user can fill " +
      "in Actual Result / Status.",
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
