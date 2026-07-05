# TubeMD V2 — Delivery Report

**Version:** 1.0.0  
**Date:** April 7, 2026  
**Test Results:** 141/141 passed

---

## 1. What Was Built

TubeMD is a Chrome extension that extracts YouTube video transcripts and converts them into AI-optimized Markdown files, plain text, AI summaries, and SKILL.md files for coding agents. It features a dual UI (inline YouTube panel + popup window), multi-AI provider support, and a 14-day free trial with feature gating.

### Architecture Overview

| Component | File | Purpose |
|---|---|---|
| Manifest | `manifest.json` | Extension config, permissions, keyboard shortcuts |
| Background | `background.js` | AI provider calls (Gemini, OpenAI, Claude), settings storage, skill generation |
| Content Script | `content.js` | Transcript extraction from YouTube pages, inline panel UI, video metadata |
| Popup | `popup.html/js/css` | Defuddle-inspired popup with Markdown/Text/Summary/Skill tabs |
| Options | `options.html/js/css` | Settings page for AI providers, API keys, contact info |

### Feature Matrix

| Feature | Status | Free/PRO |
|---|---|---|
| Transcript extraction (YouTube captions) | Done | Free |
| Plain text format with timestamps | Done | Free |
| Markdown with YAML frontmatter | Done | PRO (after trial) |
| AI Summary (Gemini, ChatGPT, Claude) | Done | PRO (after trial) |
| SKILL.md generation (Manus format) | Done | PRO (after trial) |
| SKILL.md generation (Claude Code format) | Done | PRO (after trial) |
| Language selection | Done | Free |
| Search within transcript | Done | Free |
| Copy to clipboard | Done | Free |
| Download as file | Done | Free (text) / PRO (md, skill) |
| Inline YouTube panel | Done | Free |
| Popup window (Defuddle-style) | Done | Free |
| 14-day free trial | Done | — |
| Settings page | Done | Free |
| Keyboard shortcut (Ctrl+Shift+Y) | Done | Free |
| Contact support (hello@agentmatik.ai) | Done | Free |

---

## 2. YouTube to Skill — Format Research

### Manus Skill Format

Manus skills are stored in `/home/ubuntu/skills/{name}/SKILL.md`. The format uses YAML frontmatter followed by structured Markdown content. The key fields are:

| Field | Required | Description |
|---|---|---|
| `name` | Yes | Lowercase hyphenated identifier (e.g., `video-editing-workflow`) |
| `description` | Yes | 1-2 sentence summary of what the skill teaches |
| `version` | Yes | Semver version string |
| `author` | No | Original content creator |
| `source` | No | URL of the source video |

The body of a Manus SKILL.md should contain procedural knowledge organized into clear sections with headers, step-by-step instructions, best practices, and common pitfalls. It should be token-efficient (Manus reads the entire file into context) and focus on actionable instructions rather than background theory.

### Claude Code Skill Format

Claude Code skills are stored in `.claude/skills/` or `~/.claude/skills/` and use a different frontmatter structure:

| Field | Required | Description |
|---|---|---|
| `name` | Yes | Human-readable skill name |
| `description` | Yes | Brief description for skill matching |
| `invocation` | Yes | Must be `"user"` (activated when user asks) |
| `version` | No | Semver version string |

Claude Code skills support string substitutions like `{{cwd}}`, `{{os}}`, `{{date}}`, and `{{time}}`. The body should reference Claude Code's available tools (Read, Write, Edit, Bash, Search, Glob, Grep, LS) and provide structured workflows. Claude Code skills are matched by description, so the description field is critical for discoverability.

### Key Differences

| Aspect | Manus | Claude Code |
|---|---|---|
| Location | `/home/ubuntu/skills/{name}/SKILL.md` | `.claude/skills/SKILL.md` |
| Frontmatter | `name`, `description`, `version` | `name`, `description`, `invocation` |
| Invocation | Read by agent when relevant | Matched by description when user asks |
| Substitutions | None | `{{cwd}}`, `{{os}}`, `{{date}}`, `{{time}}` |
| Tool references | General (file, shell, browser, etc.) | Specific (Read, Write, Edit, Bash, etc.) |
| Token budget | Should be concise (read into full context) | Can be longer (loaded on demand) |

### Implementation

The extension uses AI to convert a video transcript into a properly structured SKILL.md. The AI prompt is carefully crafted to:

1. Extract **procedural knowledge** (how-to steps, workflows, best practices) rather than opinions or commentary
2. Structure it with proper YAML frontmatter for the target platform
3. Organize content into clear sections with headers
4. Include common pitfalls and troubleshooting tips
5. Keep it token-efficient for Manus, or tool-aware for Claude Code

Users select their target platform (Manus or Claude Code) via radio buttons in the Skill tab, then click "Generate Skill". The resulting SKILL.md can be copied or downloaded.

---

## 3. SEO Analysis & Extension Naming

### Competitive Landscape

