# Chrome Web Store Submission Dossier - TubeMD

Internal document: listing content + reviewer-facing justifications.

## Listing

- **Name:** TubeMD - YouTube Transcript to Markdown
- **Summary (132 chars max):** Extract YouTube transcripts as clean Markdown
  with YAML frontmatter. Optional AI summaries with your own API key.
- **Category:** Productivity (Workflow & Planning)
- **Description (draft):**

  Turn any YouTube video's transcript into clean, agent-ready Markdown.
  TubeMD adds a panel right on the watch page (plus a toolbar popup): extract
  the transcript in any available caption language, search inside it, click a
  timestamp to seek, and copy or download the result.

  Free: plain-text transcripts (view, copy, .txt download).
  Pro (one-time purchase, lifetime): Markdown export with YAML frontmatter,
  AI summaries via Google Gemini, OpenAI, or Anthropic Claude using YOUR OWN
  API key, and SKILL.md generation for AI agents.

  No backend, no telemetry, no account. Your API keys stay on your device and
  are sent only to the provider you choose.

- **Privacy policy URL:** https://agentmatik.ai/tubemd/privacy
- **Screenshots:** 1280x800 - inline panel with a loaded transcript, popup
  with Markdown view (Pro), options page with provider config.
- **Promo tile:** 440x280, Agentmatik Product Pass brand.

## Permission justifications (paste into the review form)

| Permission | Justification |
|---|---|
| `activeTab` | Read the current YouTube tab when the user clicks the extension. |
| `storage` | Save provider choice, user API key (local only), license state. |
| `scripting` | Toggle the inline panel via the keyboard shortcut. |
| `alarms` | Daily re-validation of the Pro license (service workers cannot use setInterval). |
| host `www.youtube.com` | Read the transcript data of the video the user is viewing. |
| host `generativelanguage.googleapis.com` | AI summaries when the user selects Gemini - only on explicit user action, with the user's own key. |
| host `api.openai.com` | Same, for OpenAI. |
| host `api.anthropic.com` | Same, for Anthropic Claude. |
| host `licensing.agentmatik.ai` | Start Stripe checkout and validate the license key the user enters. |

## Monetization disclosure

Payments happen OUTSIDE the extension on a Stripe-hosted checkout page opened
in a new tab (compliant with the Web Store's removal of in-extension
payments). The extension only requests a checkout URL and validates the
resulting TM- license key. The only data transmitted to our API is that
license key - no browsing data, no video data, no AI keys.

## Review risk assessment

- The three AI host permissions are the main scrutiny point. Defense: they are
  contacted ONLY when the user explicitly clicks Generate Summary/Skill, with
  the user's own key; documented in PRIVACY.md and the listing.
- Transcript extraction uses YouTube's own data on the page the user is
  watching; no scraping of third-party sites, no DRM circumvention (captions
  are user-accessible content).
- No remote code; all logic ships in the package.

## Pre-submission checklist

- [ ] `node --check` all src JS + manifest valid (CI green).
- [ ] `LICENSING_API` in `src/license.js` points at the deployed Worker; live
      Stripe price active.
- [ ] One real test purchase end-to-end (checkout -> webhook -> /success ->
      activate in options).
- [ ] Manual matrix passed: normal video, auto-captions, non-English, Shorts,
      no-caption video (visible error), live stream.
- [ ] Privacy policy URL live: https://agentmatik.ai/tubemd/privacy
- [ ] Store copy uses plain hyphens only.
