import { readdirSync } from "node:fs";

/**
 * A mockup doesn't have to be the generated mockup.html wireframe — dropping
 * in a designer's export (mockup.png, mockup.jpg, mockup.pdf, ...) satisfies
 * it just as well. Returns the actual file name found in `dir`, or null.
 */
export function findMockupFile(dir: string): string | null {
  try {
    return readdirSync(dir).find((f) => /^mockup\./i.test(f)) ?? null;
  } catch {
    return null; // dir doesn't exist yet
  }
}