The Chrome Web Store has approximately 15-20 YouTube transcript extensions. The dominant keywords are "youtube to text", "youtube transcript", and "youtube summary". However, **"markdown" is almost completely unused** in extension names — only one competitor mentions it, and none target the AI agent/skill use case.

### Keyword Opportunity Matrix

| Keyword | Search Volume | Competition | Our Position |
|---|---|---|---|
| youtube to text | Very High | High (5+ extensions) | Secondary keyword |
| youtube transcript | Very High | High (8+ extensions) | In description |
| youtube to markdown | Medium (growing) | Very Low (1 extension) | **Primary differentiator** |
| youtube AI summary | Medium | Medium (4+ extensions) | In description |
| youtube skill file | Zero | Zero | **Unique to us** |
| youtube AI agent knowledge | Zero | Zero | **Unique to us** |
| youtube obsidian markdown | Low | Low (2 extensions) | Future feature |

### Recommended Name

> **TubeMD — YouTube Transcript to Markdown & AI Skills**

This name scores highest because "TubeMD" is short, brandable, and contains "MD" (universally recognized as Markdown). The subtitle hits the top three keywords (YouTube, Transcript, Markdown) while "AI Skills" is a unique differentiator that no competitor has claimed.

### Chrome Web Store Description (SEO-Optimized)

The description should lead with the primary value proposition and include all target keywords naturally:

> TubeMD converts any YouTube video into a clean Markdown transcript with YAML frontmatter — optimized for AI agents, Obsidian, and knowledge bases. Extract transcripts, generate AI summaries with ChatGPT/Claude/Gemini, and create SKILL.md files for Claude Code and Manus. Download as Markdown (.md) or plain text. Free 14-day trial.

---

## 4. Monetization Strategy

### Trial Design (Implemented)

The extension uses a **14-day time-based free trial** rather than a usage-count limit. This approach is friendlier and lets users develop habits around the premium features before the paywall appears.

| Tier | What's Included | Gating |
|---|---|---|
| Free (always) | Text transcript, copy, search, language selection | Never gated |
| Trial (14 days) | Full access to Markdown, AI Summary, Skill generation | Time-limited |
| PRO (paid) | Everything in Trial, permanently | After trial expires |

### Recommended Pricing

| Plan | Price | Rationale |
|---|---|---|
| Lifetime | $49 | Impulse-buy price point, half of competitor's $99 |
| Yearly | $1.99/month ($23.88/year) | Low enough to convert hesitant users |
| Monthly | $4.99/month | Standard for Chrome extensions |

### Payment Gateway Options (Fastest to Implement)

| Gateway | Setup Time | Complexity | Notes |
|---|---|---|---|
| **Gumroad** | 30 minutes | Very Low | Create a product page, redirect users there. Verify purchase via license key stored in extension. No Stripe account needed. |
| **LemonSqueezy** | 1 hour | Low | Similar to Gumroad but with better API. Has a Chrome extension license key validation API. |
| **ExtensionPay** | 2-3 hours | Medium | Built specifically for Chrome extensions. Requires Stripe account. Handles everything automatically. |
| **Stripe Payment Links** | 1 hour | Low | Create payment links in Stripe dashboard, redirect users. Need webhook for license validation. |

**Recommendation for immediate launch:** Use **Gumroad** — create a product page at `agentmatik.ai/tubemd-pro` that redirects to Gumroad. Users pay, receive a license key, enter it in the extension settings. This requires zero backend code and can be set up in 30 minutes. Migrate to ExtensionPay later when your Stripe account is ready.

---

## 5. Development Roadmap

### v1.0.0 (Current Release)
- [x] Dual UI (inline panel + popup)
- [x] Markdown with YAML frontmatter
- [x] Multi-AI providers (Gemini, ChatGPT, Claude)
- [x] YouTube to Skill (Manus + Claude Code)
- [x] 14-day free trial with feature gating
- [x] Language selection
- [x] Search, copy, download
- [x] Settings page
- [x] Custom icon
- [x] Contact support

### v1.1.0 (Next Sprint)
- [ ] Gumroad license key validation (monetization)
- [ ] Obsidian integration (save to vault via URI scheme)
- [ ] Notion integration (save as child page via API)
- [ ] Chrome Web Store listing with SEO-optimized description
- [ ] Analytics (anonymous usage tracking for conversion optimization)

### v1.2.0 (Future)
- [ ] Batch processing (extract multiple videos from playlist)
- [ ] Custom AI prompts for summary/skill generation
- [ ] Export to PDF
- [ ] GitHub integration (save as issue/file)
- [ ] Webhook support (send to any endpoint)
- [ ] Auto-detect video language and suggest translation

### v2.0.0 (Major)
- [ ] Support for non-YouTube platforms (Vimeo, Twitch, podcasts)
- [ ] Browser-side AI (local LLM for privacy)
- [ ] Team/organization features
- [ ] API access for developers
