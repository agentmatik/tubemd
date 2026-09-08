// TubeMD Options Page Controller
// Version: 2.0.0

(function () {
  'use strict';

  const PROVIDERS = ['gemini', 'openai', 'claude'];

  document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupEventListeners();
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

})();
