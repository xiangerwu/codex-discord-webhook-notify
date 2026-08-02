# Feature Specification: Galgame Notification Theme

**Feature Branch**: `001-galgame-notification-theme`

**Created**: 2026-08-02

**Status**: Implemented and validated

**Input**: Add a new Galgame-style Discord notification card based on the approved preview, without changing the existing EVA theme.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Select an Independent Galgame Theme (Priority: P1)

As the notification owner, I can select a new Galgame theme while the existing EVA theme remains available and unchanged.

**Why this priority**: The user explicitly requires a new design without replacing or regressing the current notification style.

**Independent Test**: Select each supported theme for the same test notification and verify that both produce a PNG while the default remains EVA.

**Acceptance Scenarios**:

1. **Given** an existing configuration with no theme selection, **When** a notification is rendered, **Then** the EVA theme is used exactly as before.
2. **Given** a configuration selecting the Galgame theme, **When** a notification is rendered, **Then** the new Galgame card is produced from the shared notification data.
3. **Given** an unsupported theme name, **When** configuration is validated, **Then** rendering is rejected with the supported theme names listed.

---

### User Story 2 - Read the Notification Like a Visual-Novel Conversation (Priority: P2)

As a mobile Discord reader, I can quickly distinguish my latest request from the agent's reply in a compact visual-novel layout.

**Why this priority**: The approved design depends on a clear conversation hierarchy rather than a generic status dashboard.

**Independent Test**: Render a card with representative Chinese and English text, inspect it at mobile width, and confirm that the request bubble, seamless gradient reply, status, time, and footer remain readable.

**Acceptance Scenarios**:

1. **Given** a notification record, **When** the Galgame theme renders it, **Then** the original status avatar appears centered near the top inside a circular frame without being regenerated or redesigned.
2. **Given** a latest user request, **When** the card renders, **Then** it appears in a wide mobile-chat bubble with a centered, letter-spaced purple `♡ 哥哥大人` role tab enlarged to 150% of its previous size and a natural curved tail.
3. **Given** a condensed agent result, **When** the card renders, **Then** it appears in white text with a black outline directly over the background gradient, below a centered purple `♡ [agent] 小米浴` role tab enlarged to 150% of its previous size, with no visible white reply boundary.
4. **Given** a completion time and status, **When** the card renders, **Then** both are prominent, bold, and readable without zooming on a typical mobile screen.

---

### User Story 3 - Identify the Responding Agent (Priority: P3)

As the notification owner, I can identify which agent replied while the character identity remains 小米浴.

**Why this priority**: Multiple agents share the same notification pipeline, so the card must preserve agent context.

**Independent Test**: Render otherwise identical records for the currently active agents and verify that the reply speaker changes while the 小米浴 identity and footer structure remain stable. Keep Antigravity only as a long-name compatibility fixture until its own agent takes over notification handling.

**Acceptance Scenarios**:

1. **Given** a responding agent, **When** the Galgame card renders, **Then** the speaker label is formatted as `[agent] 小米浴`.
2. **Given** the footer, **When** the card renders, **Then** `PAUSE`, `SKIP`, `AUTO`, `LOG`, `SAVE`, `LOAD`, and `SYSTEM` appear enlarged and evenly distributed on one visual-novel-style line.
3. **Given** a project name, **When** the Galgame card renders, **Then** the project name is omitted from the footer.
4. **Given** a project name and status, **When** the Galgame card renders, **Then** both appear enlarged and centered in their top metadata labels.

### Edge Cases

- Long request or result text is constrained to its allotted region and does not overlap the avatar, footer, or card edge.
- Long project and agent names are clipped or reduced within their fixed regions without shifting the footer to a second line.
- Every supported notification status uses the avatar path supplied by the shared core and displays its localized status label.
- The longest localized status label, `用量不足`, remains fully visible without ellipsis.
- Missing or unreadable avatar input causes a concise renderer failure instead of a partial or empty PNG.
- Mixed Chinese and Latin text remains readable with locally available fonts.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide `galgame` as an explicitly selectable notification theme.
- **FR-002**: The system MUST keep `eva` as the default theme and MUST NOT change its renderer output or selection behavior.
- **FR-003**: The Galgame theme MUST consume the existing renderer data contract without adding notification semantics or delivery logic.
- **FR-004**: The Galgame theme MUST render the supplied original avatar image in a 300-pixel circular frame centered near the top of a 1000×1400 mobile-readable card.
- **FR-005**: The Galgame theme MUST present the current user request in a wide mobile-chat bubble with a centered, letter-spaced purple `♡ 哥哥大人` role tab enlarged to 150% of its previous text size, a curved tail, and enough height for the constrained request text.
- **FR-006**: The Galgame theme MUST present the condensed result as white text with a black outline directly over the seamless purple gradient below a centered purple `♡ [agent] 小米浴` role tab enlarged to 150% of its previous text size; the reply boundary MUST be invisible and the continuation arrow MUST remain inside the region.
- **FR-007**: The Galgame theme MUST show the responding agent as `[agent] 小米浴`.
- **FR-008**: The Galgame theme MUST show the supplied project name, bold enlarged status, and Asia/Taipei completion time in centered top metadata labels.
- **FR-009**: The footer MUST omit the project name and contain enlarged, evenly distributed `PAUSE`, `SKIP`, `AUTO`, `LOG`, `SAVE`, `LOAD`, and `SYSTEM` controls on one line.
- **FR-010**: The Galgame theme MUST render locally and deterministically to the requested PNG path or fail with a concise actionable error.
- **FR-011**: Theme validation MUST include both `eva` and `galgame` in the explicit allowlist and rejection message.
- **FR-012**: Documentation MUST explain how to select and preview the Galgame theme while stating that EVA remains the default.

### Project Guardrails *(mandatory)*

- **GR-001**: The feature MUST remain event-driven and MUST NOT add polling or scheduled scanning.
- **GR-002**: Runtime notification behavior MUST remain deterministic, local, and free of AI calls.
- **GR-003**: Shared notification semantics and theme presentation MUST remain separate.
- **GR-004**: Renderer selection MUST remain allowlisted; webhook URLs, credentials, and user IDs MUST NOT appear in fixtures, previews, or documentation.
- **GR-005**: Gate tests MUST cover theme selection and renderer output, the notification eval MUST cover the new theme contract, and a local PNG preview MUST provide visual evidence.

### Key Entities

- **Notification Theme**: A named presentation choice selected from an explicit allowlist; `eva` remains the default and `galgame` is the new option.
- **Renderer Card Data**: Status, status key, project, responding agent, completion time, latest user request, condensed result, and original avatar path supplied by the shared core.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All supported test notifications render successfully with both EVA and Galgame themes, with zero change to the default theme choice.
- **SC-002**: At a 360-pixel-wide mobile preview, the status, time, request, reply, speaker, and footer controls remain distinguishable without horizontal scrolling.
- **SC-003**: Previews for the currently active agents identify the correct responding agent in 100% of test cases while retaining 小米浴. Antigravity remains a non-public compatibility fixture until its own agent takes over notification handling.
- **SC-004**: The complete gate test suite and notification contract eval pass, and one inspected local Galgame PNG matches the approved layout hierarchy.

## Assumptions

- The approved purple preview is the visual baseline; small rendering differences caused by installed fonts are acceptable if hierarchy and readability remain intact.
- The existing original status avatars under `data/riceshower_stamp/` remain the source of truth and are not regenerated.
- Footer controls are decorative visual-novel details in the static PNG and do not imply interactive behavior.
- Existing text condensation and truncation performed by the shared core remain authoritative.
