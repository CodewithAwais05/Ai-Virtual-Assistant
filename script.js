// =====================================================================
// Awais AI — client app logic
// Auth, chat history, and settings are all stored locally on this
// device (localStorage). There is no backend server, so this login
// system is a per-device gate that keeps each person's chat history
// separate — it is NOT secure remote authentication. Don't reuse a
// real/important password here.
// =====================================================================

// ===== Elements =====
const authScreen = document.querySelector("#authScreen");
const authForm = document.querySelector("#authForm");
const authUsername = document.querySelector("#authUsername");
const authPassword = document.querySelector("#authPassword");
const authError = document.querySelector("#authError");
const authSubmitBtn = document.querySelector("#authSubmitBtn");
const authTabs = document.querySelectorAll(".authTab");

const appEl = document.querySelector("#app");
const chatLog = document.querySelector("#chatLog");
const chatWrap = document.querySelector("#chatWrap");
const scrollBottomBtn = document.querySelector("#scrollBottomBtn");
const suggestionChips = document.querySelector("#suggestionChips");
const textForm = document.querySelector("#textForm");
const textInput = document.querySelector("#textInput");
const statusEl = document.querySelector("#status");
const micBtn = document.querySelector("#micBtn");
const micInfoBtn = document.querySelector("#micInfoBtn");
const voiceHint = document.querySelector("#voiceHint");
const closeVoiceHintBtn = document.querySelector("#closeVoiceHintBtn");
const emojiBtn = document.querySelector("#emojiBtn");
const emojiPanel = document.querySelector("#emojiPanel");
const closeEmojiBtn = document.querySelector("#closeEmojiBtn");
const emojiGrid = document.querySelector("#emojiGrid");
const imageBtn = document.querySelector("#imageBtn");
const imageFileInput = document.querySelector("#imageFileInput");
const attachmentStrip = document.querySelector("#attachmentStrip");
const attachmentThumb = document.querySelector("#attachmentThumb");
const attachmentName = document.querySelector("#attachmentName");
const removeAttachmentBtn = document.querySelector("#removeAttachmentBtn");
const fileBtn = document.querySelector("#fileBtn");
const genericFileInput = document.querySelector("#genericFileInput");
const fileAttachmentStrip = document.querySelector("#fileAttachmentStrip");
const fileAttachmentName = document.querySelector("#fileAttachmentName");
const removeFileAttachmentBtn = document.querySelector("#removeFileAttachmentBtn");
const sendBtn = document.querySelector("#sendBtn");
const stopBtn = document.querySelector("#stopBtn");
const newChatBtn = document.querySelector("#newChatBtn");
const newChatSideBtn = document.querySelector("#newChatSideBtn");
const exportBtn = document.querySelector("#exportBtn");
const modelBadge = document.querySelector("#modelBadge");

const menuBtn = document.querySelector("#menuBtn");
const sidebar = document.querySelector("#sidebar");
const sidebarOverlay = document.querySelector("#sidebarOverlay");
const closeSidebarBtn = document.querySelector("#closeSidebarBtn");
const chatHistoryList = document.querySelector("#chatHistoryList");
const chatSearchInput = document.querySelector("#chatSearchInput");
const clearAllChatsBtn = document.querySelector("#clearAllChatsBtn");
const sidebarUsername = document.querySelector("#sidebarUsername");
const logoutBtn = document.querySelector("#logoutBtn");

const themeToggleBtn = document.querySelector("#themeToggleBtn");
const themeIconMoon = document.querySelector("#themeIconMoon");
const themeIconSun = document.querySelector("#themeIconSun");

const settingsBtn = document.querySelector("#settingsBtn");
const settingsOverlay = document.querySelector("#settingsOverlay");
const closeSettingsBtn = document.querySelector("#closeSettingsBtn");
const saveSettingsBtn = document.querySelector("#saveSettingsBtn");
const resetSettingsBtn = document.querySelector("#resetSettingsBtn");
const modelSelect = document.querySelector("#modelSelect");
const temperatureInput = document.querySelector("#temperatureInput");
const temperatureValue = document.querySelector("#temperatureValue");
const systemPromptInput = document.querySelector("#systemPromptInput");
const autoReadToggle = document.querySelector("#autoReadToggle");
const autoSendVoiceToggle = document.querySelector("#autoSendVoiceToggle");

const SYSTEM_PROMPT_DEFAULT =
  "You are Awais AI, a helpful, concise assistant. Answer clearly and directly. When code helps explain something, use fenced code blocks with a language tag.";
const GROQ_MODEL_DEFAULT = "openai/gpt-oss-120b";
const VISION_MODEL = "qwen/qwen3.6-27b"; // used automatically whenever an image is attached
const MODEL_LABELS = {
  "openai/gpt-oss-120b": "⚡ Groq · GPT-OSS 120B",
  "openai/gpt-oss-20b": "⚡ Groq · GPT-OSS 20B",
  "qwen/qwen3.6-27b": "👁️ Groq · Qwen3.6 27B (vision)",
};
const GROQ_TEMP_DEFAULT = 0.7;

// Built-in key — ships baked into the app on every device/install.
// Anyone who decompiles the APK (a few-second job with apktool) can pull this
// string straight out of the WebView assets. Only use a key you're fine with
// other people potentially seeing and spending against. There is no in-app
// way to override this with a personal key anymore — it's the only key used.
const GROQ_API_KEY = "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"; // <-- replace with your own key before shipping

