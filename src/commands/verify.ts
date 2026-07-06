import { readFileSync } from "node:fs";
import { join } from "node:path";
import { featureDir } from "../lib/paths.js";
import { fileExists } from "../lib/template.js";
import { upsertIndexEntry, readIndex } from "../lib/index-manifest.js";
import { SPEC_FILES, SPEC_FILE_NAMES } from "../lib/spec-files.js";
import { MODE_ARTIFACTS, isValidMode } from "../lib/modes.js";

export function verify(feature: string): void {
  const cwd = process.cwd();
  const dir = featureDir(feature, cwd);

  const entry = readIndex(cwd).find((e) => e.feature === feature);
  // Only check the artifacts the feature's recorded mode actually calls for —
  // schema.dbml is never scaffolded for "fe", mockup.html never for "backend",
  // so checking the full fixed list would report them MISSING forever. Fall
  // back to the full list for features with no recorded mode (created before
  // `forge blueprint` tracked one, or not registered at all).
  const applicable =
    entry && isValidMode(entry.mode)
      ? MODE_ARTIFACTS[entry.mode].map((key) => SPEC_FILES[key])
      : SPEC_FILE_NAMES;
  const skipped = SPEC_FILE_NAMES.filter((file) => !applicable.includes(file));

  console.log(
    `Verifying spec set for "${feature}"${entry && isValidMode(entry.mode) ? ` (mode: ${entry.mode})` : ""}\n`
  );

  let missing = 0;
  let withTodo = 0;

  for (const file of applicable) {
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

  for (const file of skipped) {
    console.log(`  [N/A]      ${file} (not part of mode "${entry?.mode}")`);
  }

  console.log("");
  if (missing === 0 && withTodo === 0) {
    console.log(`All spec files present and complete for "${feature}".`);

    if (entry) {
      upsertIndexEntry(cwd, feature, { status: "active" });
      console.log(`specs/INDEX.md: "${feature}" status -> active`);
    }
  } else {
    console.log(`${missing} missing, ${withTodo} with unresolved [TODO] markers.`);
    process.exitCode = 1;
  }
}
