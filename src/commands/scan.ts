import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname, relative, basename } from "node:path";
import { specsDir, templatesDir } from "../lib/paths.js";
import { readTemplate, renderTemplate } from "../lib/template.js";

// Directories that never contain hand-authored source worth inventorying.
const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", "out", "coverage",
  ".turbo", ".cache", "vendor", ".venv", "venv", "__pycache__", "target",
  ".idea", ".vscode", ".svelte-kit", ".output", ".parcel-cache",
]);

const MAX_FILES = 20000; // guard against runaway walks on huge repos

interface ScanOptions {
  depth?: number;
}

export function scan(options: ScanOptions = {}): void {
  const cwd = process.cwd();
  const depth = options.depth && options.depth > 0 ? options.depth : 2;

  const files = collectFiles(cwd);
  const schemas = files.filter(isSchemaFile);
  const apis = files.filter(isApiFile);

  // Render everything (including the tree) before creating specs/, so a
  // first-run scan doesn't list the empty specs/ directory it's about to make.
  const raw = readTemplate(join(templatesDir, "codebase.md"));
  const rendered = renderTemplate(raw, {
    generatedAt: new Date().toISOString().slice(0, 10),
    depth: String(depth),
    project: renderProject(cwd, files.length),
    stack: linesOrNone(detectStack(cwd), "_None detected._"),
    stats: fileStats(files),
    schemas: pathListOrNone(schemas),
    apis: pathListOrNone(apis),
    tree: renderTree(cwd, depth),
  });

  mkdirSync(specsDir(cwd), { recursive: true });
  const outPath = join(specsDir(cwd), "CODEBASE.md");
  writeFileSync(outPath, rendered, "utf-8");

  console.log(`Wrote ${outPath}`);
  console.log(`  ${files.length} files scanned — ${schemas.length} schema-ish, ${apis.length} API-ish`);
  console.log(
    `\nNext: open specs/CODEBASE.md in your AI tool as grounding before drafting ` +
      `specs. Re-run "forge scan" any time to refresh.`
  );
}

// --- collection ------------------------------------------------------------

function collectFiles(root: string): string[] {
  const out: string[] = [];
  const dirs: string[] = [root];
  while (dirs.length > 0 && out.length < MAX_FILES) {
    const dir = dirs.pop()!;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!IGNORE_DIRS.has(e.name)) dirs.push(join(dir, e.name));
      } else if (e.isFile()) {
        out.push(relative(root, join(dir, e.name)));
        if (out.length >= MAX_FILES) break;
      }
    }
  }
  return out;
}

// --- detection -------------------------------------------------------------

function detectStack(root: string): string[] {
  const found: string[] = [];
  const pkgPath = join(root, "package.json");

  if (existsSync(pkgPath)) {
    let pkg: { name?: string; dependencies?: Record<string, string>; devDependencies?: Record<string, string> } = {};
    try {
      pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    } catch {
      /* malformed package.json — still note it's a Node project */
    }
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    const has = (n: string) => Object.prototype.hasOwnProperty.call(deps, n);
    const isTs = has("typescript") || existsSync(join(root, "tsconfig.json"));
    found.push(`Node.js${isTs ? " / TypeScript" : ""} (package.json)`);

    const frameworks: [string, string][] = [
      ["next", "Next.js"], ["react", "React"], ["vue", "Vue"], ["svelte", "Svelte"],
      ["@angular/core", "Angular"], ["astro", "Astro"], ["@remix-run/react", "Remix"],
      ["@nestjs/core", "NestJS"], ["express", "Express"], ["fastify", "Fastify"], ["koa", "Koa"],
      ["prisma", "Prisma"], ["drizzle-orm", "Drizzle ORM"], ["typeorm", "TypeORM"], ["mongoose", "Mongoose"],
      ["vite", "Vite"], ["webpack", "Webpack"], ["tailwindcss", "Tailwind CSS"],
      ["commander", "Commander (CLI)"], ["zod", "Zod"],
    ];
    for (const [dep, label] of frameworks) if (has(dep)) found.push(label);
  }

  const manifests: [string, string][] = [
    ["go.mod", "Go (go.mod)"],
    ["Cargo.toml", "Rust (Cargo.toml)"],
    ["pyproject.toml", "Python (pyproject.toml)"],
    ["requirements.txt", "Python (requirements.txt)"],
    ["Gemfile", "Ruby (Gemfile)"],
    ["composer.json", "PHP (composer.json)"],
    ["pom.xml", "Java/Maven (pom.xml)"],
    ["build.gradle", "Java/Kotlin (Gradle)"],
    ["Dockerfile", "Docker (Dockerfile)"],
  ];
  for (const [file, label] of manifests) if (existsSync(join(root, file))) found.push(label);

  return found;
}

