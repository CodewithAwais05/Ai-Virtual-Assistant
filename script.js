// ===== Elements =====
const micBtn = document.querySelector("#micBtn");
const voice = document.querySelector("#voice");
const statusEl = document.querySelector("#status");
const chatLog = document.querySelector("#chatLog");
const textForm = document.querySelector("#textForm");
const textInput = document.querySelector("#textInput");
const modeSelect = document.querySelector("#modeSelect");
const clearBtn = document.querySelector("#clearBtn");

const ASSISTANT_NAME = "Awais";
const MODELS = {
  fast: "openai/gpt-5.4-nano",
  smart: "claude-sonnet-4-6",
};

// Conversation history sent to the AI so it has context (kept short to stay fast)
let conversationHistory = [
  {
    role: "system",
    content:
      `You are ${ASSISTANT_NAME}, a friendly, concise voice-first virtual assistant ` +
      `built by Awais Raza. Keep answers short and conversational (2-4 sentences) since ` +
      `they will often be read aloud. Be warm and helpful.`,
  },
];

// ===== Speech synthesis =====
function speak(text) {
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1;
  utter.pitch = 1;
  utter.volume = 1;
  utter.lang = "en-GB";
  window.speechSynthesis.speak(utter);
}

function wishMe() {
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 12) speak("Good morning. I am your virtual assistant.");
  else if (hour >= 12 && hour < 16) speak("Good afternoon. I am your virtual assistant.");
  else speak("Good evening. I am your virtual assistant.");
}
window.addEventListener("click", () => wishMe(), { once: true });

// ===== Chat log UI =====
function addMessage(text, sender) {
  const bubble = document.createElement("div");
  bubble.className = `msg ${sender}`;
  bubble.textContent = text;
  chatLog.appendChild(bubble);
  chatLog.scrollTop = chatLog.scrollHeight;
  return bubble;
}

function setStatus(text, cls = "") {
  statusEl.textContent = text;
  statusEl.className = cls;
}

// ===== Quick (instant, offline) commands =====
const SITE_MAP = {
  youtube: "https://www.youtube.com/",
  google: "https://www.google.com/",
  "chat gpt": "https://chatgpt.com/",
  chatgpt: "https://chatgpt.com/",
  instagram: "https://www.instagram.com/?hl=en",
  facebook: "https://www.facebook.com/",
  snapchat: "https://www.snapchat.com/",
  whatsapp: "https://www.whatsapp.com/",
  twitter: "https://x.com/",
  x: "https://x.com/",
  reddit: "https://www.reddit.com/",
  github: "https://github.com/",
  linkedin: "https://www.linkedin.com/",
};

function tryQuickCommand(message) {
  if (message.includes("hello") || message.includes("hi") || message.includes("hey")) {
    const reply = "Hello! How can I help you?";
    speak(reply);
    return reply;
  }

  if (message.includes("who are you")) {
    const reply = `I am ${ASSISTANT_NAME}, your virtual assistant, built by Awais Raza.`;
    speak(reply);
    return reply;
  }

  if (message.includes("open calculator")) {
    const reply = "Opening calculator.";
    speak(reply);
    window.open("https://www.online-calculator.com/full-screen-calculator/", "_blank");
    return reply;
  }

  if (message.includes("time")) {
    const time = new Date().toLocaleString(undefined, { hour: "numeric", minute: "numeric" });
    const reply = `The time is ${time}.`;
    speak(reply);
    return reply;
  }

  if (message.includes("date")) {
    const date = new Date().toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric" });
    const reply = `Today's date is ${date}.`;
    speak(reply);
    return reply;
  }

  if (message.includes("clear chat") || message.includes("clear conversation")) {
    resetConversation();
    return "Cleared our conversation.";
  }

  if (message.includes("stop")) {
    window.speechSynthesis.cancel();
    return "Okay, stopped.";
  }

  const openMatch = message.match(/^open (.+)/);
  if (openMatch) {
    const target = openMatch[1].trim();
    const url = SITE_MAP[target];
    const reply = `Opening ${target}.`;
    speak(reply);
    window.open(url || `https://www.google.com/search?q=${encodeURIComponent(target)}`, "_blank");
    return reply;
  }

  return null; // no quick command matched — fall through to AI
}

// ===== AI brain (Puter.js — free, keyless) =====
async function askAI(message) {
  conversationHistory.push({ role: "user", content: message });

  const thinkingBubble = addMessage("🤔 Thinking...", "bot thinking");
  setStatus("🧠 Thinking...", "thinking");

  try {
    const model = MODELS[modeSelect.value] || MODELS.fast;
    const response = await puter.ai.chat(conversationHistory, { model });

    // Response shape varies slightly by model; normalize to plain text
    let text =
      (typeof response === "string" && response) ||
      response?.message?.content?.[0]?.text ||
      response?.text ||
      "Sorry, I didn't catch that.";

    conversationHistory.push({ role: "assistant", content: text });
    thinkingBubble.remove();
    addMessage(text, "bot");
    speak(text);
    setStatus("💤 Idle — say something or type below");
    return text;
  } catch (err) {
    thinkingBubble.remove();
    const fallback = "I couldn't reach my AI brain just now. Please check your connection and try again.";
    addMessage(fallback, "bot");
    speak(fallback);
    setStatus("⚠️ Connection issue", "");
    console.error("AI error:", err);
    return fallback;
  }
}

function resetConversation() {
  conversationHistory = [conversationHistory[0]]; // keep system prompt
  chatLog.innerHTML = "";
  setStatus("💤 Idle — say something or type below");
}

// ===== Command router =====
async function takeCommand(rawMessage) {
  const message = rawMessage.toLowerCase().trim();
  if (!message) return;

  addMessage(rawMessage, "user");

  const quickReply = tryQuickCommand(message);
  if (quickReply !== null) {
    addMessage(quickReply, "bot");
    setStatus("💤 Idle — say something or type below");
    return;
  }

  await askAI(rawMessage);
}

// ===== Voice recognition =====
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (SpeechRecognitionAPI) {
  recognition = new SpeechRecognitionAPI();
  recognition.lang = "en-US";
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const transcript = event.results[event.resultIndex][0].transcript;
    takeCommand(transcript);
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    setStatus("⚠️ Didn't catch that — try again", "");
    micBtn.classList.remove("active");
    voice.style.display = "none";
  };

  recognition.onend = () => {
    micBtn.classList.remove("active");
    voice.style.display = "none";
  };
} else {
  setStatus("⚠️ Voice input isn't supported in this browser — use text instead", "");
}

micBtn.addEventListener("click", () => {
  if (!recognition) {
    textInput.focus();
    return;
  }
  recognition.start();
  micBtn.classList.add("active");
  voice.style.display = "block";
  setStatus("🎙️ Listening...", "listening");
});

// ===== Text input fallback =====
textForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = textInput.value.trim();
  if (!message) return;
  textInput.value = "";
  takeCommand(message);
});

clearBtn.addEventListener("click", resetConversation);
