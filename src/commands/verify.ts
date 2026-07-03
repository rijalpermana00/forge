import { readFileSync } from "node:fs";
import { join } from "node:path";
import { featureDir } from "../lib/paths.js";
import { fileExists } from "../lib/template.js";
import { upsertIndexEntry, readIndex } from "../lib/index-manifest.js";
import { SPEC_FILE_NAMES } from "../lib/spec-files.js";

export function verify(feature: string): void {
  const cwd = process.cwd();
  const dir = featureDir(feature, cwd);
  console.log(`Verifying spec set for "${feature}"\n`);

  let missing = 0;
  let withTodo = 0;

  for (const file of SPEC_FILE_NAMES) {
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
