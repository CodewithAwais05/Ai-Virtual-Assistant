# Awais AI

A single-page, installable chat app that talks to Groq's hosted models. No backend, no build step — just `index.html`, `style.css`, and `script.js`. Everything (accounts, chats, settings) is stored on-device in `localStorage`.

## Features

- **Per-device accounts** — simple username/password gate (SHA-256 hashed, stored locally) so multiple people sharing a device get separate chat histories. This is *not* secure remote authentication — don't reuse a real password.
- **Multiple chats** — new chat, rename, delete, search, and a "Clear all chats" option, all in the sidebar.
- **Streaming responses** with stop/regenerate/edit/copy/read-aloud on every message.
- **Voice input** — tap the mic to dictate a message (Web Speech API). Spoken phrases like *"new chat"*, *"dark mode"*, *"stop generating"*, or *"open settings"* are caught as voice commands instead of being sent as a chat message.
- **Image attachments** — attach a photo and it's automatically compressed client-side, then routed to a vision-capable model.
- **File attachments** — attach a text file, code file, or PDF (📎). Text/code files are read directly; PDFs get their text pulled out with a small built-in parser (no external library). The extracted text is folded into your message before it's sent.
- **Emoji picker** for quick inserts into the message box.
- **Light/dark theme toggle**, with a "Nebula" magenta/indigo/amber color palette.
- **Export chat** — share or copy the current conversation as plain text.
- **Adjustable model & temperature, and a custom system prompt**, all saved locally (Settings ⚙️).

## Setup

1. Put `index.html`, `style.css`, and `script.js` in the same folder.
2. Open `script.js` and set your own Groq API key:
   ```js
   const GROQ_API_KEY = "your-key-here";
   ```
   Get a free key at [console.groq.com/keys](https://console.groq.com/keys).
3. Serve the folder over `http(s)://` (voice input and clipboard features need a secure context — a plain `file://` open won't support everything). Any static file server works, e.g.:
   ```bash
   npx serve .
   # or
   python3 -m http.server 8000
   ```
4. Open it in a browser (or "Add to Home Screen" on mobile for an app-like feel).

## ⚠️ About the hardcoded API key

The key in `script.js` ships baked into the app for every install — there's no in-app way to override it. That means:
- Anyone who views page source, or unpacks a wrapped mobile build, can read the key straight out of the file.
- Only use a key you're fine with other people potentially seeing and spending against (e.g. a low-limit or throttled key), or better, put a small proxy server in front of Groq that holds the real key server-side.

## Models

| Model | Use |
|---|---|
| `openai/gpt-oss-120b` | Default — best quality |
| `openai/gpt-oss-20b` | Fastest |
| `qwen/qwen3.6-27b` | Vision — used automatically whenever an image is attached |

## File structure

```
.
├── index.html   — markup (auth screen, chat UI, settings modal)
├── style.css    — "Nebula" theme (CSS variables for light/dark)
└── script.js    — all app logic (auth, storage, chat, voice, attachments, Groq API calls)
```

## Notes & limitations

- Attached files are capped at ~12,000 characters (longer files are truncated) to keep prompts from ballooning.
- The PDF text extractor is a lightweight regex-based scraper — it won't work on scanned/image-only PDFs (no OCR).
- Voice input and text-to-speech rely on the browser's Web Speech API, so support varies by browser/OS.