// =====================================================================
// Storage helpers
// =====================================================================
const usersKey = "awaisai_users";
const sessionKey = "awaisai_session";
const themeKey = "awaisai_theme";
const groqModelStorageKey = "awaisai_groq_model";
const groqTempStorageKey = "awaisai_groq_temp";
const systemPromptStorageKey = "awaisai_system_prompt";
const autoReadStorageKey = "awaisai_auto_read";
const autoSendVoiceStorageKey = "awaisai_auto_send_voice";

function chatsKey(username) { return `awaisai_chats_${username}`; }
function currentChatKey(username) { return `awaisai_current_${username}`; }

function getUsers() {
  try { return JSON.parse(localStorage.getItem(usersKey)) || {}; }
  catch { return {}; }
}
function saveUsers(users) { localStorage.setItem(usersKey, JSON.stringify(users)); }

async function hashPassword(password) {
  const enc = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getChats(username) {
  try { return JSON.parse(localStorage.getItem(chatsKey(username))) || []; }
  catch { return []; }
}
function saveChats(username, chats) {
  try {
    localStorage.setItem(chatsKey(username), JSON.stringify(chats));
  } catch (err) {
    console.error("Couldn't save chats (storage may be full):", err);
    flashStatus("Storage full — try removing an old chat");
  }
}

function genId(prefix = "m") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Older chats saved before this update won't have per-message ids/timestamps.
// Backfill them so every message can be targeted by the new action buttons.
function ensureMessageMeta(chat) {
  let changed = false;
  for (const m of chat.messages) {
    if (!m.id) { m.id = genId(); changed = true; }
    if (!m.ts) { m.ts = chat.updatedAt || Date.now(); changed = true; }
  }
  return changed;
}

// =====================================================================
// State
// =====================================================================
let currentUser = localStorage.getItem(sessionKey) || null;
let chats = [];
let activeChatId = null;
let isGenerating = false;
let currentAbortController = null;
let speakingMsgId = null;
let pendingImage = null; // { dataUrl, name }
let pendingFile = null; // { name, text }

const groqApiKey = GROQ_API_KEY && GROQ_API_KEY !== "PUT_YOUR_GROQ_KEY_HERE" ? GROQ_API_KEY : "";
let groqModel = localStorage.getItem(groqModelStorageKey) || GROQ_MODEL_DEFAULT;
if (!MODEL_LABELS[groqModel]) groqModel = GROQ_MODEL_DEFAULT;
let groqTemp = parseFloat(localStorage.getItem(groqTempStorageKey));
if (Number.isNaN(groqTemp)) groqTemp = GROQ_TEMP_DEFAULT;
let systemPrompt = localStorage.getItem(systemPromptStorageKey) || SYSTEM_PROMPT_DEFAULT;
let autoReadReplies = localStorage.getItem(autoReadStorageKey) === "1";
let autoSendVoice = localStorage.getItem(autoSendVoiceStorageKey) !== "0"; // on by default

function updateModelBadge() {
  modelBadge.textContent = MODEL_LABELS[groqModel] || MODEL_LABELS[GROQ_MODEL_DEFAULT];
}
updateModelBadge();

// =====================================================================
// Theme
// =====================================================================
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeIconMoon.classList.toggle("hidden", theme === "light");
  themeIconSun.classList.toggle("hidden", theme !== "light");
  localStorage.setItem(themeKey, theme);
}

function initTheme() {
  const saved = localStorage.getItem(themeKey);
  if (saved) { applyTheme(saved); return; }
  const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
  applyTheme(prefersLight ? "light" : "dark");
}

themeToggleBtn.addEventListener("click", () => {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  applyTheme(isLight ? "dark" : "light");
});

initTheme();

// =====================================================================
// Auth screen
// =====================================================================
let authMode = "login";

authTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    authMode = tab.dataset.tab;
    authTabs.forEach((t) => t.classList.toggle("active", t === tab));
    authSubmitBtn.textContent = authMode === "login" ? "Log in" : "Create account";
    authPassword.autocomplete = authMode === "login" ? "current-password" : "new-password";
    hideAuthError();
  });
});

function showAuthError(msg) {
  authError.textContent = msg;
  authError.classList.remove("hidden");
}
function hideAuthError() {
  authError.classList.add("hidden");
}

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAuthError();
  const username = authUsername.value.trim();
  const password = authPassword.value;

  if (!username || !password) {
    showAuthError("Please fill in both fields.");
    return;
  }

  authSubmitBtn.disabled = true;
  const hashed = await hashPassword(password);
  const users = getUsers();

  if (authMode === "signup") {
    if (users[username]) {
      showAuthError("That username is already taken.");
      authSubmitBtn.disabled = false;
      return;
    }
    users[username] = hashed;
    saveUsers(users);
    logIn(username);
  } else {
    if (!users[username] || users[username] !== hashed) {
      showAuthError("Incorrect username or password.");
      authSubmitBtn.disabled = false;
      return;
    }
    logIn(username);
  }
  authSubmitBtn.disabled = false;
});

function logIn(username) {
  currentUser = username;
  localStorage.setItem(sessionKey, username);
  authForm.reset();
  enterApp();
}

function logOut() {
  localStorage.removeItem(sessionKey);
  currentUser = null;
  chats = [];
  activeChatId = null;
  appEl.classList.add("hidden");
  authScreen.classList.remove("hidden");
  closeSidebar();
}

logoutBtn.addEventListener("click", () => {
  if (confirm("Log out of Awais AI on this device?")) logOut();
});

