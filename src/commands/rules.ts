import { join } from "node:path";
import { specsDir, templatesDir } from "../lib/paths.js";
import { readTemplate, writeIfAbsent } from "../lib/template.js";

export function rules(): void {
  const cwd = process.cwd();
  const outPath = join(specsDir(cwd), "RULES.md");

  const raw = readTemplate(join(templatesDir, "rules.md"));
  const written = writeIfAbsent(outPath, raw);

  if (!written) {
    console.log(`${outPath} already exists — edit it directly, or delete it to regenerate the template.`);
    return;
  }

  console.log(`Wrote ${outPath}`);
  console.log(`  Fill in the [TODO] sections with your project's conventions.`);
  console.log(
    `\nEvery forge drafting command (smelt, schema, contract, tasks, testcase) ` +
      `will ground the AI in these rules.`
  );
}
