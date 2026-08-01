#!/usr/bin/env node

import { appendFile, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const defaultConfigPath = path.join(rootDir, "config", "discord.local.json");
const defaultEventLogDir = path.join(rootDir, ".state", "events");
const defaultTitleCachePath = path.join(rootDir, ".state", "thread-titles.json");
const cardRendererPath = path.join(__dirname, "render-notification-card.ps1");
const taipeiFormatter = new Intl.DateTimeFormat("zh-TW", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const defaultStyleTemplates = {
  completed:
    "那個...{projectName} 的「{conversationTitle}」已經完成了。米浴把結果輕輕放在這裡，請你看一下...",
  needs_approval:
    "那個...{projectName} 的「{conversationTitle}」需要你看一下，米浴不敢自己決定...",
  failed:
    "對不起...{projectName} 的「{conversationTitle}」好像沒有順利完成。米浴把看到的結果留下來了...",
  usage_limited:
    "那個...{projectName} 的「{conversationTitle}」力量好像不夠了，可能是用量或額度不足...",
  completed_check:
    "那個...{projectName} 的「{conversationTitle}」已經停下來了，但米浴還不太確定結果，請你確認一下...",
};

const defaultAgentStyleTemplates = {
  codex: {
    completed: "那個...{projectName} 的「{conversationTitle}」已經完成了。米浴把結果輕輕放在這裡，請你看一下...",
    needs_approval: "那個...{projectName} 的「{conversationTitle}」需要你看一下，米浴不敢自己決定...",
    failed: "對不起...{projectName} 的「{conversationTitle}」好像沒有順利完成。米浴把看到的結果留下來了...",
    usage_limited: "那個...{projectName} 的「{conversationTitle}」力量好像不夠了，可能是用量或額度不足...",
    completed_check: "那個...{projectName} 的「{conversationTitle}」已經停下來了，但米浴還不太確定結果，請你確認一下...",
  },
  claude: {
    completed: "Claude 已完成專案 {projectName} 中的對話「{conversationTitle}」。任務已就緒，請查收結果。",
    needs_approval: "Claude 在專案 {projectName} 中的「{conversationTitle}」需要您的確認與授權以繼續執行。",
    failed: "抱歉，Claude 在專案 {projectName} 中的「{conversationTitle}」執行時遇到了錯誤，無法完成任務。",
    usage_limited: "Claude 的配額已達限制，無法在專案 {projectName} 的「{conversationTitle}」中繼續執行。",
    completed_check: "Claude 已完成專案 {projectName} 中的階段性任務「{conversationTitle}」，請您確認目前的狀態。",
  },
  antigravity: {
    completed: "Antigravity 已經突破重力！專案 {projectName} 的對話「{conversationTitle}」已順利完成。",
    needs_approval: "Antigravity 發現需要人工操作。專案 {projectName} 的「{conversationTitle}」正等待您的核准。",
    failed: "Antigravity 遇到重力干擾！專案 {projectName} 的「{conversationTitle}」執行失敗，請檢查日誌。",
    usage_limited: "Antigravity 燃料不足！專案 {projectName} 的「{conversationTitle}」因配額限制已暫停。",
    completed_check: "Antigravity 已暫停執行。專案 {projectName} 的「{conversationTitle}」已達階段目標，請確認結果。",
  }
};

const defaultStatusImageUrls = {
  completed: "",
  needs_approval: "",
  failed: "",
  usage_limited: "",
  completed_check: "",
};

function usage() {
  return [
    "Usage:",
    "  node scripts/discord-notify.mjs --codex-notify '<event-json>'",
    "  node scripts/discord-notify.mjs --test",
    "",
    "Options:",
    "  --config <path>        JSON config path. Default: config/discord.local.json",
    "  --codex-notify         Read a Codex notify event from argv or stdin.",
    "  --claude-notify        Read a Claude Code hook event (Stop/Notification) from stdin.",
    "  --event-file <path>    Read a Codex notify event from a JSON file.",
    "  --test                 Send one test notification.",
    "  --agent <name>         Specify the agent (e.g. codex, claude, antigravity). Default: codex",
    "  --dry-run              Validate and print actions without calling Discord.",
    "  --preview <path>       Save the generated notification card PNG.",
    "  --skip-forward         Do not run forwardNotifyCommand after Discord delivery.",
    "  --event-log-dir <path> Raw Codex event log directory. Default: .state/events",
    "  --title-cache <path>   Thread title cache path. Default: .state/thread-titles.json",
    "  --help                 Show this help.",
  ].join("\n");
}

function parseArgs(argv) {
  const args = {
    configPath: defaultConfigPath,
    eventLogDir: defaultEventLogDir,
    titleCachePath: defaultTitleCachePath,
    test: false,
    dryRun: false,
    codexNotify: false,
    claudeNotify: false,
    eventJson: "",
    eventFile: "",
    agent: "codex",
    previewPath: "",
    skipForward: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--test") {
      args.test = true;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--preview") {
      args.previewPath = resolveRequiredValue(argv, index, arg);
      index += 1;
    } else if (arg === "--skip-forward") {
      args.skipForward = true;
    } else if (arg === "--codex-notify") {
      args.codexNotify = true;
    } else if (arg === "--claude-notify") {
      args.claudeNotify = true;
    } else if (arg === "--agent") {
      args.agent = resolveRequiredValue(argv, index, arg).toLowerCase();
      index += 1;
    } else if (arg === "--event-file") {
      args.eventFile = resolveRequiredValue(argv, index, arg);
      index += 1;
    } else if (arg === "--config") {
      args.configPath = resolveRequiredValue(argv, index, arg);
      index += 1;
    } else if (arg === "--event-log-dir") {
      args.eventLogDir = resolveRequiredValue(argv, index, arg);
      index += 1;
    } else if (arg === "--title-cache") {
      args.titleCachePath = resolveRequiredValue(argv, index, arg);
      index += 1;
    } else if ((args.codexNotify || args.claudeNotify) && !args.eventJson) {
      args.eventJson = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}\n\n${usage()}`);
    }
  }

  args.configPath = path.resolve(rootDir, args.configPath);
  args.eventLogDir = path.resolve(rootDir, args.eventLogDir);
  args.titleCachePath = path.resolve(rootDir, args.titleCachePath);
  args.previewPath = args.previewPath ? path.resolve(rootDir, args.previewPath) : "";
  return args;
}

function resolveRequiredValue(argv, index, arg) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${arg}`);
  }
  return value;
}

