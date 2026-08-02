# Data Model: Galgame Notification Theme

No persistent data model changes are required.

## Renderer Card Data

| Field | Meaning | Validation / presentation rule |
|---|---|---|
| `status` | Localized status label | Render prominently in the status pill; `用量不足` must remain fully visible |
| `statusKey` | Stable status identifier | Used only for presentation variations if needed |
| `project` | Condensed project name | Centered in the top-left metadata label; intentionally omitted from the Galgame footer |
| `agent` | Responding agent display name | Render as `♡ [agent] 小米浴`; `Antigravity 小米浴` must remain fully visible |
| `completedAt` | Asia/Taipei display time | Bold system information |
| `request` | Latest user request | Render in the mobile chat bubble |
| `result` | Condensed agent reply | Render in the framed gradient dialogue region |
| `avatarPath` | Local original status avatar | Must load successfully or rendering fails |

The shared core remains responsible for field normalization and truncation. The renderer does not persist or reinterpret any field.
