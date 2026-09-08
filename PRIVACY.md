# Privacy Policy - TubeMD

**Last updated:** 2026-09-09

TubeMD is a free, open-source Chrome extension that turns YouTube transcripts
into Markdown and can optionally generate AI summaries and skill files with an
API key you supply. This document explains exactly what data the extension
touches, where it goes, and what it never does.

**Short version:** TubeMD has no backend and no account system. Everything runs
in your browser. The only network calls it ever makes are to `youtube.com` (to
read the transcript of the video you are watching) and, only when you ask for a
summary or a skill, to the one AI provider you picked, using your own key.
There is no licensing in this extension, so no key, token, or identifier is
ever sent anywhere to unlock anything. Nothing is ever sent to Agentmatik.

## What the extension stores, and where

All storage is local to your browser. Nothing is uploaded anywhere.

| Data | Where it is stored | Why |
|------|--------------------|-----|
| Your AI provider API key(s) | `chrome.storage.local` (this device only) | Needed to call the AI provider you pick for summaries and skills. |
| Selected provider and default format | `chrome.storage.local` | Your preferences. |

We deliberately use `chrome.storage.local` (device-only) rather than
`chrome.storage.sync`, so your API keys are never copied to your Google account
or synced across devices.

## Where your API key is sent

Your API key is sent **only** to the API endpoint of the provider you select,
and only when you ask for a summary or a generated skill:

- **Google Gemini** - `https://generativelanguage.googleapis.com`
- **OpenAI** - `https://api.openai.com`
- **Anthropic (Claude)** - `https://api.anthropic.com`

The key is never sent to Agentmatik, never sent to YouTube, never sent to any
analytics service, and never written to logs. There is no telemetry in this
extension. You can confirm this in the source: the only outbound network calls
are to the three provider hosts above (`src/background.js`) and to
`youtube.com` for transcript data (`src/content.js`).

## Transcript and video data

- Transcripts and video metadata are read from the YouTube page you are
  viewing, using YouTube's own transcript data, and are processed **locally**
  in your browser to produce Markdown or plain text.
- Transcript text is sent to a third-party AI provider **only** when you
  explicitly trigger "Generate Summary" or "Generate Skill". At that point the
  transcript (truncated to its first 30,000 characters) - and, for skills, the
  video title and URL - is included in the request to the provider you
  selected, under your own API key and that provider's privacy policy and
  data-retention terms.
- If you never use the AI features, no transcript ever leaves your browser.

## Host permissions and why each is needed

The extension requests these host permissions in `manifest.json`:

| Host | Purpose |
|------|---------|
| `https://www.youtube.com/*` | Read the transcript and video metadata from the page you are on. |
| `https://generativelanguage.googleapis.com/*` | Send transcripts to Google Gemini for a summary or skill, only if you choose Gemini. |
| `https://api.openai.com/*` | Same, for OpenAI, only if you choose OpenAI. |
| `https://api.anthropic.com/*` | Same, for Anthropic Claude, only if you choose Claude. |

The three AI-provider hosts are only ever contacted when you actively request an
AI summary or skill with a key configured for that provider.

## What TubeMD does not do

- No account, no login, no sign-up, no licensing, no payments.
- No analytics, tracking pixels, or third-party trackers.
- No selling or sharing of any data.
- No Agentmatik server is contacted, ever. There is none for this extension.

## Data deletion

Remove all stored data at any time by removing the extension, or by clearing
the extension's storage from `chrome://extensions`. There is no off-device
record to delete, because the extension never creates one.

## Changes to this policy

Version 2.0.0 (2026-09-09) removed the licensing service that earlier versions
contacted to validate paid Pro licenses; that data flow no longer exists.
Changes to this document are tracked in the repository history.

## Contact

Questions about privacy: **hello@agentmatik.ai**
