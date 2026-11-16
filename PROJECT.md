# Project Map

`pi-myself` is a configuration and extension package for the pi coding agent built around the vendored `mattpocock/skills` core. `package.json` defines registered pi paths; `README.md` is the user-facing overview; `PLAN.md` is the current-state contract, `docs/adr/` holds decisions with their reasons, and `docs/history.md` the dated history. Verify volatile behavior against tracked files and tests.

## Shipped pi Surface

- `vendor/mattpocock-skills/` — vendored upstream mattpocock/skills (process core; read-only; its `skills/engineering`, `skills/productivity`, and `skills/in-progress` (beta) trees are registered with pi).
- `.pi/extensions/` — runtime extensions: `policy` (injects the workflow policy into the session parent's system prompt), `guard` (refuses write/edit into the vendored tree, the lock, and runtime state; default `bash` timeout), `host-commands` (`/clear`; bare `/<skill>` → `/skill:<skill>`), `skill-tool` (the `skill` tool, whose skill set mirrors pi's own skill loader), `tracker` (two backends: `.scratch/` local markdown + GitHub Issues via `gh-*` ops; locked, atomically-replaced writes; `/frontier`), `smart-zone` (footer meter + `/smartzone`), `dcp/` (session-history `recall`), `continue-after-compaction`, `provision` (`/setup-pi-myself`).
- `.pi/extensions/tracker/conventions.test.ts` — the gate tying the tracker's op set to the vendored tracker templates: a documented operation that is neither wired nor recorded fails the suite.
- `.pi/settings.json` — package settings (skill commands, compaction reserves, retry); `/setup-pi-myself` leaves the consuming repo’s model settings alone.
- `.pi/skills/` — our own skills: `memory` (pi-workspace-memory workflow), `harness-catalog` (the situation-to-command map over every registered skill, plus its `pi-mapping.md` host translations), `commit-guardrails` (the git-hook installer at `install-git-hooks.mjs`), `verification-before-completion`, `typescript-coding-standards`, `security-and-hardening`, `source-driven-development`, `test-proof-debt-audit`, `ultra-review`, `ultra-review-receive`, `repo-refresh`. A skill's own helper scripts live inside its directory, the way `ultra-review/scripts/` already did, because that is what a consuming repo receives.
- `.pi/prompts/` — hand-written slash commands: `/verify`, `/init`.
- `.pi/extensions/provision.ts` — `/setup-pi-myself` command only (no session-start check: rerunning the command is the update path); `.pi/extensions/lib/` holds shared helpers (repo root, package root, pi's agent dir) and is deliberately not an extension.
- `.pi/policy/WORKFLOW.md` — the workflow policy; the `policy` extension injects it from the installed package as the parent's `<harness>` section on every run (ADR 0003), so it is never copied into a consuming repo. Deliberately not an `APPEND_SYSTEM.md`, which pi would also load here. Task children skip it.
- `.pi/policy/CHILD-CONTRACT.md` — the child contract's one source; `scripts/sync-agents.mjs` splices it between the `child-contract` markers at the end of every role in `.pi/agents/`, so provisioned roles carry it too.
- `docs/agents/` — the per-repo skill configuration (`setup-matt-pocock-skills` writes it) `docs/adr/` the decisions, and `docs/history.md` the dated record (not current guidance); the harness's own host translation ships inside the `harness-catalog` skill instead, so a consuming repo gets it with the package.

## Development Support

- `tests/` — catalog, lock, invocation, asset, prompt-contract, marker, and guidance-hygiene (links, duplicates, byte budgets) tests.
- `.pi/extensions/**/*.test.ts` — extension unit and lifecycle tests, colocated with source.
- `scripts/run-extension-tests.mjs` — discovers and runs Node extension tests.
- `scripts/sync-skills.mjs` — vendored sync + lock integrity: per-skill hashes plus a digest of every file under `vendor/mattpocock-skills/` (`--check`; `--relock` only adds that digest to a lock written before it, without a network clone, and refuses any drift).
- `scripts/sync-agents.mjs` — the child-contract splice (`npm run agents:sync`; `--check` is `npm run agents:check`, part of `npm run check`).
- `npm run hooks:install` / `hooks:check` — the repo-local git guardrail, run through the installer shipped in the `commit-guardrails` skill (staged check, optional `--trailer` session id; `--check` verifies without writing).
- `scripts/setup-project.mjs` — provisions and updates a consuming repo: copies the task roles, preserves project-owned `model`, `thinking`, and `max_turns`, leaves `.pi/settings.json` untouched, migrates old copied workflow rules and glossary names, and records a baseline so other edits can be backed up before refresh. A project-added role is left alone.
- `/setup-pi-myself --check` (provision extension) — read-only doctor for trust, role freshness, optional pinned-model family comparison, companion tools, tracker and domain docs, glossary naming, duplicate installs, and ignored runtime state.
- `.github/workflows/quality.yml` runs `npm run check` on Node 22.18.0 (the `engines` minimum) and 22.20.0; `.github/workflows/upstream-freshness.yml` fails weekly when upstream `mattpocock/skills` main has moved past the lock's head.
- `package.json` — npm scripts and pi package registration.
- `biome.json` — formatter + linter config (tabs, double quotes, `preset: recommended`); excludes `vendor/` and the generated lock, and relaxes two rules for `*.test.ts` only. Takes no comments: Biome silently drops `files.includes` when one is present.
- `tsconfig.json` — root/test TypeScript; excludes `.pi/` and `vendor/`. Strict beyond `strict: true`: `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `exactOptionalPropertyTypes`.
- `.pi/extensions/tsconfig.json` — runtime extension TypeScript (same strict flags).
- `.pi/agents/*.md` — pi-task role overrides (not registered through the `pi` field; task tooling discovers them).

## Generated and Runtime State

Not source of truth, do not edit: `node_modules/`, `.pi/node_modules/`, `.pi/npm/`, `.pi/git/`, `.pi/sessions/`, `.pi/task-exits/`, `.pi/artifacts/`, `.pi/task-session-history.json`, `.pi/sandbox/`. `.scratch/` holds the local-markdown issue tracker — disposable work units, gitignored by default. Memory records live outside the repo under `~/.pi/memory-md/projects/<slug>/` (pi-workspace-memory).

## Sensitive Areas

- `.pi/extensions/dcp/` — session-history recall.
- `.pi/extensions/skill-tool/` — skill invocation surface; its loadable set must equal the model-invoked set (tested).
- `.pi/extensions/tracker/` — local backend writes under `.scratch/` only (slug-validated paths); GitHub backend shells out to `gh` with the repo as cwd and needs `gh auth login`.
- `skills-lock.json` — vendored provenance (upstream head, per-skill hashes, whole-tree digest); regenerate via `npm run sync:skills`, never by hand.
- Package lifecycle scripts and browser helpers — may execute processes or create external side effects.

## Verification

```bash
npm run check                 # lint → both typechecks → tests → sync check → agents check (what CI runs)
npm run lint                  # Biome format + lint (read-only)
npm test                      # extensions + skill hygiene tests
npm run extensions:typecheck  # runtime extensions
npm run typecheck             # root + tests
npm run sync:check            # vendored lock integrity (every vendored file)
npm run agents:check          # every role carries the current child contract
```
