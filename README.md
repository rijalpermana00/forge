# forge

Spec-driven development CLI. Scaffolds specs, DBML schemas, API contracts,
task lists, and test cases in a fixed folder structure, and bridges the same
workflow into whichever AI coding tool you use.

## Contents

- [Design](#design)
- [Prerequisites](#prerequisites)
- [Install](#install)
- [Workflow](#workflow)
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
forge init                        # scaffolds specs/ + AI bridge (defaults to Claude Code)
forge scan                        # (optional) inventory existing code -> specs/CODEBASE.md
forge rules                       # (optional) scaffold specs/RULES.md — project conventions
forge smelt btn-fraud-check       # interactive Q&A -> brief.md + prd.md stub

# draft prd.md by hand, or with your AI tool, using brief.md as grounding

forge schema btn-fraud-check      # schema.dbml (requires prd.md)
forge contract btn-fraud-check    # api-contract.md (requires prd.md)
forge mockup btn-fraud-check      # mockup.html (requires prd.md)
forge tasks btn-fraud-check       # tasks.md (requires prd.md)
forge testcase btn-fraud-check    # testcases.md (requires prd.md)
forge verify btn-fraud-check      # reports missing files / unresolved [TODO]s

forge implement btn-fraud-check   # checks tasks.md exists, reports grounding files
                                   # -> your AI tool then writes the actual code
```

## Spec index

`forge init` creates `specs/INDEX.md` — a single manifest tracking every
feature's creation order, status, and dependencies, instead of encoding that
into folder names (which breaks under parallel branches — see design notes
below).

| Column | Set by | Meaning |
|---|---|---|
| `Feature` | `forge smelt` | Folder name under `specs/` |
| `Created` | `forge smelt` | Date first smelted; never changes after |
| `Status` | `forge smelt` (`draft`) → `forge verify` (`active` once complete) | Manually settable to `superseded` when a feature is replaced |
| `Depends On` | `forge smelt` prompt, or manual edit | Real dependency, not implied by folder order |
| `Notes` | Manual edit only | Free text — blockers, context, anything |

The manifest is **upserted, not overwritten** — `forge smelt`/`forge verify`
only ever touch the row for the feature they're operating on. Manual edits to
other rows' `Status`, `Depends On`, or `Notes` are preserved across runs.

## AI tool support

`forge init` defaults to a Claude Code bridge. Pick a different target with
`--target`, or generate additional bridges any time with `forge bridge
<target>`:

```bash
forge init --target cursor
forge bridge windsurf     # add a second bridge to the same project
forge bridge generic      # AGENTS.md fallback for any other tool
```

| Target | Files written | Invocation |
|---|---|---|
| `claude` | `.claude/commands/forge/*.md` | `/forge:smelt`, `/forge:schema`, ... |
| `cursor` | `.cursor/commands/forge-*.md` | `/forge-smelt`, `/forge-schema`, ... |
| `windsurf` | `.windsurf/workflows/forge-*.md` | `/forge-smelt`, `/forge-schema`, ... |
| `generic` | `AGENTS.md` (single file) | Point any AI tool at the file manually |

Claude Code uses frontmatter-driven shell execution (`!` command injection,
`$ARGUMENTS` substitution). Cursor and Windsurf commands are plain
instructions — their agents already have their own terminal tools, so the
bridge tells them which `forge` command to run rather than running it for
them. All four targets point at the same `prd.md`-grounding rules, so
drafting behavior stays consistent regardless of which tool actually does
the writing.

## Command reference

| Command | Requires | Produces | Overwrite-safe |
|---|---|---|---|
| `forge init [--target <t>]` | — | `specs/`, `specs/INDEX.md`, AI bridge files | Yes — bridge files regenerate freely |
| `forge bridge <target>` | — | AI bridge files for `<target>` | Yes — always regenerates |
| `forge scan [--depth <n>]` | — | `specs/CODEBASE.md` (stack, file stats, existing schema/API files, directory tree) | Yes — refreshes on every run |
| `forge rules` | — | `specs/RULES.md` (project conventions the AI grounds all drafting in) | Yes — refuses if `RULES.md` exists |
| `forge smelt <feature>` | — | `brief.md`, `prd.md` (stub), `INDEX.md` entry (`draft`) | Yes — refuses if `brief.md` exists |
| `forge schema <feature>` | `prd.md` | `schema.dbml` (stub) | Yes |
| `forge contract <feature>` | `prd.md` | `api-contract.md` (stub) | Yes |
| `forge mockup <feature>` | `prd.md` | `mockup.html` (stub) | Yes |
| `forge tasks <feature>` | `prd.md` | `tasks.md` (stub) | Yes |
| `forge testcase <feature>` | `prd.md` | `testcases.md` (stub) | Yes |
| `forge implement <feature>` | `tasks.md` | Console report of which grounding files exist; no spec file written | N/A — writes application code, not specs |
| `forge verify <feature>` | — | Console report, `INDEX.md` status → `active` if complete | N/A (read-only on spec files) |

## Output structure

```
your-project/
├── specs/
│   ├── INDEX.md                    # creation order, status, dependencies across all features
│   ├── CODEBASE.md                 # (optional) forge scan output: existing project inventory
│   ├── RULES.md                    # (optional) forge rules output: project conventions the AI follows
│   └── <feature-name>/
│       ├── brief.md           # smelt Q&A capture
│       ├── prd.md              # goal, actors, user stories, business rules, out-of-scope
│       ├── schema.dbml          # entities derived from prd.md
│       ├── api-contract.md       # Title / endpoint / Request / Response / Note format
│       ├── mockup.html            # throwaway wireframe (plain HTML/CSS, no framework)
│       ├── tasks.md               # WBS, sequenced data -> logic -> UI
│       └── testcases.md            # No/Scenario/Case/Type/Expected/Actual/Status/Remark table
├── .claude/commands/forge/         # if target = claude
├── .cursor/commands/               # if target = cursor
├── .windsurf/workflows/            # if target = windsurf
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
| `No prd.md found for "<feature>"` | Tried `schema`/`contract`/`tasks`/`testcase` before `smelt` | Run `forge smelt <feature>` first |
| `No tasks.md found for "<feature>"` | Tried `implement` before `tasks` | Run `forge tasks <feature>` first |
| `<file> already exists — skipping` | The output spec file is already there | Edit it directly, or delete it to regenerate from the template |
| `/forge:*` or `/forge-*` commands don't appear in your AI tool | `forge init`/`forge bridge` wasn't run for that target, or the tool needs a restart | Run `forge bridge <target>`, then restart the AI tool's session |
