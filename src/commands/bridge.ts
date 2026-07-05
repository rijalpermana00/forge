import { COMMAND_SPECS } from "../lib/command-specs.js";
import type { Bridge } from "../lib/bridges/shared.js";
import { claudeBridge } from "../lib/bridges/claude.js";
import { cursorBridge } from "../lib/bridges/cursor.js";
import { windsurfBridge } from "../lib/bridges/windsurf.js";
import { genericBridge } from "../lib/bridges/generic.js";
import { gptBridge } from "../lib/bridges/gpt.js";

// Registry of every supported AI-tool bridge. Adding a target is a new module
// plus one entry here — the dispatcher below never changes (Open/Closed).
const BRIDGES: Bridge[] = [claudeBridge, cursorBridge, windsurfBridge, gptBridge, genericBridge];

export type BridgeTarget = (typeof BRIDGES)[number]["target"];

export function bridge(target: string, cwd: string = process.cwd()): void {
  const selected = BRIDGES.find((b) => b.target === target);
  if (!selected) {
    const valid = BRIDGES.map((b) => b.target).join(", ");
    console.error(`Unknown bridge target "${target}". Valid targets: ${valid}.`);
    process.exitCode = 1;
    return;
  }
  console.log(selected.write(cwd, COMMAND_SPECS));
}
