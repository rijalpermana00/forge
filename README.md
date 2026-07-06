# forge

Spec-driven development CLI. Scaffolds specs, DBML schemas, API contracts,
task lists, and test cases in a fixed folder structure, and bridges the same
workflow into whichever AI coding tool you use.

## Contents

- [Design](#design)
- [Prerequisites](#prerequisites)
- [Install](#install)
- [Workflow](#workflow)
- [Bootstrapping from a BRD or HTML mockup](#bootstrapping-from-a-brd-or-html-mockup)
- [Spec index](#spec-index)
- [AI tool support](#ai-tool-support)
- [Command reference](#command-reference)
- [Output structure](#output-structure)
- [Templates](#templates)
- [Troubleshooting](#troubleshooting)

## Design

- **Deterministic scaffolding lives in the CLI.** `forge` never calls an AI
  model itself — no API key to manage, works offline, fast, free.
- **AI drafting happens wherever you already work** — Claude Code, Cursor,
  Windsurf, or any other tool. Each generated file starts as a structured
  stub with `[TODO]` markers; you (or the AI) fill it in, grounded in
  `prd.md`.
- **Sequencing is enforced by guard rails, not convention.** `schema`,
  `contract`, `tasks`, and `testcase` all refuse to run until `prd.md`
  exists, and `implement` refuses until `tasks.md` exists, so nothing gets
  invented — or coded — without a spec behind it.
- **One instruction source, many renderers.** Every AI-tool bridge is
  generated from `src/lib/command-specs.ts` — the instructions are written
  once and rendered into each tool's native format, so they can't drift out
  of sync with each other.
- **Nothing gets silently overwritten.** Spec files (`prd.md`, `schema.dbml`,
  etc.) use `writeIfAbsent` — forge reports and stops if a file already
  exists. Bridge files (`.claude/`, `.cursor/`, etc.) are regenerated freely
  by design; re-run `forge bridge <target>` any time the command specs
  change.

## Prerequisites

- [Bun](https://bun.sh) installed locally
- A project directory you want to scaffold specs into

## Install

```bash
cd forge
bun install
bun link       # makes `forge` available globally on this machine
```

Verify:

```bash
forge --version
```

## Workflow

```bash
cd your-project
forge init                                          # scaffolds specs/ + AI bridge (defaults to Claude Code)
forge scan                                           # (optional) inventory existing code -> specs/CODEBASE.md
forge rules                                          # (optional) scaffold specs/RULES.md — project conventions
forge blueprint btn-fraud-check --mode fullstack     # interactive Q&A -> brief.md + prd.md + every mode stub

# draft prd.md (and the other stubs) by hand, or with your AI tool, using brief.md as grounding

forge verify btn-fraud-check      # reports missing files / unresolved [TODO]s
forge implement btn-fraud-check   # checks tasks.md exists, reports grounding files
                                   # -> your AI tool then writes the actual code
```

`forge blueprint <feature>` is the single entry point for scaffolding a
feature's whole spec set, scoped to `--mode`:

```bash
forge blueprint checkout-flow --mode fe --from ./mockups/checkout.html
forge blueprint payments-api --mode backend --from ./docs/payments-brd.md
forge blueprint order-fulfillment --mode fullstack --from ./legacy/OrderService.ts
```

`--mode` controls which artifacts get scaffolded: `fe` skips `schema.dbml` (a
frontend consumes an existing API, it doesn't define the data layer),
`backend` skips `mockup.html` (no UI to wireframe), `fullstack` scaffolds
everything (`brief.md`, `prd.md`, `schema.dbml`, `api-contract.md`,
`mockup.html`, `tasks.md`, `testcases.md`). The mode is recorded in
`specs/INDEX.md`'s `Mode` column the first time a feature is blueprinted, and
every later run for that feature reuses the recorded mode regardless of
`--mode` (edit the column, or the individual commands below, to change a
feature's mode after the fact). `specs/RULES.md` is scaffolded too if it
doesn't exist yet. Files that already exist are left untouched, so
re-running `blueprint` after editing one stub by hand won't clobber it.

If a feature also needs an individual stub regenerated (e.g. you deleted one
by hand), the single-artifact commands below still work standalone —
`forge schema`, `forge contract`, `forge mockup`, `forge tasks`,
`forge testcase` — each requires `prd.md` to already exist.

## Bootstrapping from a BRD or HTML mockup

For a brand-new feature (no `brief.md` yet), `forge blueprint` has two input
modes. Without `--from`, it prompts you interactively in the terminal for
goal, actors, constraints, and out-of-scope items. With `--from <file>`
(repeatable — pass as many grounding files as you have), it grounds the
brief in documents you already have — a BRD, a requirements doc, an HTML
mockup, even existing code — instead of you retyping it:

```bash
forge blueprint fraud-check --mode backend --from ./docs/fraud-check-brd.md
forge blueprint checkout-flow --mode fe --from ./mockups/checkout.html
```

What happens:

1. `forge` copies each source file byte-for-byte into
   `specs/<feature>/source-<original-filename>` (extension preserved — `.md`,
   `.html`, `.pdf`, `.docx`, `.ts`, …). It never parses or transcodes it.
2. `brief.md` is stubbed with `[TODO: extract from source-<filename>, ...]`
   markers instead of the interactive answers.
3. Open the project in your AI tool and run the matching `blueprint` bridge
   command (`/forge:blueprint`, `/forge-blueprint`, or the `AGENTS.md`
   instructions). The AI reads every staged `source-*` file, replaces each
   marker in `brief.md` with the extracted value — citing where it came from
   so requirements stay traceable — then drafts `prd.md` and the rest of the
   mode's stubs from the filled-in brief.

For an HTML mockup or a source code file specifically, the AI extracts
requirements from the markup/layout or existing implementation itself
(visible fields, actions, states, copy, endpoints already called) rather
than prose — treat it the same as any other source document. If your tool
can't open the source format directly (e.g. `.docx`), it will ask you to
export it to Markdown or PDF first rather than guessing at the content.

Nothing is invented: if the source material doesn't cover something a stub
needs, the AI asks rather than filling it in from assumption.

## Backfilling every feature

Run `forge blueprint` with no feature name to backfill every feature already
registered in `specs/INDEX.md`, each using its own recorded `Mode` — only
missing files are written, nothing already drafted is touched:

```bash
forge blueprint
```

Useful after adding new project conventions, or after teammates registered
new features and you want every feature's spec set caught up in one pass.
`--from` can't be combined with the no-feature form — staging source files
only makes sense for one feature at a time.

## Spec index

`forge init` creates `specs/INDEX.md` — a single manifest tracking every
feature's creation order, status, and dependencies, instead of encoding that
into folder names (which breaks under parallel branches — see design notes
below).

| Column | Set by | Meaning |
|---|---|---|
| `Feature` | `forge blueprint` | Folder name under `specs/` |
| `Created` | `forge blueprint` | Date first blueprinted; never changes after |
| `Status` | `forge blueprint` (`draft`) → `forge verify` (`active` once complete) | Manually settable to `superseded` when a feature is replaced |
| `Mode` | `forge blueprint --mode <fe\|backend\|fullstack>`, first run only | Reused on every later `forge blueprint` call for that feature; edit manually to change it |
| `Depends On` | `forge blueprint` prompt, or manual edit | Real dependency, not implied by folder order |
| `Notes` | Manual edit only | Free text — blockers, context, anything |

The manifest is **upserted, not overwritten** — `forge blueprint`/`forge verify`
only ever touch the row for the feature they're operating on. Manual edits to
other rows' `Status`, `Mode`, `Depends On`, or `Notes` are preserved across
runs.

## AI tool support

`forge init` defaults to a Claude Code bridge. Pick a different target with
`--target`, or generate additional bridges any time with `forge bridge
<target>`:

```bash
forge init --target cursor
forge bridge windsurf     # add a second bridge to the same project
forge bridge gpt          # prompt files for GPT/ChatGPT
forge bridge codex        # prompt files for Codex
forge bridge generic      # AGENTS.md fallback for any other tool
```

| Target | Files written | Invocation |
|---|---|---|
| `claude` | `.claude/commands/forge/*.md` | `/forge:blueprint`, `/forge:schema`, ... |
| `cursor` | `.cursor/commands/forge-*.md` | `/forge-blueprint`, `/forge-schema`, ... |
| `windsurf` | `.windsurf/workflows/forge-*.md` | `/forge-blueprint`, `/forge-schema`, ... |
| `gpt` | `.gpt/commands/forge-*.md` | Use as GPT/ChatGPT reference prompts |
| `codex` | `.codex/commands/forge-*.md` | Use as Codex reference prompts |
| `generic` | `AGENTS.md` (single file) | Point any AI tool at the file manually |

Claude Code uses frontmatter-driven shell execution (`!` command injection,
`$ARGUMENTS` substitution). Cursor and Windsurf commands are plain
instructions — their agents already have their own terminal tools, so the
bridge tells them which `forge` command to run rather than running it for
them. GPT and Codex prompt files use the same plain-instruction model for
ChatGPT, Custom GPT project context, or Codex workspace sessions. All six
targets point at the same `prd.md`-grounding rules, so
drafting behavior stays consistent regardless of which tool actually does
the writing.

## Command reference

| Command | Requires | Produces | Overwrite-safe |
|---|---|---|---|
| `forge init [--target <t>]` | — | `specs/`, `specs/INDEX.md`, AI bridge files | Yes — bridge files regenerate freely |
| `forge bridge <target>` | — | AI bridge files for `<target>` | Yes — always regenerates |
| `forge scan [--depth <n>]` | — | `specs/CODEBASE.md` (stack, file stats, existing schema/API files, directory tree) | Yes — refreshes on every run |
| `forge rules` | — | `specs/RULES.md` (project conventions the AI grounds all drafting in) | Yes — refuses if `RULES.md` exists |
| `forge blueprint [feature] [--mode fe\|backend\|fullstack] [--from <file>...]` | — | With a feature name: every stub the mode calls for (`brief.md`, `prd.md`, `schema.dbml`, `api-contract.md`, `mockup.html`, `tasks.md`, `testcases.md`), `specs/RULES.md`, `INDEX.md` entry (`draft`, records `Mode`); with `--from`, also `source-<filename>` per file. Without a feature name: backfills missing stubs for every `INDEX.md`-registered feature using its own recorded `Mode` | Yes — skips any file that already exists |
| `forge schema <feature>` | `prd.md` | `schema.dbml` (stub) | Yes |
| `forge contract <feature>` | `prd.md` | `api-contract.md` (stub) | Yes |
| `forge mockup <feature>` | `prd.md` | `mockup.html` (stub) | Yes |
| `forge tasks <feature>` | `prd.md` | `tasks.md` (stub) | Yes |
| `forge testcase <feature>` | `prd.md` | `testcases.md` (stub) | Yes |
| `forge implement <feature>` | `tasks.md` | Console report of which grounding files exist; no spec file written | N/A — writes application code, not specs |
| `forge verify <feature>` | — | Console report (mode-aware — only checks the artifacts the feature's recorded `Mode` calls for; others show `[N/A]`), `INDEX.md` status → `active` if complete | N/A (read-only on spec files) |

## Output structure

```
your-project/
├── specs/
│   ├── INDEX.md                    # creation order, status, dependencies across all features
│   ├── CODEBASE.md                 # (optional) forge scan output: existing project inventory
│   ├── RULES.md                    # (optional) forge rules output: project conventions the AI follows
│   └── <feature-name>/
│       ├── brief.md           # blueprint Q&A capture
│       ├── prd.md              # goal, actors, user stories, business rules, out-of-scope
│       ├── schema.dbml          # entities derived from prd.md
│       ├── api-contract.md       # Title / endpoint / Request / Response / Note format
│       ├── mockup.html            # throwaway wireframe (plain HTML/CSS, no framework)
│       ├── tasks.md               # WBS, sequenced data -> logic -> UI
│       └── testcases.md            # No/Scenario/Case/Type/Expected/Actual/Status/Remark table
├── .claude/commands/forge/         # if target = claude
├── .cursor/commands/               # if target = cursor
├── .windsurf/workflows/            # if target = windsurf
├── .gpt/commands/                  # if target = gpt
├── .codex/commands/                # if target = codex
└── AGENTS.md                       # if target = generic
```

## Templates

Edit anything in `templates/` to change the spec stub structure globally —
every future `forge schema`, `forge contract`, etc. call will use the
updated template. The `api-contract.md` and `testcases.md` templates are
locked to existing project formats; don't change their table columns without
also updating the matching instructions in `src/lib/command-specs.ts`, or
the templates and the AI-drafting instructions will drift out of sync.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `forge: command not found` | `bun link` wasn't run, or shell hasn't reloaded | Re-run `bun link` in the `forge` package directory, restart your shell |
| `No prd.md found for "<feature>"` | Tried `schema`/`contract`/`tasks`/`testcase` before `blueprint` | Run `forge blueprint <feature> --mode <fe\|backend\|fullstack>` first |
| `No tasks.md found for "<feature>"` | Tried `implement` before `tasks` | Run `forge tasks <feature>` first |
| `<file> already exists — skipping` | The output spec file is already there | Edit it directly, or delete it to regenerate from the template |
| `/forge:*` or `/forge-*` commands don't appear in your AI tool | `forge init`/`forge bridge` wasn't run for that target, or the tool needs a restart | Run `forge bridge <target>`, then restart the AI tool's session |
