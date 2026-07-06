import { mkdirSync } from "node:fs";
import { specsDir } from "../lib/paths.js";
import { bridge } from "./bridge.js";
import { ensureIndex } from "../lib/index-manifest.js";

export function init(options: { target?: string } = {}): void {
  const cwd = process.cwd();
  const target = options.target ?? "claude";

  mkdirSync(specsDir(cwd), { recursive: true });
  ensureIndex(cwd);
  console.log(`forge initialized:`);
  console.log(`  ${specsDir(cwd)}/`);
  console.log(`  ${specsDir(cwd)}/INDEX.md`);

  bridge(target, cwd);

  console.log(`\nNext: forge blueprint <feature-name> --mode <fe|backend|fullstack>`);
}
