# Changelog

All notable changes to TubeMD are documented here. This project follows
[Semantic Versioning](https://semver.org/) and the format of
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.1.0] - 2026-07-06 - Server-validated licensing + Stripe checkout

### Added

- **Server-validated Pro licensing** replacing the client-only 14-day trial:
  shared `src/license.js` module (`TMLicense`) is the single Pro gate for
  popup, options, AND the inline panel - closing the historical gap where the
  panel was ungated. Keys (`TM-XXXX-XXXX-XXXX`) validate against the Agentmatik
  Licensing API with daily re-checks via `chrome.alarms` (network failures keep
  last-known state; only explicit revoked/expired downgrades).
- **Stripe checkout**: "Get Pro - $49 lifetime" in options, popup banner, and
  panel upgrade prompts route through the background worker (`startCheckout`),
  which opens a Stripe-hosted checkout tab (https-only URL guard).
- **Free tier is now honest and useful**: plain-text transcript view, copy,
  and .txt download everywhere; Markdown/AI/skill are Pro.
- Production scaffolding: GitHub Actions CI (syntax + manifest), issue/PR
  templates, SECURITY.md, CODEOWNERS, STORE.md dossier.

### Changed

- **License: MIT -> proprietary** (commercial freemium product).
- Options license section rebuilt: key activation, purchase, remove-license,
  revocation/expiry reasons; fully static innerHTML + textContent rendering.
- `manifest.json` 1.1.0: adds `alarms` permission + licensing host;
  `license.js` loads before `content.js`; popup/options load it via script tag.
- PRIVACY.md: discloses the licensing API call (the only Agentmatik-bound
  data) and purchase-email retention; README Free-vs-Pro section.

### Removed

- Trial-period logic (`trialStart`, popup trial banner countdown,
  `incrementUsageCount`) and the dead `https://agentmatik.ai/tubemd-pro` links.


## [Unreleased]

### Security
- API keys and settings now persist in `chrome.storage.local` (device only)
  instead of `chrome.storage.sync`, so keys are never uploaded to the user's
  Google account or synced across devices.
- AI-provider responses are HTML-escaped before being rendered as Markdown in
  the popup and inline panel, closing a DOM-injection vector on untrusted
  provider output.
- The Gemini API key is URL-encoded when placed in the request URL.

### Added
- Support for YouTube Shorts and embed URLs: `getVideoId` parses `/shorts/` and
  `/embed/` paths, `youtube.com/shorts/*` is added to the content-script matches,
  and the popup and keyboard shortcut recognize Shorts pages.
- Network timeouts on all requests: transcript fetches (20s) and AI provider
  calls (60s) now abort with a clear error instead of hanging.
- `LICENSE` (MIT), `PRIVACY.md`, `CONTRIBUTING.md`, and this changelog.

### Fixed
- Bounded the inline-panel injection retry loop (previously an unbounded
  `setTimeout` recursion when no secondary column was present).
- Reused a single `MutationObserver` instead of leaking a new one on every SPA
  re-injection.
- Malformed caption XML now falls back to the regex parser (DOMParser embeds a
  `<parsererror>` rather than throwing, which was previously undetected).
- `escapeYaml` now escapes backslashes and is null-safe.

### Changed
- Production console output in `content.js` is gated behind a `DEBUG` flag.
- Human-facing copy and AI prompt strings use plain hyphens (no em-dashes).
- License intent set to MIT (was previously described as proprietary in the
  README).

## [1.0.0] - 2026-04-07

### Added
- Initial prototype (built in Manus).
- Dual UI: inline YouTube panel and toolbar popup.
- Markdown export with YAML frontmatter, plus plain-text export.
- Multi-provider AI summaries (Google Gemini, OpenAI, Anthropic Claude) using a
  user-supplied API key.
- Multi-language transcript extraction via YouTube InnerTube / page data.
- SKILL.md generation (Claude Code and Manus formats).
- In-transcript search, click-to-seek, copy, and download.
- 14-day trial scaffold with feature gating.
- Keyboard shortcut (Ctrl+Shift+Y / Cmd+Shift+Y).
