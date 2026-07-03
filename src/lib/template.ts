import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export function renderTemplate(raw: string, vars: Record<string, string>): string {
  return raw.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export function readTemplate(path: string): string {
  return readFileSync(path, "utf-8");
}

/**
 * Writes a file only if it doesn't already exist, to avoid clobbering
 * hand-edited specs. Returns true if written, false if skipped.
 */
export function writeIfAbsent(path: string, contents: string): boolean {
  if (existsSync(path)) return false;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents, "utf-8");
  return true;
}

export function fileExists(path: string): boolean {
  return existsSync(path);
}