async function readJson(filePath, label) {
  let raw;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`${label} not found: ${filePath}`);
    }
    throw error;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${label} contains invalid JSON: ${filePath}\n${error.message}`);
  }
}

function validateConfig(config, configPath, options = {}) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error(`Config must be a JSON object: ${configPath}`);
  }

  const webhookUrl = String(config.webhookUrl || "").trim();
  const mentionUserId = String(config.mentionUserId || "").trim();
  const styleProfile = String(config.styleProfile || "rice-shower-inspired-zh").trim();
  const mentionLabel = String(config.mentionLabel || "哥哥大人").trim();
  const projectAliases = normalizeProjectAliases(config.projectAliases);
  const styleTemplates = normalizeStyleTemplates(config.styleTemplates);
  const statusImageUrls = normalizeStatusImageUrls(config.statusImageUrls);
  const forwardNotifyCommand = normalizeForwardNotifyCommand(config.forwardNotifyCommand);

  if (!webhookUrl && !options.allowEmptyWebhook) {
    throw new Error(
      `Discord webhookUrl is empty. Fill it in ${configPath} before sending notifications.`
    );
  }

  if (
    webhookUrl &&
    !/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+/u.test(webhookUrl)
  ) {
    throw new Error("Discord webhookUrl does not look like a Discord webhook URL.");
  }

  if (!/^\d{5,32}$/u.test(mentionUserId)) {
    throw new Error("mentionUserId must be a Discord numeric user id.");
  }

  const agents = {};
  if (config.agents && typeof config.agents === "object" && !Array.isArray(config.agents)) {
    for (const [agentName, agentValue] of Object.entries(config.agents)) {
      if (agentValue && typeof agentValue === "object" && !Array.isArray(agentValue)) {
        const name = agentName.toLowerCase();
        agents[name] = {
          mentionLabel: agentValue.hasOwnProperty("mentionLabel") ? String(agentValue.mentionLabel || "").trim() : undefined,
          statusImageUrls: agentValue.statusImageUrls ? normalizeStatusImageUrls(agentValue.statusImageUrls) : undefined,
          styleTemplates: agentValue.styleTemplates ? normalizeStyleTemplates(agentValue.styleTemplates) : undefined,
        };
      }
    }
  }

  return {
    webhookUrl,
    mentionUserId,
    mentionLabel,
    projectAliases,
    styleProfile,
    styleTemplates,
    statusImageUrls,
    forwardNotifyCommand,
    agents,
  };
}

function normalizeProjectAliases(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, alias]) => [normalizePathKey(key), String(alias || "").trim()])
      .filter(([key, alias]) => key && alias)
  );
}

function normalizePathKey(value) {
  return String(value || "")
    .trim()
    .replaceAll("/", "\\")
    .replace(/\\+$/u, "")
    .toLowerCase();
}

function normalizeStyleTemplates(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultStyleTemplates;
  }

  return {
    ...defaultStyleTemplates,
    ...Object.fromEntries(
      Object.entries(value)
        .map(([key, template]) => [key, String(template || "").trim()])
        .filter(([, template]) => template)
    ),
  };
}

function normalizeStatusImageUrls(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultStatusImageUrls;
  }

  return {
    ...defaultStatusImageUrls,
    ...Object.fromEntries(
      Object.entries(value)
        .map(([key, imageUrl]) => [key, String(imageUrl || "").trim()])
        .filter(([, imageUrl]) => imageUrl)
        .map(([key, imageUrl]) => {
          if (!/^https?:\/\//u.test(imageUrl)) {
            throw new Error(`statusImageUrls.${key} must be an http(s) URL when set.`);
          }
          return [key, imageUrl];
        })
    ),
  };
}

function normalizeForwardNotifyCommand(value) {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    throw new Error("forwardNotifyCommand must be an array of non-empty strings when set.");
  }

  return value;
}

async function readCodexEvent(args) {
  let raw;
  if (args.eventFile) {
    try {
      raw = await readFile(args.eventFile, "utf8");
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new Error(`Event file not found: ${args.eventFile}`);
      }
      throw error;
    }
  } else {
    raw = args.eventJson || (await readStdinIfAvailable());
  }

  if (!raw.trim()) {
    throw new Error("Codex notify mode needs an event JSON argument, file, or stdin payload.");
  }

  try {
    return { event: JSON.parse(raw), raw };
  } catch (error) {
    throw new Error(`Codex notify event is not valid JSON.\n${error.message}`);
  }
}

async function readStdinIfAvailable() {
  if (process.stdin.isTTY) {
    return "";
  }

  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function logRawEvent(event, eventLogDir) {
  const receivedAt = new Date();
  const date = receivedAt.toISOString().slice(0, 10);
  await mkdir(eventLogDir, { recursive: true });
  await appendFile(
    path.join(eventLogDir, `${date}.jsonl`),
    `${JSON.stringify({ receivedAt: receivedAt.toISOString(), event })}\n`,
    "utf8"
  );
}

function normalizeEvent(event, config, titleCache) {
  let agent = String(readFirst(event, ["agent", "client", "agentType"]) || "").trim().toLowerCase();
  if (agent === "codex desktop") {
    agent = "codex";
  } else if (!agent) {
    agent = "codex";
  }

  const eventType = String(readFirst(event, ["type", "event", "eventType", "name"]) || "").trim();
  const threadId = String(readFirst(event, ["thread-id", "thread_id", "threadId"]) || "").trim();
  const turnId = String(readFirst(event, ["turn-id", "turn_id", "turnId"]) || "").trim();
  const cwd = String(readFirst(event, ["cwd", "projectPath", "workspace", "workingDirectory"]) || "").trim();
  const cachedTitle = resolveCachedTitle(event, cwd, titleCache);
  const agentDisplayName = getAgentDisplayName(agent);
  const title = String(
    cachedTitle ||
      readFirst(event, [
        "title",
        "conversation-title",
        "conversation_title",
        "conversationTitle",
        "thread-title",
        "thread_title",
        "threadTitle",
      ]) ||
      threadId ||
      turnId ||
      `未命名 ${agentDisplayName} 對話`
  ).trim();
  const summary = String(
    readFirst(event, [
      "summary",
      "last-assistant-message",
      "last_assistant_message",
      "lastAssistantMessage",
      "message",
      "body",
    ]) || ""
  ).trim();
  const completedAt =
    String(readFirst(event, ["completedAt", "completed_at", "finishedAt", "finished_at", "timestamp"]) || "").trim() ||
    new Date().toISOString();
  const url = String(readFirst(event, ["url", "threadUrl", "thread_url"]) || "").trim();
  const projectPath = cwd || "Unknown project";

  return {
    id: threadId || turnId || `${eventType || "codex-event"}-${Date.now()}`,
    agent,
    eventType,
    statusKey: detectStatusKey(event, summary, eventType),
    completedAt,
    title,
    projectPath,
    projectName: resolveProjectName(projectPath, config.projectAliases),
    summary,
    url,
    threadId,
    turnId,
  };
}

async function normalizeClaudeEvent(event, config) {
  const hookName = String(
    readFirst(event, ["hook_event_name", "hookEventName", "type", "event", "eventType", "name"]) || ""
  ).trim();
  const lowerHook = hookName.toLowerCase();

  let statusKey;
  if (lowerHook === "notification") {
    statusKey = "needs_approval";
  } else if (lowerHook === "stop" || lowerHook === "subagentstop") {
    statusKey = "completed";
  } else {
    // Only Stop / SubagentStop / Notification hooks produce notifications.
    return null;
  }

  const cwd = String(readFirst(event, ["cwd", "projectPath", "workspace", "workingDirectory"]) || "").trim();
  const sessionId = String(readFirst(event, ["session_id", "sessionId"]) || "").trim();
  const transcriptPath = String(readFirst(event, ["transcript_path", "transcriptPath"]) || "").trim();
  const notificationMessage = String(readFirst(event, ["message"]) || "").trim();

  let title = "";
  let summary = "";
  if (transcriptPath) {
    const parsed = await readClaudeTranscript(transcriptPath);
    title = parsed.title;
    summary = parsed.summary;
  }

  if (statusKey === "needs_approval" && notificationMessage) {
    summary = notificationMessage;
  }

  if (!title) {
    title = sessionId ? `Claude 對話 ${sessionId.slice(0, 8)}` : "未命名 Claude 對話";
  }

  if (statusKey === "completed" && !summary) {
    statusKey = "completed_check";
  }

  const projectPath = cwd || "Unknown project";

  return {
    id: sessionId || `claude-${lowerHook}-${Date.now()}`,
    agent: "claude",
    eventType: hookName,
    statusKey,
    completedAt: new Date().toISOString(),
    title,
    projectPath,
    projectName: resolveProjectName(projectPath, config.projectAliases),
    summary,
    url: "",
    threadId: sessionId,
    turnId: "",
  };
}

async function readClaudeTranscript(transcriptPath) {
  let raw;
  try {
    raw = await readFile(transcriptPath, "utf8");
  } catch {
    return { title: "", summary: "" };
  }

  let firstUserText = "";
  let lastAssistantText = "";

  for (const line of raw.split(/\r?\n/u)) {
    if (!line.trim()) {
      continue;
    }

    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    const role = entry?.message?.role || entry?.role || entry?.type;
    const text = extractTranscriptText(entry?.message?.content ?? entry?.content);
    if (!text) {
      continue;
    }

    if (role === "user" && !firstUserText && !entry?.isMeta && !text.startsWith("<")) {
      firstUserText = text;
    } else if (role === "assistant") {
      lastAssistantText = text;
    }
  }

  return {
    title: normalizePrompt(firstUserText),
    summary: lastAssistantText.trim(),
  };
}

function extractTranscriptText(content) {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .filter((block) => block && block.type === "text" && typeof block.text === "string")
      .map((block) => block.text)
      .join("\n")
      .trim();
  }

  return "";
}

function shouldNotifyEvent(event, agent) {
  const eventType = String(readFirst(event, ["type", "event", "eventType", "name"]) || "").toLowerCase();

  if (!eventType.includes("complete") && !eventType.includes("approval")) {
    return false;
  }

  if (agent === "codex") {
    if (isTitleGenerationEvent(event)) {
      return false;
    }

    if (isAmbientSuggestionEvent(event)) {
      return false;
    }
  }

  return true;
}

function isTitleGenerationEvent(event) {
  const inputMessages = readFirst(event, ["input-messages", "input_messages", "inputMessages"]);
  const inputText = Array.isArray(inputMessages) ? inputMessages.join("\n") : String(inputMessages || "");
  const lastAssistantMessage = String(
    readFirst(event, ["last-assistant-message", "last_assistant_message", "lastAssistantMessage"]) || ""
  ).trim();

  return (
    inputText.includes("Generate a concise UI title") ||
    inputText.includes("provide a short title for a task") ||
    /^\{"title"\s*:/u.test(lastAssistantMessage)
  );
}

function isAmbientSuggestionEvent(event) {
  const inputMessages = readFirst(event, ["input-messages", "input_messages", "inputMessages"]);
  const inputText = Array.isArray(inputMessages) ? inputMessages.join("\n") : String(inputMessages || "");
  const lastAssistantMessage = String(
    readFirst(event, ["last-assistant-message", "last_assistant_message", "lastAssistantMessage"]) || ""
  ).trim();
  const cwd = String(readFirst(event, ["cwd", "projectPath", "workspace", "workingDirectory"]) || "");

  if (
    inputText.includes("Generate 0 to 3 hyperpersonalized suggestions") ||
    inputText.includes("Codex ambient suggestions") ||
    inputText.includes("# Ambient suggestion candidates") ||
    cwd.includes("\\WindowsApps\\OpenAI.Codex_")
  ) {
    return true;
  }

  return isJsonObjectWithOnlyKeys(lastAssistantMessage, ["suggestions"]) ||
    isJsonObjectWithOnlyKeys(lastAssistantMessage, ["exclude"]);
}

function isJsonObjectWithOnlyKeys(value, keys) {
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return false;
    }

    const actualKeys = Object.keys(parsed);
    return actualKeys.length === keys.length && keys.every((key) => actualKeys.includes(key));
  } catch {
    return false;
  }
}

function extractTitleGenerationRecord(event) {
  if (!isTitleGenerationEvent(event)) {
    return null;
  }

  const title = parseGeneratedTitle(
    String(readFirst(event, ["last-assistant-message", "last_assistant_message", "lastAssistantMessage"]) || "")
  );
  const prompt = extractPromptFromTitleGenerationEvent(event);
  const cwd = String(readFirst(event, ["cwd", "projectPath", "workspace", "workingDirectory"]) || "").trim();

  if (!title || !prompt || !cwd) {
    return null;
  }

  return { cwd, prompt, title };
}

function parseGeneratedTitle(value) {
  try {
    const parsed = JSON.parse(value);
    return String(parsed?.title || "").trim();
  } catch {
    return "";
  }
}

function extractPromptFromTitleGenerationEvent(event) {
  const inputMessages = readFirst(event, ["input-messages", "input_messages", "inputMessages"]);
  const inputText = Array.isArray(inputMessages) ? inputMessages.join("\n") : String(inputMessages || "");
  const marker = "User prompt:";
  const index = inputText.lastIndexOf(marker);
  if (index < 0) {
    return "";
  }

  return normalizePrompt(inputText.slice(index + marker.length));
}

function extractUserPrompt(event) {
  return extractUserPrompts(event)[0] || "";
}

function extractUserPrompts(event) {
  const inputMessages = readFirst(event, ["input-messages", "input_messages", "inputMessages"]);
  if (!Array.isArray(inputMessages) || inputMessages.length === 0) {
    return [];
  }

  return inputMessages.map((message) => normalizePrompt(message)).filter(Boolean);
}

function normalizePrompt(value) {
  return String(value || "").trim().replace(/\s+/gu, " ");
}

function makeTitleCacheKey(cwd, prompt) {
  return `${normalizePathKey(cwd)}\n${normalizePrompt(prompt).toLowerCase()}`;
}

function resolveCachedTitle(event, cwd, titleCache) {
  const threadId = String(readFirst(event, ["thread-id", "thread_id", "threadId"]) || "");
  const directTitle = titleCache.byThreadId?.[threadId];
  if (directTitle) {
    return directTitle;
  }

  for (const prompt of extractUserPrompts(event)) {
    const title = titleCache.byProjectPrompt?.[makeTitleCacheKey(cwd, prompt)];
    if (title) {
      return title;
    }
  }
  return "";
}

function readFirst(object, keys) {
  for (const key of keys) {
    if (object && Object.prototype.hasOwnProperty.call(object, key) && object[key] !== undefined) {
      return object[key];
    }
  }
  return undefined;
}

function resolveProjectName(projectPath, aliases) {
  const normalized = normalizePathKey(projectPath);
  if (aliases[normalized]) {
    return aliases[normalized];
  }

  const matchedAlias = Object.entries(aliases)
    .filter(([candidate]) => normalized === candidate || normalized.startsWith(`${candidate}\\`))
    .sort((a, b) => b[0].length - a[0].length)[0]?.[1];

  return matchedAlias || path.basename(projectPath) || projectPath;
}

function detectStatusKey(event, summary, eventType) {
  const statusFields = {
    type: eventType,
    summary,
    status: readFirst(event, ["status", "state", "result", "error", "failure", "reason"]),
  };
  const haystack = flattenForSearch(statusFields);
  const normalizedEventType = eventType.toLowerCase();

  if (normalizedEventType.includes("approval") || /\bapproval[-_ ]?requested\b/u.test(haystack)) {
    return "needs_approval";
  }

  if (
    /\b(quota|usage limit|usage_limit|rate limit|rate_limit|insufficient quota|credit|billing)\b/iu.test(
      haystack
    ) ||
    /(用量|額度|點數|配額)/u.test(haystack)
  ) {
    return "usage_limited";
  }

  if (
    /\b(error|failed|failure|exception|timed out|timeout|crash)\b/iu.test(haystack) ||
    /(失敗|錯誤|例外)/u.test(haystack)
  ) {
    return "failed";
  }

  if (normalizedEventType === "agent-turn-complete" || normalizedEventType.includes("complete")) {
    return summary ? "completed" : "completed_check";
  }

  return "completed_check";
}

function flattenForSearch(value) {
  const seen = new WeakSet();
  return JSON.stringify(value, (_key, item) => {
    if (typeof item === "object" && item !== null) {
      if (seen.has(item)) {
        return "[Circular]";
      }
      seen.add(item);
    }
    return item;
  }).toLowerCase();
}

function buildDiscordPayload(record, config) {
  const mention = `<@${config.mentionUserId}>`;

  return {
    content: mention,
    embeds: [
      {
        color: statusColorFor(record.statusKey),
        image: { url: "attachment://notification.png" },
      },
    ],
    allowed_mentions: {
      users: [config.mentionUserId],
    },
  };
}

function extractNotificationResult(value) {
  const lines = String(value || "")
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, "$1")
    .split(/\r?\n/u)
    .map((line) => line.trim().replace(/^(?:#{1,6}|[-*])\s*/u, "").replaceAll("**", ""))
    .filter((line) => line && !/^DONE(?:_WITH_CONCERNS)?$/iu.test(line))
    .slice(0, 2);

  const result = lines.join("\n") || "沒有提供結果";
  return result.length <= 180 ? result : `${result.slice(0, 179).trimEnd()}…`;
}

function formatCardTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value || "未知時間");
  }

  const parts = Object.fromEntries(
    taipeiFormatter.formatToParts(date).map(({ type, value: partValue }) => [type, partValue])
  );
  return `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
}

