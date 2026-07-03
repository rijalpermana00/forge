import prompts from "prompts";
import { copyFileSync, mkdirSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { featureDir, templatesDir } from "../lib/paths.js";
import { readTemplate, renderTemplate, writeIfAbsent, fileExists } from "../lib/template.js";
import { upsertIndexEntry, readIndex } from "../lib/index-manifest.js";
import { SPEC_FILES } from "../lib/spec-files.js";

/** Base name for a staged source document; the original extension is preserved. */
const SOURCE_DOC_BASE = "source-brd";

interface SmeltOptions {
  /** Path to an existing BRD/requirements document to ground extraction in. */
  from?: string;
}

export async function smelt(feature: string, opts: SmeltOptions = {}): Promise<void> {
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

  // Two input modes:
  //   --from <file>  → stage the document, stub the brief with extraction
  //                    markers, and let the AI extract the fields from prose.
  //   (default)      → interactive Q&A, one field per prompt.
  const briefVars = opts.from
    ? stageSourceDoc(opts.from, dir)
    : await runInteractive(feature);

  if (!briefVars) return; // cancelled

  const briefRaw = readTemplate(join(templatesDir, SPEC_FILES.brief));
  const brief = renderTemplate(briefRaw, {
    feature,
    date: new Date().toISOString().slice(0, 10),
    ...briefVars,
  });
  writeIfAbsent(briefPath, brief);

  const prdRaw = readTemplate(join(templatesDir, SPEC_FILES.prd));
  const prd = renderTemplate(prdRaw, { feature });
  const prdWritten = writeIfAbsent(prdPath, prd);

  upsertIndexEntry(cwd, feature, { status: "draft", dependsOn: briefVars.dependsOn });

  console.log(`\nWrote ${briefPath}`);
  if (prdWritten) console.log(`Wrote ${prdPath} (stub)`);
  console.log(`Registered "${feature}" in specs/INDEX.md`);
  console.log(
    `\nNext: open this project in your AI tool and draft prd.md from brief.md ` +
      `— use the /forge:smelt, /forge-smelt, or AGENTS.md instructions, depending ` +
      `on which bridge you initialized.`
  );
}

interface BriefVars {
  goal: string;
  actors: string;
  constraints: string;
  outOfScope: string;
  dependsOn: string;
}

/**
 * Copies the source document into the feature folder verbatim, preserving its
 * original extension (.md, .pdf, .docx, …), and returns brief fields pre-filled
 * with extraction markers. The CLI never parses or transcodes the document — the
 * copy is byte-for-byte so binary formats stay intact; the AI reads the staged
 * file and fills the markers.
 */
function stageSourceDoc(from: string, dir: string): BriefVars {
  const srcPath = resolve(process.cwd(), from);
  if (!fileExists(srcPath)) {
    console.log(`Source document not found: ${srcPath}`);
    process.exitCode = 1;
    return undefined as unknown as BriefVars;
  }

  const docName = `${SOURCE_DOC_BASE}${extname(srcPath).toLowerCase()}`;
  const destPath = join(dir, docName);
  if (fileExists(destPath)) {
    console.log(`${destPath} already exists — leaving it in place.`);
  } else {
    mkdirSync(dir, { recursive: true });
    copyFileSync(srcPath, destPath);
    console.log(`Staged ${basename(srcPath)} → ${destPath}`);
  }

  const marker = `[TODO: extract from ${docName}]`;
  return {
    goal: marker,
    actors: marker,
    constraints: marker,
    outOfScope: marker,
    dependsOn: "-",
  };
}

/** Interactive Q&A fallback when no source document is provided. */
async function runInteractive(feature: string): Promise<BriefVars | null> {
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
    return null;
  }

  return {
    goal: answers.goal ?? "",
    actors: answers.actors ?? "",
    constraints: answers.constraints ?? "",
    outOfScope: answers.outOfScope ?? "",
    dependsOn: answers.dependsOn?.trim() || "-",
  };
}