// =====================================================================
// App entry
// =====================================================================
function enterApp() {
  authScreen.classList.add("hidden");
  appEl.classList.remove("hidden");
  sidebarUsername.textContent = currentUser;

  chats = getChats(currentUser);
  let needsSave = false;
  chats.forEach((c) => { if (ensureMessageMeta(c)) needsSave = true; });
  if (needsSave) saveChats(currentUser, chats);

  const savedChatId = localStorage.getItem(currentChatKey(currentUser));
  if (savedChatId && chats.some((c) => c.id === savedChatId)) {
    activeChatId = savedChatId;
  } else if (chats.length) {
    activeChatId = chats[0].id;
  } else {
    activeChatId = createNewChat();
  }

  renderHistoryList();
  renderActiveChat();

  if (!groqApiKey) {
    setStatus("Awais AI's built-in key isn't configured yet", "error");
  }
}

if (currentUser) enterApp();

// =====================================================================
// Chat data helpers
// =====================================================================
function createNewChat() {
  const chat = {
    id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: "New chat",
    messages: [],
    updatedAt: Date.now(),
  };
  chats.unshift(chat);
  saveChats(currentUser, chats);
  return chat.id;
}

function getActiveChat() {
  return chats.find((c) => c.id === activeChatId) || null;
}

function persistChats() {
  saveChats(currentUser, chats);
  localStorage.setItem(currentChatKey(currentUser), activeChatId);
}

function titleFromMessage(text) {
  const clean = (text || "").trim().replace(/\s+/g, " ");
  return clean.length > 34 ? clean.slice(0, 34) + "…" : clean || "New chat";
}

// =====================================================================
// Sidebar / history UI
// =====================================================================
function openSidebar() {
  sidebar.classList.add("open");
  sidebarOverlay.classList.add("open");
}
function closeSidebar() {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("open");
}
menuBtn.addEventListener("click", openSidebar);
closeSidebarBtn.addEventListener("click", closeSidebar);
sidebarOverlay.addEventListener("click", closeSidebar);

function renderHistoryList() {
  const query = (chatSearchInput.value || "").toLowerCase().trim();
  chatHistoryList.innerHTML = "";
  const sorted = [...chats]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .filter((c) => !query || (c.title || "").toLowerCase().includes(query));

  for (const chat of sorted) {
    const item = document.createElement("div");
    item.className = "historyItem" + (chat.id === activeChatId ? " active" : "");

    const title = document.createElement("span");
    title.className = "historyItemTitle";
    title.textContent = chat.title || "New chat";
    title.title = "Double-tap to rename";
    item.appendChild(title);

    title.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      startRenameChat(chat, title);
    });

    const del = document.createElement("button");
    del.className = "historyDeleteBtn";
    del.title = "Delete chat";
    del.textContent = "🗑";
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteChat(chat.id);
    });
    item.appendChild(del);

    item.addEventListener("click", () => {
      activeChatId = chat.id;
      persistChats();
      renderHistoryList();
      renderActiveChat();
      closeSidebar();
    });

    chatHistoryList.appendChild(item);
  }
}

function startRenameChat(chat, titleEl) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "historyRenameInput";
  input.value = chat.title || "";
  titleEl.replaceWith(input);
  input.focus();
  input.select();

  let committed = false;
  function commit() {
    if (committed) return;
    committed = true;
    chat.title = input.value.trim() || "New chat";
    saveChats(currentUser, chats);
    renderHistoryList();
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    if (e.key === "Escape") { committed = true; renderHistoryList(); }
  });
  input.addEventListener("blur", commit);
}

chatSearchInput.addEventListener("input", () => renderHistoryList());

clearAllChatsBtn.addEventListener("click", () => {
  if (!chats.length) return;
  if (!confirm("Delete ALL chats on this device? This can't be undone.")) return;
  chats = [];
  saveChats(currentUser, chats);
  activeChatId = createNewChat();
  persistChats();
  renderHistoryList();
  renderActiveChat();
  closeSidebar();
});

function deleteChat(chatId) {
  if (!confirm("Delete this chat? This can't be undone.")) return;
  chats = chats.filter((c) => c.id !== chatId);
  saveChats(currentUser, chats);

  if (activeChatId === chatId) {
    activeChatId = chats.length ? chats[0].id : createNewChat();
    renderActiveChat();
  }
  persistChats();
  renderHistoryList();
}

function startNewChat() {
  activeChatId = createNewChat();
  persistChats();
  renderHistoryList();
  renderActiveChat();
  closeSidebar();
}

newChatBtn.addEventListener("click", () => {
  if (confirm("Start a new chat?")) startNewChat();
});
newChatSideBtn.addEventListener("click", startNewChat);

// =====================================================================
// Lightweight markdown rendering (bold/italic/inline code/fenced code/links)
// No external libraries, so it keeps working with the app fully offline.
// =====================================================================
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineMarkdown(escapedText) {
  return escapedText
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, '<code class="inlineCode">$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

function renderMarkdownToHTML(raw) {
  const fenceRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let html = "";
  let lastIndex = 0;
  let match;

  while ((match = fenceRegex.exec(raw)) !== null) {
    const textBefore = raw.slice(lastIndex, match.index);
    html += inlineMarkdown(escapeHtml(textBefore)).replace(/\n/g, "<br>");

    const lang = (match[1] || "code").trim();
    const code = match[2].replace(/\n$/, "");
    const codeId = genId("code");
    html += `<div class="codeBlock"><div class="codeBlockHeader"><span>${escapeHtml(lang)}</span><button type="button" class="codeCopyBtn" data-code-target="${codeId}">Copy</button></div><pre><code id="${codeId}">${escapeHtml(code)}</code></pre></div>`;

    lastIndex = fenceRegex.lastIndex;
  }

  const remaining = raw.slice(lastIndex);
  html += inlineMarkdown(escapeHtml(remaining)).replace(/\n/g, "<br>");
  return html;
}

function stripMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, " code block ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1");
}

