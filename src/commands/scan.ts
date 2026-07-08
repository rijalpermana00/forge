import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync, statSync } from "node:fs";
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
  contracts?: boolean;
}

export function scan(options: ScanOptions = {}): void {
  const cwd = process.cwd();

  if (options.contracts) {
    scanContracts(cwd);
    return;
  }

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

// --- contracts mode ----------------------------------------------------------
// `forge scan --contracts` extracts what the frontend *consumes*: every HTTP
// call site and every exported data shape. The output is grounding for a
// backend prompt — "build an API that satisfies this surface".

const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".svelte"]);
const MAX_SOURCE_BYTES = 512 * 1024; // skip bundles/generated monsters
const MAX_SHAPE_LINES = 40;

interface Endpoint {
  method: string;
  path: string;
  typeHint: string;
  file: string;
}

interface Shape {
  name: string;
  file: string;
  body: string;
}

function scanContracts(cwd: string): void {
  const files = collectFiles(cwd).filter(isContractSourceFile);
  const endpoints: Endpoint[] = [];
  const shapes: Shape[] = [];

  for (const f of files) {
    let content: string;
    try {
      const full = join(cwd, f);
      if (statSync(full).size > MAX_SOURCE_BYTES) continue;
      content = readFileSync(full, "utf-8");
    } catch {
      continue;
    }
    extractEndpoints(content, f, endpoints);
    extractShapes(content, f, shapes);
  }

  const uniqueEndpoints = dedupeEndpoints(endpoints);
  const uniqueShapes = dedupeShapes(shapes);

  const raw = readTemplate(join(templatesDir, "contracts.md"));
  const rendered = renderTemplate(raw, {
    generatedAt: new Date().toISOString().slice(0, 10),
    project: renderProject(cwd, files.length),
    endpointCount: String(uniqueEndpoints.length),
    endpoints: renderEndpoints(uniqueEndpoints),
    shapeCount: String(uniqueShapes.length),
    shapes: renderShapes(uniqueShapes),
  });

  mkdirSync(specsDir(cwd), { recursive: true });
  const outPath = join(specsDir(cwd), "CONTRACTS.md");
  writeFileSync(outPath, rendered, "utf-8");

  console.log(`Wrote ${outPath}`);
  console.log(
    `  ${files.length} source files scanned — ${uniqueEndpoints.length} endpoints, ${uniqueShapes.length} data shapes`
  );
  console.log(
    `\nNext: use specs/CONTRACTS.md as grounding for the backend, e.g.\n` +
      `  forge blueprint <feature> --mode backend --from specs/CONTRACTS.md`
  );
}

function isContractSourceFile(f: string): boolean {
  if (!SOURCE_EXTS.has(extname(f).toLowerCase())) return false;
  // Tests and mocks name endpoints that aren't part of the real contract.
  return !/(\.test\.|\.spec\.|__tests__|__mocks__)/.test(f);
}

// --- endpoint extraction ---

