# TubeMD - YouTube to Markdown Transcript

A Chrome extension (Manifest V3) that extracts YouTube video transcripts as clean Markdown with YAML frontmatter, optimized for feeding to AI agents. Optional AI summaries via Gemini, ChatGPT, or Claude using your own API key.

Built by [Agentmatik](https://agentmatik.ai). Original code - this is a from-scratch implementation, not a fork of another extension.

## Status

- **Version:** 1.0.0 (prototype, built in Manus, migrated here 2026-07-05)
- **Stage:** working prototype - not yet on the Chrome Web Store
- **Next:** polish to store-ready, then submit. See `kickoff-prompt.md` for the dev-thread starting point and the roadmap.

## Repository layout

| Path | What it is |
|------|-----------|
| `src/` | The extension itself. Load this via `chrome://extensions` > Developer mode > Load unpacked. Ships its own `src/README.md`. |
| `manus-export/` | Complete history of how it was built. `transcript.md` is the full 553-message chat; `messages-raw.json` + `task-detail.json` are the lossless source; `files/` holds every attachment including all intermediate build zips. |
| `kickoff-prompt.md` | Paste into a fresh Claude Code session (started in this folder) to continue development. |

## Load it locally

1. `git clone` this repo.
2. Open `chrome://extensions`, enable **Developer mode** (top right).
3. Click **Load unpacked** and select the `src/` folder.
4. Open any YouTube watch page - the inline panel appears in the right column, or click the extension icon for the popup. Shortcut: `Ctrl+Shift+Y` (`Cmd+Shift+Y` on Mac).

## What it does

- Extracts the transcript of any YouTube video with captions and renders it as Markdown (with YAML frontmatter: title, author, URL, date, duration, language) or plain timestamped text.
- Real-time search within the transcript, click-a-timestamp to seek, one-click copy or download as `.md`/`.txt`.
- Optional AI summary via Google Gemini, OpenAI, or Anthropic - the user supplies their own API key (stored locally; the extension declares host permissions for those three APIs).

## How extraction works

TubeMD reads YouTube's own transcript data (the InnerTube/`get_transcript` approach) rather than scraping the DOM - see the technical sections of `manus-export/transcript.md` for the full method and its known fragility (YouTube changes break transcript extensions often; this is the main maintenance risk).

## Monetization (as prototyped)

The build already contains a licensing scaffold: a 14-day free trial, then a Pro upgrade gating Markdown export and AI summaries. This is a starting point to validate during the polish thread, not a finalized model.

## License

Proprietary - (c) 2026 Agentmatik s.r.o. All rights reserved. Not for redistribution.
