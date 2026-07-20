# Security Policy

## Reporting a vulnerability

Email **hello@agentmatik.ai** with the subject "SECURITY: tubemd". Include
reproduction steps and the extension version. Response within 72 hours. Do not
open public issues for security reports.

## Security posture

- **API keys** (Gemini/OpenAI/Anthropic, user-supplied) are stored in
  `chrome.storage.local` only (never sync, never logged) and sent exclusively
  to the provider the user selected.
- **AI output** is HTML-escaped before rendering (popup and inline panel).
- **License keys** (`TM-...`) are validated against the Agentmatik Licensing
  API over HTTPS; the checkout URL returned by the API is opened only if it
  parses as `https:`.
- **Options/popup rendering rule:** `innerHTML` is only assigned fully static
  markup; every dynamic value is inserted via `textContent`.
- No analytics, no telemetry, no remote code.