function avatarPathFor(statusKey) {
  const filename =
    {
      completed: "开心.png",
      needs_approval: "犹豫.png",
      failed: "伤心.png",
      usage_limited: "困扰.png",
      completed_check: "唔唔.png",
    }[statusKey] || "唔唔.png";
  return path.join(rootDir, "data", "riceshower_stamp", filename);
}

function buildNotificationCardData(record) {
  const agent = String(record.agent || "codex").toLowerCase();
  const summary = String(record.summary || "").trim();
  return {
    status: statusLabelFor(record.statusKey),
    statusKey: record.statusKey,
    project: truncateText(record.projectName || record.projectPath, 50),
    agent:
      {
        codex: "Codex",
        claude: "Claude",
        antigravity: "Antigravity",
      }[agent] || agent,
    completedAt: formatCardTime(record.completedAt),
    result:
      summary || record.statusKey !== "completed_check"
        ? extractNotificationResult(summary)
        : "代理已停止回應，但未提供結果摘要。請開啟任務確認。",
    avatarPath: avatarPathFor(record.statusKey),
  };
}

async function renderNotificationCard(record) {
  const stateDir = path.join(rootDir, ".state");
  const id = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const inputPath = path.join(stateDir, `notification-card-${id}.json`);
  const outputPath = path.join(stateDir, `notification-card-${id}.png`);
  const powershell = path.join(
    process.env.SystemRoot || "C:\\Windows",
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe"
  );

  await mkdir(stateDir, { recursive: true });
  await writeFile(
    inputPath,
    JSON.stringify(buildNotificationCardData(record)),
    "utf8"
  );

  try {
    await runProcess(powershell, [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      cardRendererPath,
      "-InputPath",
      inputPath,
      "-OutputPath",
      outputPath,
    ]);
    return await readFile(outputPath);
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}

function runProcess(executable, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
    const stderr = [];
    child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Notification card renderer failed (${code}): ${Buffer.concat(stderr).toString("utf8").trim()}`));
      }
    });
  });
}

function truncateText(value, maxLength) {
  const text = String(value || "").trim().replace(/\s+/gu, " ");
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function statusColorFor(statusKey) {
  return (
    {
      completed: 0x6aa84f,
      needs_approval: 0xf1c232,
      failed: 0xcc4125,
      usage_limited: 0x8e7cc3,
      completed_check: 0x3d85c6,
    }[statusKey] || 0x3d85c6
  );
}

function statusLabelFor(statusKey) {
  return (
    {
      completed: "完成",
      needs_approval: "待核准",
      failed: "失敗",
      usage_limited: "用量不足",
      completed_check: "待確認",
    }[statusKey] || "待確認"
  );
}

function renderTemplate(template, values) {
  return String(template || defaultStyleTemplates.completed_check).replace(/\{(\w+)\}/gu, (_match, key) =>
    values[key] === undefined ? "" : String(values[key])
  );
}

function formatTaipeiTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return `${value}（原始時間，無法轉換）`;
  }

  return `${taipeiFormatter.format(date)} Asia/Taipei`;
}

async function postDiscord(webhookUrl, payload, cardPng) {
  const body = buildDiscordRequestBody(payload, cardPng);
  const response = await fetch(webhookUrl, {
    method: "POST",
    body,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Discord webhook failed: ${response.status} ${response.statusText}\n${body}`);
  }
}

