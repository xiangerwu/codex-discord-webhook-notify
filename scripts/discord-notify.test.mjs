import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildDiscordPayload,
  buildDiscordRequestBody,
  buildNotificationCardData,
  extractNotificationResult,
  formatCardTime,
  resolveNotificationTheme,
} from "./discord-notify.mjs";

test("notification background uses flat-top hexagon geometry", async () => {
  const renderer = await readFile(new URL("./notification-themes/eva.ps1", import.meta.url), "utf8");

  assert.match(renderer, /\$centerX = \$StartX \+ \(\$column \* \$Radius \* 1\.5\)/u);
  assert.match(renderer, /\$centerY = \$StartY \+ \(\$row \* \$hexHeight\).*\$column % 2/us);
  assert.doesNotMatch(renderer, /\(60 \* \$index\) - 30/u);
});

test("hexagon background covers the full canvas", async () => {
  const renderer = await readFile(new URL("./notification-themes/eva.ps1", import.meta.url), "utf8");

  assert.match(renderer, /\$graphics\.FillRectangle\(\$backgroundBrush, 0, 0, \$width, \$height\)/u);
  assert.doesNotMatch(renderer, /\$graphics\.SetClip\(\$backgroundPath\)/u);
});

test("hexagon background extends beyond every canvas edge", async () => {
  const renderer = await readFile(new URL("./notification-themes/eva.ps1", import.meta.url), "utf8");

  assert.match(renderer, /Draw-HexGrid \$graphics \$hexBackground -52 -45 15 17 52/u);
  assert.doesNotMatch(renderer, /\$Bounds/u);
});

test("hexagon background uses solid warning-red cells with thick black separators", async () => {
  const renderer = await readFile(new URL("./notification-themes/eva.ps1", import.meta.url), "utf8");

  assert.match(renderer, /\$hexBackground = .*New-Color "050000".*, 10\)/u);
  assert.match(renderer, /Draw-HexGrid .* \$hexFill 1 \$true \$hexDimFill 0\.15/u);
  assert.match(renderer, /\[System\.Random\]::new\(2408\)/u);
  assert.match(renderer, /DrawString\("EMERGENCY"/u);
  assert.match(renderer, /FillPolygon\(\$Pen\.Brush, \$topTriangle\)/u);
});

test("notification themes default to EVA and reject unknown renderers", () => {
  assert.equal(resolveNotificationTheme(), "eva");
  assert.equal(resolveNotificationTheme("EVA"), "eva");
  assert.throws(() => resolveNotificationTheme("unknown"), /Available themes: eva/u);
});

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

test("marked summary block wins over the leading lines", () => {
  const inline = extractNotificationResult(
    "先跑了一堆背景說明，不該進通知。\n摘要：改好通知卡摘要擷取。\n測試 3/3 通過。\n\n後面還有別的段落。"
  );
  assert.equal(inline, "改好通知卡摘要擷取。\n測試 3/3 通過。");

  const block = extractNotificationResult(
    "背景說明。\nSUMMARY:\n改好通知卡摘要擷取。\n測試 3/3 通過。"
  );
  assert.equal(block, "改好通知卡摘要擷取。\n測試 3/3 通過。");
});

test("mobile card text is capped to fit its panels", () => {
  const longText = "字".repeat(120);

  assert.equal(extractNotificationResult(longText), `${"字".repeat(107)}…`);
  assert.equal(buildNotificationCardData({ request: longText }).request, `${"字".repeat(107)}…`);
});

test("completion time is formatted in Taipei time", () => {
  assert.equal(formatCardTime("2026-08-01T11:59:00Z"), "2026.08.01 19:59");
});

test("card data includes the responding agent and user request", () => {
  const data = buildNotificationCardData({
    agent: "claude",
    statusKey: "completed",
    projectName: "Auto Notify",
    title: "generated title must not be rendered",
    request: "把通知卡改成手機容易閱讀",
    completedAt: "2026-08-01T11:59:00Z",
    summary: "完成通知。",
  });

  assert.equal(data.agent, "Claude");
  assert.equal(data.project, "Auto Notify");
  assert.equal(data.request, "把通知卡改成手機容易閱讀");
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
