# Notification card design decision

Date: 2026-08-01

## Decision

Use replaceable notification themes. The first theme is the validated **EVA Industrial Plate (A v3)** layout.

The card is rendered locally as a 1000×1400 PNG using Windows System.Drawing. Its height is twice the previous card, and the portrait layout prioritizes phone readability. Runtime image generation does not call an AI model and adds no npm dependency.

`notificationTheme` selects a renderer from the explicit `notificationThemeRenderers` allowlist. It defaults to `eva`, so existing local configuration remains compatible. Each renderer accepts the same input JSON and output PNG paths; adding a theme requires one renderer file and one allowlist entry.

Theme renderers own only PNG presentation. Event normalization, status detection, text truncation, avatar selection, Discord payload construction, and webhook delivery remain in the shared JavaScript handler. The renderer input contract is `status`, `statusKey`, `project`, `agent`, `completedAt`, `request`, `result`, and `avatarPath`.

## Information contract

The card displays only:

1. Status
2. Project name
3. Responding agent
4. Completion time in Asia/Taipei
5. The latest non-empty user request, limited to 108 characters. Codex `input-messages` are ordered oldest to newest, so the notifier selects the last normalized entry.
6. A condensed result, limited to 108 characters. The notifier prefers a summary block the agent marks with `摘要:` / `SUMMARY:` / `結論:` (inline or as the following lines) and falls back to the first two useful lines of the final response when no marker is present.

Generated conversation titles are excluded. The user's actual request identifies the turn instead.

The summary is produced by the agent, not by the notifier: the runtime still performs deterministic extraction only and never calls an AI model. Agents are instructed (via `AGENTS.md` / `CLAUDE.md`) to end a turn with a `摘要:` block.

## EVA visual contract

- Existing local Rice Shower status image
- Black mechanical identification-plate layout
- Orange frame and top/bottom warning stripes
- Status-specific accent color
- Full-card solid warning-red hexagons separated by thick black lines, with alternating triangle and `EMERGENCY` motifs
- High-opacity black glass panels with a vertical transparency gradient
- Separate status, agent, and project identity blocks
- User request and completion report use a 4:6 height ratio
- Compact header with portrait and metadata
- User request above the completion report
- Vertically stacked, large-text content panels

## Galgame visual contract

- Optional `galgame` theme; `eva` remains the default
- Same 1000×1400 renderer contract and original status avatar supplied by the shared core
- Circular avatar centered near the top, with bold status and completion time
- Latest user request in a wide mobile-chat bubble matching the reply width, with a centered letter-spaced purple `♡ 哥哥大人` role tab at 150% of its previous text size
- Responding agent displayed in a centered purple `♡ [agent] 小米浴` role tab at 150% of its previous text size
- Condensed reply uses white text with a black outline directly on the seamless purple gradient; no visible reply boundary remains and the continuation arrow stays inside the region
- Supplied project name and enlarged status are centered in the top metadata labels
- The status label fully fits `用量不足`; the agent role tab fully fits `Antigravity 小米浴` without ellipsis
- Enlarged `PAUSE`, `SKIP`, `AUTO`, `LOG`, `SAVE`, `LOAD`, and `SYSTEM` controls distributed evenly in one footer line; project is omitted
- Footer controls are decorative elements in the static PNG, not interactive actions

## Verification

```powershell
node --test scripts\discord-notify.test.mjs
node evals\notification-contract.mjs
node scripts\discord-notify.mjs --test --dry-run --preview data\notification-preview.png
```
