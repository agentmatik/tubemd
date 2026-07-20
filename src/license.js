// TubeMD - Shared licensing module (single source of truth)
// Version: 1.1.0
//
// Loaded in every extension context that needs the Pro gate:
//   - background.js  (via importScripts) - runs the network calls
//   - popup.js / options.js (via <script> in the HTML) - read state, send messages
//   - content.js     (as the first content_scripts entry) - reads the Pro gate
//
// Design notes:
//   - The Pro CHECK (isProActive) is a pure chrome.storage.local read, so every
//     surface (popup, options, inline panel) agrees on one flag. No network on
//     the hot path.
//   - The network calls (checkout, validate) live here but are only ever invoked
//     from the background service worker. Content scripts must NOT fetch the
//     licensing API directly: a content-script fetch is subject to the host
//     page's (YouTube's) CSP and would be blocked. Content/popup message the
//     background worker instead.
//   - No ES module syntax: this file is importScripts()-ed and <script>-loaded,
//     so it exposes its API on globalThis.TMLicense.

(function () {
  'use strict';

  // ============================================================
  // CONTRACT - shared "Agentmatik Licensing API" Cloudflare Worker
  // ============================================================
  // Single configurable base URL for the licensing backend.
  // TODO(deploy): set this to the deployed Worker URL once the shared
  // "Agentmatik Licensing API" (repo agentmatik/skool-downloader/api) is live.
  // If you change the host, also update host_permissions in manifest.json and
  // the disclosure in PRIVACY.md / STORE.md.
  const LICENSING_API = 'https://licensing.agentmatik.ai';

  // This extension's product id in the shared Worker.
  const PRODUCT = 'tubemd';

  // License key shape handed out by the Worker: TM-XXXX-XXXX-XXXX
  // (three groups of four uppercase alphanumerics).
  const KEY_PATTERN = /^TM-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

  // Bound licensing requests so a hung connection surfaces as an error rather
  // than leaving the caller waiting forever.
  const LICENSE_FETCH_TIMEOUT_MS = 10000;

  // chrome.storage.local keys owned by this module.
  const STORE = {
    isPro: 'isPro',
    key: 'licenseKey',
    plan: 'licensePlan',
    validatedAt: 'licenseValidatedAt',
    reason: 'licenseReason'
  };

  // ============================================================
  // KEY FORMAT
  // ============================================================
  function normalizeKey(raw) {
    return String(raw == null ? '' : raw).trim().toUpperCase();
  }

  function isValidKeyFormat(key) {
    return KEY_PATTERN.test(normalizeKey(key));
  }

  // ============================================================
  // STATE (pure chrome.storage.local reads/writes)
  // ============================================================
  // The one gate every surface calls. Returns a boolean; never throws.
  async function isProActive() {
    try {
      const s = await chrome.storage.local.get([STORE.isPro]);
      return s[STORE.isPro] === true;
    } catch {
      return false;
    }
  }

  async function getLicenseState() {
    const s = await chrome.storage.local.get([
      STORE.isPro, STORE.key, STORE.plan, STORE.validatedAt, STORE.reason
    ]);
    return {
      isPro: s[STORE.isPro] === true,
      licenseKey: s[STORE.key] || '',
      licensePlan: s[STORE.plan] || '',
      validatedAt: s[STORE.validatedAt] || 0,
      reason: s[STORE.reason] || ''
    };
  }

  // Grant Pro for a validated key. Never logs the key.
  async function setValidated(key, plan) {
    await chrome.storage.local.set({
      [STORE.isPro]: true,
      [STORE.key]: normalizeKey(key),
      [STORE.plan]: plan || 'pro',
      [STORE.validatedAt]: Date.now(),
      [STORE.reason]: null
    });
  }

  // Record an explicitly-rejected key (revoked/expired/invalid): Pro off, key
  // kept so the reason can be surfaced and a later re-check can self-heal.
  async function setInvalid(key, reason) {
    await chrome.storage.local.set({
      [STORE.isPro]: false,
      [STORE.key]: normalizeKey(key),
      [STORE.reason]: reason || 'invalid',
      [STORE.validatedAt]: Date.now()
    });
  }

  // Full removal (user clicks "Remove license").
  async function clearLicense() {
    await chrome.storage.local.remove([
      STORE.isPro, STORE.key, STORE.plan, STORE.validatedAt, STORE.reason
    ]);
  }

  // ============================================================
  // NETWORK CLIENT (invoked only from the background service worker)
  // ============================================================
  async function licenseFetch(path, payload) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LICENSE_FETCH_TIMEOUT_MS);
    let resp;
    try {
      resp = await fetch(`${LICENSING_API}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Licensing request timed out. Check your connection and try again.');
      }
      throw new Error('Could not reach the licensing service. Check your connection and try again.');
    } finally {
      clearTimeout(timer);
    }
    if (!resp.ok) {
      throw new Error(`Licensing service error (HTTP ${resp.status}).`);
    }
    return resp.json().catch(() => ({}));
  }

  // POST /v1/checkout { product } -> { url } (Stripe-hosted checkout).
  async function requestCheckoutUrl() {
    const data = await licenseFetch('/v1/checkout', { product: PRODUCT });
    const url = data && data.url;
    // Only ever open an https URL, so a misconfigured/hostile response cannot
    // navigate to javascript:, data:, or a plain-http page.
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error('Checkout did not return a valid URL.');
    }
    if (parsed.protocol !== 'https:') {
      throw new Error('Checkout returned an insecure URL.');
    }
    return parsed.href;
  }

  // POST /v1/license/validate { key, product } -> { ok, valid, plan, product, reason? }
  async function requestValidate(key) {
    return licenseFetch('/v1/license/validate', { key: normalizeKey(key), product: PRODUCT });
  }

  globalThis.TMLicense = {
    LICENSING_API,
    PRODUCT,
    KEY_PATTERN,
    STORE,
    normalizeKey,
    isValidKeyFormat,
    isProActive,
    getLicenseState,
    setValidated,
    setInvalid,
    clearLicense,
    requestCheckoutUrl,
    requestValidate
  };
})();