// =====================================================================
// Chat log rendering
// =====================================================================
function formatTime(ts) {
  try { return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}

function makeActionBtn(icon, title, action, msgId) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "msgActionBtn";
  btn.title = title;
  btn.textContent = icon;
  btn.dataset.action = action;
  btn.dataset.msgId = msgId;
  return btn;
}

function renderMessageBubble(m, showRegenerate) {
  const sender = m.role === "user" ? "user" : "bot";
  const wrap = document.createElement("div");
  wrap.className = `msg ${sender}`;
  wrap.dataset.id = m.id;

  const content = document.createElement("div");
  content.className = "msgContent";

  if (m.image) {
    const img = document.createElement("img");
    img.className = "msgImage";
    img.src = m.image;
    img.alt = m.imageName || "attached image";
    content.appendChild(img);
  }

  if (m.fileName) {
    const fileChip = document.createElement("div");
    fileChip.className = "msgFileChip";
    fileChip.innerHTML = `<span class="msgFileIcon">📄</span><span class="msgFileName"></span>`;
    fileChip.querySelector(".msgFileName").textContent = m.fileName;
    content.appendChild(fileChip);
  }

  const textSpan = document.createElement("span");
  if (sender === "bot") {
    textSpan.innerHTML = renderMarkdownToHTML(m.content || "");
  } else {
    textSpan.textContent = m.content || "";
  }
  content.appendChild(textSpan);
  wrap.appendChild(content);

  const meta = document.createElement("div");
  meta.className = "msgMeta";

  const time = document.createElement("span");
  time.className = "msgTime";
  time.textContent = formatTime(m.ts);
  meta.appendChild(time);

  const actions = document.createElement("div");
  actions.className = "msgActions";
  actions.appendChild(makeActionBtn("📋", "Copy", "copy", m.id));
  if (sender === "bot") {
    const speakBtn = makeActionBtn("🔊", "Read aloud", "speak", m.id);
    if (speakingMsgId === m.id) { speakBtn.textContent = "⏸"; speakBtn.classList.add("speaking"); }
    actions.appendChild(speakBtn);
    if (showRegenerate) actions.appendChild(makeActionBtn("🔁", "Regenerate", "regenerate", m.id));
  } else {
    actions.appendChild(makeActionBtn("✏️", "Edit", "edit", m.id));
  }
  meta.appendChild(actions);
  wrap.appendChild(meta);

  chatLog.appendChild(wrap);
  return wrap;
}

function renderActiveChat() {
  chatLog.innerHTML = "";
  const chat = getActiveChat();
  if (!chat) return;
  chat.messages.forEach((m, idx) => {
    const isLastBot = m.role === "assistant" && idx === chat.messages.length - 1;
    renderMessageBubble(m, isLastBot);
  });
  suggestionChips.classList.toggle("hidden", chat.messages.length > 0);
  scrollToBottom(true);
  if (!isGenerating) setStatus("Ready — ask me anything");
}

function renderErrorBubble(text) {
  const wrap = document.createElement("div");
  wrap.className = "msg bot error";
  const content = document.createElement("div");
  content.className = "msgContent";
  content.textContent = text;
  wrap.appendChild(content);
  chatLog.appendChild(wrap);
  scrollToBottom();
}

function addThinkingBubble() {
  const bubble = document.createElement("div");
  bubble.className = "thinkingBubble";
  bubble.innerHTML = "<span></span><span></span><span></span>";
  chatLog.appendChild(bubble);
  scrollToBottom();
  return bubble;
}

function setStatus(text, cls = "") {
  statusEl.textContent = text;
  statusEl.className = cls;
}

function flashStatus(text) {
  setStatus(text);
  setTimeout(() => { if (!isGenerating) setStatus("Ready — ask me anything"); }, 1400);
}

// =====================================================================
// Suggestion chips (shown on an empty chat)
// =====================================================================
suggestionChips.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  textInput.value = chip.dataset.prompt + " ";
  autoResizeInput();
  textInput.focus();
});

// =====================================================================
// Message actions: copy / speak / edit / regenerate
// =====================================================================
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      () => flashStatus("Copied to clipboard"),
      () => flashStatus("Couldn't copy")
    );
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); flashStatus("Copied to clipboard"); }
  catch { flashStatus("Couldn't copy"); }
  ta.remove();
}

function toggleSpeak(msg) {
  if (!("speechSynthesis" in window)) { flashStatus("Speech not supported on this device"); return; }
  if (speakingMsgId === msg.id) {
    speechSynthesis.cancel();
    speakingMsgId = null;
    renderActiveChat();
    return;
  }
  speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(stripMarkdown(msg.content || ""));
  utter.onend = () => { speakingMsgId = null; renderActiveChat(); };
  utter.onerror = () => { speakingMsgId = null; renderActiveChat(); };
  speakingMsgId = msg.id;
  renderActiveChat();
  speechSynthesis.speak(utter);
}

// Speak without toggle bookkeeping — used for "auto-read replies aloud".
function speakText(text) {
  if (!("speechSynthesis" in window) || !text) return;
  speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(stripMarkdown(text));
  speechSynthesis.speak(utter);
}

