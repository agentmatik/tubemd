// TubeMD - Background Service Worker
// Handles: AI summarization, skill generation, settings storage, keyboard
// shortcut, and server-validated licensing (checkout + validate + daily
// re-check). The service worker is the ONLY context that talks to the licensing
// API, because a content-script fetch would be blocked by YouTube's CSP.
// Version: 1.1.0

// Shared licensing module (single source of truth for the API contract, key
// format, and the Pro gate). Exposes globalThis.TMLicense.
importScripts('license.js');

// Network safety: bound every provider request so a hung connection surfaces
// as an error instead of leaving the UI spinning forever.
const AI_FETCH_TIMEOUT_MS = 60000;
async function fetchWithTimeout(resource, options = {}, timeoutMs = AI_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(resource, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Check your connection and try again.');
    }
    throw new Error('Network error reaching the AI provider. Check your connection.');
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================
// KEYBOARD SHORTCUT - Toggle inline panel on YouTube pages
// ============================================================
chrome.commands?.onCommand?.addListener((command) => {
  if (command === 'toggle-panel') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.url?.includes('youtube.com/watch') || tab?.url?.includes('youtube.com/shorts/')) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => document.dispatchEvent(new CustomEvent('yt-to-text-toggle'))
        });
      }
    });
  }
});

// ============================================================
// MESSAGE HANDLER
// ============================================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'summarize':
      handleSummarize(request)
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case 'generateSkill':
      handleGenerateSkill(request)
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case 'getSettings':
      getSettings().then(sendResponse);
      return true;

    case 'saveSettings':
      saveSettings(request.settings).then(() => sendResponse({ success: true }));
      return true;

    case 'getApiKey':
      getSettings().then(s => {
        const provider = s.aiProvider || 'gemini';
        sendResponse({ apiKey: s.apiKeys?.[provider] || '' });
      });
      return true;

    case 'saveApiKey':
      getSettings().then(s => {
        if (!s.apiKeys) s.apiKeys = {};
        s.apiKeys[s.aiProvider || 'gemini'] = request.apiKey;
        saveSettings(s).then(() => sendResponse({ success: true }));
      });
      return true;

    // --- Licensing (popup + options + inline panel all route through here) ---
    case 'startCheckout':
      handleCheckout()
        .then(data => sendResponse(data))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case 'validateLicense':
      handleValidate(request.key)
        .then(data => sendResponse(data))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case 'getLicenseState':
      TMLicense.getLicenseState().then(state => sendResponse({ success: true, state }));
      return true;

    case 'removeLicense':
      TMLicense.clearLicense().then(() => sendResponse({ success: true }));
      return true;

    case 'revalidateLicense':
      handleRevalidate()
        .then(data => sendResponse(data))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
  }
});

// ============================================================
// LICENSING
// ============================================================
// Open a Stripe-hosted checkout. Fetch the URL server-side, then open the tab
// from here (content scripts have no tabs access; opening from the worker keeps
// one code path for popup, options, and the inline panel).
async function handleCheckout() {
  const url = await TMLicense.requestCheckoutUrl();
  await chrome.tabs.create({ url });
  return { success: true, url };
}

// Activate a pasted key. Format-check locally first (no wasted round-trip on an
// obvious typo), then validate against the Worker.
async function handleValidate(rawKey) {
  const key = TMLicense.normalizeKey(rawKey);
  if (!TMLicense.isValidKeyFormat(key)) {
    return { success: false, error: 'That does not look like a TubeMD key. The format is TM-XXXX-XXXX-XXXX.' };
  }

  const data = await TMLicense.requestValidate(key);

  if (data.valid === true && data.product === TMLicense.PRODUCT) {
    await TMLicense.setValidated(key, data.plan);
    return { success: true, valid: true, plan: data.plan || 'pro' };
  }

  // Explicitly rejected, or valid for a different product: do not grant Pro.
  const reason = data.reason || (data.product && data.product !== TMLicense.PRODUCT ? 'wrong_product' : 'invalid');
  await TMLicense.setInvalid(key, reason);
  return { success: true, valid: false, reason };
}

