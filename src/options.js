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
    const result = await chrome.storage.sync.get(['tubeMdSettings']);
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

    await chrome.storage.sync.set({ tubeMdSettings: settings });

    const status = document.getElementById('save-status');
    status.textContent = 'Settings saved!';
    setTimeout(() => { status.textContent = ''; }, 3000);
  }

  // ============================================================
  // LICENSE INFO
  // ============================================================
  async function loadLicenseInfo() {
    const result = await chrome.storage.local.get(['trialStart', 'isPro', 'usageCount']);
    const container = document.getElementById('license-info');

    if (result.isPro) {
      container.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span style="background:#34c759;color:#fff;padding:4px 12px;border-radius:6px;font-size:12px;font-weight:600;">PRO</span>
          <span style="font-size:14px;font-weight:600;">Licensed</span>
        </div>
        <p class="section-desc">You have full access to all features. Thank you for your support!</p>
      `;
      return;
    }

    const trialStart = result.trialStart;
    const usageCount = result.usageCount || 0;

    if (!trialStart) {
      container.innerHTML = `
        <p class="section-desc">Free trial has not started yet. Extract your first transcript to begin the 14-day trial.</p>
        <p class="section-desc" style="margin-top:8px;">Total extractions: ${usageCount}</p>
      `;
      return;
    }

    const trialDays = 14;
    const elapsed = Date.now() - trialStart;
    const daysLeft = Math.max(0, trialDays - Math.floor(elapsed / (1000 * 60 * 60 * 24)));

    if (daysLeft > 0) {
      container.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span style="background:#ff9500;color:#fff;padding:4px 12px;border-radius:6px;font-size:12px;font-weight:600;">TRIAL</span>
          <span style="font-size:14px;font-weight:600;">${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining</span>
        </div>
        <p class="section-desc">You have full access to all features during the trial period.</p>
        <p class="section-desc" style="margin-top:8px;">Total extractions: ${usageCount}</p>
        <a href="https://agentmatik.ai/tubemd-pro" target="_blank" style="display:inline-block;margin-top:12px;background:#e74c6f;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">Upgrade to Pro</a>
      `;
    } else {
      container.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span style="background:#ff3b30;color:#fff;padding:4px 12px;border-radius:6px;font-size:12px;font-weight:600;">EXPIRED</span>
          <span style="font-size:14px;font-weight:600;">Trial ended</span>
        </div>
        <p class="section-desc">Your 14-day trial has expired. Upgrade to Pro to unlock Markdown export and AI summaries.</p>
        <p class="section-desc" style="margin-top:8px;">Total extractions: ${usageCount}</p>
        <a href="https://agentmatik.ai/tubemd-pro" target="_blank" style="display:inline-block;margin-top:12px;background:#e74c6f;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">Upgrade to Pro &mdash; $49 Lifetime</a>
      `;
    }
  }

})();
