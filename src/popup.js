(function () {
  'use strict';

  let currentTab = null;
  let transcriptData = null;
  let videoMeta = null;
  let activeFormat = 'markdown';
  let searchQuery = '';

  // A YouTube page we can extract from: standard watch pages and Shorts.
  const isYouTubeVideoUrl = (url) =>
    !!url && (url.includes('youtube.com/watch') || url.includes('youtube.com/shorts/'));

  // ============================================================
  // INITIALIZATION
  // ============================================================
  document.addEventListener('DOMContentLoaded', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;

    if (!isYouTubeVideoUrl(tab?.url)) {
      showState('not-youtube');
      return;
    }

    showState('video');
    requestVideoInfo();
    setupEventListeners();
  });

  function showState(state) {
    document.getElementById('state-not-youtube').style.display = state === 'not-youtube' ? 'flex' : 'none';
    document.getElementById('state-video').style.display = state === 'video' ? 'block' : 'none';
  }

  // ============================================================
  // COMMUNICATION
  // ============================================================
  async function sendToContent(action, data = {}) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(currentTab.id, { action, ...data }, (response) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(response);
      });
    });
  }

  async function sendToBackground(action, data = {}) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action, ...data }, (response) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(response);
      });
    });
  }

  // ============================================================
  // VIDEO INFO
  // ============================================================
  async function requestVideoInfo() {
    try {
      const info = await sendToContent('getVideoInfo');
      if (info) {
        videoMeta = info;
        document.getElementById('video-title').textContent = info.title || 'Untitled Video';
        document.getElementById('video-author').textContent = info.author || '';
        document.getElementById('video-date').textContent = info.publishDate ? formatDate(info.publishDate) : '';
        document.getElementById('video-url').textContent = info.url || currentTab.url;
      }
    } catch (e) {
      document.getElementById('video-title').textContent = currentTab.title?.replace(' - YouTube', '') || 'YouTube Video';
      document.getElementById('video-url').textContent = currentTab.url;
    }
  }

  // ============================================================
  // EVENT LISTENERS
  // ============================================================
  function setupEventListeners() {
    document.getElementById('btn-extract').addEventListener('click', extractTranscript);

    document.getElementById('btn-refresh').addEventListener('click', () => {
      transcriptData = null;
      videoMeta = null;
      resetUI();
      requestVideoInfo();
    });

    document.getElementById('btn-settings').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    // Format tabs
    document.querySelectorAll('.format-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        setActiveTab(tab.dataset.format);
        renderCurrentFormat();
      });
    });

    // Language select
    document.getElementById('lang-select').addEventListener('change', (e) => {
      if (transcriptData) extractTranscript(e.target.value);
    });

    // Search toggle
    document.getElementById('btn-search').addEventListener('click', () => {
      const bar = document.getElementById('search-bar');
      bar.style.display = bar.style.display === 'none' ? 'flex' : 'none';
      if (bar.style.display === 'flex') document.getElementById('search-input').focus();
    });

    // Search input
    document.getElementById('search-input').addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase();
      renderTextTranscript();
    });

    // Copy & Download
    document.getElementById('btn-copy').addEventListener('click', copyCurrentFormat);
    document.getElementById('btn-download').addEventListener('click', downloadCurrentFormat);

    // Summarize
    document.getElementById('btn-summarize').addEventListener('click', generateSummary);

    // Generate Skill
    document.getElementById('btn-generate-skill').addEventListener('click', generateSkill);
  }

  // ============================================================
  // EXTRACT TRANSCRIPT
  // ============================================================
  async function extractTranscript(lang) {
    const btn = document.getElementById('btn-extract');
    btn.textContent = 'EXTRACTING...';
    btn.disabled = true;

    try {
      const langCode = typeof lang === 'string' ? lang : '';
      const response = await sendToContent('extractTranscript', { lang: langCode });

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to extract transcript');
      }

      transcriptData = response.data;

      try {
        const meta = await sendToContent('getVideoMeta');
        if (meta) videoMeta = meta;
      } catch (e) { /* use what we have */ }

      // Update UI
      document.getElementById('extract-status').style.display = 'flex';
      document.getElementById('format-tabs').style.display = 'flex';
      document.getElementById('lang-bar').style.display = 'block';
      document.getElementById('content-area').style.display = 'block';
      document.getElementById('action-bar').style.display = 'none';

      // Populate languages
      const langSelect = document.getElementById('lang-select');
      langSelect.innerHTML = '';
      transcriptData.languages.forEach(l => {
        const opt = document.createElement('option');
        opt.value = l.code;
        opt.textContent = `${l.name}${l.isGenerated ? ' (auto)' : ''}`;
        if (l.code === transcriptData.selectedLanguage) opt.selected = true;
        langSelect.appendChild(opt);
      });

      // Enable AI buttons
      document.getElementById('btn-summarize').disabled = false;
      document.getElementById('btn-generate-skill').disabled = false;

      renderCurrentFormat();
      showToast(`Transcript extracted (${transcriptData.transcript.length} segments)`);

    } catch (err) {
      btn.textContent = 'RETRY';
      btn.disabled = false;
      showToast(err.message);
    }
  }

  // ============================================================
  // RENDER FORMATS
  // ============================================================
  function renderCurrentFormat() {
    if (!transcriptData) return;
    if (activeFormat === 'markdown') renderMarkdownOutput();
    else if (activeFormat === 'text') renderTextTranscript();
    // summary and skill are rendered on demand via their buttons
  }

  function generateMarkdownContent() {
    if (!transcriptData) return '';

    const url = videoMeta?.url || currentTab?.url || '';
    const title = videoMeta?.title || transcriptData.videoTitle || 'Untitled';
    const author = videoMeta?.author || '';
    const published = videoMeta?.publishDate || '';
    const description = videoMeta?.description || '';
    const duration = videoMeta?.duration || '';
    const views = videoMeta?.viewCount || '';
    const videoId = url ? new URL(url).searchParams?.get('v') || '' : '';

    let md = '---\n';
    md += `title: "${escapeYaml(title)}"\n`;
    if (author) md += `author: "${escapeYaml(author)}"\n`;
    md += `site: "YouTube"\n`;
    md += `domain: "youtube.com"\n`;
    md += `url: "${url}"\n`;
    if (published) md += `published: "${published}"\n`;
    if (duration) md += `duration: "${duration}"\n`;
    if (views) md += `views: "${views}"\n`;
    if (description) md += `description: "${escapeYaml(description.substring(0, 200))}"\n`;
    md += `language: "${transcriptData.selectedLanguage || 'en'}"\n`;
    md += `extracted: "${new Date().toISOString()}"\n`;
    md += '---\n\n';

    if (videoId) {
      md += `![${escapeYaml(title)}](https://www.youtube.com/watch?v=${videoId})\n\n`;
    }

    md += `# ${title}\n\n`;

    transcriptData.transcript.forEach(item => {
      md += `**[${formatTime(item.start)}]** ${item.text}\n\n`;
    });

    return md;
  }

  function renderMarkdownOutput() {
    const md = generateMarkdownContent();
    document.getElementById('markdown-output').textContent = md;
  }

  function renderTextTranscript() {
    if (!transcriptData) return;
    const container = document.getElementById('text-output');
    container.innerHTML = '';
    const searchCountEl = document.getElementById('search-count');
    let matchCount = 0;

    transcriptData.transcript.forEach(item => {
      const matches = !searchQuery || item.text.toLowerCase().includes(searchQuery);
      if (searchQuery && matches) matchCount++;

      const row = document.createElement('div');
      row.className = 'transcript-row';
      row.style.display = matches || !searchQuery ? 'flex' : 'none';

      let displayText = escapeHtml(item.text);
      if (searchQuery && matches) {
        const regex = new RegExp(`(${escapeRegex(searchQuery)})`, 'gi');
        displayText = displayText.replace(regex, '<mark>$1</mark>');
      }

      row.innerHTML = `
        <span class="transcript-time" data-time="${item.start}">${formatTime(item.start)}</span>
        <span class="transcript-text">${displayText}</span>
      `;

      row.querySelector('.transcript-time').addEventListener('click', () => {
        sendToContent('seekVideo', { time: item.start });
      });

      container.appendChild(row);
    });

    if (searchCountEl) {
      searchCountEl.textContent = searchQuery ? `${matchCount} match${matchCount !== 1 ? 'es' : ''}` : '';
    }
  }

  // ============================================================
  // AI SUMMARY
  // ============================================================
  async function generateSummary() {
    if (!transcriptData) { showToast('Extract transcript first.'); return; }

    const output = document.getElementById('summary-output');
    output.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Generating AI summary...</p>
      </div>
    `;

    activeFormat = 'summary';
    document.querySelectorAll('.format-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.format-tab[data-format="summary"]').classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('tab-summary').classList.add('active');

    try {
      const settings = await sendToBackground('getSettings');
      const provider = settings?.aiProvider || 'gemini';
      const apiKey = settings?.apiKeys?.[provider];

      if (!apiKey) {
        output.innerHTML = `
          <div class="placeholder-text">
            <p>No API key configured for ${getProviderName(provider)}.</p>
            <p style="margin-top:8px;font-size:12px;color:#aaa;">Go to Settings to add your API key.</p>
            <button class="btn btn-secondary" style="margin-top:12px;width:auto;padding:8px 16px;" id="btn-open-settings">Open Settings</button>
          </div>
        `;
        document.getElementById('btn-open-settings').addEventListener('click', () => chrome.runtime.openOptionsPage());
        return;
      }

      const fullText = transcriptData.transcript.map(item =>
        `[${formatTime(item.start)}] ${item.text}`
      ).join('\n');

      const response = await sendToBackground('summarize', {
        text: fullText,
        provider,
        apiKey
      });

      if (!response?.success) {
        throw new Error(response?.error || 'Summary generation failed');
      }

      output.innerHTML = `
        <span class="provider-badge">${getProviderName(provider).toUpperCase()}</span>
        <div class="summary-rendered">${renderMarkdownToHtml(response.data)}</div>
        <div class="summary-actions">
          <button class="btn btn-secondary" id="btn-copy-summary" style="width:auto;padding:8px 16px;font-size:12px;">Copy</button>
          <button class="btn btn-primary" id="btn-regenerate" style="width:auto;padding:8px 16px;font-size:12px;">Regenerate</button>
        </div>
      `;
      document.getElementById('btn-copy-summary').addEventListener('click', () => {
        navigator.clipboard.writeText(response.data).then(() => showToast('Summary copied!'));
      });
      document.getElementById('btn-regenerate').addEventListener('click', generateSummary);

    } catch (err) {
      output.innerHTML = `
        <div class="placeholder-text">
          <p>${escapeHtml(err.message)}</p>
          <button class="btn btn-primary" id="btn-retry-summary" style="margin-top:12px;width:auto;padding:8px 16px;">Retry</button>
        </div>
      `;
      document.getElementById('btn-retry-summary').addEventListener('click', generateSummary);
    }
  }

  // ============================================================
  // SKILL GENERATION
  // ============================================================
  async function generateSkill() {
    if (!transcriptData) { showToast('Extract transcript first.'); return; }

    const output = document.getElementById('skill-output');
    const skillFormat = document.querySelector('input[name="skill-format"]:checked')?.value || 'claude';
    const formatLabel = skillFormat === 'manus' ? 'Manus' : 'Claude Code';

    output.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Generating ${formatLabel} skill from transcript...</p>
        <p style="font-size:11px;color:#aaa;margin-top:4px;">This may take 15-30 seconds</p>
      </div>
    `;

    // Switch to skill tab
    activeFormat = 'skill';
    document.querySelectorAll('.format-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.format-tab[data-format="skill"]').classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('tab-skill').classList.add('active');

    try {
      const settings = await sendToBackground('getSettings');
      const provider = settings?.aiProvider || 'gemini';
      const apiKey = settings?.apiKeys?.[provider];

      if (!apiKey) {
        output.innerHTML = `
          <div class="placeholder-text">
            <p>No API key configured for ${getProviderName(provider)}.</p>
            <p style="margin-top:8px;font-size:12px;color:#aaa;">Go to Settings to add your API key.</p>
            <button class="btn btn-secondary" style="margin-top:12px;width:auto;padding:8px 16px;" id="btn-skill-settings">Open Settings</button>
          </div>
        `;
        document.getElementById('btn-skill-settings').addEventListener('click', () => chrome.runtime.openOptionsPage());
        return;
      }

      const fullText = transcriptData.transcript.map(item =>
        `[${formatTime(item.start)}] ${item.text}`
      ).join('\n');

      const response = await sendToBackground('generateSkill', {
        text: fullText,
        provider,
        apiKey,
        skillFormat,
        videoTitle: videoMeta?.title || transcriptData.videoTitle || '',
        videoUrl: videoMeta?.url || currentTab?.url || ''
      });

      if (!response?.success) {
        throw new Error(response?.error || 'Skill generation failed');
      }

      // Clean up the response - remove markdown code fences if the AI wrapped it
      let skillContent = response.data;
      skillContent = skillContent.replace(/^```(?:markdown|md|yaml)?\n?/gm, '').replace(/\n?```$/gm, '').trim();

      const badgeClass = skillFormat === 'manus' ? 'manus' : 'claude';

      output.innerHTML = `
        <span class="skill-badge ${badgeClass}">${formatLabel.toUpperCase()} SKILL</span>
        <span class="provider-badge">${getProviderName(provider).toUpperCase()}</span>
        <div class="skill-output-container">
          <pre class="skill-code-block">${escapeHtml(skillContent)}</pre>
        </div>
        <div class="skill-actions">
          <button class="btn btn-secondary" id="btn-copy-skill" style="width:auto;padding:8px 16px;font-size:12px;">Copy</button>
          <button class="btn btn-secondary" id="btn-download-skill" style="width:auto;padding:8px 16px;font-size:12px;">Download SKILL.md</button>
          <button class="btn btn-primary" id="btn-regenerate-skill" style="width:auto;padding:8px 16px;font-size:12px;">Regenerate</button>
        </div>
      `;

      document.getElementById('btn-copy-skill').addEventListener('click', () => {
        navigator.clipboard.writeText(skillContent).then(() => showToast('Skill copied!'));
      });

      document.getElementById('btn-download-skill').addEventListener('click', () => {
        const blob = new Blob([skillContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'SKILL.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Downloaded SKILL.md!');
      });

      document.getElementById('btn-regenerate-skill').addEventListener('click', generateSkill);

    } catch (err) {
      output.innerHTML = `
        <div class="placeholder-text">
          <p>${escapeHtml(err.message)}</p>
          <button class="btn btn-primary" id="btn-retry-skill" style="margin-top:12px;width:auto;padding:8px 16px;">Retry</button>
        </div>
      `;
      document.getElementById('btn-retry-skill').addEventListener('click', generateSkill);
    }
  }

  // ============================================================
  // COPY & DOWNLOAD
  // ============================================================
  function copyCurrentFormat() {
    if (!transcriptData) { showToast('No transcript loaded.'); return; }

    let text;
    if (activeFormat === 'markdown') {
      text = generateMarkdownContent();
    } else {
      text = transcriptData.transcript.map(item =>
        `[${formatTime(item.start)}] ${item.text}`
      ).join('\n');
    }

    navigator.clipboard.writeText(text)
      .then(() => showToast('Copied to clipboard!'))
      .catch(() => showToast('Failed to copy.'));
  }

  function downloadCurrentFormat() {
    if (!transcriptData) { showToast('No transcript loaded.'); return; }

    const title = videoMeta?.title || transcriptData.videoTitle || 'transcript';
    const filename = sanitizeFilename(title);

    let content, ext, mimeType;
    if (activeFormat === 'markdown') {
      content = generateMarkdownContent();
      ext = 'md';
      mimeType = 'text/markdown';
    } else {
      content = transcriptData.transcript.map(item =>
        `[${formatTime(item.start)}] ${item.text}`
      ).join('\n');
      ext = 'txt';
      mimeType = 'text/plain';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded as .${ext}!`);
  }

  // ============================================================
  // TABS
  // ============================================================
  function setActiveTab(fmt) {
    activeFormat = fmt;
    document.querySelectorAll('.format-tab').forEach(t =>
      t.classList.toggle('active', t.dataset.format === fmt));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const pane = document.getElementById(`tab-${fmt}`);
    if (pane) pane.classList.add('active');
  }

  // ============================================================
  // RESET UI
  // ============================================================
  function resetUI() {
    document.getElementById('extract-status').style.display = 'none';
    document.getElementById('format-tabs').style.display = 'none';
    document.getElementById('lang-bar').style.display = 'none';
    document.getElementById('content-area').style.display = 'none';
    document.getElementById('action-bar').style.display = 'block';
    document.getElementById('btn-extract').textContent = 'GET TRANSCRIPTION';
    document.getElementById('btn-extract').disabled = false;
    document.getElementById('search-bar').style.display = 'none';
    searchQuery = '';
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

  function formatDate(dateStr) {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return dateStr; }
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
    return String(str == null ? '' : str)
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\r?\n/g, ' ');
  }

  function sanitizeFilename(name) {
    return name.replace(/[^a-z0-9\s\-_]/gi, '').replace(/\s+/g, '-').replace(/^-+|-+$/g, '').substring(0, 80).toLowerCase();
  }

  function getProviderName(provider) {
    const names = { gemini: 'Gemini', openai: 'ChatGPT', claude: 'Claude' };
    return names[provider] || provider;
  }

  function renderMarkdownToHtml(text) {
    // Escape HTML first so an unexpected AI response cannot inject markup into
    // the popup (result is assigned via innerHTML). The markdown transforms
    // only match *, #, - so escaping does not affect them.
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

  function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

})();
