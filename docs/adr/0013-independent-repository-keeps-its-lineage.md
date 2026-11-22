# ADR 0013: An independent repository keeps its lineage

Decided 2026-11-22 for the `BinhNguyen1912` harness. Builds on ADR 0012 and leaves ADR 0007's scoping decision untouched.

## Context

The harness is now this owner's own project: it lives in a repository of his, under his name, and he decides what it contains. The code and decisions were written upstream, under a fork that GitHub still labels as a fork of `MinhDuyDEV/pi-myself`, and two of his repositories were already provisioned from it (`.pi/pi-myself-provisioned.json` beside the copied roles).

Three constraints collide with a plain rename:

- `LICENSE` is MIT with `Copyright (c) 2025 huynhgiabuu`; the notice has to travel with every copy, so authorship is retained, not reassigned.
- `docs/history.md` is a dated record and the ADRs are dated decisions: rewriting them to the new name would falsify when a thing was true.
- The provisioning baseline is keyed to a file name in a consuming repository. Renaming it would make `/setup-pi-harness` in an already-provisioned repository find no baseline and back up every role as `.local`.

## Decision

- Identity is `pi-harness`: the `package.json` name and `repository`, the README title and install line, the provision command `/setup-pi-harness` (was `/setup-pi-myself`), the `PI_HARNESS_BASH_TIMEOUT` variable, and every current-state document and source comment follow.
- The GitHub repository is created fresh under `BinhNguyen1912/pi-harness`, so it is not a fork. The previous fork stays exactly as it is; the upstream stays reachable as a read-only `upstream` remote, and nothing is pushed or proposed to it.
- `git log`, `LICENSE`, `docs/history.md`, and the ADRs written before this one keep the authors, names, and reasoning they were written under. This ADR is the boundary: an ADR or history line dated before 2026-11-22 that says `pi-myself` or `/setup-pi-myself` means this package and its command as they were then.
- The provisioning baseline file keeps its original name, `.pi/pi-myself-provisioned.json`.

## Consequences

Naming is deliberately mixed: current-state documents and code say `pi-harness`, dated records say `pi-myself`. A reader who needs the old command finds the mapping in this ADR instead of a silently rewritten file.

The baseline keeps the old name until a migration exists: `provision` would have to read the old file, write the new one, and delete the old one, with a test for the already-provisioned case. Renaming it without that step is a data-loss bug for every consuming repository.

The fork remains public; the independent repository is the one that is developed. Syncing upstream is a fetch plus `npm run sync:skills`, unchanged by the rename.