// `client.get<Subscription[]>("/subscriptions")`, `axios.post('/auth/login', …)`
const HTTP_CALL_RE = /\.(get|post|put|patch|delete|head)\s*(?:<([^>;]*)>)?\s*\(\s*(["'`])([^"'`\n]*)\3/g;
// `fetch("/api/x", { method: "POST" })`
const FETCH_CALL_RE = /\bfetch\s*\(\s*(["'`])([^"'`\n]*)\1/g;

function extractEndpoints(content: string, file: string, out: Endpoint[]): void {
  for (const m of content.matchAll(HTTP_CALL_RE)) {
    const path = normalizeUrlPath(m[4]);
    if (!path) continue; // e.g. Map.get("key"), headers.get("Content-Type")
    out.push({ method: m[1].toUpperCase(), path, typeHint: (m[2] ?? "").trim(), file });
  }
  for (const m of content.matchAll(FETCH_CALL_RE)) {
    const path = normalizeUrlPath(m[2]);
    if (!path) continue;
    // Only look for `method:` inside this fetch call's own argument list.
    const parenIdx = m.index! + m[0].indexOf("(");
    const args = captureBalanced(content, parenIdx, "(", ")") ?? "";
    const methodMatch = args.match(/method\s*:\s*["'`](\w+)/i);
    out.push({ method: (methodMatch?.[1] ?? "GET").toUpperCase(), path, typeHint: "", file });
  }
}

/**
 * Turns a call-site URL literal into a stable path, or null if it doesn't
 * look like one. `${baseUrl}/subs` -> `/subs`; `/subs/${id}` -> `/subs/:id`.
 */
function normalizeUrlPath(raw: string): string | null {
  let p = raw.trim();
  // A leading `${...}` is almost always a base-URL variable — drop it.
  if (p.startsWith("${")) {
    const close = p.indexOf("}");
    if (close === -1) return null;
    p = p.slice(close + 1);
  }
  p = p.replace(/\$\{([^}]*)\}/g, (_, expr: string) => {
    const id = (expr.trim().split(".").pop() ?? "").replace(/\W/g, "");
    return `:${id || "param"}`;
  });
  if (/^https?:\/\//.test(p)) p = p.replace(/^https?:\/\/[^/]*/, "") || "/";
  return p.startsWith("/") ? p : null;
}

function dedupeEndpoints(endpoints: Endpoint[]): Endpoint[] {
  const seen = new Map<string, Endpoint>();
  for (const e of endpoints) {
    const key = `${e.method} ${e.path}`;
    const prev = seen.get(key);
    if (!prev) seen.set(key, e);
    else if (!prev.typeHint && e.typeHint) prev.typeHint = e.typeHint;
  }
  return [...seen.values()].sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}

function renderEndpoints(endpoints: Endpoint[]): string {
  if (endpoints.length === 0) return "_None found._";
  const rows = endpoints.map(
    (e) => `| ${e.method} | \`${e.path}\` | ${e.typeHint ? `\`${e.typeHint}\`` : "—"} | \`${e.file}\` |`
  );
  return ["| Method | Path | Response type | Source |", "|---|---|---|---|", ...rows].join("\n");
}

// --- shape extraction ---

const SHAPE_STARTS: RegExp[] = [
  /export\s+interface\s+(\w+)[^{;=]*\{/g,
  /export\s+type\s+(\w+)(?:<[^=;{]*>)?\s*=\s*\{/g,
  /export\s+(?:const\s+)?enum\s+(\w+)\s*\{/g,
  /(?:export\s+)?const\s+(\w+[Ss]chema)\s*=\s*z\.\w+\s*\(/g,
];
// One-line aliases carry contract info too: `export type Status = "active" | …`
const TYPE_ALIAS_RE = /export\s+type\s+(\w+)\s*=\s*([^;{\n][^;\n]*);?$/gm;

function extractShapes(content: string, file: string, out: Shape[]): void {
  for (const re of SHAPE_STARTS) {
    for (const m of content.matchAll(re)) {
      const name = m[1];
      if (/(Props|State)$/.test(name)) continue; // UI-only, not backend contract
      const opener = m[0].endsWith("(") ? "(" : "{";
      const openIdx = m.index! + m[0].length - 1;
      const block = captureBalanced(content, openIdx, opener, opener === "{" ? "}" : ")");
      if (!block) continue;
      out.push({ name, file, body: truncateShape(content.slice(m.index!, openIdx) + block) });
    }
  }
  for (const m of content.matchAll(TYPE_ALIAS_RE)) {
    if (/(Props|State)$/.test(m[1])) continue;
    out.push({ name: m[1], file, body: `export type ${m[1]} = ${m[2].trim()};` });
  }
}

function captureBalanced(src: string, openIdx: number, open: string, close: string, maxLen = 6000): string | null {
  let depth = 0;
  for (let i = openIdx; i < src.length && i - openIdx < maxLen; i++) {
    if (src[i] === open) depth++;
    else if (src[i] === close && --depth === 0) return src.slice(openIdx, i + 1);
  }
  return null;
}

function truncateShape(body: string): string {
  const lines = body.split("\n");
  if (lines.length <= MAX_SHAPE_LINES) return body;
  return [...lines.slice(0, MAX_SHAPE_LINES), `  // … +${lines.length - MAX_SHAPE_LINES} more lines`].join("\n");
}

function dedupeShapes(shapes: Shape[]): Shape[] {
  const seen = new Map<string, Shape>();
  for (const s of shapes) if (!seen.has(s.name)) seen.set(s.name, s);
  return [...seen.values()];
}

function renderShapes(shapes: Shape[]): string {
  if (shapes.length === 0) return "_None found._";
  const byFile = new Map<string, Shape[]>();
  for (const s of shapes) {
    const list = byFile.get(s.file) ?? [];
    list.push(s);
    byFile.set(s.file, list);
  }
  const sections: string[] = [];
  for (const [file, list] of [...byFile.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    sections.push(`### \`${file}\`\n\n\`\`\`ts\n${list.map((s) => s.body).join("\n\n")}\n\`\`\``);
  }
  return sections.join("\n\n");
}
