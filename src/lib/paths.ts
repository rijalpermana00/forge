import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Resolve paths relative to this file's location so the CLI works no matter
// which project directory the user runs `forge` from.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const packageRoot = join(__dirname, "..", "..");
export const templatesDir = join(packageRoot, "templates");

export function specsDir(cwd: string = process.cwd()): string {
  return join(cwd, "specs");
}

export function featureDir(feature: string, cwd: string = process.cwd()): string {
  return join(specsDir(cwd), feature);
}
