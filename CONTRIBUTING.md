# Contributing to TubeMD

Thanks for your interest in improving TubeMD. This is a small, dependency-free
Manifest V3 Chrome extension - contributions of all sizes are welcome.

## Getting set up

1. Fork and clone the repository.
2. Load the extension unpacked:
   - Open `chrome://extensions/`
   - Enable **Developer mode** (top right)
   - Click **Load unpacked** and select the `src/` folder
3. Make your changes in `src/`.
4. Reload the extension from `chrome://extensions/` after each change (use the
   reload icon on the TubeMD card), then hard-refresh the YouTube tab.

There is no build step and no `node_modules`. The extension ships the files in
`src/` as-is.

## Project layout

| File | Responsibility |
|------|----------------|
| `src/manifest.json` | MV3 manifest: permissions, content scripts, commands. |
| `src/content.js` | Transcript extraction (InnerTube + page data), inline panel. |
| `src/background.js` | Service worker: AI provider calls, settings storage. |
| `src/popup.{html,js,css}` | Toolbar popup UI. |
| `src/options.{html,js,css}` | Settings page (provider + API keys). |
| `src/content.css` | Inline panel styles. |

## Coding conventions

- **No external runtime dependencies.** Keep it vanilla JS; the extension must
  load with zero build tooling.
- **Never log secrets.** API keys must never be passed to `console.*`, and
  production console output stays behind the `DEBUG` flag in `content.js`.
- **Keys stay local.** Settings and API keys live in `chrome.storage.local`
  (device only), never `chrome.storage.sync`.
- **Keys go only to the chosen provider.** Do not add outbound calls to any host
  other than `youtube.com` and the user's selected AI provider.
- **Escape untrusted content.** Anything rendered via `innerHTML` (AI output,
  transcript text) must be HTML-escaped first.
- **Copy style:** all human-facing text uses a plain hyphen `-`. Never use em-
  dashes or en-dashes.

## Testing your change

Because the extension talks to live YouTube and third-party APIs, test manually:

- A normal video with manual captions.
- A video with auto-generated captions only.
- A non-English video.
- A video with no captions (should show a clear "no captions" message, not fail
  silently).
- A YouTube Short.
- The AI summary path with a real key for at least one provider.

Run a quick syntax check before opening a PR:

```bash
for f in src/*.js; do node --check "$f"; done
```

## Pull requests

- Keep changes focused; one concern per PR.
- Describe what you tested (which video types, which provider).
- Update `CHANGELOG.md` under an `Unreleased` heading.
- Do not bump the `manifest.json` version in a feature PR; releases are cut
  separately.

## Reporting bugs

Open an issue with the video URL (if relevant and public), your browser version,
what you expected, and what happened. For extraction failures, note whether the
video has captions and whether they are manual or auto-generated - YouTube
changes its internal data often, and that context speeds up a fix.
