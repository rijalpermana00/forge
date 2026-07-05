#!/usr/bin/env node
import { createRequire } from "node:module";
import { Command } from "commander";
import { init } from "./commands/init.js";
import { smelt } from "./commands/smelt.js";
import { makeScaffoldCommand } from "./commands/scaffold.js";
import { implement } from "./commands/implement.js";
import { verify } from "./commands/verify.js";
import { bridge } from "./commands/bridge.js";
import { scan } from "./commands/scan.js";
import { rules } from "./commands/rules.js";
import { SPEC_FILES } from "./lib/spec-files.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const program = new Command();

program
  .name("forge")
  .description("Spec-driven development CLI — scaffolds specs, schemas, API contracts, tasks, and test cases.")
  .version(version);

program
  .command("init")
  .description("Scaffold specs/ folder and an AI-tool bridge in the current project")
  .option("-t, --target <target>", "bridge target: claude, cursor, windsurf, gpt, codex, or generic", "claude")
  .action((options) => init({ target: options.target }));

program
  .command("bridge <target>")
  .description("(Re)generate AI-tool bridge commands: claude, cursor, windsurf, gpt, codex, or generic")
  .action((target) => bridge(target));

program
  .command("scan")
  .description("Inventory the existing project structure into specs/CODEBASE.md")
  .option("-d, --depth <n>", "directory-tree depth to include in the report", "2")
  .action((options) => scan({ depth: Number(options.depth) }));

program
  .command("rules")
  .description("Scaffold specs/RULES.md — project conventions the AI follows when drafting")
  .action(() => rules());

program
  .command("smelt <feature>")
  .description("Extract raw requirements into a grounding brief and stub the PRD")
  .option(
    "-f, --from <file>",
    "extract from an existing BRD/requirements document instead of interactive Q&A"
  )
  .action((feature, options) => smelt(feature, { from: options.from }));

program
  .command("schema <feature>")
  .description("Scaffold schema.dbml (requires prd.md)")
  .action(makeScaffoldCommand({ file: SPEC_FILES.schema, label: "schema" }));

program
  .command("contract <feature>")
  .description("Scaffold api-contract.md (requires prd.md)")
  .action(makeScaffoldCommand({ file: SPEC_FILES.contract, label: "contract" }));

program
  .command("mockup <feature>")
  .description("Scaffold mockup.html (requires prd.md)")
  .action(makeScaffoldCommand({ file: SPEC_FILES.mockup, label: "mockup" }));

program
  .command("tasks <feature>")
  .description("Scaffold tasks.md WBS (requires prd.md)")
  .action(makeScaffoldCommand({ file: SPEC_FILES.tasks, label: "tasks" }));

program
  .command("testcase <feature>")
  .description("Scaffold testcases.md (requires prd.md)")
  .action(makeScaffoldCommand({ file: SPEC_FILES.testcases, label: "testcase" }));

program
  .command("implement <feature>")
  .description("Check the spec set is ready for coding, and report which grounding files exist (requires tasks.md)")
  .action(implement);

program
  .command("verify <feature>")
  .description("Check that all spec files exist and have no unresolved [TODO] markers")
  .action(verify);

program.parse();
