import { readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { featureDir } from "../lib/paths.js";
import { fileExists } from "../lib/template.js";
import { upsertIndexEntry, readIndex } from "../lib/index-manifest.js";
import { SPEC_FILES, OPTIONAL_SPEC_KEYS, type SpecKey } from "../lib/spec-files.js";
import { MODE_ARTIFACTS, isValidMode } from "../lib/modes.js";
import { findMockupFile } from "../lib/mockup.js";

const ALL_KEYS = Object.keys(SPEC_FILES) as SpecKey[];

// [TODO] markers only ever get scanned for in text formats — an image or PDF
// mockup can't contain them, and reading a binary file as utf-8 to scan it
// would be both wasteful and meaningless.
const TEXT_MOCKUP_EXTS = new Set([".html", ".md", ".txt"]);

export function verify(feature: string): void {
  const cwd = process.cwd();
  const dir = featureDir(feature, cwd);

  const entry = readIndex(cwd).find((e) => e.feature === feature);
  // Only check the artifacts the feature's recorded mode actually calls for —
  // schema.dbml is never scaffolded for "fe", mockup.html never for "backend",
  // so checking the full fixed list would report them MISSING forever. Fall
  // back to the full list for features with no recorded mode (created before
  // `forge blueprint` tracked one, or not registered at all).
  const mode = entry && isValidMode(entry.mode) ? entry.mode : undefined;
  const applicable = mode ? MODE_ARTIFACTS[mode] : ALL_KEYS;
  const skipped = ALL_KEYS.filter((key) => !applicable.includes(key));

  console.log(`Verifying spec set for "${feature}"${mode ? ` (mode: ${mode})` : ""}\n`);

  let missing = 0;
  let withTodo = 0;

  for (const key of applicable) {
    const optional = OPTIONAL_SPEC_KEYS.includes(key);
    const tag = optional ? "OPTIONAL, " : "";

    // mockup is satisfied by any mockup.* file, not just the generated
    // mockup.html — a dropped-in design export counts.
    const file = key === "mockup" ? (findMockupFile(dir) ?? SPEC_FILES.mockup) : SPEC_FILES[key];
    const path = join(dir, file);

    if (!fileExists(path)) {
      console.log(`  [${tag}MISSING]  ${key === "mockup" ? "mockup.*" : file}`);
      if (!optional) missing++;
      continue;
    }
    if (key === "mockup" && !TEXT_MOCKUP_EXTS.has(extname(file).toLowerCase())) {
      console.log(`  [OK]       ${file}`);
      continue;
    }
    const content = readFileSync(path, "utf-8");
    const todoCount = (content.match(/\[TODO/g) || []).length;
    if (todoCount > 0) {
      console.log(`  [${tag}TODO x${todoCount}]  ${file}`);
      if (!optional) withTodo++;
    } else {
      console.log(`  [OK]       ${file}`);
    }
  }

  for (const key of skipped) {
    console.log(`  [N/A]      ${SPEC_FILES[key]} (not part of mode "${entry?.mode}")`);
  }

  console.log("");
  if (missing === 0 && withTodo === 0) {
    console.log(`All required spec files present and complete for "${feature}".`);

    if (entry) {
      upsertIndexEntry(cwd, feature, { status: "active" });
      console.log(`specs/INDEX.md: "${feature}" status -> active`);
    }
  } else {
    console.log(`${missing} missing, ${withTodo} with unresolved [TODO] markers.`);
    process.exitCode = 1;
  }
}
