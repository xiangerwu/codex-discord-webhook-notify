# Notification card design decision

Date: 2026-08-01

## Decision

Use the validated **Industrial Plate (A v3)** layout for generated Discord notification cards.

The card is rendered locally as a 1600×700 PNG using Windows System.Drawing. Runtime image generation does not call an AI model and adds no npm dependency.

## Information contract

The card displays only:

1. Status
2. Project name
3. Responding agent
4. Completion time in Asia/Taipei
5. The first two useful lines of the agent's final response, limited to 180 characters

Conversation titles are intentionally excluded because they are generated automatically and are not user-controlled.

## Visual contract

- Existing local Rice Shower status image
- Black mechanical identification-plate layout
- Orange frame and top/bottom warning stripes
- Status-specific accent color
- Chamfered square portrait frame
- Large completion report area

## Verification

```powershell
node --test scripts\discord-notify.test.mjs
node evals\notification-contract.mjs
node scripts\discord-notify.mjs --test --dry-run --preview data\notification-preview.png
```
