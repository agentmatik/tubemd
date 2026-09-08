# TubeMD

**Turn any YouTube video into agent-ready Markdown and skills - in your browser, with your keys**

[![CI](https://github.com/agentmatik/tubemd/actions/workflows/ci.yml/badge.svg)](https://github.com/agentmatik/tubemd/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version 2.0.0](https://img.shields.io/badge/version-2.0.0-orange.svg)](CHANGELOG.md)

TubeMD is a Manifest V3 Chrome extension. It adds a panel to every YouTube
watch page (plus a toolbar popup): one click reads the video's transcript and
turns it into clean Markdown with YAML frontmatter, ready to paste into your
notes, a knowledge base, or an AI agent's context window. Optional AI
summaries and SKILL.md generation run with your own Gemini, OpenAI, or
Anthropic key.

Free and open source (MIT). No backend, no telemetry, no account. Everything
runs in your browser, and your API keys never leave your device except to reach
the provider you picked.

## What it does

Everything below is free for everyone - there is no paid tier.

- **Markdown export with YAML frontmatter** - title, author, URL, publish date,
  duration, views, description, language, and extraction timestamp.
- **Plain-text export** - timestamped transcript.
- **AI summaries** - Gemini (free tier), OpenAI, or Claude, with your own key.
- **SKILL.md generation** - turn a how-to video into a Claude Code or Manus skill.
- **Multi-language** - extract any available caption track, manual or auto-generated.
- **Dual UI** - an inline panel in YouTube's right column plus a toolbar popup.
- **In-transcript search**, click-a-timestamp-to-seek, one-click copy/download.
- **Keyboard shortcut** - `Ctrl+Shift+Y` (`Cmd+Shift+Y` on macOS).

## Why it exists

AI agents are only as good as what you feed them, and a YouTube video is one of
the worst-shaped inputs there is: the knowledge is locked in audio, the auto
captions are a wall of unpunctuated text, and the metadata (who said it, when,
where) is scattered around the page. TubeMD produces one clean Markdown file
per video, with that metadata as frontmatter, so an AI agent can ingest it like
any other document. It does this without a backend: your keys stay on your
device, nothing is tracked, and there is no account to create.

## Feed your own brain

The Markdown TubeMD emits is built for ingestion, not just for reading:

- **AI agent memories** - the file is plain Markdown with a YAML frontmatter
  block (`title`, `author`, `url`, `published`, `duration`, `language`,
  `extracted`), which is what memory pipelines such as
  [GBrain](https://github.com/garrytan/gbrain)'s `media-ingest` expect, so a
  video becomes a first-class memory entry with its provenance intact.
- **Claude Code skills** - the SKILL.md generator extracts the procedural
  knowledge from a how-to video (steps, commands, pitfalls) and writes it in
  the format Claude Code loads from `.claude/skills/<name>/SKILL.md`. Pick the
  Manus format instead to get a Manus-style skill file.
- **Any Markdown knowledge base** - Obsidian, Logseq, a `notes/` folder in a
  git repository, or a RAG index: drop the file in and the frontmatter does the
  rest.

## Install

**From source (now):**

1. Clone this repository, or download it as a ZIP and unpack it.
2. Open `chrome://extensions/` and enable **Developer mode** (top right).
3. Click **Load unpacked** and select the **`src/`** folder.
4. Open any YouTube watch page. The TubeMD panel appears in the right column,
   or click the toolbar icon for the popup.

**Chrome Web Store:** listing coming. Until then, "Load unpacked" is the way
in. Chromium-based browsers (Edge, Brave) can load it the same way; Firefox is
not supported.

## Usage

### Extract a transcript

1. On a YouTube video, click **GET TRANSCRIPTION** (inline panel or popup).
2. Switch caption language with the dropdown if more than one is available.
3. Copy or download the result. The inline panel exports Markdown (`.md`); the
   popup has **MARKDOWN** and **TEXT** tabs and exports whichever is active.
4. Search inside the transcript, or click a timestamp to seek the video.

If a video has no captions, TubeMD shows a clear "no captions available"
message rather than failing silently.

### AI summaries and skills (bring your own key)

1. Open **Settings** (the gear icon, or right-click the extension > Options).
2. Pick a provider and paste your API key:
   - **Gemini** - [Google AI Studio](https://aistudio.google.com/apikey) (free tier)
   - **OpenAI** - [OpenAI Platform](https://platform.openai.com/api-keys)
   - **Claude** - [Anthropic Console](https://console.anthropic.com/settings/keys)
3. Extract a transcript, then click **Generate Summary** (panel or popup) or
   **Generate Skill** (popup, **SKILL** tab - choose Claude Code or Manus).

Keys are stored in `chrome.storage.local` (this device only) and are sent only
to the provider you selected, only when you click Generate. See
[PRIVACY.md](PRIVACY.md).

## Markdown output

```markdown
---
title: "Video Title"
author: "Channel Name"
site: "YouTube"
domain: "youtube.com"
url: "https://www.youtube.com/watch?v=..."
published: "2026-03-12"
duration: "1h 30m 45s"
views: "150000"
language: "en"
extracted: "2026-07-06T12:00:00.000Z"
---

# Video Title

**[00:00]** First transcript segment...
```

## How extraction works

TubeMD reads YouTube's own transcript data rather than scraping rendered DOM. It
tries, in order:

1. The `ytInitialPlayerResponse` embedded in the page.
2. YouTube's InnerTube `player` endpoint with the ANDROID client.
3. InnerTube with the WEB client.

Whichever returns caption tracks first wins; the selected track's caption file
is fetched and parsed (both `srv3` and classic formats, with a regex fallback if
the XML parser chokes). This is inherently fragile: **YouTube changes its
internal data regularly, and that is the main maintenance risk for this
extension.** Failures surface a visible error, not a silent blank. If
extraction breaks for you, please open an issue with the video URL and the
caption type - that report is the most useful contribution this project gets.

## Permissions

| Permission | Why |
|-----------|-----|
| `activeTab` | Act on the tab you are viewing when you click the extension. |
| `storage` | Save your provider choice and API key locally. |
| `scripting` | Toggle the inline panel via the keyboard shortcut. |
| host: `www.youtube.com` | Read transcript and metadata from the page. |
| host: `generativelanguage.googleapis.com` | Gemini summaries and skills, only if you choose Gemini. |
| host: `api.openai.com` | OpenAI summaries and skills, only if you choose OpenAI. |
| host: `api.anthropic.com` | Claude summaries and skills, only if you choose Claude. |

The three AI hosts are contacted only when you actively request a summary or
skill. Full detail in [PRIVACY.md](PRIVACY.md).

## Privacy

No backend, no telemetry, no tracking, no account. Transcripts are processed
locally and are sent to a third-party AI provider only when you explicitly ask
for a summary or skill, under your own key. The only network calls the
extension ever makes are to `youtube.com` and to the AI provider you picked.
Read the full policy in [PRIVACY.md](PRIVACY.md).

## Development

No build step and no dependencies - the files in `src/` load as-is (vanilla
JavaScript, Manifest V3). After a change, reload the extension on
`chrome://extensions/` and hard-refresh the YouTube tab.

The checks CI runs ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)),
runnable locally:

```bash
for f in src/*.js; do node --check "$f"; done       # syntax
python3 -m json.tool src/manifest.json > /dev/null   # manifest is valid JSON
gitleaks detect --source . --redact                  # no secrets in history
```

The only `AIza...` literal in the codebase is YouTube's public InnerTube
web-client key, kept as an extraction fallback in `src/content.js`;
[`.gitleaks.toml`](.gitleaks.toml) allowlists exactly that string and nothing
else.

See [CONTRIBUTING.md](CONTRIBUTING.md) for conventions and the manual test
matrix. Releases are tracked in [CHANGELOG.md](CHANGELOG.md).

## Contributing

Issues and pull requests are welcome. Extraction breakage reports are the most
valuable kind, because YouTube's internal data changes without notice. Read
[CONTRIBUTING.md](CONTRIBUTING.md) first - it is short. Security reports go
through [SECURITY.md](SECURITY.md).

## License

MIT - Copyright (c) 2026 Agentmatik s.r.o. See [LICENSE](LICENSE).

Built by [Agentmatik](https://agentmatik.ai). Original code, not a fork.
