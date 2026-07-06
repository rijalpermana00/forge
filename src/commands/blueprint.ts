import prompts from "prompts";
import { copyFileSync, mkdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { featureDir, specsDir, templatesDir } from "../lib/paths.js";
import { readTemplate, renderTemplate, writeIfAbsent, fileExists } from "../lib/template.js";
import { upsertIndexEntry, readIndex } from "../lib/index-manifest.js";
import { SPEC_FILES, type SpecKey } from "../lib/spec-files.js";
import { MODE_ARTIFACTS, isValidMode, type BlueprintMode } from "../lib/modes.js";
import { findMockupFile } from "../lib/mockup.js";

export type { BlueprintMode };

export interface BlueprintOptions {
  mode: string;
  from?: string[];
}

/**
 * With a feature name: create or backfill that one feature's spec set.
 * Without one: backfill every feature already registered in specs/INDEX.md,
 * each using its own previously recorded mode.
 */
export async function blueprint(feature: string | undefined, opts: BlueprintOptions): Promise<void> {
  const cwd = process.cwd();

  if (!feature) {
    if (opts.from && opts.from.length > 0) {
      console.error(
        "--from can't be used without a feature name — it stages source files for a single feature."
      );
      process.exitCode = 1;
      return;
    }
    blueprintAll(cwd);
    return;
  }

  await blueprintOne(feature, opts, cwd);
}

function blueprintAll(cwd: string): void {
  const entries = readIndex(cwd);
  if (entries.length === 0) {
    console.log(
      "No features registered in specs/INDEX.md yet. Run " +
        "`forge blueprint <feature-name> --mode <fe|backend|fullstack>` first."
    );
    return;
  }

  console.log(`Blueprinting all ${entries.length} registered feature(s)\n`);
  for (const entry of entries) {
    if (!isValidMode(entry.mode)) {
      console.log(
        `Skipping "${entry.feature}" — no mode recorded in specs/INDEX.md. Run ` +
          `"forge blueprint ${entry.feature} --mode <fe|backend|fullstack>" once to set it.`
      );
      continue;
    }
    console.log(`-- ${entry.feature} (mode: ${entry.mode}) --`);
    mkdirSync(featureDir(entry.feature, cwd), { recursive: true });
    scaffoldArtifacts(entry.feature, entry.mode, cwd);
  }
  ensureRules(cwd);
  console.log("\nDone.");
}

async function blueprintOne(feature: string, opts: BlueprintOptions, cwd: string): Promise<void> {
  const entries = readIndex(cwd);
  const existing = entries.find((e) => e.feature === feature);

  let mode: BlueprintMode;
  if (existing && isValidMode(existing.mode)) {
    mode = existing.mode;
    if (opts.mode !== mode) {
      console.log(
        `"${feature}" is already registered with mode "${mode}" — using that ` +
          `(edit the Mode column in specs/INDEX.md to change it).`
      );
    }
  } else if (isValidMode(opts.mode)) {
    mode = opts.mode;
  } else {
    console.error(`Unknown mode "${opts.mode}". Use one of: fe, backend, fullstack.`);
    process.exitCode = 1;
    return;
  }

  const dir = featureDir(feature, cwd);
  mkdirSync(dir, { recursive: true });

  console.log(`Blueprinting "${feature}" (mode: ${mode})\n`);

  const briefPath = join(dir, SPEC_FILES.brief);
  let dependsOn: string | undefined;

  if (!fileExists(briefPath)) {
    const stagedNames = stageSourceFiles(opts.from ?? [], dir);
    if (opts.from && opts.from.length > 0 && stagedNames === null) {
      process.exitCode = 1;
      return; // a --from file was missing; message already printed
    }

    const briefVars =
      stagedNames && stagedNames.length > 0 ? extractionMarkers(stagedNames) : await runInteractive();
    if (!briefVars) return; // cancelled

    dependsOn = briefVars.dependsOn;
    const briefRaw = readTemplate(join(templatesDir, SPEC_FILES.brief));
    const brief = renderTemplate(briefRaw, {
      feature,
      date: new Date().toISOString().slice(0, 10),
      ...briefVars,
    });
    writeIfAbsent(briefPath, brief);
    console.log(`Wrote ${briefPath}`);
  } else if (opts.from && opts.from.length > 0) {
    stageSourceFiles(opts.from, dir); // brief already exists — stage anyway for reference
  }

  scaffoldArtifacts(feature, mode, cwd);
  ensureRules(cwd);

  upsertIndexEntry(cwd, feature, {
    status: existing?.status ?? "draft",
    mode,
    ...(dependsOn !== undefined ? { dependsOn } : {}),
  });
  console.log(`Registered "${feature}" in specs/INDEX.md`);

  console.log(
    `\nNext: open this project in your AI tool and ask it to draft every scaffolded file, ` +
      `grounded in the staged source material — use /forge:blueprint, /forge-blueprint, or ` +
      `AGENTS.md instructions, depending on which bridge you initialized.`
  );
}

/** Writes every stub the mode calls for (except brief.md, handled separately). */
function scaffoldArtifacts(feature: string, mode: BlueprintMode, cwd: string): void {
  const dir = featureDir(feature, cwd);
  const artifacts = MODE_ARTIFACTS[mode].filter((key) => key !== "brief");

  for (const key of artifacts) {
    const file = SPEC_FILES[key];
    const outPath = join(dir, file);

    // A dropped-in design export (mockup.png, mockup.pdf, ...) satisfies the
    // mockup artifact just as well as the generated mockup.html — don't
    // clobber it with the HTML stub.
    if (key === "mockup") {
      const existingMockup = findMockupFile(dir);
      if (existingMockup) {
        console.log(`${join(dir, existingMockup)} already exists — skipping.`);
        continue;
      }
    } else if (fileExists(outPath)) {
      console.log(`${outPath} already exists — skipping.`);
      continue;
    }

    const raw = readTemplate(join(templatesDir, file));
    const rendered = renderTemplate(raw, { feature });
    writeIfAbsent(outPath, rendered);
    console.log(`Wrote ${outPath} (stub)`);
  }

  const skipped = (Object.keys(SPEC_FILES) as SpecKey[]).filter(
    (key) => key !== "brief" && !artifacts.includes(key)
  );
  if (skipped.length > 0) {
    console.log(`Skipped for mode "${mode}": ${skipped.map((key) => SPEC_FILES[key]).join(", ")}.`);
  }
}

function ensureRules(cwd: string): void {
  const rulesPath = join(specsDir(cwd), "RULES.md");
  if (fileExists(rulesPath)) return;
  const rulesRaw = readTemplate(join(templatesDir, "rules.md"));
  writeIfAbsent(rulesPath, rulesRaw);
  console.log(`Wrote ${rulesPath}`);
}

/**
 * Copies each --from file byte-for-byte into the feature folder as
 * source-<original-filename>. Returns null (instead of throwing) if a source
 * file is missing, so the caller can fail the whole command with exit code 1
 * rather than leaving a half-staged feature folder.
 */
function stageSourceFiles(files: string[], dir: string): string[] | null {
  const staged: string[] = [];
  for (const src of files) {
    const srcPath = resolve(process.cwd(), src);
    if (!fileExists(srcPath)) {
      console.error(`Source file not found: ${srcPath}`);
      return null;
    }

    const docName = `source-${basename(srcPath)}`;
    const destPath = join(dir, docName);
    if (fileExists(destPath)) {
      console.log(`${destPath} already exists — leaving it in place.`);
    } else {
      copyFileSync(srcPath, destPath);
      console.log(`Staged ${basename(srcPath)} → ${destPath}`);
    }
    staged.push(docName);
  }
  return staged;
}

interface BriefVars {
  goal: string;
  actors: string;
  constraints: string;
  outOfScope: string;
  dependsOn: string;
}

function extractionMarkers(stagedNames: string[]): BriefVars {
  const marker = `[TODO: extract from ${stagedNames.join(", ")}]`;
  return { goal: marker, actors: marker, constraints: marker, outOfScope: marker, dependsOn: "-" };
}

/** Interactive Q&A fallback when no --from files are given for a brand-new feature. */
async function runInteractive(): Promise<BriefVars | null> {
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
    console.log("Blueprinting cancelled.");
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