function isSchemaFile(f: string): boolean {
  const ext = extname(f).toLowerCase();
  const base = basename(f).toLowerCase();
  if (ext === ".dbml" || ext === ".prisma" || ext === ".sql") return true;
  if (/schema/.test(base) && [".ts", ".js", ".py", ".rb", ".go", ".json"].includes(ext)) return true;
  if (/(^|\/)migrations?(\/|$)/.test(f.toLowerCase())) return true;
  return false;
}

function isApiFile(f: string): boolean {
  const p = f.toLowerCase();
  const base = basename(p);
  if (/(openapi|swagger)\.(ya?ml|json)$/.test(base)) return true;
  if (/\.(controller|route|router|resolver)\.(ts|js|py)$/.test(base)) return true;
  if (/(^|\/)(routes?|controllers?|endpoints?|handlers?|api)(\/|$)/.test(p)) return true;
  return false;
}

// --- rendering -------------------------------------------------------------

function renderProject(root: string, fileCount: number): string {
  let name = basename(root);
  const pkgPath = join(root, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      if (pkg.name) name = pkg.name;
    } catch {
      /* ignore */
    }
  }
  const manifestNames = [
    "package.json", "tsconfig.json", "go.mod", "Cargo.toml", "pyproject.toml",
    "requirements.txt", "Gemfile", "composer.json", "pom.xml",
  ].filter((m) => existsSync(join(root, m)));

  return [
    `- **Name:** ${name}`,
    `- **Root:** ${root}`,
    `- **Files scanned:** ${fileCount}`,
    `- **Manifests:** ${manifestNames.length ? manifestNames.join(", ") : "none detected"}`,
  ].join("\n");
}

function fileStats(files: string[]): string {
  const counts = new Map<string, number>();
  for (const f of files) {
    const ext = extname(f).toLowerCase() || "(no ext)";
    counts.set(ext, (counts.get(ext) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  return [`- **Total files:** ${files.length}`, ...top.map(([ext, n]) => `- \`${ext}\` — ${n}`)].join("\n");
}

function renderTree(root: string, maxDepth: number): string {
  const lines: string[] = [`${basename(root) || root}/`];
  walkTree(root, "", maxDepth, lines);
  return lines.join("\n");
}

function walkTree(dir: string, prefix: string, depthLeft: number, lines: string[]): void {
  if (depthLeft <= 0) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  const filtered = entries
    .filter((e) => !(e.isDirectory() && IGNORE_DIRS.has(e.name)))
    .sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  const CAP = 40;
  const shown = filtered.slice(0, CAP);
  shown.forEach((e, i) => {
    const isLast = i === shown.length - 1 && filtered.length <= CAP;
    lines.push(`${prefix}${isLast ? "└── " : "├── "}${e.name}${e.isDirectory() ? "/" : ""}`);
    if (e.isDirectory()) {
      walkTree(join(dir, e.name), prefix + (isLast ? "    " : "│   "), depthLeft - 1, lines);
    }
  });
  if (filtered.length > CAP) {
    lines.push(`${prefix}└── …and ${filtered.length - CAP} more`);
  }
}

function pathListOrNone(items: string[], cap = 40): string {
  if (items.length === 0) return "_None found._";
  const shown = items.slice(0, cap).map((i) => `- \`${i}\``);
  if (items.length > cap) shown.push(`- …and ${items.length - cap} more`);
  return shown.join("\n");
}

function linesOrNone(items: string[], emptyText: string): string {
  return items.length ? items.map((i) => `- ${i}`).join("\n") : emptyText;
}
