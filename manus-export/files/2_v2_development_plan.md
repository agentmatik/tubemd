# YouTube to Markdown Extension (V2) - Development Plan

Based on your detailed requirements and my research into Defuddle Clip, ExtensionPay, and the current codebase, here is the comprehensive development plan for the V2 extension.

## 1. Extension Naming & Branding
Based on SEO research for YouTube transcript and markdown tools, the current market lacks a tool specifically branded for Markdown extraction. 

**Recommended Name:** `TubeMD - YouTube to Markdown Transcript`
*Alternative:* `ClipScript MD - YouTube Transcript to Markdown`

**App Icon:** I will implement the provided 3D red play button with the dark CC badge as the official extension icon across all sizes (16x16, 48x48, 128x128).

## 2. Architecture & UI Paradigm Shift
Currently, the extension injects a panel directly into the YouTube page. To match the Defuddle Clip experience, we will shift to a **Popup UI** architecture:
- Clicking the extension icon will open a clean, standalone popup window.
- The popup will communicate with the content script (which remains on the YouTube page to extract the transcript using the user's cookies).
- This provides a cleaner, less intrusive experience that works consistently regardless of YouTube's layout changes.

## 3. Feature Implementation Plan

### Feature 1: Languages
- **Implementation:** The current extraction logic already fetches all available caption tracks. We will expose these in a clean dropdown menu in the popup UI, matching the 20+ languages supported by the original extension.

### Feature 2: Format & Markdown Frontmatter
- **Implementation:** We will generate a rich Markdown file that includes YAML frontmatter, optimized for AI agent ingestion.
- **Metadata Extraction:** We will extract the video title, author, publish date, and description directly from YouTube's `ytInitialPlayerResponse` object in the page source.
- **Output:** The output will perfectly match your requested format:
  ```markdown
  ---
  title: "[Video Title]"
  author: "[Channel Name]"
  site: "YouTube"
  domain: "youtube.com"
  url: "[Video URL]"
  published: "[Publish Date]"
  description: "[Video Description]"
  ---
  
  ![](https://www.youtube.com/watch?v=[ID])
  
  [Transcript Content...]
  ```

### Feature 3: Integrations for AI Summaries
- **Implementation:** We will expand the settings to allow users to choose their preferred AI provider.
- **Providers:** 
  - Google Gemini (Current)
  - OpenAI ChatGPT (New)
  - Anthropic Claude (New)
- Users will be able to input their API key for their chosen provider in the settings panel.

### Feature 4: Plugin Settings & Sync Destinations
- **Implementation:** We will build a dedicated Options page (accessible via the gear icon in the popup).
- **Settings will include:**
  - AI Provider selection and API keys.
  - Default export format (Markdown vs Text).
  - Contact support link (`hello@agentmatik.ai`).
- *Note on Defuddle Sync:* Implementing direct sync to Obsidian, Notion, and GitHub requires OAuth flows and specific API integrations. For V2, we will focus on the core Markdown generation and AI summaries. If direct API sync to Notion/GitHub is a hard requirement for this phase, please let me know, as it adds significant complexity.

### Feature 5: Monetization Logic
- **Gateway Recommendation:** **ExtensionPay** is the absolute best practice for Chrome extensions. It is built specifically for extensions, uses Stripe under the hood, requires no backend server, and handles user authentication automatically.
- **Pricing Strategy:**
  - Free Tier: 10 free transcriptions.
  - Lifetime Pro: $49.00 (One-time payment).
- **Implementation:** We will integrate the open-source `ExtPay.js` library. After 10 uses, the "GET TRANSCRIPTION" button will trigger the ExtensionPay Stripe checkout popup.

### Feature 6: Versioning & Contact
- **Implementation:** We will update `manifest.json` to version `2.0.0`.
- A prominent "Contact Support" link will be added to the bottom of the popup and the settings page, directing users to `mailto:hello@agentmatik.ai`.

## 4. Execution Steps

If you approve this plan, I will execute the following steps:
1. **Restructure:** Move UI logic from `content.js` to a new `popup.html` and `popup.js`.
2. **Metadata:** Update `content.js` to extract full video metadata for the Markdown frontmatter.
3. **AI Providers:** Update `background.js` to support OpenAI and Anthropic APIs alongside Gemini.
4. **Monetization:** Integrate `ExtPay.js` and implement the 10-use free tier logic.
5. **Styling:** Apply a clean, Defuddle-inspired minimalist design to the popup.
6. **Packaging:** Generate the new icons and package the V2 extension for testing.

Please review this plan. Let me know which name you prefer, and if you approve, I will begin coding immediately!
