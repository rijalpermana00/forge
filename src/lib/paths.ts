import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

// Resolve paths relative to this module's location so the CLI works no matter
// which project directory the user runs `forge` from. Walking up until we find
// the `templates/` directory keeps this correct in both layouts: source
// (src/lib/paths.ts) during development, and the single bundled file
// (dist/cli.js) once published to npm.
const __filename = fileURLToPath(import.meta.url);

function findPackageRoot(start: string): string {
  let dir = dirname(start);
  for (;;) {
    if (existsSync(join(dir, "templates"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
  // Fallback to the original two-levels-up assumption (src/lib -> root).
  return join(dirname(start), "..", "..");
}

export const packageRoot = findPackageRoot(__filename);
export const templatesDir = join(packageRoot, "templates");

export function specsDir(cwd: string = process.cwd()): string {
  return join(cwd, "specs");
}

export function featureDir(feature: string, cwd: string = process.cwd()): string {
  return join(specsDir(cwd), feature);
}
