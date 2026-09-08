// TubeMD - Content Script
// Runs on YouTube watch pages. Responsibilities:
//   1. Extract transcripts (using page context with user's cookies)
//   2. Inject inline panel into YouTube's secondary column
//   3. Respond to messages from popup.js
//   4. Extract video metadata for Markdown frontmatter
//
// Version: 2.0.0

(function () {
  'use strict';

  if (window.__tubeMdLoaded) return;
  window.__tubeMdLoaded = true;

  // Flip to true when debugging locally. Keeps the console clean in production.
  const DEBUG = false;
  const log = (...args) => { if (DEBUG) console.log('[TubeMD]', ...args); };
  const warn = (...args) => { if (DEBUG) console.warn('[TubeMD]', ...args); };

  // Network safety: never let a single fetch hang the UI forever.
  const FETCH_TIMEOUT_MS = 20000;
  async function fetchWithTimeout(resource, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      return await fetch(resource, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  let currentVideoId = null;
  let transcriptData = null;
  let currentLang = '';
  let panelVisible = true;
  let searchQuery = '';
  let panelObserver = null; // single MutationObserver; guarded against leaks

  // ============================================================
  // MESSAGE HANDLER - Responds to popup.js requests
  // ============================================================
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'getVideoInfo':
        sendResponse(getBasicVideoInfo());
        return false;

      case 'getVideoMeta':
        sendResponse(getFullVideoMeta());
        return false;

      case 'extractTranscript':
        handleExtractTranscript(request.lang)
          .then(data => sendResponse({ success: true, data }))
          .catch(err => sendResponse({ success: false, error: err.message }));
        return true; // async

      case 'seekVideo':
        seekVideo(request.time);
        sendResponse({ success: true });
        return false;
    }
  });

  // ============================================================
  // VIDEO METADATA EXTRACTION
  // ============================================================
  function getPlayerResponse() {
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const text = script.textContent;
      if (!text || text.length < 100) continue;
      const idx = text.indexOf('ytInitialPlayerResponse');
      if (idx === -1) continue;
      const assignMatch = text.substring(idx).match(/ytInitialPlayerResponse\s*=\s*/);
      if (!assignMatch) continue;
      const jsonStart = idx + assignMatch.index + assignMatch[0].length;
      try {
        return extractJsonObject(text, jsonStart);
      } catch (e) { /* continue */ }
    }
    return null;
  }

  function getInitialData() {
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const text = script.textContent;
      if (!text || text.length < 100) continue;
      const idx = text.indexOf('ytInitialData');
      if (idx === -1) continue;
      const assignMatch = text.substring(idx).match(/ytInitialData\s*=\s*/);
      if (!assignMatch) continue;
      const jsonStart = idx + assignMatch.index + assignMatch[0].length;
      try {
        return extractJsonObject(text, jsonStart);
      } catch (e) { /* continue */ }
    }
    return null;
  }

  function getBasicVideoInfo() {
    const pr = getPlayerResponse();
    const vd = pr?.videoDetails;
    return {
      title: vd?.title || getPageTitle(),
      author: vd?.author || getChannelName(),
      url: window.location.href,
      publishDate: getPublishDate(pr),
      videoId: vd?.videoId || getVideoId()
    };
  }

  function getFullVideoMeta() {
    const pr = getPlayerResponse();
    const vd = pr?.videoDetails;
    const md = pr?.microformat?.playerMicroformatRenderer;

    return {
      title: vd?.title || getPageTitle(),
      author: vd?.author || getChannelName(),
      url: window.location.href.split('&')[0], // Clean URL
      publishDate: md?.publishDate || getPublishDate(pr),
      description: vd?.shortDescription || '',
      duration: formatDuration(parseInt(vd?.lengthSeconds || '0', 10)),
      viewCount: vd?.viewCount || '',
      videoId: vd?.videoId || getVideoId(),
      channelId: vd?.channelId || '',
      keywords: vd?.keywords || [],
      thumbnail: vd?.thumbnail?.thumbnails?.slice(-1)?.[0]?.url || '',
      isLive: vd?.isLiveContent || false,
      category: md?.category || ''
    };
  }

  function getPublishDate(pr) {
    const md = pr?.microformat?.playerMicroformatRenderer;
    if (md?.publishDate) return md.publishDate;
    if (md?.uploadDate) return md.uploadDate;
    // Fallback: try page DOM
    const dateEl = document.querySelector('#info-strings yt-formatted-string, #info span.bold');
    return dateEl?.textContent?.trim() || '';
  }

  function getChannelName() {
    const el = document.querySelector('#owner #channel-name a, ytd-video-owner-renderer #channel-name a');
    return el?.textContent?.trim() || '';
  }

  function formatDuration(seconds) {
    if (!seconds) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  }

  // ============================================================
  // TRANSCRIPT EXTRACTION
  // ============================================================
  async function handleExtractTranscript(lang) {
    const videoId = getVideoId();
    if (!videoId) throw new Error('No video detected on this page.');
    currentVideoId = videoId;
    currentLang = lang || '';
    const result = await fetchTranscriptData(videoId, currentLang);
    transcriptData = result;
    return result;
  }

  async function fetchTranscriptData(videoId, lang) {
    const errors = [];

    // Method 1: Extract from page's embedded data
    try {
      const pageResult = getCaptionTracksFromPage();
      if (pageResult) {
        log('Method 1: found captions in page HTML');
        return await buildTranscriptResponse(pageResult, videoId, lang);
      }
    } catch (e) { errors.push(`Page HTML: ${e.message}`); }

    // Method 2: InnerTube ANDROID client
    try {
      const androidResult = await fetchViaInnerTube(videoId, 'ANDROID');
      if (androidResult) {
        log('Method 2: found captions via InnerTube ANDROID');
        return await buildTranscriptResponse(androidResult, videoId, lang);
      }
    } catch (e) { errors.push(`InnerTube ANDROID: ${e.message}`); }

    // Method 3: InnerTube WEB client
    try {
      const webResult = await fetchViaInnerTube(videoId, 'WEB');
      if (webResult) {
        log('Method 3: found captions via InnerTube WEB');
        return await buildTranscriptResponse(webResult, videoId, lang);
      }
    } catch (e) { errors.push(`InnerTube WEB: ${e.message}`); }

    const errorDetail = errors.length > 0 ? `\nDetails: ${errors.join('; ')}` : '';
    throw new Error(`No captions available for this video.${errorDetail}`);
  }

  function getCaptionTracksFromPage() {
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const text = script.textContent;
      if (!text || text.length < 100) continue;
      const idx = text.indexOf('ytInitialPlayerResponse');
      if (idx === -1) continue;
      const assignMatch = text.substring(idx).match(/ytInitialPlayerResponse\s*=\s*/);
      if (!assignMatch) continue;
      const jsonStart = idx + assignMatch.index + assignMatch[0].length;
      try {
        const playerResponse = extractJsonObject(text, jsonStart);
        const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer;
        if (captions?.captionTracks?.length > 0) {
          return {
            captionTracks: captions.captionTracks,
            title: playerResponse?.videoDetails?.title || ''
          };
        }
      } catch (e) { /* continue */ }
    }

    // Fallback: search for captionTracks directly
    for (const script of scripts) {
      const text = script.textContent;
      if (!text || !text.includes('"captionTracks"')) continue;
      const tracksMatch = text.match(/"captionTracks"\s*:\s*(\[[\s\S]*?\])\s*[,}]/);
      if (tracksMatch) {
        try {
          const tracks = JSON.parse(tracksMatch[1]);
          if (tracks.length > 0) return { captionTracks: tracks, title: getPageTitle() };
        } catch (e) { /* continue */ }
      }
    }
    return null;
  }

  async function fetchViaInnerTube(videoId, clientType) {
    let body, headers;
    if (clientType === 'ANDROID') {
      const clientVersion = '20.10.38';
      body = {
        context: { client: { clientName: 'ANDROID', clientVersion } },
        videoId
      };
      headers = {
        'Content-Type': 'application/json',
        'User-Agent': `com.google.android.youtube/${clientVersion} (Linux; U; Android 14)`
      };
    } else {
      const pageConfig = getPageInnerTubeConfig();
      body = {
        context: {
          client: {
            hl: document.documentElement.lang || 'en',
            gl: 'US',
            clientName: 'WEB',
            clientVersion: pageConfig.clientVersion || '2.20240101.00.00'
          }
        },
        videoId
      };
      headers = { 'Content-Type': 'application/json' };
    }

    // Fallback: YouTube's public InnerTube web-client key (every youtube.com page ships it) - not a secret.
    const apiKey = getPageInnerTubeConfig().apiKey || 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
    const url = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}&prettyPrint=false`;

    const resp = await fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      credentials: clientType === 'WEB' ? 'include' : 'omit'
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    const captionTracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!Array.isArray(captionTracks) || captionTracks.length === 0) return null;

    return { captionTracks, title: data?.videoDetails?.title || '' };
  }

  function getPageInnerTubeConfig() {
    const result = { apiKey: '', clientVersion: '' };
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const text = script.textContent;
      if (!text) continue;
      if (!result.apiKey) {
        const m = text.match(/"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/);
        if (m) result.apiKey = m[1];
      }
      if (!result.clientVersion) {
        const m = text.match(/"INNERTUBE_CLIENT_VERSION"\s*:\s*"([^"]+)"/);
        if (m) result.clientVersion = m[1];
      }
      if (result.apiKey && result.clientVersion) break;
    }
    return result;
  }

  async function buildTranscriptResponse(result, videoId, lang) {
    const tracks = result.captionTracks;
    const availableLanguages = tracks.map(track => ({
      code: track.languageCode,
      name: track.name?.simpleText || track.name?.runs?.[0]?.text || track.languageCode,
      isGenerated: track.kind === 'asr',
      baseUrl: track.baseUrl
    }));

    let selectedTrack = lang ? tracks.find(t => t.languageCode === lang) : null;
    if (!selectedTrack) selectedTrack = tracks[0];

    if (!selectedTrack?.baseUrl) throw new Error('Selected caption track has no transcript URL.');
    const xmlResp = await fetchWithTimeout(selectedTrack.baseUrl, { credentials: 'include' });
    if (!xmlResp.ok) throw new Error(`Failed to fetch transcript XML: HTTP ${xmlResp.status}`);
    const xml = await xmlResp.text();
    if (!xml || xml.length < 10) throw new Error('Transcript XML response was empty');

    const transcript = parseTranscriptXml(xml);
    if (transcript.length === 0) throw new Error('Parsed transcript is empty');

    return {
      transcript,
      languages: availableLanguages,
      selectedLanguage: selectedTrack.languageCode,
      videoTitle: result.title || getPageTitle()
    };
  }

  // ============================================================
  // XML PARSING (srv3 + classic)
  // ============================================================
  function parseTranscriptXml(xml) {
    try {
      const result = parseWithDOMParser(xml);
      if (result.length > 0) return result;
      // DOMParser produced nothing usable - fall through to the regex parser.
      return parseWithRegex(xml);
    } catch (e) {
      warn('DOMParser failed, using regex:', e.message);
      return parseWithRegex(xml);
    }
  }

  function parseWithDOMParser(xml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    // DOMParser does not throw on malformed XML; it embeds a <parsererror>.
    // Detect it so parseTranscriptXml can fall back to the regex parser.
    if (doc.querySelector('parsererror')) {
      throw new Error('XML parse error');
    }
    const transcript = [];

    // srv3 format
    const pElements = doc.querySelectorAll('p');
    if (pElements.length > 0) {
      pElements.forEach(p => {
        const startMs = parseInt(p.getAttribute('t') || '0', 10);
        const durMs = parseInt(p.getAttribute('d') || '0', 10);
        let text = '';
        const sElements = p.querySelectorAll('s');
        if (sElements.length > 0) {
          sElements.forEach(s => { text += s.textContent; });
        } else {
          text = p.textContent;
        }
        text = decodeEntities(text).trim();
        if (text) {
          transcript.push({ text, start: startMs / 1000, duration: durMs / 1000, end: (startMs + durMs) / 1000 });
        }
      });
      if (transcript.length > 0) return transcript;
    }

    // Classic format
    const textElements = doc.querySelectorAll('text');
    textElements.forEach(el => {
      const start = parseFloat(el.getAttribute('start') || '0');
      const dur = parseFloat(el.getAttribute('dur') || '0');
      let text = el.textContent || '';
      text = text.replace(/\n/g, ' ').trim();
      if (text) transcript.push({ text, start, duration: dur, end: start + dur });
    });

    return transcript;
  }

  function parseWithRegex(xml) {
    const transcript = [];

    // srv3
    const pRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
    let match;
    while ((match = pRegex.exec(xml)) !== null) {
      const startMs = parseInt(match[1], 10);
      const durMs = parseInt(match[2], 10);
      let text = '';
      const sRegex = /<s[^>]*>([^<]*)<\/s>/g;
      let sMatch;
      while ((sMatch = sRegex.exec(match[3])) !== null) { text += sMatch[1]; }
      if (!text) text = match[3].replace(/<[^>]+>/g, '');
      text = decodeEntities(text).trim();
      if (text) transcript.push({ text, start: startMs / 1000, duration: durMs / 1000, end: (startMs + durMs) / 1000 });
    }
    if (transcript.length > 0) return transcript;

    // Classic
    const textRegex = /<text\s+start="([^"]*)"\s+dur="([^"]*)"[^>]*>([\s\S]*?)<\/text>/g;
    while ((match = textRegex.exec(xml)) !== null) {
      const start = parseFloat(match[1]);
      const dur = parseFloat(match[2] || '0');
      let text = match[3] || '';
      text = text.replace(/<[^>]+>/g, '').replace(/\n/g, ' ');
      text = decodeEntities(text).trim();
      if (text) transcript.push({ text, start, duration: dur, end: start + dur });
    }
    return transcript;
  }

  function decodeEntities(text) {
    return text
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/').replace(/&nbsp;/g, ' ').replace(/&apos;/g, "'");
  }

  // ============================================================
  // INLINE PANEL (YouTube secondary column)
  // ============================================================
  function findSecondaryColumn() {
    return document.querySelector('#secondary-inner') ||
           document.querySelector('#secondary') ||
           document.querySelector('ytd-watch-flexy #secondary');
  }

  // Bound the retry loop: on some layouts (Shorts, theater, YouTube redesigns)
  // the secondary column never appears. Give up after ~15s instead of spinning
  // a setTimeout forever. The popup remains a fully working fallback entry point.
  let injectAttempts = 0;
  const MAX_INJECT_ATTEMPTS = 30; // 30 * 500ms = 15s

  function injectPanel() {
    if (document.getElementById('ytt-panel')) return;
    const secondary = findSecondaryColumn();
    if (!secondary) {
      if (injectAttempts++ < MAX_INJECT_ATTEMPTS) setTimeout(injectPanel, 500);
      return;
    }
    injectAttempts = 0;

    const panel = createPanel();
    secondary.insertBefore(panel, secondary.firstChild);
    setupInlinePanelListeners();
    detectVideoChange();
  }

  function createPanel() {
    const panel = document.createElement('div');
    panel.id = 'ytt-panel';
    panel.innerHTML = `
      <div class="ytt-header">
        <div class="ytt-logo">
          <span class="ytt-logo-text">TubeMD</span>
        </div>
        <div class="ytt-header-actions">
          <button id="ytt-toggle-btn" class="ytt-icon-btn" title="Toggle visibility">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          <button id="ytt-settings-btn" class="ytt-icon-btn" title="Settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
          <button id="ytt-close-btn" class="ytt-icon-btn" title="Close panel">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <div id="ytt-settings-panel" class="ytt-settings-panel" style="display:none;">
        <h3>Quick Settings</h3>
        <p class="ytt-hint">AI Provider: <strong id="ytt-current-provider">Gemini</strong></p>
        <label for="ytt-api-key" id="ytt-api-key-label">Gemini API Key</label>
        <div class="ytt-api-key-row">
          <input type="password" id="ytt-api-key" placeholder="Enter your API key..." />
          <button id="ytt-save-api-key" class="ytt-btn ytt-btn-primary">Save</button>
        </div>
        <p class="ytt-hint" id="ytt-key-hint">Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank">Google AI Studio</a></p>
        <button id="ytt-open-full-settings" class="ytt-btn ytt-btn-secondary" style="margin-top:8px;">Full Settings</button>
        <button id="ytt-settings-close" class="ytt-btn ytt-btn-secondary">Close</button>
      </div>

      <div class="ytt-tabs">
        <button class="ytt-tab active" data-tab="transcription">Transcription</button>
        <button class="ytt-tab" data-tab="summary">Summary</button>
      </div>

      <div id="ytt-action-bar" class="ytt-action-bar">
        <button id="ytt-get-transcription-btn" class="ytt-btn ytt-btn-get">GET TRANSCRIPTION</button>
        <a href="mailto:hello@agentmatik.ai" class="ytt-contact-link">Contact Us</a>
      </div>

      <div id="ytt-lang-bar" class="ytt-lang-bar" style="display:none;">
        <div class="ytt-lang-selector">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          <select id="ytt-lang-select"><option value="">Auto</option></select>
        </div>
        <div class="ytt-action-buttons">
          <button id="ytt-search-btn" class="ytt-icon-btn" title="Search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
          <button id="ytt-copy-btn" class="ytt-icon-btn" title="Copy">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
          <button id="ytt-download-btn" class="ytt-icon-btn" title="Download .md">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
        </div>
      </div>

      <div id="ytt-search-bar" class="ytt-search-bar" style="display:none;">
        <input type="text" id="ytt-search-input" placeholder="Search transcript..." />
        <span id="ytt-search-count"></span>
      </div>

      <div id="ytt-content" class="ytt-content">
        <div id="ytt-transcription-tab" class="ytt-tab-content active">
          <div id="ytt-transcript-list" class="ytt-transcript-list"></div>
        </div>
        <div id="ytt-summary-tab" class="ytt-tab-content">
          <div id="ytt-summary-content" class="ytt-summary-content">
            <div class="ytt-placeholder">
              <p>Load transcript first, then generate a summary.</p>
              <button id="ytt-summarize-btn" class="ytt-btn ytt-btn-primary" disabled>Generate Summary</button>
            </div>
          </div>
        </div>
      </div>
    `;
    return panel;
  }

  // ============================================================
  // INLINE PANEL EVENT LISTENERS
  // ============================================================
  function setupInlinePanelListeners() {
    document.addEventListener('yt-to-text-toggle', () => {
      const panel = document.getElementById('ytt-panel');
      if (panel) { panelVisible = !panelVisible; panel.style.display = panelVisible ? 'block' : 'none'; }
    });

    document.getElementById('ytt-close-btn').addEventListener('click', () => {
      const panel = document.getElementById('ytt-panel');
      if (panel) { panelVisible = false; panel.style.display = 'none'; }
    });

    document.getElementById('ytt-toggle-btn').addEventListener('click', () => {
      const content = document.getElementById('ytt-content');
      const langBar = document.getElementById('ytt-lang-bar');
      const actionBar = document.getElementById('ytt-action-bar');
      const searchBar = document.getElementById('ytt-search-bar');
      const tabs = document.querySelector('#ytt-panel .ytt-tabs');
      const isHidden = content.style.display === 'none';
      content.style.display = isHidden ? 'block' : 'none';
      if (langBar) langBar.style.display = isHidden && transcriptData ? 'flex' : 'none';
      if (actionBar) actionBar.style.display = isHidden ? 'block' : 'none';
      if (searchBar) searchBar.style.display = 'none';
      if (tabs) tabs.style.display = isHidden ? 'flex' : 'none';
    });

    document.getElementById('ytt-settings-btn').addEventListener('click', () => {
      const panel = document.getElementById('ytt-settings-panel');
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      // Load current provider settings
      chrome.runtime.sendMessage({ action: 'getSettings' }, (settings) => {
        const provider = settings?.aiProvider || 'gemini';
        const providerNames = { gemini: 'Gemini', openai: 'ChatGPT', claude: 'Claude' };
        const providerHints = {
          gemini: 'Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank">Google AI Studio</a>',
          openai: 'Get your key at <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI Platform</a>',
          claude: 'Get your key at <a href="https://console.anthropic.com/settings/keys" target="_blank">Anthropic Console</a>'
        };
        document.getElementById('ytt-current-provider').textContent = providerNames[provider] || provider;
        document.getElementById('ytt-api-key-label').textContent = `${providerNames[provider] || provider} API Key`;
        document.getElementById('ytt-key-hint').innerHTML = providerHints[provider] || '';
        const apiKey = settings?.apiKeys?.[provider] || '';
        document.getElementById('ytt-api-key').value = apiKey;
      });
    });

    document.getElementById('ytt-settings-close').addEventListener('click', () => {
      document.getElementById('ytt-settings-panel').style.display = 'none';
    });

    document.getElementById('ytt-save-api-key').addEventListener('click', () => {
      const key = document.getElementById('ytt-api-key').value.trim();
      // Save to the current provider's key slot
      chrome.runtime.sendMessage({ action: 'getSettings' }, (settings) => {
        const provider = settings?.aiProvider || 'gemini';
        const apiKeys = settings?.apiKeys || {};
        apiKeys[provider] = key;
        chrome.runtime.sendMessage({ action: 'saveSettings', settings: { ...settings, apiKeys } }, () => {
          showToast('API key saved!');
          document.getElementById('ytt-settings-panel').style.display = 'none';
        });
      });
    });

    document.getElementById('ytt-open-full-settings').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    document.querySelectorAll('#ytt-panel .ytt-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#ytt-panel .ytt-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#ytt-panel .ytt-tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`ytt-${tab.dataset.tab}-tab`).classList.add('active');
      });
    });

    document.getElementById('ytt-get-transcription-btn').addEventListener('click', loadTranscriptInline);

    document.getElementById('ytt-lang-select').addEventListener('change', (e) => {
      currentLang = e.target.value;
      loadTranscriptInline();
    });

    document.getElementById('ytt-summarize-btn').addEventListener('click', generateSummaryInline);
    document.getElementById('ytt-copy-btn').addEventListener('click', copyTranscriptInline);
    document.getElementById('ytt-download-btn').addEventListener('click', downloadTranscriptInline);

    document.getElementById('ytt-search-btn').addEventListener('click', () => {
      const bar = document.getElementById('ytt-search-bar');
      bar.style.display = bar.style.display === 'none' ? 'flex' : 'none';
      if (bar.style.display === 'flex') document.getElementById('ytt-search-input').focus();
    });

    document.getElementById('ytt-search-input').addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase();
      renderTranscript();
    });
  }

  // ============================================================
  // VIDEO DETECTION
  // ============================================================
  function getVideoId() {
    // Standard watch URL: ?v=ID
    const fromQuery = new URLSearchParams(window.location.search).get('v');
    if (fromQuery) return fromQuery;
    // Shorts (/shorts/ID) and embeds (/embed/ID) have no ?v= param.
    const pathMatch = window.location.pathname.match(/\/(?:shorts|embed)\/([A-Za-z0-9_-]{6,})/);
    if (pathMatch) return pathMatch[1];
    return null;
  }

  function getPageTitle() {
    const titleEl = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, h1.title');
    return titleEl?.textContent?.trim() || document.title.replace(' - YouTube', '').trim();
  }

  function detectVideoChange() {
    const checkVideo = () => {
      const newVideoId = getVideoId();
      if (newVideoId && newVideoId !== currentVideoId) {
        currentVideoId = newVideoId;
        transcriptData = null;
        currentLang = '';
        resetInlineUI();
      }
    };
    checkVideo();

    // Guard against observer leaks: YouTube's SPA can re-run injectPanel, and a
    // fresh observer each time would accumulate. Keep exactly one.
    if (panelObserver) panelObserver.disconnect();
    panelObserver = new MutationObserver(() => {
      checkVideo();
      if (!document.getElementById('ytt-panel')) injectPanel();
    });
    panelObserver.observe(document.querySelector('title') || document.head, {
      childList: true, subtree: true, characterData: true
    });

    window.addEventListener('yt-navigate-finish', () => {
      checkVideo();
      setTimeout(() => { if (!document.getElementById('ytt-panel')) injectPanel(); }, 1000);
    });
  }

  function resetInlineUI() {
    const listEl = document.getElementById('ytt-transcript-list');
    if (listEl) listEl.innerHTML = '';
    const actionBar = document.getElementById('ytt-action-bar');
    if (actionBar) actionBar.style.display = 'block';
    const langBar = document.getElementById('ytt-lang-bar');
    if (langBar) langBar.style.display = 'none';
    const getBtn = document.getElementById('ytt-get-transcription-btn');
    if (getBtn) { getBtn.textContent = 'GET TRANSCRIPTION'; getBtn.disabled = false; }
    const summaryContent = document.getElementById('ytt-summary-content');
    if (summaryContent) {
      summaryContent.innerHTML = `
        <div class="ytt-placeholder">
          <p>Load transcript first, then generate a summary.</p>
          <button id="ytt-summarize-btn" class="ytt-btn ytt-btn-primary" disabled>Generate Summary</button>
        </div>
      `;
      document.getElementById('ytt-summarize-btn').addEventListener('click', generateSummaryInline);
    }
    const langSelect = document.getElementById('ytt-lang-select');
    if (langSelect) langSelect.innerHTML = '<option value="">Auto</option>';
    const searchBar = document.getElementById('ytt-search-bar');
    if (searchBar) searchBar.style.display = 'none';
    searchQuery = '';
  }

  // ============================================================
  // INLINE TRANSCRIPT LOADING
  // ============================================================
  async function loadTranscriptInline() {
    if (!currentVideoId) { showToast('No video detected.'); return; }
    const getBtn = document.getElementById('ytt-get-transcription-btn');
    if (getBtn) { getBtn.textContent = 'LOADING...'; getBtn.disabled = true; }

    try {
      const response = await fetchTranscriptData(currentVideoId, currentLang);
      transcriptData = response;

      const langSelect = document.getElementById('ytt-lang-select');
      langSelect.innerHTML = '';
      response.languages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang.code;
        option.textContent = `${lang.name}${lang.isGenerated ? ' (auto)' : ''}`;
        if (lang.code === response.selectedLanguage) option.selected = true;
        langSelect.appendChild(option);
      });
      currentLang = response.selectedLanguage;

      const actionBar = document.getElementById('ytt-action-bar');
      if (actionBar) actionBar.style.display = 'none';
      const langBar = document.getElementById('ytt-lang-bar');
      if (langBar) langBar.style.display = 'flex';
      const sumBtn = document.getElementById('ytt-summarize-btn');
      if (sumBtn) sumBtn.disabled = false;

      renderTranscript();
      showToast(`Transcript loaded! (${response.transcript.length} segments)`);
    } catch (err) {
      if (getBtn) { getBtn.textContent = 'RETRY'; getBtn.disabled = false; }
      showToast(err.message);
    }
  }

  // ============================================================
  // RENDER TRANSCRIPT (inline panel)
  // ============================================================
  function renderTranscript() {
    if (!transcriptData?.transcript) return;
    const listEl = document.getElementById('ytt-transcript-list');
    listEl.innerHTML = '';
    const searchCountEl = document.getElementById('ytt-search-count');
    let matchCount = 0;

    transcriptData.transcript.forEach(item => {
      const matchesSearch = !searchQuery || item.text.toLowerCase().includes(searchQuery);
      if (searchQuery && matchesSearch) matchCount++;

      const div = document.createElement('div');
      div.className = 'ytt-transcript-item' + (matchesSearch ? '' : ' ytt-hidden');

      let displayText = escapeHtml(item.text);
      if (searchQuery && matchesSearch) {
        const regex = new RegExp(`(${escapeRegex(searchQuery)})`, 'gi');
        displayText = displayText.replace(regex, '<mark>$1</mark>');
      }

      div.innerHTML = `
        <span class="ytt-timestamp" data-time="${item.start}">${formatTime(item.start)}</span>
        <span class="ytt-text">${displayText}</span>
      `;
      div.querySelector('.ytt-timestamp').addEventListener('click', () => seekVideo(item.start));
      listEl.appendChild(div);
    });

    if (searchCountEl) {
      searchCountEl.textContent = searchQuery ? `${matchCount} match${matchCount !== 1 ? 'es' : ''}` : '';
    }
  }

  // ============================================================
  // INLINE AI SUMMARY
  // ============================================================
  async function generateSummaryInline() {
    if (!transcriptData?.transcript) { showToast('Load transcript first.'); return; }
    const contentEl = document.getElementById('ytt-summary-content');
    contentEl.innerHTML = `<div class="ytt-placeholder"><div class="ytt-spinner spinning"></div><p>Generating AI summary...</p></div>`;

    document.querySelectorAll('#ytt-panel .ytt-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#ytt-panel .ytt-tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector('#ytt-panel .ytt-tab[data-tab="summary"]').classList.add('active');
    document.getElementById('ytt-summary-tab').classList.add('active');

    try {
      const settings = await new Promise(resolve => chrome.runtime.sendMessage({ action: 'getSettings' }, resolve));
      const provider = settings?.aiProvider || 'gemini';
      const apiKey = settings?.apiKeys?.[provider];

      if (!apiKey) {
        contentEl.innerHTML = `
          <div class="ytt-placeholder">
            <p>No API key configured for ${provider}.</p>
            <p class="ytt-hint">Click the gear icon or go to extension Options to add your API key.</p>
          </div>
        `;
        return;
      }

      const fullText = transcriptData.transcript.map(item => `[${formatTime(item.start)}] ${item.text}`).join('\n');
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'summarize', text: fullText, provider, apiKey }, (resp) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else if (resp?.success) resolve(resp.data);
          else reject(new Error(resp?.error || 'Unknown error'));
        });
      });

      contentEl.innerHTML = `
        <div class="ytt-summary-text">${renderMarkdown(response)}</div>
        <div class="ytt-summary-actions">
          <button id="ytt-copy-summary" class="ytt-btn ytt-btn-secondary">Copy</button>
          <button id="ytt-regenerate" class="ytt-btn ytt-btn-primary">Regenerate</button>
        </div>
      `;
      document.getElementById('ytt-copy-summary').addEventListener('click', () => {
        navigator.clipboard.writeText(response).then(() => showToast('Summary copied!'));
      });
      document.getElementById('ytt-regenerate').addEventListener('click', generateSummaryInline);
    } catch (err) {
      contentEl.innerHTML = `
        <div class="ytt-placeholder"><p>${escapeHtml(err.message)}</p>
        <button id="ytt-summarize-btn" class="ytt-btn ytt-btn-primary">Retry</button></div>
      `;
      document.getElementById('ytt-summarize-btn').addEventListener('click', generateSummaryInline);
    }
  }

  // ============================================================
  // INLINE COPY & DOWNLOAD
  // ============================================================
  // The inline panel always exports Markdown with YAML frontmatter. The popup
  // offers the plain-text variant via its TEXT tab.

  function copyTranscriptInline() {
    if (!transcriptData?.transcript) { showToast('No transcript loaded.'); return; }
    navigator.clipboard.writeText(generateInlineMarkdown())
      .then(() => showToast('Copied as Markdown!'))
      .catch(() => showToast('Failed to copy.'));
  }

  function downloadTranscriptInline() {
    if (!transcriptData?.transcript) { showToast('No transcript loaded.'); return; }
    const title = transcriptData.videoTitle || 'transcript';
    const blob = new Blob([generateInlineMarkdown()], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizeFilename(title)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded as .md!');
  }

  function generateInlineMarkdown() {
    const meta = getFullVideoMeta();
    let md = '---\n';
    md += `title: "${escapeYaml(meta.title)}"\n`;
    if (meta.author) md += `author: "${escapeYaml(meta.author)}"\n`;
    md += `site: "YouTube"\n`;
    md += `domain: "youtube.com"\n`;
    md += `url: "${meta.url}"\n`;
    if (meta.publishDate) md += `published: "${meta.publishDate}"\n`;
    if (meta.duration) md += `duration: "${meta.duration}"\n`;
    if (meta.viewCount) md += `views: "${meta.viewCount}"\n`;
    if (meta.description) md += `description: "${escapeYaml(meta.description.substring(0, 200))}"\n`;
    md += `language: "${transcriptData.selectedLanguage || 'en'}"\n`;
    md += `extracted: "${new Date().toISOString()}"\n`;
    md += '---\n\n';
    if (meta.videoId) md += `![${escapeYaml(meta.title)}](https://www.youtube.com/watch?v=${meta.videoId})\n\n`;
    md += `# ${meta.title}\n\n`;
    transcriptData.transcript.forEach(item => {
      md += `**[${formatTime(item.start)}]** ${item.text}\n\n`;
    });
    return md;
  }

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================
  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function seekVideo(time) {
    const video = document.querySelector('video');
    if (video) { video.currentTime = time; video.play(); }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function escapeYaml(str) {
    // Escape backslashes first, then double quotes, then flatten newlines -
    // values are emitted inside double-quoted YAML scalars.
    return String(str == null ? '' : str)
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\r?\n/g, ' ');
  }

  function sanitizeFilename(name) {
    return name.replace(/[^a-z0-9\s\-_]/gi, '').replace(/\s+/g, '-').replace(/^-+|-+$/g, '').substring(0, 80).toLowerCase();
  }

  function renderMarkdown(text) {
    // Escape HTML first so a malicious/unexpected AI response cannot inject
    // markup into the panel (the result is assigned via innerHTML below).
    // The markdown transforms only match *, #, - so escaping does not break them.
    return escapeHtml(String(text == null ? '' : text))
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')
      .replace(/^\* (.+)$/gm, '<li>$1</li>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      .replace(/<\/ul>\s*<ul>/g, '')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  }

  function extractJsonObject(str, startIdx) {
    let depth = 0, inString = false, escape = false, start = -1;
    for (let i = startIdx; i < str.length && i < startIdx + 1000000; i++) {
      const ch = str[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') { if (depth === 0) start = i; depth++; }
      else if (ch === '}') { depth--; if (depth === 0) return JSON.parse(str.substring(start, i + 1)); }
    }
    throw new Error('Could not extract JSON object');
  }

  function showToast(message) {
    const panel = document.getElementById('ytt-panel');
    if (!panel) return;
    const existing = document.getElementById('ytt-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'ytt-toast';
    toast.className = 'ytt-toast';
    toast.textContent = message;
    panel.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 2500);
  }

  // ============================================================
  // START
  // ============================================================
  injectPanel();

})();