function buildDiscordRequestBody(payload, cardPng) {
  const body = new FormData();
  body.append("payload_json", JSON.stringify(payload));
  body.append("files[0]", new Blob([cardPng], { type: "image/png" }), "notification.png");
  return body;
}

function getAgentDisplayName(agent) {
  const names = {
    codex: "",
    claude: "Claude",
    antigravity: "Antigravity",
  };
  return names.hasOwnProperty(agent) ? names[agent] : agent;
}

function buildTestCompletion(config, agent = "codex") {
  const agentDisplayName = getAgentDisplayName(agent);
  return {
    id: `test-${agent}-${Date.now()}`,
    agent,
    eventType: "agent-turn-complete",
    statusKey: "completed",
    title: `${agentDisplayName} Discord notify 測試`,
    projectPath: rootDir,
    projectName: resolveProjectName(rootDir, config.projectAliases),
    completedAt: new Date().toISOString(),
    summary: `如果你收到這則訊息，${agentDisplayName || "Codex"} 的固定通知格式已正常運作。`,
    url: "",
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const config = validateConfig(await readJson(args.configPath, "Config"), args.configPath, {
    allowEmptyWebhook: args.dryRun,
  });

  const { records, codexEventRaw } = await resolveRecords(args, config);

  if (records.length === 0) {
    console.log("No conversations to notify.");
    return;
  }

  for (const record of records) {
    const payload = buildDiscordPayload(record, config);
    const cardPng = await renderNotificationCard(record);
    if (args.previewPath) {
      await mkdir(path.dirname(args.previewPath), { recursive: true });
      await writeFile(args.previewPath, cardPng);
    }
    if (args.dryRun) {
      console.log(JSON.stringify({ dryRun: true, payload, preview: args.previewPath || null }, null, 2));
    } else {
      await postDiscord(config.webhookUrl, payload, cardPng);
    }
  }

  if (args.codexNotify && !args.dryRun && !args.skipForward) {
    await forwardNotifyEvent(config.forwardNotifyCommand, codexEventRaw);
  }

  console.log(`Notification run complete. Sent notifications: ${records.length}`);
}

async function resolveRecords(args, config) {
  if (args.test) {
    const agent = args.agent || "codex";
    return { records: [buildTestCompletion(config, agent)], codexEventRaw: "" };
  }

  if (args.claudeNotify) {
    const { event, raw } = await readCodexEvent(args);
    await logRawEvent(event, args.eventLogDir);
    const record = await normalizeClaudeEvent(event, config);
    if (!record) {
      return { records: [], codexEventRaw: raw };
    }
    return { records: [record], codexEventRaw: raw };
  }

  if (args.codexNotify) {
    const { event, raw } = await readCodexEvent(args);
    await logRawEvent(event, args.eventLogDir);
    const titleCache = await readTitleCache(args.titleCachePath);
    const titleRecord = extractTitleGenerationRecord(event);
    if (titleRecord) {
      await writeTitleCache(args.titleCachePath, updateTitleCache(titleCache, titleRecord));
    }
    const record = normalizeEvent(event, config, titleCache);
    if (!shouldNotifyEvent(event, record.agent)) {
      return { records: [], codexEventRaw: raw };
    }
    return { records: [record], codexEventRaw: raw };
  }

  throw new Error(`Choose --codex-notify, --claude-notify, or --test.\n\n${usage()}`);
}

async function readTitleCache(cachePath) {
  try {
    const raw = await readFile(cachePath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      byProjectPrompt:
        parsed?.byProjectPrompt && typeof parsed.byProjectPrompt === "object" ? parsed.byProjectPrompt : {},
      byThreadId: parsed?.byThreadId && typeof parsed.byThreadId === "object" ? parsed.byThreadId : {},
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { byProjectPrompt: {}, byThreadId: {} };
    }
    throw error;
  }
}

function updateTitleCache(cache, titleRecord) {
  return {
    byProjectPrompt: {
      ...cache.byProjectPrompt,
      [makeTitleCacheKey(titleRecord.cwd, titleRecord.prompt)]: titleRecord.title,
    },
    byThreadId: cache.byThreadId,
  };
}

async function writeTitleCache(cachePath, cache) {
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
}

async function forwardNotifyEvent(command, eventRaw) {
  if (!command.length || !eventRaw) {
    return;
  }

  const [executable, ...args] = command;
  await new Promise((resolve, reject) => {
    const child = spawn(executable, [...args, eventRaw], {
      windowsHide: true,
      stdio: "ignore",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`forwardNotifyCommand failed with exit code ${code}`));
      }
    });
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

export {
  buildDiscordPayload,
  buildDiscordRequestBody,
  buildNotificationCardData,
  extractNotificationResult,
  formatCardTime,
  renderNotificationCard,
};
