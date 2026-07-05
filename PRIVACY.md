# Privacy Policy - TubeMD

**Last updated:** 2026-07-06

TubeMD is a Chrome extension that turns YouTube transcripts into clean Markdown
and can optionally generate AI summaries. This document explains exactly what
data the extension touches, where it goes, and what it never does.

**Short version:** TubeMD has no backend. Everything runs in your browser. Your
API keys are stored only on your device and are sent only to the AI provider you
choose. Agentmatik operates no server that receives your keys, your transcripts,
or your browsing activity.

## What the extension stores, and where

All storage is local to your browser. Nothing is uploaded to Agentmatik.

| Data | Where it is stored | Why |
|------|--------------------|-----|
| Your AI provider API key(s) | `chrome.storage.local` (this device only) | Needed to call the AI provider you pick for summaries. |
| Selected provider and default format | `chrome.storage.local` | Your preferences. |
| Trial start date, usage count | `chrome.storage.local` | Drives the local trial counter. |

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
are to the three provider hosts above and to `youtube.com` for transcript data.

## Transcript and video data

- Transcripts and video metadata are read from the YouTube page you are viewing,
  using YouTube's own transcript data, and are processed **locally** in your
  browser to produce Markdown or plain text.
- Transcript text is sent to a third-party AI provider **only** when you
  explicitly trigger "Generate Summary" or "Generate Skill". At that point the
  transcript is included in the request to the provider you selected, under your
  own API key and that provider's privacy policy and data-retention terms.
- If you never use the AI features, no transcript ever leaves your browser.

## Host permissions and why each is needed

The extension requests these host permissions in `manifest.json`:

| Host | Purpose |
|------|---------|
| `https://www.youtube.com/*` | Read the transcript and video metadata from the page you are on. |
| `https://generativelanguage.googleapis.com/*` | Send transcripts to Google Gemini for a summary, only if you choose Gemini. |
| `https://api.openai.com/*` | Send transcripts to OpenAI, only if you choose OpenAI. |
| `https://api.anthropic.com/*` | Send transcripts to Anthropic Claude, only if you choose Claude. |

The three AI-provider hosts are only ever contacted when you actively request an
AI summary or skill with a key configured for that provider.

## What TubeMD does not do

- No account, no login, no sign-up.
- No analytics, tracking pixels, or third-party trackers.
- No selling or sharing of any data.
- No server operated by Agentmatik receives your keys, transcripts, or activity.

## Data deletion

Remove all stored data at any time by removing the extension, or by clearing the
extension's storage from `chrome://extensions`. There is nothing stored off your
device for us to delete.

## Contact

Questions about privacy: **hello@agentmatik.ai**
