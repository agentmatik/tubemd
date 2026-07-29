# TubeMD - YouTube to Markdown Transcript

A Manifest V3 Chrome extension that turns any YouTube video's transcript into
clean Markdown with YAML frontmatter, optimized for feeding to AI agents.
Optional AI summaries via Google Gemini, OpenAI, or Anthropic Claude - using
**your own** API key.

Built by [Agentmatik](https://agentmatik.ai). Original code, not a fork.

- No backend. Everything runs in your browser.
- No telemetry, no tracking, no account.
- Your API keys stay on your device and go only to the provider you pick.

## Features

- **Markdown export with YAML frontmatter** - title, author, URL, publish date,
  duration, views, description, language, and extraction timestamp.
- **Plain-text export** - timestamped transcript.
- **AI summaries** - Gemini (free tier), OpenAI, or Claude, with your key.
- **SKILL.md generation** - turn a how-to video into a Claude Code or Manus skill.
- **Multi-language** - extract any available caption track, manual or auto.
- **Dual UI** - an inline panel in YouTube's right column plus a toolbar popup.
- **In-transcript search**, click-a-timestamp-to-seek, one-click copy/download.
- **Keyboard shortcut** - `Ctrl+Shift+Y` (`Cmd+Shift+Y` on macOS).

## Install (developer / unpacked)

Not yet on the Chrome Web Store. To run it locally:

1. Clone this repository.
2. Open `chrome://extensions/` and enable **Developer mode** (top right).
3. Click **Load unpacked** and select the **`src/`** folder.
4. Open any YouTube watch page. The TubeMD panel appears in the right column, or
   click the toolbar icon for the popup.

## Usage

### Extract a transcript
1. On a YouTube video, click **GET TRANSCRIPTION** (inline panel or popup).
2. Switch caption language with the dropdown if more than one is available.
3. Copy or download as `.md` or `.txt`, or search within the transcript.

If a video has no captions, TubeMD shows a clear "no captions available"
message rather than failing silently.

### AI summaries and skills (bring your own key)
1. Open **Settings** (the gear icon, or right-click the extension > Options).
2. Pick a provider and paste your API key:
   - **Gemini** - [Google AI Studio](https://aistudio.google.com/apikey) (free tier)
   - **OpenAI** - [OpenAI Platform](https://platform.openai.com/api-keys)
   - **Claude** - [Anthropic Console](https://console.anthropic.com/settings/keys)
3. Extract a transcript, then click **Generate Summary** or **Generate Skill**.

Keys are stored in `chrome.storage.local` (this device only) and are sent only
to the provider you selected. See [PRIVACY.md](PRIVACY.md).

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
extension.** Failures surface a visible error, not a silent blank.

## Permissions

| Permission | Why |
|-----------|-----|
| `activeTab` | Act on the tab you are viewing when you click the extension. |
| `storage` | Save your provider choice and API key locally. |
| `scripting` | Toggle the inline panel via the keyboard shortcut. |
| host: `www.youtube.com` | Read transcript and metadata from the page. |
| host: `generativelanguage.googleapis.com` | Gemini summaries, only if you choose Gemini. |
| host: `api.openai.com` | OpenAI summaries, only if you choose OpenAI. |
| host: `api.anthropic.com` | Claude summaries, only if you choose Claude. |

The three AI hosts are contacted only when you actively request a summary or
skill. Full detail in [PRIVACY.md](PRIVACY.md).

## Privacy

No backend, no telemetry, no tracking. Transcripts are processed locally and are
sent to a third-party AI provider only when you explicitly ask for a summary or
skill, under your own key. Read the full policy in [PRIVACY.md](PRIVACY.md).

## Free vs Pro

Free: transcript extraction with plain-text view, copy, and .txt download - in
both the inline panel and the popup. Pro ($1.99/month or $19/year): Markdown
export with YAML frontmatter, AI summaries, and SKILL.md generation. Payment
runs through Stripe Checkout in a new tab; the license key (TM-XXXX-XXXX-XXXX)
is validated server-side against the Agentmatik Licensing API and re-checked
daily (network failures never lock out a paying user; only an explicit
revoked/expired downgrades).

## Development

No build step and no dependencies - the files in `src/` load as-is. See
[CONTRIBUTING.md](CONTRIBUTING.md) for setup, conventions, and the manual test
matrix. Changes are tracked in [CHANGELOG.md](CHANGELOG.md).

## License

Proprietary - (c) 2026 Agentmatik s.r.o. All rights reserved. See [LICENSE](LICENSE).
The packaged extension is free to install; Pro features require an active subscription license.
The source may not be copied, redistributed, or sold.
