# TubeMD - YouTube to Markdown Transcript

**Version 1.0.0** | Built by [Agentmatik](https://agentmatik.ai)

Extract YouTube video transcripts as clean Markdown with YAML frontmatter, optimized for feeding to AI agents. Supports AI-powered summaries via Gemini, ChatGPT, and Claude.

## Features

### Core
- **Markdown Export with YAML Frontmatter** — Title, author, URL, publish date, duration, views, description, language, and extraction timestamp
- **Plain Text Export** — Timestamped transcript in simple text format
- **AI Summary** — Generate summaries using Google Gemini (free), OpenAI ChatGPT, or Anthropic Claude
- **Multi-Language Support** — Extract transcripts in any available caption language
- **Dual UI** — Inline panel on YouTube + popup window when clicking the extension icon

### UI
- **Inline YouTube Panel** — Appears in the secondary column (right side) on YouTube watch pages
- **Popup Window** — Click the extension icon for a Defuddle-inspired clean popup interface
- **Search** — Real-time search within transcript with match highlighting
- **Click-to-Seek** — Click any timestamp to jump to that moment in the video
- **Copy & Download** — One-click copy to clipboard or download as .md/.txt file
- **Keyboard Shortcut** — Ctrl+Shift+Y (Cmd+Shift+Y on Mac) to toggle the inline panel

### Settings
- **Multi-Provider AI Config** — Choose between Gemini, ChatGPT, or Claude with individual API keys
- **Default Format** — Set your preferred output format (Markdown or Text)
- **License Management** — 14-day free trial, then upgrade to Pro for Markdown export and AI summaries

## Installation

1. Download and unzip the extension
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **"Load unpacked"** and select the unzipped `youtube-to-text-extension` folder
5. The extension icon appears in your toolbar

## Usage

### Inline Panel (YouTube)
1. Navigate to any YouTube video
2. The TubeMD panel appears automatically in the right column
3. Click **GET TRANSCRIPTION** to extract the transcript
4. Use the language dropdown to switch caption languages
5. Click the copy/download icons to export

### Popup Window
1. While on a YouTube video, click the TubeMD extension icon
2. Click **GET TRANSCRIPTION**
3. Switch between **MARKDOWN**, **TEXT**, and **SUMMARY** tabs
4. Use the action buttons to copy, download, or search

### AI Summary
1. Go to Settings (gear icon) and add your API key for your preferred provider
2. After extracting a transcript, click **Generate Summary** or switch to the Summary tab

## Markdown Output Format

The Markdown export includes rich YAML frontmatter optimized for AI agent consumption:

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
description: "First 200 chars of description..."
language: "en"
extracted: "2026-04-07T12:00:00.000Z"
---

# Video Title

**[00:00]** First transcript segment...

**[00:15]** Second transcript segment...
```

## File Structure

```
youtube-to-text-extension/
├── manifest.json       # Extension manifest (MV3)
├── background.js       # Service worker (AI summarization, settings)
├── content.js          # Content script (transcript extraction, inline panel)
├── content.css         # Inline panel styles
├── popup.html          # Popup window HTML
├── popup.js            # Popup controller
├── popup.css           # Popup styles
├── options.html        # Settings page HTML
├── options.js          # Settings controller
├── options.css         # Settings page styles
├── icons/              # Extension icons (16, 48, 128px)
└── README.md           # This file
```

## Monetization

- **Free Trial:** 14-day full access to all features
- **After Trial:** Plain text transcript remains free; Markdown export and AI summaries require Pro
- **Pro Pricing:** $49 lifetime (one-time payment)

## Contact

- Email: hello@agentmatik.ai
- Website: [agentmatik.ai](https://agentmatik.ai)

## Versioning

This project follows [Semantic Versioning](https://semver.org/):
- **MAJOR** (X.0.0): Breaking changes or major feature overhauls
- **MINOR** (1.X.0): New features, backward-compatible
- **PATCH** (1.0.X): Bug fixes, minor improvements

### Changelog

#### v1.0.0 (2026-04-07)
- Initial release
- Dual UI: inline YouTube panel + popup window
- Markdown export with YAML frontmatter
- Multi-AI provider support (Gemini, ChatGPT, Claude)
- Multi-language transcript extraction
- 14-day free trial with feature-based gating
- Settings page with provider configuration
- Search, copy, download functionality
- Keyboard shortcut (Ctrl+Shift+Y)
