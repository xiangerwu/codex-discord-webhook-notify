import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  buildDiscordPayload,
  buildNotificationCardData,
  normalizeEvent,
  renderNotificationCard,
  resolveNotificationTheme,
} from "../scripts/discord-notify.mjs";

for (const statusKey of ["completed", "needs_approval", "failed", "usage_limited", "completed_check"]) {
  const payload = buildDiscordPayload(
    { statusKey, projectName: "專案", title: "對話", summary: "結果" },
    { mentionUserId: "123456789" }
  );

  assert.equal(payload.content, "<@123456789>");
  assert.equal(payload.embeds.length, 1);
  assert.deepEqual(payload.embeds[0].image, { url: "attachment://notification.png" });
}

const png = await renderNotificationCard({
  statusKey: "completed",
  projectName: "Auto Notify",
  request: "把通知卡改成手機容易閱讀",
  completedAt: "2026-08-01T11:59:00Z",
  summary: "已完成通知卡。\n測試 3/3 通過。",
});
assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
assert.equal(png.readUInt32BE(16), 1000);
assert.equal(png.readUInt32BE(20), 1400);
const galgamePng = await renderNotificationCard(
  {
    agent: "claude",
    statusKey: "completed",
    projectName: "Auto Notify",
    request: "把通知改成手機聊天樣式",
    completedAt: "2026-08-01T11:59:00Z",
    summary: "通知已經送達。",
  },
  "galgame"
);
assert.deepEqual([...galgamePng.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
assert.equal(galgamePng.readUInt32BE(16), 1000);
assert.equal(galgamePng.readUInt32BE(20), 1400);
assert.equal(
  buildNotificationCardData({ request: "顯示這次使用者要求" }).request,
  "顯示這次使用者要求"
);

assert.equal(
  buildNotificationCardData({ statusKey: "usage_limited", summary: "額度已達限制" }).status,
  "用量不足"
);
const completedCheck = buildNotificationCardData({ statusKey: "completed_check", summary: "" });
assert.equal(completedCheck.status, "待確認");
assert.match(completedCheck.result, /未提供結果摘要/u);
assert.equal(resolveNotificationTheme("EVA"), "eva");
assert.equal(resolveNotificationTheme("galgame"), "galgame");
assert.throws(() => resolveNotificationTheme("missing"), /Available themes: eva, galgame/u);
const galgameRenderer = await readFile(
  new URL("../scripts/notification-themes/galgame.ps1", import.meta.url),
  "utf8"
);
assert.match(galgameRenderer, /0x54E5.*0x54E5.*0x5927.*0x4EBA/us);
assert.doesNotMatch(galgameRenderer, /Q\.SAVE|Q\.LOAD/u);
assert.match(galgameRenderer, /\$data\.project/u);
assert.match(galgameRenderer, /PAUSE.*SKIP.*AUTO.*LOG.*SAVE.*LOAD.*SYSTEM/us);
assert.match(galgameRenderer, /Draw-ChatBubble \$graphics 50 500 900 220/u);
assert.match(galgameRenderer, /New-RoundedRectangle 50 790 900 430 28/u);
assert.match(galgameRenderer, /Draw-RoundedPanel \$graphics 72 468 290 68/u);
assert.match(galgameRenderer, /Draw-RoundedPanel \$graphics 72 758 560 72/u);
assert.match(galgameRenderer, /New-Color "332252" 0.*New-Color "EEE8FF" 0/us);
assert.match(galgameRenderer, /\$data\.result\).*New-Color "211B2A" 230\) 2/us);
assert.match(galgameRenderer, /Draw-RoundedPanel \$graphics 500 128 300 76/u);
assert.equal(
  normalizeEvent(
    {
      type: "agent-turn-complete",
      cwd: "C:\\project",
      "input-messages": ["最初需求", "目前最新需求"],
    },
    { projectAliases: {} },
    {}
  ).request,
  "目前最新需求"
);

console.log("notification contract eval: 27/27 passed");
