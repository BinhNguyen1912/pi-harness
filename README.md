# pi-myself

A pi coding-agent harness built around [mattpocock/skills](https://github.com/mattpocock/skills) as the process core: runtime extensions, task-agent roles, slash-command adapters, and hygiene tests — assembled from [pikit](https://github.com/heyhuynhgiabuu/pikit) and rebuilt where Matt's skills need pi-specific support.

The philosophy: **one process, one vocabulary**. Matt's 27 promoted skills plus the 7 beta skills from `skills/in-progress/` are vendored verbatim and are the only process narrative; this package contributes the runtime that makes them first-class in pi — a real `skill` tool, deterministic prompts, seven delegation roles that inherit the active Pi model, and session recall.

## Install

pi-myself is a **per-project package**, and the split is deliberate: **it carries process**, so it stays per-repo and its workflow policy reaches only the repositories that opted in; the **companions are host tools**, so they live in the global settings and every repository shares one copy. Two things follow — a global pi-myself would impose that process on every repository on the machine, and a second copy under a different identity (a global install beside a checkout) does not merely conflict: pi 0.87.1 exits at startup once extensions register the same tool name twice (ADR 0007).

**Once per machine** — set up once, never repeated per repository:

```bash
pi install npm:@heyhuynhgiabuu/pi-task                # task tool + role catalog
pi install git:github.com/sting8k/pi-workspace-memory # durable memory records
pi install npm:pi-web-access                          # web research: one search tool + one URL reader
pi install npm:@sting8k/pi-srcwalk                    # optional: the srcwalk tool
npm install -g srcwalk                                # ...and the CLI that tool runs
```

`pi update --extensions` refreshes all of them together, so an update is one command too. `pi-srcwalk` is optional and two-part: the pi package registers the tool, the global CLI is what it runs, and without the CLI every call fails.

**In each repository that should use the harness** — one command, then the two below:

```bash
pi install git:github.com/BinhNguyen1912/pi-myself -l
```

Then inside the repository, in order:

```text
# 1. start pi here and accept the "Trust project folder?" prompt —
#    the -l install just created .pi/settings.json, which is what raises it
/setup-pi-myself                  # 2. provisions .pi/agents/ and ignores .pi/ in git
/reload                           # 3. so the task tool lists the roles it just wrote
/skill:setup-matt-pocock-skills   # 4. per-repo config for the process core (issue tracker, domain docs, triage labels)
```

Steps 1 and 3 are not optional: pi loads none of a repository's `.pi/` until the folder is trusted, and pi-task builds the `task` tool's agent list when it registers, so the session that provisioned still shows the set it loaded with.

pi-task loads task roles from a repository’s own `.pi/agents/`, so `/setup-pi-myself` copies the seven packaged roles there. A rerun refreshes their behavior while preserving project choices for `model`, `thinking`, and `max_turns`; edits to other role lines are backed up as `<name>.local`. The command leaves the project’s `.pi/settings.json` and current model alone. It also removes an old copied workflow policy and migrates a glossary named `CONTEXT.md` to `GLOSSARY.md`. Run `/setup-pi-myself --check` to diagnose without writing. The repo’s `.pi/` is local state and is ignored by Git; project rules belong in `AGENTS.md`. Provider authentication stays in your Pi configuration.

## Model choice and daily use

This fork keeps the name `pi-myself` and leaves model selection to Pi. Use your normal Ollama/DeepSeek session, or switch to any other provider in Pi; the package does not set `defaultProvider`, `defaultModel`, or role `model:` values. The package checkout has example compaction settings, but installation does not copy them into a consuming project. Your `29.2%/500k` footer describes the model context window, not a 500-token limit.

For a small task, talk to Pi directly. For a vague feature, use `/skill:grill-with-docs` or `/skill:grill-me`; for an agreed design, use `/skill:to-spec` then `/skill:implement`. Use `/skill:handoff` when moving to a new session, and `/setup-pi-myself --check` after updating this package. Delegation through `pi-task` is available when a bounded independent task earns it; it does not require a second provider or a fleet of agents. Review with the same model can still catch issues through a fresh context and explicit criteria, but it is not cross-model verification.

The original project is [MinhDuyDEV/pi-myself](https://github.com/MinhDuyDEV/pi-myself). The vendored skills and their MIT license remain attributed to [mattpocock/skills](https://github.com/mattpocock/skills); the root MIT notice is retained.

## What the harness contributes

| Surface | What |
| --- | --- |
| `skill` tool | Extension registering a real skill-invocation tool that loads exactly the model-invoked skill set, read with pi's own frontmatter parser — `Call the Skill tool with "grilling"` works verbatim, and asking for a user-invoked skill returns the slash command to hand the human, so those stay human-only |
| `tracker` tool | Deterministic ops for everything `to-spec`/`to-tickets`/`triage`/`wayfinder` do to the tracker — local markdown (`.scratch/`) **and** GitHub Issues via `gh-*` ops on the `gh` CLI: spec + ticket + map creation in the skills' templates, native sub-issue and dependency edges (mirrored by `Part of` / `Blocked by` lines), frontier, claim, resolve with the gist indexed into the map, out-of-scope, triage attention queue, role-family-safe label swaps mapped through `triage-labels.md`, title/body edit and map-section notes, and filtering by state role, category role, or wayfinder type. The local backend writes under a lock, allocates ticket numbers under a per-directory lock, and refuses a second claim, so parallel wayfinder sessions can neither clobber one file, share a number, nor both take a ticket; `tick` addresses a fixed box position in `## Acceptance criteria`, and the GitHub ops comment before they close and add a gist only to an open `wayfinder:map`; ops of the family `docs/agents/issue-tracker.md` does not configure are refused with the op to use instead, and a local blocker naming no ticket is rejected when written |
| Skill invocation | Model-invoked skills run through the `skill` tool; user-invoked ones run through pi's native `/skill:<name>` slash commands (typed, they work whatever `enableSkillCommands` says; the setting, default true, only lists them in autocomplete) — no generated wrapper layer; a bare `/<name>` the vendored skills print is rewritten to `/skill:<name>` by the `host-commands` extension |
| Task roles | Seven roles in three responsibility tiers: read (`explore`, `scout`), reason (`general`, `designer`, `ultra-verifier`), and review (`reviewer`, `ultra-scout`). They inherit the active Pi model unless you pin a role in the consuming project. The `reviewer` provides a separate context even with one model; a different model family is optional extra coverage. |
| Session recall | `recall` searches persisted session JSONL (including compaction summaries and task-complete reports) before agents guess about lost context; `expand` indices stay stable while the live session grows, and Esc interrupts a long scan |
| Compaction continuity | Resumes a task that a manual `/compact` interrupted (recall → memory_search → reconcile → continue); automatic compaction never triggers a resume. The workflow policy's phase-boundary rules mirror `PHASE-BOUNDARIES.md` |
| Smart-zone meter | Measures context against ~150k (or the model's context window when smaller) after every turn, ignoring failed and aborted runs; the reading sits in the footer past 60% and the PHASE-BOUNDARIES.md decision order (`/new` > `/skill:handoff` > subagent > `/compact`) toasts once at 85%/100% (`/smartzone`) |
| Write guard | `guard` extension: `write`/`edit` into the vendored tree, `skills-lock.json` (in this repo and inside the installed package), or generated runtime state is refused with what to do instead; a `bash` call without a `timeout` gets 30 minutes (`PI_MYSELF_BASH_TIMEOUT` overrides), since pi's own has none |
| Host command bridge | `host-commands` extension: `/clear` starts a new session like `/new`, and a bare `/<skill>` becomes `/skill:<skill>` unless a prompt or command owns the name |
| Memory | The `memory` skill drives `pi-workspace-memory` records (`state` facts, `event` findings), kept strictly apart from `GLOSSARY.md` (domain) and the tracker (work units) — see `PLAN.md` §3 and ADR 0002 |
| Workflow policy | `policy` extension: injects `.pi/policy/WORKFLOW.md` from the installed package as the parent's `<harness>` system-prompt section before every run, so no repo holds a copy that can go stale; task children skip it (their role body carries the child contract), and an old provisioned `APPEND_SYSTEM.md` suppresses it with one notice to run `/setup-pi-myself` |
| Project provisioning | `/setup-pi-myself` copies or updates task roles while keeping project model and thinking choices; `/setup-pi-myself --check` is a read-only doctor. It does not change the model selected in Pi or the project’s `.pi/settings.json`. |

## The process core

```
skill:grill-with-docs → skill:to-spec → skill:to-tickets → skill:implement → skill:retro  ── one main flow
      ↕ skill:prototype + skill:handoff      (skill:wayfinder for the foggy and huge;
skill:triage ← incoming issues   skill:implement drives  skill:triage for raw issues;
                                 skill:tdd               skill:diagnosing-bugs for hard bugs;
                                 and closes with         skill:improve-codebase-architecture
                                 skill:code-review       for upkeep)
```

Run them as `/skill:<name>` (or ask in conversation); `/skill:ask-matt` routes when the fit is unclear — the map above is its summary. `/skill:implement-spec` is the parallel alternative to per-ticket `implement`: the whole spec in one run, each implementer in its own worktree, everything landing on one integration branch. `pr` shapes a pull request's body, and `/skill:retro` closes the loop by improving the agent's environment rather than the code. The beta bucket (`loop-me`, `claude-handoff`, `setup-ts-deep-modules`, `writing-beats`/`-fragments`/`-shape`) is registered the same way, all user-invoked. The `harness-catalog` skill's `pi-mapping.md` maps the host mechanisms the skills name: subagents onto pi's task roles, session logs onto `recall`, and `claude --bg` onto a new top-level `pi` session.

## Upgrading the vendored core

```bash
npm run sync:skills    # re-clone upstream into vendor/mattpocock-skills, rewrite skills-lock.json
npm run sync:check     # verify lock integrity (also runs in CI)
```

Never edit files under `vendor/mattpocock-skills/`; propose changes upstream instead.

## Verification

From the repository root:

```bash
npm run check     # lint → both typechecks → tests → vendored-lock check → agents check (what CI runs)
```

Individually:

```bash
npm run lint                     # Biome: format + lint (read-only)
npm run lint:fix                 # apply safe fixes and formatting
npm test                         # extension + skill tests
npm run typecheck                # root + tests
npm run extensions:typecheck     # runtime extensions
npm run sync:check               # vendored lock integrity
```

## Customizing

- Add a skill at `.pi/skills/<name>/SKILL.md`; the hygiene tests govern it.
- Add a task role at `.pi/agents/<name>.md` (fields supported by the installed task package).
- Add a prompt at `.pi/prompts/<name>.md` (a typed slash command like `/verify`; skills need no wrapper — pi exposes them natively as `/skill:<name>`). A prompt earns its place only when it does something no skill does (recording evidence in the tracker, provisioning); one that re-narrates a skill's steps is a second process and gets dropped.
- Add a top-level extension file or one-level extension directory with `index.ts`.
- Process changes belong upstream in mattpocock/skills.

## License

MIT. The vendored `vendor/mattpocock-skills/` tree is [mattpocock/skills](https://github.com/mattpocock/skills) (MIT), see its LICENSE.
