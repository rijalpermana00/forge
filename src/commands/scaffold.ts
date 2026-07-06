import { join } from "node:path";
import { featureDir, templatesDir } from "../lib/paths.js";
import { readTemplate, renderTemplate, writeIfAbsent, fileExists } from "../lib/template.js";
import { SPEC_FILES } from "../lib/spec-files.js";
import { findMockupFile } from "../lib/mockup.js";

interface ScaffoldOptions {
  file: string; // spec artifact name, used as both template and output, e.g. "schema.dbml"
  label: string; // human word for messages, e.g. "schema"
}

export function makeScaffoldCommand({ file, label }: ScaffoldOptions) {
  return (feature: string) => {
    const dir = featureDir(feature);
    const prdPath = join(dir, SPEC_FILES.prd);
    const outPath = join(dir, file);

    if (!fileExists(prdPath)) {
      console.error(
        `No prd.md found for "${feature}". Run "forge blueprint ${feature} --mode <fe|backend|fullstack>" first ` +
          `so the ${label} is grounded in an actual spec, not invented from scratch.`
      );
      process.exitCode = 1;
      return;
    }

    // A dropped-in design export (mockup.png, mockup.pdf, ...) satisfies the
    // mockup artifact just as well as the generated mockup.html.
    if (file === SPEC_FILES.mockup) {
      const existingMockup = findMockupFile(dir);
      if (existingMockup) {
        console.log(`${join(dir, existingMockup)} already exists — skipping (edit or delete it to regenerate).`);
        return;
      }
    } else if (fileExists(outPath)) {
      console.log(`${outPath} already exists — skipping (edit it directly, or delete to regenerate).`);
      return;
    }

    const raw = readTemplate(join(templatesDir, file));
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
