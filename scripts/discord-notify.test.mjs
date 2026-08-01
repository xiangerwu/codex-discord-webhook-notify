import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDiscordPayload,
  buildDiscordRequestBody,
  buildNotificationCardData,
  extractNotificationResult,
  formatCardTime,
} from "./discord-notify.mjs";

test("Discord payload contains only a notification and result", () => {
  const payload = buildDiscordPayload(
    {
      statusKey: "completed",
      projectName: "自動通知",
      projectPath: "ignored",
      title: "固定格式",
      summary: "已完成格式標準化。",
    },
    { mentionUserId: "123456789" }
  );

  assert.deepEqual(payload, {
    content: "<@123456789>",
    embeds: [{ color: 0x6aa84f, image: { url: "attachment://notification.png" } }],
    allowed_mentions: { users: ["123456789"] },
  });
});

test("agent output is reduced to the first two useful lines", () => {
  const result = extractNotificationResult(
    "DONE\n\n已完成通知卡。\n測試 2/2 通過。\n這一行不應進入通知。"
  );

  assert.equal(result, "已完成通知卡。\n測試 2/2 通過。");
});

test("completion time is formatted in Taipei time", () => {
  assert.equal(formatCardTime("2026-08-01T11:59:00Z"), "2026.08.01 19:59");
});

test("card data includes the responding agent and excludes the conversation title", () => {
  const data = buildNotificationCardData({
    agent: "claude",
    statusKey: "completed",
    projectName: "Auto Notify",
    title: "generated title must not be rendered",
    completedAt: "2026-08-01T11:59:00Z",
    summary: "完成通知。",
  });

  assert.equal(data.agent, "Claude");
  assert.equal(data.project, "Auto Notify");
  assert.equal("title" in data, false);
});

test("long status labels stay concise and completed checks explain missing results", () => {
  const limited = buildNotificationCardData({
    statusKey: "usage_limited",
    projectName: "Auto Notify",
    completedAt: "2026-08-01T11:59:00Z",
    summary: "配額已達限制。",
  });
  const check = buildNotificationCardData({
    statusKey: "completed_check",
    projectName: "Auto Notify",
    completedAt: "2026-08-01T11:59:00Z",
    summary: "",
  });

  assert.equal(limited.status, "用量不足");
  assert.equal(check.status, "待確認");
  assert.equal(check.result, "代理已停止回應，但未提供結果摘要。請開啟任務確認。");
});

test("Discord request uses one PNG attachment", async () => {
  const payload = { content: "<@123456789>" };
  const body = buildDiscordRequestBody(payload, Buffer.from("png"));
  const attachment = body.get("files[0]");

  assert.equal(body.get("payload_json"), JSON.stringify(payload));
  assert.equal(attachment.name, "notification.png");
  assert.equal(attachment.type, "image/png");
  assert.equal(await attachment.text(), "png");
});