function startEdit(chat, msg) {
  const idx = chat.messages.findIndex((m) => m.id === msg.id);
  if (idx < 0) return;
  chat.messages = chat.messages.slice(0, idx); // drop this message and anything after it
  chat.updatedAt = Date.now();
  persistChats();
  renderActiveChat();
  renderHistoryList();
  textInput.value = msg.content || "";
  autoResizeInput();
  textInput.focus();
}

async function regenerateFrom(chat, assistantMsgId) {
  if (isGenerating) return;
  const idx = chat.messages.findIndex((m) => m.id === assistantMsgId);
  if (idx < 0) return;
  chat.messages = chat.messages.slice(0, idx); // drop the assistant reply, keep the user prompt before it
  chat.updatedAt = Date.now();
  persistChats();
  renderActiveChat();
  renderHistoryList();
  await runAssistantReply(chat);
}

chatLog.addEventListener("click", (e) => {
  const codeCopyBtn = e.target.closest(".codeCopyBtn");
  if (codeCopyBtn) {
    const codeEl = document.getElementById(codeCopyBtn.dataset.codeTarget);
    if (codeEl) {
      copyText(codeEl.textContent);
      const original = codeCopyBtn.textContent;
      codeCopyBtn.textContent = "Copied!";
      setTimeout(() => { codeCopyBtn.textContent = original; }, 1200);
    }
    return;
  }

  const actionBtn = e.target.closest(".msgActionBtn");
  if (!actionBtn) return;
  const chat = getActiveChat();
  if (!chat) return;
  const msg = chat.messages.find((m) => m.id === actionBtn.dataset.msgId);
  if (!msg) return;

  const action = actionBtn.dataset.action;
  if (action === "copy") copyText(msg.content || "");
  else if (action === "speak") toggleSpeak(msg);
  else if (action === "edit") startEdit(chat, msg);
  else if (action === "regenerate") regenerateFrom(chat, msg.id);
});

// =====================================================================
// Scroll handling
// =====================================================================
function isNearBottom() {
  return chatLog.scrollHeight - chatLog.scrollTop - chatLog.clientHeight < 80;
}

function scrollToBottom(instant = false) {
  chatLog.scrollTo({ top: chatLog.scrollHeight, behavior: instant ? "auto" : "smooth" });
}

function scrollToBottomIfNearEnd() {
  if (isNearBottom()) scrollToBottom(true);
}

chatLog.addEventListener("scroll", () => {
  scrollBottomBtn.classList.toggle("hidden", isNearBottom());
});

scrollBottomBtn.addEventListener("click", () => scrollToBottom());

// =====================================================================
// Export chat
// =====================================================================
exportBtn.addEventListener("click", async () => {
  const chat = getActiveChat();
  if (!chat || !chat.messages.length) { flashStatus("Nothing to export yet"); return; }

  const transcript = chat.messages
    .map((m) => `${m.role === "user" ? "You" : "Awais AI"} (${formatTime(m.ts)}):\n${m.content || ""}\n`)
    .join("\n");
  const fileName = (chat.title || "chat").replace(/[^\w\- ]/g, "").slice(0, 40) || "chat";

  if (navigator.share) {
    try {
      await navigator.share({ title: fileName, text: transcript });
      return;
    } catch (err) {
      if (err.name === "AbortError") return; // user cancelled the share sheet
    }
  }
  copyText(transcript);
  flashStatus("Chat copied to clipboard");
});

// =====================================================================
// Emoji picker
// =====================================================================
const EMOJI_SET = [
  "😀","😂","😅","😊","😍","🤔","😎","😴","😢","😭","😡","🤯","🥳","😇","🙃","😉",
  "👍","👎","👏","🙏","💪","🤝","👋","✌️","🔥","✨","🎉","💡","❤️","💯","⭐","✅",
  "❌","⚠️","🚀","🎯","📌","📎","🕒","📅","💻","🐛","🛠️","📷","🖼️","🎨","🎧","📚",
  "☕","🍕","🌙","☀️","🌧️","❄️","🐱","🐶","🌸","🌍","🙌","🤷","😏","🥲","🤓","👀",
];

function buildEmojiGrid() {
  emojiGrid.innerHTML = "";
  for (const emoji of EMOJI_SET) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "emojiOption";
    btn.textContent = emoji;
    btn.addEventListener("click", () => insertAtCursor(textInput, emoji));
    emojiGrid.appendChild(btn);
  }
}
buildEmojiGrid();

function insertAtCursor(input, text) {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  input.value = input.value.slice(0, start) + text + input.value.slice(end);
  const cursor = start + text.length;
  input.focus();
  input.setSelectionRange(cursor, cursor);
  autoResizeInput();
}

function closeAllPopovers() {
  emojiPanel.classList.add("hidden");
  voiceHint.classList.add("hidden");
}

emojiBtn.addEventListener("click", () => {
  const willOpen = emojiPanel.classList.contains("hidden");
  closeAllPopovers();
  emojiPanel.classList.toggle("hidden", !willOpen);
});
closeEmojiBtn.addEventListener("click", () => emojiPanel.classList.add("hidden"));

micInfoBtn.addEventListener("click", () => {
  const willOpen = voiceHint.classList.contains("hidden");
  closeAllPopovers();
  voiceHint.classList.toggle("hidden", !willOpen);
});
closeVoiceHintBtn.addEventListener("click", () => voiceHint.classList.add("hidden"));

