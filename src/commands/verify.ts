import { readFileSync } from "node:fs";
import { join } from "node:path";
import { featureDir } from "../lib/paths.js";
import { fileExists } from "../lib/template.js";
import { upsertIndexEntry, readIndex } from "../lib/index-manifest.js";

const REQUIRED_FILES = ["brief.md", "prd.md", "schema.dbml", "api-contract.md", "tasks.md", "testcases.md"];

export function verify(feature: string): void {
  const cwd = process.cwd();
  const dir = featureDir(feature, cwd);
  console.log(`Verifying spec set for "${feature}"\n`);

  let missing = 0;
  let withTodo = 0;

  for (const file of REQUIRED_FILES) {
    const path = join(dir, file);
    if (!fileExists(path)) {
      console.log(`  [MISSING]  ${file}`);
      missing++;
      continue;
    }
    const content = readFileSync(path, "utf-8");
    const todoCount = (content.match(/\[TODO/g) || []).length;
    if (todoCount > 0) {
      console.log(`  [TODO x${todoCount}]  ${file}`);
      withTodo++;
    } else {
      console.log(`  [OK]       ${file}`);
    }
  }

  console.log("");
  if (missing === 0 && withTodo === 0) {
    console.log(`All spec files present and complete for "${feature}".`);

    const indexed = readIndex(cwd).some((e) => e.feature === feature);
    if (indexed) {
      upsertIndexEntry(cwd, feature, { status: "active" });
      console.log(`specs/INDEX.md: "${feature}" status -> active`);
    }
  } else {
    console.log(`${missing} missing, ${withTodo} with unresolved [TODO] markers.`);
    process.exitCode = 1;
  }
}
