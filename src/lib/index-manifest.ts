import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { specsDir } from "./paths.js";

export interface IndexEntry {
  feature: string;
  created: string; // YYYY-MM-DD
  status: "draft" | "active" | "superseded";
  dependsOn: string; // "-" or comma-separated feature names
  notes: string; // "-" or free text
}

const HEADER = [
  "| Feature | Created | Status | Depends On | Notes |",
  "| ------ | ------ | ------ | ------ | ------ |",
];

function indexPath(cwd: string): string {
  return join(specsDir(cwd), "INDEX.md");
}

function parseRow(line: string): IndexEntry | null {
  const cells = line
    .split("|")
    .map((c) => c.trim())
    .filter((_, i, arr) => i > 0 && i < arr.length - 1); // drop leading/trailing empties from split
  if (cells.length !== 5) return null;
  const [feature, created, status, dependsOn, notes] = cells;
  if (feature === "Feature" || /^-+$/.test(feature)) return null; // header/separator
  return { feature, created, status: status as IndexEntry["status"], dependsOn, notes };
}

export function readIndex(cwd: string = process.cwd()): IndexEntry[] {
  const path = indexPath(cwd);
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf-8")
    .split("\n")
    .map(parseRow)
    .filter((row): row is IndexEntry => row !== null);
}

function renderIndex(entries: IndexEntry[]): string {
  const rows = entries.map(
    (e) => `| ${e.feature} | ${e.created} | ${e.status} | ${e.dependsOn} | ${e.notes} |`
  );
  return [
    "# Spec Index",
    "",
    "Tracks feature specs in creation order. Updated automatically by `forge smelt`",
    "(new entry, status `draft`) and `forge verify` (status `active` once all spec",
    "files are complete). Edit `Depends On` / `Notes` / `Status` manually as needed —",
    "this file is never overwritten wholesale, only upserted per feature.",
    "",
    ...HEADER,
    ...rows,
    "",
  ].join("\n");
}

export function ensureIndex(cwd: string = process.cwd()): void {
  const path = indexPath(cwd);
  if (existsSync(path)) return;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, renderIndex([]), "utf-8");
}

/**
 * Adds a new entry if the feature isn't already indexed. If it is, only
 * updates the fields explicitly passed — `created` is never overwritten.
 */
export function upsertIndexEntry(
  cwd: string,
  feature: string,
  updates: Partial<Omit<IndexEntry, "feature" | "created">> & { created?: string }
): void {
  const entries = readIndex(cwd);
  const existing = entries.find((e) => e.feature === feature);

  if (existing) {
    Object.assign(existing, updates);
  } else {
    entries.push({
      feature,
      created: updates.created ?? new Date().toISOString().slice(0, 10),
      status: updates.status ?? "draft",
      dependsOn: updates.dependsOn ?? "-",
      notes: updates.notes ?? "-",
    });
  }

  const path = indexPath(cwd);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, renderIndex(entries), "utf-8");
}
