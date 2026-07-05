# TubeMD — Project Migration & Continuation Prompt

**To the user:** When you start your new Manus session, upload the `tubemd-migration.zip` file and paste the prompt below.

---

## Copy and paste this prompt into your new Manus session:

```markdown
I am migrating an ongoing project from a previous Manus session. I have attached a zip file containing the complete source code, research, and test files for a Chrome extension called "TubeMD" (v1.0.0).

Please unzip the attached `tubemd-migration.zip` file into your workspace and review the `TubeMD_V2_Delivery_Report.md` to understand the current state of the project.

**Project Context:**
TubeMD is a Chrome extension that extracts YouTube video transcripts and converts them into AI-optimized Markdown files, plain text, AI summaries, and SKILL.md files for coding agents (Manus and Claude Code). It features a dual UI (inline YouTube panel + popup window), multi-AI provider support, and a 14-day free trial with feature gating.

**Current Status:**
Version 1.0.0 is fully functional and passes all 141 automated tests. The core transcript extraction logic uses a dual-format parser (srv3 and classic XML) and multiple fallback methods (page HTML, InnerTube ANDROID client, InnerTube WEB client) to bypass YouTube's bot protections.

**Next Steps (v1.1.0 Sprint):**
Please review the codebase and then help me implement the following features for the v1.1.0 release:
1. **Gumroad License Key Validation:** Implement the monetization logic. Users will buy a license on Gumroad. The extension needs a way to input this license key in the settings and validate it against the Gumroad API to unlock PRO features after the 14-day trial.
2. **Obsidian Integration:** Add a feature to save the extracted Markdown transcript directly to an Obsidian vault using Obsidian's URI scheme (`obsidian://new?vault=...`).
3. **Notion Integration:** Add a feature to save the transcript as a child page in Notion via the Notion API.
4. **Chrome Web Store Listing:** Help me draft the final SEO-optimized description and prepare the assets for publishing to the Chrome Web Store, using the research in `research/seo_analysis.md`.

Please start by unzipping the file, reviewing the architecture in `extension/content.js` and `extension/background.js`, and then let me know your plan for tackling the Gumroad integration first.
```
