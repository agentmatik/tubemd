# Security Policy

## Reporting a vulnerability

Email **hello@agentmatik.ai** with the subject "SECURITY: tubemd". Include
reproduction steps and the extension version. Please do not open public issues
for security reports until a fix is available.

## Security posture

- **No backend, no remote code, no telemetry.** The extension's only outbound
  network calls are to `youtube.com` (transcript data, from the content
  script) and to the one AI provider the user selected (from the service
  worker). There is no licensing, account, or update-check traffic.
- **API keys** (Gemini/OpenAI/Anthropic, user-supplied) are stored in
  `chrome.storage.local` only (never sync, never logged) and sent exclusively
  to the provider the user selected, over HTTPS.
- **AI output** is HTML-escaped before rendering (popup and inline panel).
- **Options/popup rendering rule:** `innerHTML` is only assigned fully static
  markup; every dynamic value is inserted via `textContent`.
- **Secret scanning:** CI runs a pinned gitleaks over the full history on every
  push and pull request. The only allowlisted literal is YouTube's public
  InnerTube web-client key (`.gitleaks.toml`), which is not a secret.
- **Supply chain:** no dependencies and no build step - what is in `src/` is
  what runs.
