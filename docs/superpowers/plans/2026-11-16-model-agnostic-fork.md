# Model agnostic pi-myself implementation plan

> **For agentic workers:** Implement the tasks in order and verify each one before publishing.

**Goal:** Keep the `pi-myself` name and workflow while letting each Pi session choose its own model, including Ollama.

**Architecture:** Remove package model defaults and role model pins. Keep roles and skills intact. Provisioning copies role behavior but preserves a consuming project's model and thinking choices. The doctor reports a same-family review as advice when models are configured, not as a failed setup.

**Tech Stack:** Pi package, TypeScript extensions, Node.js tests.

**Spec:** User request in this conversation: clone `MinhDuyDEV/pi-myself`, keep the name, and make it work with flexible model choices.

## Global constraints

- Keep the repository name `pi-myself`.
- Preserve upstream MIT notices and the vendored Matt Pocock tree.
- Do not install the package into the user's global Pi directory.
- Do not require multiple model providers.

## Review focus

- Setup must leave existing project model settings untouched.
- A role without `model:` must inherit the session model.
- A project role with its own model must keep it across package updates.
- The doctor must not call an unpinned role roster broken.
- The checkout should pass the repository's check script.

### Task 1: Model selection

- [x] Update tests for inherited model behavior and project-owned model overrides.
- [x] Remove model and thinking pins from packaged roles and package settings.
- [x] Adjust provisioning and doctor behavior.
- [x] Run focused tests.

### Task 2: Ownership and instructions

- [x] Update package and README URLs for the owner's same-named repo.
- [x] Explain installation, model selection, and optional multi-agent use.
- [x] Preserve source and license attribution.
- [x] Run full `npm run check`.

### Task 3: Publish

- [x] Create the owner's `pi-myself` fork after local review.
- [x] Push the verified changes and confirm the remote content.
