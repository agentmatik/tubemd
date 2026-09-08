# Chrome Web Store Submission Dossier - TubeMD

Internal document: listing content + reviewer-facing justifications. TubeMD is
free and open source (MIT). There is nothing to buy, inside or outside the
extension.

## Listing

- **Name:** TubeMD - YouTube transcripts to Markdown
- **Summary (132 chars max, 93 used):** Turn any YouTube video into
  agent-ready Markdown and skills - in your browser, with your keys
- **Category:** Productivity (Workflow & Planning)
- **Price:** Free
- **Description (draft):**

  Turn any YouTube video's transcript into clean, agent-ready Markdown.
  TubeMD adds a panel right on the watch page (plus a toolbar popup): extract
  the transcript in any available caption language, search inside it, click a
  timestamp to seek, and copy or download the result as Markdown with YAML
  frontmatter (title, author, URL, date, duration, language) or as plain text.

  Optional, with your own API key: AI summaries via Google Gemini, OpenAI, or
  Anthropic Claude, and SKILL.md generation that turns a how-to video into a
  Claude Code or Manus skill file.

  Everything is free. No backend, no telemetry, no account. Your API keys stay
  on your device and are sent only to the provider you choose, only when you
  click Generate. Open source under the MIT license:
  https://github.com/agentmatik/tubemd

- **Privacy policy URL:** https://agentmatik.ai/tubemd/privacy (to be
  published as a mirror of [PRIVACY.md](PRIVACY.md); the GitHub URL of
  PRIVACY.md is an acceptable fallback).
- **Homepage URL:** https://github.com/agentmatik/tubemd
- **Screenshots:** 1280x800 - inline panel with a loaded transcript, popup with
  the Markdown view, popup with a generated SKILL.md, options page with provider
  config.
- **Promo tile:** 440x280, Agentmatik Product Pass brand.

## Permission justifications (paste into the review form)

| Permission | Justification |
|---|---|
| `activeTab` | Read the current YouTube tab when the user clicks the extension. |
| `storage` | Save the user's provider choice, default format, and their own AI API key - locally only (`chrome.storage.local`), never synced or uploaded. |
| `scripting` | Toggle the inline panel via the keyboard shortcut (`Ctrl+Shift+Y`). |
| host `www.youtube.com` | Read the transcript data of the video the user is viewing. |
| host `generativelanguage.googleapis.com` | AI summaries and skills when the user selects Gemini - only on explicit user action, with the user's own key, straight from the browser to Google. |
| host `api.openai.com` | Same, for OpenAI. |
| host `api.anthropic.com` | Same, for Anthropic Claude. |

## Data disclosure (CWS "Privacy practices" form)

- Single purpose: convert the transcript of the YouTube video the user is
  watching into Markdown or plain text, with optional AI summaries and skill
  files generated with the user's own API key.
- Data collected by the developer: none. The extension has no backend and
  makes no call to any Agentmatik host.
- Data sent to third parties: only when the user clicks Generate Summary or
  Generate Skill, the transcript text (and, for skills, the video title and
  URL) plus the user's own API key go directly to the AI provider the user
  selected. Disclosed in PRIVACY.md and in the listing text.
- No remote code, no analytics, no payments, no account.

## Review risk assessment

- The three AI host permissions are the main scrutiny point. Defense: they are
  contacted ONLY when the user explicitly clicks Generate Summary/Skill, with
  the user's own key; documented in PRIVACY.md and the listing.
- Transcript extraction uses YouTube's own data on the page the user is
  watching; no scraping of third-party sites, no DRM circumvention (captions
  are user-accessible content).
- No remote code; all logic ships in the package. The source is public, so a
  reviewer can diff the uploaded ZIP against the tagged release.

## Packaging

The uploaded ZIP is the `src/` folder of a tagged release (`manifest.json` at
the ZIP root). `src/README.md` is a short pointer and may ship or be dropped.

## Pre-submission checklist

- [ ] CI green on the release commit (`node --check` on all `src/*.js`,
      manifest valid JSON, gitleaks clean over full history).
- [ ] `manifest.json` version matches the CHANGELOG entry and the git tag.
- [ ] Manual matrix passed: normal video, auto-captions, non-English, Shorts,
      no-caption video (visible error), live stream.
- [ ] AI path verified with a real key for at least one provider (summary and
      skill).
- [ ] Privacy policy URL live and matching PRIVACY.md.
- [ ] Store copy uses plain hyphens only.
