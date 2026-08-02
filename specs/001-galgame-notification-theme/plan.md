# Implementation Plan: Galgame Notification Theme

**Branch**: `main` | **Date**: 2026-08-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-galgame-notification-theme/spec.md`

## Summary

Add an allowlisted `galgame` renderer that consumes the existing notification-card JSON contract and writes the approved 1000×1400 purple visual-novel PNG. Keep `eva` as the unchanged default. Extend deterministic tests, evals, documentation, and local preview evidence.

## Technical Context

**Language/Version**: Node.js ES modules; Windows PowerShell 5.1-compatible renderer syntax

**Primary Dependencies**: Node.js standard library; Windows `System.Drawing`

**Storage**: Local JSON config/event files and generated PNG previews

**Testing**: Node built-in test runner; deterministic notification contract eval; inspected PNG preview

**Target Platform**: Windows local runtime; Discord mobile clients consume the rendered PNG

**Project Type**: Local event-driven CLI notification service

**Performance Goals**: One 1000×1400 PNG per accepted event with no network or AI work during rendering

**Constraints**: Offline deterministic rendering; existing renderer contract unchanged; EVA output unchanged; no secrets in previews or fixtures

**Scale/Scope**: One new renderer, one allowlist entry, focused tests/eval/docs, one local preview

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Event-driven only: no polling, scheduling, or repository/process-state inference.
- Runtime processing and rendering remain deterministic, local, and free of AI calls.
- Shared handler semantics remain separate from replaceable theme presentation.
- Trust-boundary validation and secret/data-minimization requirements are identified.
- Gate tests, notification-contract evals, and visual preview tasks are planned where applicable.

**Gate Result (pre-design)**: PASS. The feature adds presentation only, uses the existing local renderer contract, and introduces no polling, AI calls, delivery logic, or secrets.

## Project Structure

### Documentation (this feature)

```text
specs/001-galgame-notification-theme/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)

```text
scripts/
├── discord-notify.mjs
├── discord-notify.test.mjs
└── notification-themes/
    ├── eva.ps1
    └── galgame.ps1

evals/
└── notification-contract.mjs

config/
└── discord.example.json

README.md
```

**Structure Decision**: Reuse the existing theme boundary. All Galgame drawing code lives in one sibling renderer; the shared handler only receives the allowlist entry. Existing gate tests and evals remain the validation entry points.

## Complexity Tracking

No constitution violations.

## Post-Design Constitution Check

- Event-driven only: PASS; no event handling changes.
- Deterministic local processing: PASS; `System.Drawing` only.
- Shared core / replaceable presentation: PASS; shared change is limited to allowlist registration.
- Secret safety: PASS; fixtures use synthetic IDs and local asset paths resolved at runtime.
- Tests, evals, and trace evidence: PASS; tasks cover gate tests, eval, and a local inspected preview.
