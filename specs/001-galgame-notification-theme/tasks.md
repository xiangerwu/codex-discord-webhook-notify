# Tasks: Galgame Notification Theme

**Input**: Design documents from `specs/001-galgame-notification-theme/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/renderer.md`, `quickstart.md`

## Phase 1: Setup

**Purpose**: Confirm the existing theme boundary and local safety constraints before editing.

- [x] T001 Verify `config/discord.local.json` and `.state/` remain ignored in `.gitignore`, and confirm `scripts/notification-themes/eva.ps1` is not modified

---

## Phase 2: User Story 1 - Select an Independent Galgame Theme (Priority: P1) 🎯 MVP

**Goal**: Allow `galgame` selection while EVA remains the unchanged default.

**Independent Test**: `resolveNotificationTheme()` accepts `eva` and `galgame`, defaults to `eva`, and rejects unknown names with both allowed values.

### Tests and Evals

- [x] T002 [US1] Add failing allowlist/default assertions for `galgame` in `scripts/discord-notify.test.mjs`
- [x] T003 [P] [US1] Add failing theme contract assertions for `galgame` in `evals/notification-contract.mjs`

### Implementation

- [x] T004 [US1] Register `galgame` beside `eva` in the explicit renderer allowlist in `scripts/discord-notify.mjs`

---

## Phase 3: User Story 2 - Read the Notification Like a Visual-Novel Conversation (Priority: P2)

**Goal**: Produce the approved mobile-readable Galgame PNG from shared card data.

**Independent Test**: Render a test notification with `galgame`; verify PNG signature, 1000×1400 dimensions, original avatar loading, chat bubble, framed reply, gradient, and one-line footer structures.

### Tests and Evals

- [x] T005 [US2] Add failing renderer structure and 1000×1400 integration assertions in `scripts/discord-notify.test.mjs`

### Implementation

- [x] T006 [US2] Implement the offline deterministic Galgame renderer in `scripts/notification-themes/galgame.ps1`

---

## Phase 4: User Story 3 - Identify the Responding Agent and Project (Priority: P3)

**Goal**: Keep 小米浴 while displaying the actual responding agent and project.

**Independent Test**: Renderer contract assertions prove the speaker is composed from `agent + 小米浴` and the footer begins with the supplied project before the single-line controls.

### Tests and Evals

- [x] T007 [US3] Add failing dynamic agent and project footer assertions in `scripts/discord-notify.test.mjs`

### Implementation

- [x] T008 [US3] Bind the Galgame speaker and footer to `agent` and `project` in `scripts/notification-themes/galgame.ps1`

---

## Phase 5: Polish & Validation

- [x] T009 [P] Document Galgame selection and preview commands in `README.md` while preserving `eva` in `config/discord.example.json`
- [x] T010 Run `node --test scripts\discord-notify.test.mjs` and `node evals\notification-contract.mjs`
- [x] T011 Generate and visually inspect `.state/galgame-notification-preview.png` at full size and mobile scale using `specs/001-galgame-notification-theme/quickstart.md`
- [x] T012 Scan changed artifacts for webhook URLs, user IDs, tokens, unrelated event data, and accidental EVA renderer changes

---

## Phase 6: Approved Readability Refinement

- [x] T013 [US2] Add failing user-label, reply-spacing, arrow-placement, and footer assertions in `scripts/discord-notify.test.mjs`
- [x] T014 [P] [US2] Add matching renderer contract assertions in `evals/notification-contract.mjs`
- [x] T015 [US2] Implement the approved label, reply layout, and seven-control footer in `scripts/notification-themes/galgame.ps1`
- [x] T016 [P] [US2] Synchronize the refined visual contract in `specs/001-galgame-notification-theme/` and `aidd_docs/decisions/notification-card-design.md`
- [x] T017 [US2] Run tests and evals, inspect a local preview, and scan the diff for secrets and EVA changes

---

## Phase 7: Equal-Width Conversation Frames

- [x] T018 [US2] Add failing equal-width and request-height assertions in `scripts/discord-notify.test.mjs` and `evals/notification-contract.mjs`
- [x] T019 [US2] Widen both conversation frames and expand request text space in `scripts/notification-themes/galgame.ps1`
- [x] T020 [US2] Synchronize the approved width contract, run tests and evals, and inspect `.state/galgame-notification-wide-preview.png`

---

## Phase 8: Integrated Reply and Role Tabs

- [x] T021 [US2] Add failing role-tab and transparent-reply assertions in `scripts/discord-notify.test.mjs` and `evals/notification-contract.mjs`
- [x] T022 [US2] Add matching purple user and agent role tabs and blend the reply region into the gradient in `scripts/notification-themes/galgame.ps1`
- [x] T023 [US2] Synchronize the visual contract, run tests and evals, and inspect `.state/galgame-notification-role-tabs-preview.png`

---

## Phase 9: Label Scale and Reply Contrast

- [x] T024 [US2] Add failing centered 150%-scale labels, black reply outline, invisible reply boundary, status, and project assertions in `scripts/discord-notify.test.mjs` and `evals/notification-contract.mjs`
- [x] T025 [US2] Implement the enlarged centered labels, outlined reply text, border removal, and top project/status metadata in `scripts/notification-themes/galgame.ps1`
- [x] T026 [US2] Synchronize the visual contract, run tests and evals, and inspect `.state/galgame-notification-contrast-preview.png`

---

## Phase 10: Long Status Label Regression

- [x] T027 [US2] Reproduce the `用量不足` ellipsis with a failing status-frame regression test in `scripts/discord-notify.test.mjs`
- [x] T028 [US2] Widen the shared Galgame status frame and text region in `scripts/notification-themes/galgame.ps1`
- [x] T029 [US2] Run the focused regression, full tests, eval, and inspect `.state/galgame-notification-usage-preview.png`
- [x] T030 [US3] Add a failing regression for the truncated `Antigravity 小米浴` role label in `scripts/discord-notify.test.mjs`
- [x] T031 [US3] Widen the agent role tab, rerun validation, and refresh the usage preview in `scripts/notification-themes/galgame.ps1`

---

## Dependencies & Execution Order

- T001 precedes all edits.
- T002 and T003 must fail before T004.
- T004 precedes the renderer integration path.
- T005 must fail before T006.
- T007 must fail before T008.
- T009 can run after the public theme name is stable.
- T010–T012 require all implementation tasks.

## Parallel Opportunities

- T003 can be written independently from T002.
- T009 touches documentation/config only and can run independently after T004.

## Implementation Strategy

MVP is T001–T004: theme selection without replacing EVA. The complete user-visible feature requires T005–T012.
