# src/ - the extension itself

This folder is what Chrome loads: `manifest.json` plus the scripts, styles,
and icons it references. There is no build step - open `chrome://extensions/`,
enable Developer mode, click **Load unpacked**, and select this folder.

| File | Responsibility |
|------|----------------|
| `manifest.json` | MV3 manifest: permissions, content scripts, commands. |
| `content.js`, `content.css` | Transcript extraction and the inline YouTube panel. |
| `background.js` | Service worker: AI provider calls, settings storage, shortcut. |
| `popup.html`, `popup.js`, `popup.css` | Toolbar popup. |
| `options.html`, `options.js`, `options.css` | Settings page (provider + API keys). |
| `icons/` | Extension icons. |

Documentation lives one level up: [README](../README.md),
[CONTRIBUTING](../CONTRIBUTING.md), [PRIVACY](../PRIVACY.md),
[CHANGELOG](../CHANGELOG.md). License: MIT ([LICENSE](../LICENSE)).
