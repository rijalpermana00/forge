#!/usr/bin/env bun
import { Command } from "commander";
import { init } from "./commands/init.js";
import { smelt } from "./commands/smelt.js";
import { makeScaffoldCommand } from "./commands/scaffold.js";
import { verify } from "./commands/verify.js";
import { bridge } from "./commands/bridge.js";

const program = new Command();

program
  .name("forge")
  .description("Spec-driven development CLI — scaffolds specs, schemas, API contracts, tasks, and test cases.")
  .version("0.1.0");

program
  .command("init")
  .description("Scaffold specs/ folder and an AI-tool bridge in the current project")
  .option("-t, --target <target>", "bridge target: claude, cursor, windsurf, or generic", "claude")
  .action((options) => init({ target: options.target }));

program
  .command("bridge <target>")
  .description("(Re)generate AI-tool bridge commands: claude, cursor, windsurf, or generic")
  .action((target) => bridge(target));

program
  .command("smelt <feature>")
  .description("Extract raw requirements into a grounding brief and stub the PRD")
  .action(smelt);

program
  .command("schema <feature>")
  .description("Scaffold schema.dbml (requires prd.md)")
  .action(makeScaffoldCommand({ templateFile: "schema.dbml", outputFile: "schema.dbml", label: "schema" }));

program
  .command("contract <feature>")
  .description("Scaffold api-contract.md (requires prd.md)")
  .action(
    makeScaffoldCommand({ templateFile: "api-contract.md", outputFile: "api-contract.md", label: "contract" })
  );

program
  .command("tasks <feature>")
  .description("Scaffold tasks.md WBS (requires prd.md)")
  .action(makeScaffoldCommand({ templateFile: "tasks.md", outputFile: "tasks.md", label: "tasks" }));

program
  .command("testcase <feature>")
  .description("Scaffold testcases.md (requires prd.md)")
  .action(makeScaffoldCommand({ templateFile: "testcases.md", outputFile: "testcases.md", label: "testcase" }));

program
  .command("verify <feature>")
  .description("Check that all spec files exist and have no unresolved [TODO] markers")
  .action(verify);

program.parse();
