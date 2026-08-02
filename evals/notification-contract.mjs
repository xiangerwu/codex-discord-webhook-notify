import assert from "node:assert/strict";

import {
  buildDiscordPayload,
  buildNotificationCardData,
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
assert.throws(() => resolveNotificationTheme("missing"), /Available themes: eva/u);

console.log("notification contract eval: 11/11 passed");
