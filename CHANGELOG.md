# Changelog

All notable changes to TubeMD are documented here. This project follows
[Semantic Versioning](https://semver.org/) and the format of
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
