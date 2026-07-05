# Kickoff prompt - TubeMD

Paste this into a fresh Claude Code session started **inside**
`apps/chrome-extensions/tubemd/`.

---

You are helping me take **TubeMD** (a Chrome extension I built) from prototype to a polished, monetizable product on the Chrome Web Store. This is my own original code - a fresh reimplementation, not a clone (we built the transcript extraction from scratch on the YouTube transcript / Innertube API approach after studying how existing tools work).

**What it does:** adds a button to YouTube that extracts a video's transcript and converts it to clean Markdown. Manifest V3. It has an options page and declares host permissions for `generativelanguage.googleapis.com`, `api.openai.com` and `api.anthropic.com` - so there's an AI-cleanup/summarize path that uses a user-supplied API key.

**Context you have locally:**
- `src/` - the v1.0.0 build. Read `src/README.md`, then `src/manifest.json`, `src/content.js` (the extraction logic, ~40KB - the core), `src/background.js`, `src/options.js`/`options.html` (API key handling), `src/popup.js`.
- `manus-export/transcript.md` - full build history (553 messages), including the research into how YouTube transcript extraction actually works (Innertube API, key extraction from page HTML) and clone-feasibility analysis.
- No GitHub repo yet - I want to create `agentmatik/tubemd` (private first).

**Start by:**
1. Reading `src/content.js` + the transcript's technical sections so you understand the extraction method and where it's brittle (YouTube DOM/Innertube changes break these extensions constantly - identify that risk).
2. Loading it unpacked and giving me a QA report: does extraction work across normal videos, no-caption videos, auto-generated captions, non-English, Shorts? How is the API key stored and is that Web-Store-review-safe?
3. Proposing a prioritized roadmap to **Chrome Web Store acceptance**: permission justification (`activeTab`/`scripting`/`storage` is a clean, minimal set - good), the AI host permissions will need clear justification + privacy policy since users paste API keys, MV3 compliance, and store listing assets.
4. Recommending the monetization model - free core + paid AI features is the obvious freemium split; validate that.

**End goal:** a `agentmatik/tubemd` repo, store acceptance, a landing page on agentmatik.ai, and a working paid tier. Don't change code until we've agreed the roadmap. Keep all copy em-dash-free (plain hyphens only).
