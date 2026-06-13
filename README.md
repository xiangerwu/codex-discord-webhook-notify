# Codex Discord Webhook Notify

這是一個 Codex `notify` handler。Codex 對話回合完成時，腳本會接收 `agent-turn-complete` 事件，整理成中文 Discord embed，並透過 Discord webhook 通知指定使用者。

這個專案只做 event-driven notification，不做排程輪詢，也不掃描專案狀態。

## 功能

- 接收 Codex `notify` 事件：`--codex-notify`
- 支援完成、待核准、失敗、用量不足、需人工確認等狀態判斷
- 自動忽略 Codex Desktop 內部 title generation / ambient suggestions 事件
- 保留原始 Codex event log 到 `.state/events/*.jsonl` 方便校準
- 使用 `.state/thread-titles.json` 快取 Codex Desktop 產生的對話標題
- 支援 Discord mention、embed、狀態顏色、公開圖片 URL、轉發 notify command

## 檔案

```text
scripts/discord-notify.mjs     Codex notify handler
config/discord.example.json    設定範例，可複製成本機設定
data/riceshower_stamp/*.png    米浴表情包素材
```

本機 secret 設定檔 `config/discord.local.json` 不應提交到 GitHub，已由 `.gitignore` 排除。

## 設定

複製範例設定：

```powershell
Copy-Item config\discord.example.json config\discord.local.json
```

填入你的 Discord webhook 與 user id：

```json
{
  "webhookUrl": "https://discord.com/api/webhooks/...",
  "mentionUserId": "123456789012345678",
  "mentionLabel": "哥哥大人",
  "projectAliases": {
    "C:\\Users\\your-name\\Documents\\your-project": "我的專案"
  },
  "statusImageUrls": {
    "completed": "",
    "needs_approval": "",
    "failed": "",
    "usage_limited": "",
    "completed_check": ""
  },
  "forwardNotifyCommand": []
}
```

`statusImageUrls` 只接受公開 `http(s)` URL。Discord embed 無法直接讀取本機圖片路徑；如果要使用 `data/riceshower_stamp/*.png`，請先把圖片放到可公開存取的位置，再填入 URL。

## Codex Notify

把 Codex user-level config 設成呼叫這個腳本。Windows 範例：

```toml
notify = ["node", "C:\\Users\\your-name\\Documents\\codex-discord-webhook-notify\\scripts\\discord-notify.mjs", "--codex-notify"]
```

設定完成後重開 Codex App，讓 user-level `notify` 生效。

## 測試

只產生 payload，不送 Discord：

```powershell
node scripts/discord-notify.mjs --test --dry-run
```

送出一則測試通知：

```powershell
node scripts/discord-notify.mjs --test
```

模擬 Codex 完成事件：

```powershell
node scripts/discord-notify.mjs --codex-notify '{"type":"agent-turn-complete","cwd":"C:\\Users\\your-name\\Documents\\your-project","thread-id":"thread-001","last-assistant-message":"notify dry run"}' --dry-run
```

## 公開前注意

- 不要提交 `config/discord.local.json`
- 不要提交 `.state/`
- 不要把 Discord webhook URL 放進 README、issue、commit message 或 prompt
- 如果 webhook 曾經暴露，請到 Discord 重新產生 webhook URL

## 素材聲明

米浴表情包來自 [是我祭祭哒](https://space.bilibili.com/9369485?) 公開之表情包。