document.addEventListener("click", (e) => {
  if (!emojiPanel.classList.contains("hidden") && !emojiPanel.contains(e.target) && e.target !== emojiBtn) {
    emojiPanel.classList.add("hidden");
  }
  if (!voiceHint.classList.contains("hidden") && !voiceHint.contains(e.target) && e.target !== micInfoBtn) {
    voiceHint.classList.add("hidden");
  }
});

// =====================================================================
// Image attachment (compressed client-side, then sent as base64 to a
// vision-capable Groq model)
// =====================================================================
const MAX_IMAGE_DIMENSION = 1024;
const IMAGE_JPEG_QUALITY = 0.72;

function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that image"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Couldn't read that image"));
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
          const scale = MAX_IMAGE_DIMENSION / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", IMAGE_JPEG_QUALITY));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

imageBtn.addEventListener("click", () => imageFileInput.click());

imageFileInput.addEventListener("change", async () => {
  const file = imageFileInput.files && imageFileInput.files[0];
  imageFileInput.value = "";
  if (!file) return;
  if (!file.type.startsWith("image/")) { flashStatus("That's not an image file"); return; }

  try {
    const dataUrl = await compressImageFile(file);
    pendingImage = { dataUrl, name: file.name };
    attachmentThumb.src = dataUrl;
    attachmentName.textContent = file.name;
    attachmentStrip.classList.remove("hidden");
    flashStatus("Image attached — it'll be analyzed with the vision model");
  } catch (err) {
    console.error(err);
    flashStatus("Couldn't process that image");
  }
});

removeAttachmentBtn.addEventListener("click", () => {
  pendingImage = null;
  attachmentStrip.classList.add("hidden");
});

// =====================================================================
// Generic file attachment (text-based files are read and inlined into
// the message as a fenced code block; PDFs get their text extracted
// with a tiny built-in parser so nothing needs to be uploaded anywhere)
// =====================================================================
const MAX_FILE_CHARS = 12000; // keep prompts from ballooning — trims very long files
const TEXTY_EXT = /\.(txt|md|csv|json|js|ts|jsx|tsx|py|java|c|cpp|h|cs|go|rb|php|html|css|xml|yml|yaml|log)$/i;

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file"));
    reader.onload = () => resolve(reader.result);
    reader.readAsText(file);
  });
}

// Extremely small, dependency-free PDF text scraper: PDFs store page text
// inside `(...)Tj` / `[(...)...]TJ` show-text operators, so a regex pass
// over the raw bytes pulls out readable text without needing pdf.js.
async function extractPdfText(file) {
  const buf = await file.arrayBuffer();
  const raw = new TextDecoder("latin1").decode(buf);
  const chunks = [];
  const tjRegex = /\(((?:\\.|[^()\\])*)\)\s*Tj/g;
  const arrayRegex = /\[((?:\\.|[^\[\]\\])*)\]\s*TJ/g;
  let match;
  while ((match = tjRegex.exec(raw)) !== null) chunks.push(match[1]);
  while ((match = arrayRegex.exec(raw)) !== null) {
    const pieces = match[1].match(/\(((?:\\.|[^()\\])*)\)/g) || [];
    chunks.push(pieces.map((p) => p.slice(1, -1)).join(""));
  }
  const text = chunks
    .join(" ")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/[ \t]+/g, " ")
    .trim();
  return text;
}

fileBtn.addEventListener("click", () => genericFileInput.click());

genericFileInput.addEventListener("change", async () => {
  const file = genericFileInput.files && genericFileInput.files[0];
  genericFileInput.value = "";
  if (!file) return;

  flashStatus("Reading file...");
  try {
    let text = "";
    if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
      text = await extractPdfText(file);
      if (!text) {
        flashStatus("Couldn't extract text from that PDF (it may be scanned/image-based)");
        return;
      }
    } else if (TEXTY_EXT.test(file.name) || file.type.startsWith("text/") || file.type === "application/json") {
      text = await readFileAsText(file);
    } else {
      flashStatus("That file type isn't supported — try a text file, code file, or PDF");
      return;
    }

    let truncated = false;
    if (text.length > MAX_FILE_CHARS) {
      text = text.slice(0, MAX_FILE_CHARS);
      truncated = true;
    }

    pendingFile = { name: file.name, text, truncated };
    fileAttachmentName.textContent = file.name;
    fileAttachmentStrip.classList.remove("hidden");
    flashStatus(`"${file.name}" attached — it'll be included with your next message`);
  } catch (err) {
    console.error(err);
    flashStatus("Couldn't read that file");
  }
});

removeFileAttachmentBtn.addEventListener("click", () => {
  pendingFile = null;
  fileAttachmentStrip.classList.add("hidden");
});

// =====================================================================
// Settings modal
// =====================================================================
function openSettings() {
  modelSelect.value = groqModel;
  temperatureInput.value = groqTemp;
  temperatureValue.textContent = groqTemp.toFixed(1);
  systemPromptInput.value = systemPrompt;
  autoReadToggle.checked = autoReadReplies;
  autoSendVoiceToggle.checked = autoSendVoice;
  settingsOverlay.classList.remove("hidden");
}
function closeSettings() {
  settingsOverlay.classList.add("hidden");
}

settingsBtn.addEventListener("click", openSettings);
closeSettingsBtn.addEventListener("click", closeSettings);
settingsOverlay.addEventListener("click", (e) => {
  if (e.target === settingsOverlay) closeSettings();
});

temperatureInput.addEventListener("input", () => {
  temperatureValue.textContent = parseFloat(temperatureInput.value).toFixed(1);
});

