# 安裝與整合

本文件包含完整設定、Codex `notify`、Claude Code hooks、主題切換與開發驗證。專案功能摘要請見 [README](../README.md)。

## 系統需求

- Windows 10/11
- PowerShell 5.1 或 PowerShell 7
- Node.js 20 以上
- Discord webhook URL
- 接收 mention 的 Discord user ID

專案沒有 npm 相依套件；PNG 由 Windows `System.Drawing` 在本機產生。

## 取得專案

```powershell
git clone https://github.com/xiangerwu/codex-discord-webhook-notify.git
Set-Location codex-discord-webhook-notify
```

## Discord 設定

複製範例：

```powershell
Copy-Item config\discord.example.json config\discord.local.json
```

編輯本機設定：

```json
{
  "webhookUrl": "<DISCORD_WEBHOOK_URL>",
  "mentionUserId": "<DISCORD_USER_ID>",
  "notificationTheme": "galgame",
  "projectAliases": {
    "C:\\Users\\your-name\\Documents\\your-project": "我的專案"
  },
  "forwardNotifyCommand": []
}
```

欄位：

- `webhookUrl`：Discord webhook URL
- `mentionUserId`：通知要 mention 的使用者
- `notificationTheme`：`eva` 或 `galgame`；省略時使用 `eva`
- `projectAliases`：把本機路徑映射成通知卡顯示名稱
- `forwardNotifyCommand`：通知完成後轉送原始 Codex event 的命令；不需要時保持空陣列

先驗證設定：

```powershell
node scripts\discord-notify.mjs --test --dry-run --preview .state\notification-preview.png
```

確認圖片後再發送：

```powershell
node scripts\discord-notify.mjs --test
```

## Codex 整合

在 Codex user-level `config.toml` 設定：

```toml
notify = ["node", "C:\\path\\to\\codex-discord-webhook-notify\\scripts\\discord-notify.mjs", "--codex-notify"]
```

重新啟動 Codex App，讓設定生效。Codex 完成回合後會傳入 `agent-turn-complete` event。

手動模擬：

```powershell
node scripts\discord-notify.mjs --codex-notify '{"type":"agent-turn-complete","cwd":"C:\\project","input-messages":["測試通知"],"last-assistant-message":"摘要：測試完成。"}' --dry-run
```

## Claude Code 整合

在 `~/.claude/settings.json` 加入：

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"C:\\path\\to\\codex-discord-webhook-notify\\scripts\\discord-notify.mjs\" --claude-notify --agent claude",
            "async": true
          }
        ]
      }
    ],
    "Notification": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"C:\\path\\to\\codex-discord-webhook-notify\\scripts\\discord-notify.mjs\" --claude-notify --agent claude",
            "async": true
          }
        ]
      }
    ]
  }
}
```

- `Stop` / `SubagentStop`：回合完成
- `Notification`：需要權限或人工確認
- 其他 Claude hooks 不會發送通知

Claude 事件可包含 `transcript_path`；通知器會從 transcript 取出最後一則使用者要求與助理回覆。

## 摘要格式

建議要求代理在回合結尾加入：

```text
摘要：已完成通知卡調整。
測試 18/18、eval 27/27 通過。
```

可用標記：`摘要：`、`SUMMARY:`、`結論：`。通知器不改寫摘要，也不呼叫 AI。

## 主題切換

修改 `config/discord.local.json`：

```json
{
  "notificationTheme": "eva"
}
```

或：

```json
{
  "notificationTheme": "galgame"
}
```

`eva` 始終是預設主題；切換 Galgame 不會改動 EVA renderer。

## 新增通知主題

1. 在 `scripts/notification-themes/` 建立接受 `-InputPath` 與 `-OutputPath` 的 PowerShell renderer。
2. 讀取共用欄位：`status`、`statusKey`、`project`、`agent`、`completedAt`、`request`、`result`、`avatarPath`。
3. 將 PNG 寫到 `OutputPath`；失敗時回傳非零 exit code。
4. 在 `scripts/discord-notify.mjs` 的 `notificationThemeRenderers` 白名單登記名稱。
5. 加入 renderer contract test、eval 與實際 PNG 預覽。

主題只能處理版面，不應重做事件解析、狀態判斷、文字截斷或 webhook 發送。

## 驗證

```powershell
node --test scripts\discord-notify.test.mjs
node evals\notification-contract.mjs
```

預覽：

```powershell
node scripts\discord-notify.mjs --test --dry-run --preview .state\notification-preview.png
```

## 安全與排錯

- `config/discord.local.json` 與 `.state/` 必須保持在 `.gitignore`
- 不要把真實 webhook URL 或 user ID 寫入文件、測試、截圖或 Git
- Discord 回傳非 2xx 時，CLI 會以非零 exit code 結束並顯示狀態碼
- renderer 失敗時，先確認 `avatarPath` 存在，並直接執行預覽命令取得錯誤
- webhook 曾外洩時，請立即在 Discord 重新產生
