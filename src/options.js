// TubeMD Options Page Controller
// Version: 1.0.0

(function () {
  'use strict';

  const PROVIDERS = ['gemini', 'openai', 'claude'];

  document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupEventListeners();
    loadLicenseInfo();
  });

  // ============================================================
  // LOAD SETTINGS
  // ============================================================
  async function loadSettings() {
    // Read from chrome.storage.local (device-only). See background.js for why
    // API keys are deliberately kept out of chrome.storage.sync.
    const result = await chrome.storage.local.get(['tubeMdSettings']);
    const settings = result.tubeMdSettings || {};

    // Provider
    const provider = settings.aiProvider || 'gemini';
    const radio = document.querySelector(`input[name="aiProvider"][value="${provider}"]`);
    if (radio) radio.checked = true;
    showKeySection(provider);

    // API Keys
    const keys = settings.apiKeys || {};
    PROVIDERS.forEach(p => {
      const input = document.getElementById(`${p}-key`);
      if (input && keys[p]) input.value = keys[p];
    });

    // Default format
    const format = settings.defaultFormat || 'markdown';
    const formatRadio = document.querySelector(`input[name="defaultFormat"][value="${format}"]`);
    if (formatRadio) formatRadio.checked = true;
  }

  // ============================================================
  // EVENT LISTENERS
  // ============================================================
  function setupEventListeners() {
    // Provider selection
    document.querySelectorAll('input[name="aiProvider"]').forEach(radio => {
      radio.addEventListener('change', () => {
        showKeySection(radio.value);
      });
    });

    // Toggle visibility buttons
    document.querySelectorAll('.btn-toggle-vis').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        if (input) {
          input.type = input.type === 'password' ? 'text' : 'password';
        }
      });
    });

    // Save button
    document.getElementById('btn-save').addEventListener('click', saveSettings);
  }

  // ============================================================
  // SHOW/HIDE KEY SECTIONS
  // ============================================================
  function showKeySection(provider) {
    PROVIDERS.forEach(p => {
      const section = document.getElementById(`${p}-key-section`);
      if (section) section.style.display = p === provider ? 'block' : 'none';
    });
  }

  // ============================================================
  // SAVE SETTINGS
  // ============================================================
  async function saveSettings() {
    const provider = document.querySelector('input[name="aiProvider"]:checked')?.value || 'gemini';
    const format = document.querySelector('input[name="defaultFormat"]:checked')?.value || 'markdown';

    const apiKeys = {};
    PROVIDERS.forEach(p => {
      const input = document.getElementById(`${p}-key`);
      if (input) apiKeys[p] = input.value.trim();
    });

    const settings = {
      aiProvider: provider,
      apiKeys,
      defaultFormat: format
    };

    await chrome.storage.local.set({ tubeMdSettings: settings });

    const status = document.getElementById('save-status');
    status.textContent = 'Settings saved!';
    setTimeout(() => { status.textContent = ''; }, 3000);
  }

  // ============================================================
  // LICENSE (server-validated; single gate via TMLicense)
  // ============================================================
  // Rendering rule: innerHTML is only ever assigned FULLY STATIC markup (no
  // interpolation). Every dynamic value (key, reasons, server messages) is
  // inserted via textContent, so nothing user- or server-controlled can become
  // HTML.

  const LICENSE_HTML_PRO = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
      <span style="background:#34c759;color:#fff;padding:4px 12px;border-radius:6px;font-size:12px;font-weight:600;">PRO</span>
      <span style="font-size:14px;font-weight:600;">Licensed - lifetime</span>
    </div>
    <p class="section-desc">Key: <code id="lic-key-shown"></code></p>
    <p class="section-desc">Markdown export, AI summaries, and SKILL.md generation are unlocked. Thank you for your support!</p>
    <button id="lic-remove" class="btn-secondary" style="margin-top:10px;">Remove license from this device</button>
  `;

  const LICENSE_HTML_FREE = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
      <span style="background:#8e8e93;color:#fff;padding:4px 12px;border-radius:6px;font-size:12px;font-weight:600;">FREE</span>
      <span style="font-size:14px;font-weight:600;">Plain-text transcripts</span>
    </div>
    <p id="lic-reason" class="section-desc" style="color:#ff3b30;"></p>
    <p class="section-desc">Pro (one-time $49, lifetime) unlocks Markdown export with YAML frontmatter, AI summaries, and SKILL.md generation.</p>
    <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
      <input type="text" id="lic-input" placeholder="TM-XXXX-XXXX-XXXX" maxlength="17"
             style="flex:1;min-width:180px;padding:10px;border:1px solid #d2d2d7;border-radius:8px;font-family:monospace;" />
      <button id="lic-activate" class="btn-primary">Activate</button>
      <button id="lic-buy" class="btn-primary" style="background:#e74c6f;">Get Pro - $49 lifetime</button>
    </div>
    <p id="lic-msg" class="section-desc" style="margin-top:8px;min-height:16px;"></p>
  `;

  async function loadLicenseInfo() {
    const container = document.getElementById('license-info');
    const state = await TMLicense.getLicenseState();

    if (state.isPro) {
      container.innerHTML = LICENSE_HTML_PRO; // static markup only
      document.getElementById('lic-key-shown').textContent = maskKey(state.licenseKey);
      document.getElementById('lic-remove').addEventListener('click', async () => {
        await chrome.runtime.sendMessage({ action: 'removeLicense' });
        loadLicenseInfo();
      });
      return;
    }

    container.innerHTML = LICENSE_HTML_FREE; // static markup only

    const reasonEl = document.getElementById('lic-reason');
    if (state.reason === 'revoked') {
      reasonEl.textContent = 'Your previous license was revoked (this happens after a refund). Contact hello@agentmatik.ai if this is unexpected.';
    } else if (state.reason === 'expired') {
      reasonEl.textContent = 'Your previous license expired.';
    } else {
      reasonEl.remove();
    }

    const msg = document.getElementById('lic-msg');

    document.getElementById('lic-activate').addEventListener('click', async () => {
      const key = document.getElementById('lic-input').value;
      msg.textContent = 'Validating...';
      const resp = await chrome.runtime.sendMessage({ action: 'validateLicense', key });
      if (resp?.success && resp.valid) {
        msg.textContent = 'License activated!';
        loadLicenseInfo();
      } else {
        msg.textContent = resp?.error || friendlyReason(resp?.reason) || 'Activation failed.';
      }
    });

    document.getElementById('lic-buy').addEventListener('click', async () => {
      msg.textContent = 'Opening secure checkout...';
      const resp = await chrome.runtime.sendMessage({ action: 'startCheckout' });
      msg.textContent = resp?.success
        ? 'Checkout opened in a new tab. Paste your TM- key above after payment.'
        : (resp?.error || 'Could not start checkout. Please try again later.');
    });
  }

  function maskKey(key) {
    // Show enough to recognize the key without exposing it to shoulder-surfing.
    return key ? `${key.slice(0, 7)}...${key.slice(-4)}` : '';
  }

  function friendlyReason(reason) {
    return {
      invalid_format: 'That does not look like a TubeMD key (TM-XXXX-XXXX-XXXX).',
      not_found: 'License key not recognized.',
      revoked: 'This license has been revoked.',
      expired: 'This license has expired.',
      wrong_product: 'This key is for a different Agentmatik product.',
    }[reason];
  }

})();