resetSettingsBtn.addEventListener("click", () => {
  modelSelect.value = GROQ_MODEL_DEFAULT;
  temperatureInput.value = GROQ_TEMP_DEFAULT;
  temperatureValue.textContent = GROQ_TEMP_DEFAULT.toFixed(1);
  systemPromptInput.value = SYSTEM_PROMPT_DEFAULT;
  autoReadToggle.checked = false;
  autoSendVoiceToggle.checked = true;
});

saveSettingsBtn.addEventListener("click", () => {
  groqModel = modelSelect.value || GROQ_MODEL_DEFAULT;
  localStorage.setItem(groqModelStorageKey, groqModel);
  updateModelBadge();

  let temp = parseFloat(temperatureInput.value);
  if (Number.isNaN(temp)) temp = GROQ_TEMP_DEFAULT;
  groqTemp = temp;
  localStorage.setItem(groqTempStorageKey, String(groqTemp));

  systemPrompt = systemPromptInput.value.trim() || SYSTEM_PROMPT_DEFAULT;
  localStorage.setItem(systemPromptStorageKey, systemPrompt);

  autoReadReplies = autoReadToggle.checked;
  localStorage.setItem(autoReadStorageKey, autoReadReplies ? "1" : "0");

  autoSendVoice = autoSendVoiceToggle.checked;
  localStorage.setItem(autoSendVoiceStorageKey, autoSendVoice ? "1" : "0");

  closeSettings();
  flashStatus("Settings saved");
});

// =====================================================================
// Groq API — streaming (supports multimodal image+text user turns)
// =====================================================================
function buildApiMessages(history) {
  return history.map((m) => {
    if (m.role === "user" && m.image) {
      return {
        role: "user",
        content: [
          { type: "text", text: m.content || "What's in this image?" },
          { type: "image_url", image_url: { url: m.image } },
        ],
      };
    }
    if (m.role === "user" && m.fileContentForModel) {
      return { role: "user", content: m.fileContentForModel };
    }
    return { role: m.role, content: m.content || "" };
  });
}

async function* streamGroq(apiKey, history, model, signal) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: groqTemp,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...buildApiMessages(history),
      ],
    }),
  });

  if (!response.ok) {
    let message = `Groq API error (${response.status})`;
    try {
      const data = await response.json();
      message = data?.error?.message || message;
    } catch { /* body wasn't JSON — keep the generic message */ }
    throw new Error(message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop(); // last line may be incomplete — keep it for the next chunk

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const json = JSON.parse(payload);
        const delta = json?.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch { /* ignore partial/malformed SSE lines */ }
    }
  }
}

// =====================================================================
// Main ask flow
// =====================================================================
function toggleStopButton(show) {
  stopBtn.classList.toggle("hidden", !show);
  sendBtn.classList.toggle("hidden", show);
}

async function runAssistantReply(chat) {
  if (!groqApiKey) {
    renderErrorBubble("Awais AI's built-in API key isn't configured. Ask the developer to add one in script.js.");
    setStatus("Missing API key", "error");
    return;
  }

  const lastUserMsg = [...chat.messages].reverse().find((m) => m.role === "user");
  const effectiveModel = lastUserMsg && lastUserMsg.image ? VISION_MODEL : groqModel;

  isGenerating = true;
  toggleStopButton(true);
  setStatus(effectiveModel === VISION_MODEL ? "Looking at your image..." : "Thinking...", "thinking");

  const thinkingBubble = addThinkingBubble();
  currentAbortController = new AbortController();

  let fullText = "";
  let liveContentEl = null;
  let liveWrapEl = null;

  try {
    for await (const delta of streamGroq(groqApiKey, chat.messages, effectiveModel, currentAbortController.signal)) {
      if (!liveWrapEl) {
        thinkingBubble.remove();
        liveWrapEl = document.createElement("div");
        liveWrapEl.className = "msg bot";
        liveContentEl = document.createElement("div");
        liveContentEl.className = "msgContent typing";
        liveWrapEl.appendChild(liveContentEl);
        chatLog.appendChild(liveWrapEl);
      }
      fullText += delta;
      liveContentEl.innerHTML = renderMarkdownToHTML(fullText);
      scrollToBottomIfNearEnd();
    }

    if (!fullText) fullText = "Sorry, I didn't get a response.";
    if (liveContentEl) liveContentEl.classList.remove("typing");

    chat.messages.push({ id: genId(), role: "assistant", content: fullText, ts: Date.now() });
    chat.updatedAt = Date.now();
    persistChats();
    renderHistoryList();
    renderActiveChat();
    setStatus("Ready — ask me anything");
    if (navigator.vibrate) navigator.vibrate(8);
    if (autoReadReplies) speakText(fullText);
  } catch (err) {
    if (thinkingBubble.isConnected) thinkingBubble.remove();
    if (liveWrapEl && liveWrapEl.isConnected) liveWrapEl.remove();

    if (err.name === "AbortError") {
      if (fullText) {
        chat.messages.push({ id: genId(), role: "assistant", content: `${fullText}\n\n_[stopped]_`, ts: Date.now() });
        chat.updatedAt = Date.now();
        persistChats();
        renderHistoryList();
      }
      renderActiveChat();
      setStatus("Stopped");
    } else {
      console.error("AI error:", err);
      let friendly = err.message || "Something went wrong.";
      if (friendly.includes("Failed to fetch") || friendly.includes("NetworkError")) {
        friendly = "Couldn't reach Groq directly from the app (this may be a CORS restriction on Groq's side). You may need a small proxy server — ask me and I can set one up.";
      }
      renderActiveChat();
      renderErrorBubble(friendly);
      setStatus("Error", "error");
    }
  } finally {
    isGenerating = false;
    toggleStopButton(false);
    currentAbortController = null;
  }
}

