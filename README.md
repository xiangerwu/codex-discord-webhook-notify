# Codex Discord Webhook Notify

把 Codex 或 Claude Code 的回合事件轉成手機易讀的 PNG 通知卡，並透過 Discord webhook 發送。

事件解析、文字擷取與圖片渲染都在本機確定性執行，不呼叫 AI、不輪詢專案狀態。

![Galgame 通知卡範例](docs/images/galgame-notification-example.png)

## 主要功能

- 接收 Codex `notify` 與 Claude Code hook 事件
- 支援 `完成`、`待核准`、`失敗`、`用量不足`、`待確認` 五種狀態
- 顯示專案名稱、實際回應代理、Asia/Taipei 完成時間、最新使用者要求與精簡結果
- 依狀態使用不同的米浴角色圖片
- 支援 `eva` 與 `galgame` 兩種通知主題，預設為 `eva`
- 自動忽略 Codex Desktop 的標題生成與 ambient suggestions 事件
- 保存原始事件至 `.state/events/*.jsonl`，方便追查通知內容
- 所有主題共用相同資料契約與 Discord 發送流程

## 通知內容

```text
狀態 | 專案名稱 | 回應代理 | 完成時間
最新一則使用者要求
代理標記的摘要，或最終回覆前兩行
```

代理可在最終回覆加入 `摘要：`、`SUMMARY:` 或 `結論：`。通知器優先擷取標記段落的前兩行；沒有標記時才使用最終回覆前兩行。使用者要求與結果各限制為 108 字。

## 主題

| 主題 | 說明 |
|---|---|
| `eva` | 紅黑警戒蜂巢、工業識別牌與高對比內容面板 |
| `galgame` | 手機聊天氣泡、紫色角色標籤、視覺小說漸層與操作列 |

Galgame 主題使用原始狀態角色圖；回覆文字以白字黑框直接融入漸層。專案名稱位於左上角，長狀態與代理角色標籤均可完整顯示。

## 快速開始

需求：Windows、PowerShell、Node.js，以及一組 Discord webhook。

1. 建立本機設定：

   ```powershell
   Copy-Item config\discord.example.json config\discord.local.json
   ```

2. 編輯 `config/discord.local.json`：

   ```json
   {
     "webhookUrl": "<DISCORD_WEBHOOK_URL>",
     "mentionUserId": "<DISCORD_USER_ID>",
     "notificationTheme": "galgame",
     "projectAliases": {},
     "forwardNotifyCommand": []
   }
   ```

3. 發送測試通知：

   ```powershell
   node scripts\discord-notify.mjs --test
   ```

4. 依照 [安裝與整合指南](docs/SETUP.md) 接上 Codex `notify` 或 Claude Code hooks。

`config/discord.local.json` 與 `.state/` 已被 Git 忽略，不應提交。

## 本機驗證

只產生 PNG、不送 Discord：

```powershell
node scripts\discord-notify.mjs --test --dry-run --preview .state\notification-preview.png
```

執行 gate tests 與通知契約 eval：

```powershell
node --test scripts\discord-notify.test.mjs
node evals\notification-contract.mjs
```

## 專案結構

```text
scripts/discord-notify.mjs             事件處理、資料正規化與 Discord 發送
scripts/notification-themes/eva.ps1    EVA PNG renderer
scripts/notification-themes/galgame.ps1 Galgame PNG renderer
config/discord.example.json            設定範例
data/riceshower_stamp/*.png             狀態角色圖片
docs/SETUP.md                           完整安裝、Codex 與 Claude Code 整合
```

## 文件

- [安裝、設定與代理整合](docs/SETUP.md)
- [通知卡設計決策](aidd_docs/decisions/notification-card-design.md)
- [Galgame 功能規格](specs/001-galgame-notification-theme/spec.md)

## 安全

- 不要提交 `config/discord.local.json`、`.state/` 或真實 webhook URL
- 不要把 webhook、Discord user ID 或本機憑證貼到 issue、commit message 或 prompt
- webhook 若曾外洩，請立即在 Discord 重新產生

## 素材聲明

米浴表情包來自 [是我祭祭哒](https://space.bilibili.com/9369485?) 公開之表情包。