// Periodic + startup re-check of the stored key.
// fail-CLOSED only on an explicit valid:false with reason revoked/expired.
// On a network error (or any ambiguous response) KEEP the last-known Pro state,
// so a paying user is never locked out while offline or during a backend blip.
async function handleRevalidate() {
  const state = await TMLicense.getLicenseState();
  if (!state.licenseKey) return { success: true, skipped: 'no-key' };

  let data;
  try {
    data = await TMLicense.requestValidate(state.licenseKey);
  } catch (err) {
    // Network/timeout: keep last-known state.
    return { success: false, error: err.message, kept: true };
  }

  if (data.valid === false && (data.reason === 'revoked' || data.reason === 'expired')) {
    await TMLicense.setInvalid(state.licenseKey, data.reason);
    return { success: true, valid: false, reason: data.reason };
  }

  if (data.valid === true && data.product === TMLicense.PRODUCT) {
    await TMLicense.setValidated(state.licenseKey, data.plan || state.licensePlan);
    return { success: true, valid: true };
  }

  // Anything else (ok:false, valid:false with a soft reason, malformed): keep
  // the last-known state rather than risk locking out a paying user.
  return { success: true, kept: true };
}

// Re-validate on install, browser startup, and once a day via an alarm
// (alarms survive service-worker termination; setInterval would not).
const LICENSE_ALARM = 'tubemd-license-revalidate';

function ensureLicenseAlarm() {
  chrome.alarms.create(LICENSE_ALARM, { periodInMinutes: 1440 });
}

chrome.runtime.onInstalled.addListener(() => {
  ensureLicenseAlarm();
  handleRevalidate().catch(() => { /* keep last-known state */ });
});

chrome.runtime.onStartup.addListener(() => {
  ensureLicenseAlarm();
  handleRevalidate().catch(() => { /* keep last-known state */ });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === LICENSE_ALARM) {
    handleRevalidate().catch(() => { /* keep last-known state */ });
  }
});

// ============================================================
// SETTINGS MANAGEMENT
// ============================================================
const DEFAULT_SETTINGS = {
  aiProvider: 'gemini',
  apiKeys: { gemini: '', openai: '', claude: '' },
  defaultFormat: 'markdown',
  theme: 'light'
};

// Settings (including user API keys) live in chrome.storage.local, NOT sync.
// storage.sync would upload the keys to the user's Google account and across
// their devices; keeping them local means the key never leaves this machine.
// Keep this in sync with options.js, which reads/writes the same key.
async function getSettings() {
  return new Promise(resolve => {
    chrome.storage.local.get(['tubeMdSettings'], (result) => {
      resolve({ ...DEFAULT_SETTINGS, ...(result.tubeMdSettings || {}) });
    });
  });
}

async function saveSettings(settings) {
  return new Promise(resolve => {
    chrome.storage.local.set({ tubeMdSettings: settings }, resolve);
  });
}

// ============================================================
// AI SUMMARIZATION - Multi-provider
// ============================================================
async function handleSummarize(request) {
  const { text, provider, apiKey } = request;

  if (!apiKey) {
    throw new Error(`No API key provided. Please configure your ${provider} API key in Settings.`);
  }

  const truncatedText = text.substring(0, 30000);

  const systemPrompt = `You are a helpful assistant that summarizes YouTube video transcripts. Provide:
1. A concise **Summary** (2-3 paragraphs) of the main content.
2. **Key Points** (5-8 bullet points) highlighting the most important takeaways.
3. **Topics Covered** - a brief list of main topics discussed.`;

  return await callAI(provider, apiKey, systemPrompt, `Here is the transcript:\n\n${truncatedText}`);
}

