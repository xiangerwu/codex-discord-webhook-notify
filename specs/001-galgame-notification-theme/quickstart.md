# Quickstart: Validate the Galgame Notification Theme

## Gate Tests

```powershell
node --test scripts\discord-notify.test.mjs
node evals\notification-contract.mjs
```

Expected: all tests and eval assertions pass, including both `eva` and `galgame` theme selection and Galgame PNG dimensions.

## Local Preview

Copy the example config if a local config does not exist, then set `notificationTheme` to `galgame` in the local ignored config:

```powershell
Copy-Item config\discord.example.json config\discord.local.json
node scripts\discord-notify.mjs --test --dry-run --preview .state\galgame-notification-preview.png
```

Expected visual hierarchy:

1. Bold system label and completion time
2. Original status avatar in a centered circular frame
3. Latest user request in a wide curved chat bubble under the centered purple `♡ 哥 哥 大 人` role tab
4. Centered purple `♡ [agent] 小米浴` role tab and white reply text with a black outline directly on the gradient
5. No visible reply boundary; seamless purple gradient and an enlarged, evenly distributed seven-control footer
6. Full `用量不足` status and `Antigravity 小米浴` agent labels without ellipsis

Inspect `.state/galgame-notification-preview.png` at full size and at approximately 360 pixels wide.
