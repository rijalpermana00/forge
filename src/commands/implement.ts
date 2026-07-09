import { join } from "node:path";
import { featureDir, specsDir } from "../lib/paths.js";
import { fileExists } from "../lib/template.js";
import { SPEC_FILES, SPEC_FILE_NAMES } from "../lib/spec-files.js";
import { findMockupFile } from "../lib/mockup.js";

/**
 * Unlike the scaffold commands, `implement` never writes a spec file — it
 * only checks that the plan it's about to ground code in actually exists,
 * then reports which grounding files are present so the AI knows what it
 * can and can't lean on before writing application code.
 */
export function implement(feature: string): void {
  const cwd = process.cwd();
  const dir = featureDir(feature, cwd);
  const tasksPath = join(dir, SPEC_FILES.tasks);

  if (!fileExists(tasksPath)) {
    console.error(
      `No tasks.md found for "${feature}". Run "forge tasks ${feature}" first ` +
        `so implementation follows a sequenced plan instead of ad-hoc scope.`
    );
    process.exitCode = 1;
    return;
  }

  console.log(`Implementing: ${feature}\n`);
  console.log(`Grounding files:`);
  for (const file of SPEC_FILE_NAMES) {
    if (file === SPEC_FILES.mockup) {
      const found = findMockupFile(dir);
      console.log(`  ${found ? "[OK] " : "[--] "} specs/${feature}/${found ?? "mockup.*"}`);
      continue;
    }
    const path = join(dir, file);
    console.log(`  ${fileExists(path) ? "[OK] " : "[--] "} specs/${feature}/${file}`);
  }
  const rulesPath = join(specsDir(cwd), "RULES.md");
  console.log(`  ${fileExists(rulesPath) ? "[OK] " : "[--] "} specs/RULES.md`);

  console.log(
    `\nNext: work through specs/${feature}/tasks.md in order — data/schema tasks, ` +
      `then logic, then UI. Ground every change in schema.dbml, api-contract.md, and ` +
      `specs/RULES.md (if present); don't invent scope beyond prd.md. Once done, run ` +
      `through testcases.md manually and fill in Actual Result / Status.`
  );
}