// ============================================================
// SKILL GENERATION - Manus & Claude Code formats
// ============================================================
async function handleGenerateSkill(request) {
  const { text, provider, apiKey, skillFormat, videoTitle, videoUrl } = request;

  if (!apiKey) {
    throw new Error(`No API key provided. Please configure your ${provider} API key in Settings.`);
  }

  const truncatedText = text.substring(0, 30000);

  let systemPrompt;

  if (skillFormat === 'manus') {
    systemPrompt = `You are an expert at creating Manus AI agent skills from educational content.

Your task: Extract the procedural knowledge from this YouTube video transcript and structure it as a Manus SKILL.md file.

STRICT FORMAT REQUIREMENTS:
1. Start with YAML frontmatter between --- markers containing ONLY:
   - name: lowercase-hyphenated skill name derived from the video topic
   - description: 1-2 sentences describing what the skill does AND when to use it (this is the trigger mechanism)

2. After frontmatter, write the skill body in Markdown using these principles:
   - Use imperative/infinitive form ("Extract data", "Configure the API", NOT "You should extract")
   - Be concise and token-efficient - challenge each piece: "Does this justify its token cost?"
   - Prefer concise examples over verbose explanations
   - Structure as actionable steps/workflows, not a summary
   - Include code examples if the video covers coding (use fenced code blocks)
   - Keep under 500 lines total
   - Use headers (##) to organize major sections
   - Focus on PROCEDURAL knowledge (how to do things), not declarative facts

3. Do NOT include: README-style content, changelogs, author credits, or meta-commentary

EXAMPLE STRUCTURE:
---
name: skill-name-here
description: Brief description of what this skill does. Use when [trigger condition].
---

## Overview
One paragraph explaining the skill's purpose.

## Steps
### Step 1: [Action]
Instructions...

### Step 2: [Action]
Instructions...

## Key Patterns
- Pattern 1: explanation
- Pattern 2: explanation

## Common Pitfalls
- Pitfall and how to avoid it

Now generate the SKILL.md from this transcript. Output ONLY the SKILL.md content, nothing else.`;

  } else {
    // Claude Code format
    systemPrompt = `You are an expert at creating Claude Code skills from educational content.

Your task: Extract the procedural knowledge from this YouTube video transcript and structure it as a Claude Code SKILL.md file.

STRICT FORMAT REQUIREMENTS:
1. Start with YAML frontmatter between --- markers containing:
   - name: lowercase-hyphenated skill name (becomes the /slash-command)
   - description: 1-2 sentences describing what the skill does and when to use it
   - invocation: "user" (since this is a knowledge skill the user explicitly invokes)

2. After frontmatter, write the skill body in Markdown:
   - Structure as clear, actionable instructions Claude Code can follow
   - Use imperative form ("Run the command", "Create the file")
   - Include code examples in fenced code blocks with language tags
   - Use headers (##) to organize major sections
   - Focus on PROCEDURAL knowledge - step-by-step workflows
   - Include validation steps where appropriate ("Verify by running...")
   - Keep concise but comprehensive
   - Reference tools Claude Code has: Read, Write, Edit, Bash, Search, etc.

3. String substitutions you can use in instructions:
   - {{cwd}} - current working directory
   - {{os}} - operating system
   - {{shell}} - user's shell
   - {{arguments}} - user-provided arguments

4. Do NOT include: README content, changelogs, author credits, or meta-commentary

EXAMPLE STRUCTURE:
---
name: skill-name-here
description: Brief description. Use when [trigger condition].
invocation: user
---

## Overview
One paragraph explaining what this skill helps accomplish.

## Prerequisites
- Required tools/packages
- Environment setup

## Workflow
### Step 1: [Action]
Instructions with code examples:
\`\`\`bash
command example
\`\`\`

### Step 2: [Action]
More instructions...

## Validation
How to verify the result is correct.

## Common Issues
- Issue and resolution

Now generate the SKILL.md from this transcript. Output ONLY the SKILL.md content, nothing else.`;
  }

  const userMessage = `Video: "${videoTitle || 'Unknown'}"
URL: ${videoUrl || 'N/A'}

Transcript:
${truncatedText}`;

  return await callAI(provider, apiKey, systemPrompt, userMessage);
}

// ============================================================
// UNIFIED AI CALLER
// ============================================================
async function callAI(provider, apiKey, systemPrompt, userMessage) {
  switch (provider) {
    case 'gemini':
      return await callGemini(apiKey, systemPrompt, userMessage);
    case 'openai':
      return await callOpenAI(apiKey, systemPrompt, userMessage);
    case 'claude':
      return await callClaude(apiKey, systemPrompt, userMessage);
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

// --- Gemini ---
async function callGemini(apiKey, systemPrompt, userMessage) {
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${systemPrompt}\n\n${userMessage}` }]
        }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4096 }
      })
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const result = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!result) throw new Error('Gemini returned no content.');
  return result;
}

// --- OpenAI (ChatGPT) ---
async function callOpenAI(apiKey, systemPrompt, userMessage) {
  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.3,
      max_tokens: 4096
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const result = data.choices?.[0]?.message?.content;
  if (!result) throw new Error('OpenAI returned no content.');
  return result;
}

// --- Anthropic (Claude) ---
async function callClaude(apiKey, systemPrompt, userMessage) {
  const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userMessage }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const result = data.content?.[0]?.text;
  if (!result) throw new Error('Claude returned no content.');
  return result;
}
