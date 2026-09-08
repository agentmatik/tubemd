# Changelog

All notable changes to TubeMD are documented here. This project follows
[Semantic Versioning](https://semver.org/) and the format of
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.0.0] - 2026-09-09 - Free and open source

TubeMD is now free and open source under the MIT license. Every feature is
available to everyone: plain-text export, Markdown with YAML frontmatter, AI
summaries with your own key, and SKILL.md generation. Nothing in the extension
contacts an Agentmatik server any more.

### Changed

- **License: proprietary -> MIT** (copyright 2026 Agentmatik s.r.o.). `LICENSE`
  replaced with the MIT text.
- **Manifest 2.0.0**: name "TubeMD - YouTube transcripts to Markdown", the
  description is the new tagline, the `alarms` permission is dropped (it only
  served the daily license re-check), and `license.js` is no longer loaded.
- **Inline panel copy/download export Markdown again** (as in 1.0.0); the popup
  keeps both the MARKDOWN and TEXT tabs, so plain text is still one click away.
- Docs rewritten for a public audience: README (why it exists, "feed your own
  brain", install, privacy, development), PRIVACY (no licensing data flow; only
  `youtube.com` and the chosen AI provider are ever contacted), STORE (free
  listing, monetization section removed), CONTRIBUTING, SECURITY, PR template;
  `src/README.md` reduced to a pointer.
- Options page: footer links to the GitHub repository and the contact section
  gains a "Report an issue on GitHub" link; the provider description says where
  the key lives.
- UI restyle to the Agentmatik Product Pass design system (merged 2026-07 as
  PR #3, first shipped in this release; previously listed as Unreleased).
  CSS-only - no JS, ids, or message flows touched:
  - Cream `#FBF0E0` canvas, white cards with 2px ink borders (16px radius),
    liquid-orange glass primary buttons and white glass secondary pills/chips
    per the July 2026 glass-system amendments, JetBrains Mono labels/chips,
    warm status colors (`#3F8A56` ok / `#B43A28` error). Applies to the popup
    (`src/popup.css`), options page (`src/options.css`), and the inline
    YouTube panel (`src/content.css` - previously dark navy/pink, now a cream
    branded island that reads on both YouTube themes; the "agentmatik"
    wordmark is added via a CSS `::after` so `content.js` stays untouched).
  - Shared Agentmatik header pattern: product name in the display face with a
    small lowercase "agentmatik" wordmark beneath (popup + options HTML gain a
    wordmark `<span>`; all load-bearing ids/classes unchanged).
  - Typography: brand stacks (`Bricolage Grotesque` display, `Instrument Sans`
    body, `JetBrains Mono` code) with system fallbacks - extensions cannot load
    remote fonts and no font files are bundled.
  - Accessibility: visible `:focus-visible` rings (deep-orange, 2px),
    `prefers-reduced-motion` disables all transforms/animations, tap targets
    32px+, WCAG AA contrast on all text roles.

### Removed

- **Pro licensing, entirely**: `src/license.js` (`TMLicense`), Stripe checkout
  (`startCheckout`), license-key activation/validation and the daily
  re-validation alarm in `background.js`, the options page License section,
  the popup upgrade banner and "PRO" tab badges, and the inline-panel upgrade
  prompts. No `TM-` key, product id, or any other identifier is sent anywhere.

### Added

- `.gitleaks.toml`: extends the default ruleset and allowlists exactly one
  literal - YouTube's public InnerTube web-client key, which `src/content.js`
  uses as an extraction fallback (documented inline; not a secret).
- CI `secrets` job: downloads a pinned gitleaks CLI (8.21.2, checksum
  verified) and scans the full git history on every push and pull request.

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
