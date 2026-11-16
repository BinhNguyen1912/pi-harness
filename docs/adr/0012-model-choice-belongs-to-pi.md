# ADR 0012: Model choice belongs to Pi and the consuming project

Decided 2026-11-16 for the `BinhNguyen1912/pi-myself` fork. Supersedes model selection in ADR 0009 and all of ADR 0011.

## Context

The owner often uses Pi with Ollama and DeepSeek, but may choose another provider. The source harness pins seven roles to `vector/*`, requires a separate model family for review, and overwrites each project's selected default model during setup. That makes the workflow depend on provider access the owner may not have.

## Decision

- Packaged roles omit `model:` and `thinking:`. pi-task lets them inherit the active Pi session.
- `/setup-pi-myself` leaves a consuming project's `.pi/settings.json` unchanged and preserves project-owned `model`, `thinking`, and `max_turns` overrides on roles.
- The doctor accepts an unpinned roster. When roles explicitly pin models, it can still warn about a reviewer on the same family as a reason role.
- The seven role responsibilities, skills, safety boundaries, and workflow commands remain available. A single model is sufficient to run them.

## Consequences

Independent review on one model has a fresh context and criteria, but lacks cross-model diversity. A second provider can be assigned to `reviewer` later without changing this package.

The root MIT notice and the vendored upstream tree remain unchanged.
