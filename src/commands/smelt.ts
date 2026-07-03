import prompts from "prompts";
import { join } from "node:path";
import { featureDir, templatesDir } from "../lib/paths.js";
import { readTemplate, renderTemplate, writeIfAbsent, fileExists } from "../lib/template.js";
import { upsertIndexEntry, readIndex } from "../lib/index-manifest.js";
import { SPEC_FILES } from "../lib/spec-files.js";

export async function smelt(feature: string): Promise<void> {
  const cwd = process.cwd();
  const dir = featureDir(feature, cwd);
  const briefPath = join(dir, SPEC_FILES.brief);
  const prdPath = join(dir, SPEC_FILES.prd);

  if (fileExists(briefPath)) {
    console.log(`brief.md already exists for "${feature}": ${briefPath}`);
    console.log("Delete it manually if you want to re-run smelting from scratch.");
    return;
  }

  console.log(`Smelting: ${feature}\n`);

  const existingFeatures = readIndex(cwd).map((e) => e.feature);
  if (existingFeatures.length > 0) {
    console.log(`Existing features: ${existingFeatures.join(", ")}\n`);
  }

  const answers = await prompts([
    { type: "text", name: "goal", message: "One-sentence goal — what must this feature deliver?" },
    { type: "text", name: "actors", message: "Who are the actors/roles involved?" },
    { type: "text", name: "constraints", message: "Key constraints (regulatory, technical, deadline)?" },
    { type: "text", name: "outOfScope", message: "What's explicitly OUT of scope?" },
    {
      type: "text",
      name: "dependsOn",
      message: "Does this depend on another existing feature? (feature name, or leave blank)",
    },
  ]);

  if (!answers.goal) {
    console.log("Smelting cancelled.");
    return;
  }

  const briefRaw = readTemplate(join(templatesDir, SPEC_FILES.brief));
  const brief = renderTemplate(briefRaw, {
    feature,
    date: new Date().toISOString().slice(0, 10),
    goal: answers.goal ?? "",
    actors: answers.actors ?? "",
    constraints: answers.constraints ?? "",
    outOfScope: answers.outOfScope ?? "",
  });
  writeIfAbsent(briefPath, brief);

  const prdRaw = readTemplate(join(templatesDir, SPEC_FILES.prd));
  const prd = renderTemplate(prdRaw, { feature });
  const prdWritten = writeIfAbsent(prdPath, prd);

  const dependsOn: string = answers.dependsOn?.trim() || "-";
  upsertIndexEntry(cwd, feature, { status: "draft", dependsOn });

  console.log(`\nWrote ${briefPath}`);
  if (prdWritten) console.log(`Wrote ${prdPath} (stub)`);
  console.log(`Registered "${feature}" in specs/INDEX.md`);
  console.log(
    `\nNext: open this project in your AI tool and draft prd.md from brief.md ` +
      `— use the /forge:smelt, /forge-smelt, or AGENTS.md instructions, depending ` +
      `on which bridge you initialized.`
  );
}