stopBtn.addEventListener("click", () => {
  if (currentAbortController) currentAbortController.abort();
});

async function askAI(message, image, file) {
  const chat = getActiveChat();
  if (!chat) return;

  const userMsg = { id: genId(), role: "user", content: message, ts: Date.now() };
  if (image) { userMsg.image = image.dataUrl; userMsg.imageName = image.name; }
  if (file) {
    userMsg.fileName = file.name;
    // The raw file text isn't shown in the bubble (to keep the chat log
    // readable) but is folded into what's actually sent to the model.
    const note = file.truncated ? " (truncated to the first part)" : "";
    userMsg.fileContentForModel =
      `${message ? message + "\n\n" : ""}Attached file: ${file.name}${note}\n\`\`\`\n${file.text}\n\`\`\``;
  }
  chat.messages.push(userMsg);

  if (chat.messages.filter((m) => m.role === "user").length === 1) {
    chat.title = titleFromMessage(message || (file ? file.name : image ? "Image" : ""));
  }
  chat.updatedAt = Date.now();
  persistChats();
  renderHistoryList();
  renderActiveChat();

  if (navigator.vibrate) navigator.vibrate(12);

  await runAssistantReply(chat);
}

// ===== Voice command router =====
// Recognized spoken phrases trigger app actions instead of being sent to the
// model as a chat message. Anything else is treated as a normal message.
function tryRunVoiceCommand(rawText) {
  const text = rawText.trim().toLowerCase().replace(/[.!?]+$/, "");

  const matches = (...phrases) => phrases.some((p) => text === p || text.includes(p));

  if (matches("new chat", "start a new chat", "start new chat")) {
    startNewChat();
    flashStatus("Started a new chat");
    return true;
  }
  if (matches("clear all chats", "delete all chats", "clear my chats")) {
    clearAllChatsBtn.click();
    return true;
  }
  if (matches("stop generating", "stop", "cancel that", "stop talking")) {
    if (currentAbortController) currentAbortController.abort();
    if (speakingMsgId || speechSynthesis.speaking) speechSynthesis.cancel();
    return true;
  }
  if (matches("read that again", "read last message", "read the last reply", "say that again")) {
    const chat = getActiveChat();
    const lastBot = chat && [...chat.messages].reverse().find((m) => m.role === "assistant");
    if (lastBot) toggleSpeak(lastBot);
    else flashStatus("No reply to read yet");
    return true;
  }
  if (matches("dark mode", "switch to dark mode", "turn on dark mode")) {
    applyTheme("dark");
    flashStatus("Switched to dark mode");
    return true;
  }
  if (matches("light mode", "switch to light mode", "turn on light mode")) {
    applyTheme("light");
    flashStatus("Switched to light mode");
    return true;
  }
  if (matches("open settings")) {
    openSettings();
    return true;
  }
  if (matches("close settings")) {
    closeSettings();
    return true;
  }
  if (matches("open chats", "show my chats", "open sidebar")) {
    openSidebar();
    return true;
  }

  return false;
}

// ===== Command router =====
async function takeCommand(rawMessage) {
  const message = rawMessage.trim();
  if ((!message && !pendingImage && !pendingFile) || isGenerating) return;

  if (message && tryRunVoiceCommand(message)) return;

  const image = pendingImage;
  pendingImage = null;
  attachmentStrip.classList.add("hidden");

  const file = pendingFile;
  pendingFile = null;
  fileAttachmentStrip.classList.add("hidden");

  await askAI(message, image, file);
}

// ===== Voice input (speech-to-text, with voice-command routing) =====
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (SpeechRecognitionAPI) {
  recognition = new SpeechRecognitionAPI();
  recognition.lang = "en-US";
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const transcript = event.results[event.resultIndex][0].transcript;
    micBtn.classList.remove("active");

    // Commands run immediately regardless of the auto-send setting.
    if (tryRunVoiceCommand(transcript)) return;

    textInput.value = transcript;
    autoResizeInput();

    if (autoSendVoice) {
      takeCommand(transcript);
      textInput.value = "";
      autoResizeInput();
    }
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    setStatus("Didn't catch that — try again", "error");
    micBtn.classList.remove("active");
  };

  recognition.onend = () => {
    micBtn.classList.remove("active");
  };
} else {
  micBtn.style.display = "none";
}

micBtn.addEventListener("click", () => {
  if (!recognition) return;
  closeAllPopovers();
  recognition.start();
  micBtn.classList.add("active");
  setStatus("Listening...", "listening");
});

// ===== Text input: auto-growing textarea, Enter to send, Shift+Enter for newline =====
function autoResizeInput() {
  textInput.style.height = "auto";
  textInput.style.height = Math.min(textInput.scrollHeight, 140) + "px";
}
textInput.addEventListener("input", autoResizeInput);

textInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (typeof textForm.requestSubmit === "function") textForm.requestSubmit();
    else textForm.dispatchEvent(new Event("submit", { cancelable: true }));
  }
});

textForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = textInput.value.trim();
  if ((!message && !pendingImage && !pendingFile) || isGenerating) return;
  textInput.value = "";
  autoResizeInput();
  takeCommand(message);
});
