import { join } from "node:path";
import { featureDir, templatesDir } from "../lib/paths.js";
import { readTemplate, renderTemplate, writeIfAbsent, fileExists } from "../lib/template.js";

interface ScaffoldOptions {
  templateFile: string; // e.g. "schema.dbml"
  outputFile: string; // e.g. "schema.dbml"
  label: string; // e.g. "schema"
}

export function makeScaffoldCommand({ templateFile, outputFile, label }: ScaffoldOptions) {
  return (feature: string) => {
    const dir = featureDir(feature);
    const prdPath = join(dir, "prd.md");
    const outPath = join(dir, outputFile);

    if (!fileExists(prdPath)) {
      console.error(
        `No prd.md found for "${feature}". Run "forge smelt ${feature}" first ` +
          `so the ${label} is grounded in an actual spec, not invented from scratch.`
      );
      process.exitCode = 1;
      return;
    }

    if (fileExists(outPath)) {
      console.log(`${outPath} already exists — skipping (edit it directly, or delete to regenerate).`);
      return;
    }

    const raw = readTemplate(join(templatesDir, templateFile));
    const rendered = renderTemplate(raw, { feature });
    writeIfAbsent(outPath, rendered);
    console.log(`Wrote ${outPath} (stub)`);
    console.log(
      `Next: open prd.md alongside this file in your AI tool and ask it to fill the ` +
        `${label} from the spec (see .claude/, .cursor/, .windsurf/, or AGENTS.md ` +
        `depending on which bridge you initialized).`
    );
  };
}
