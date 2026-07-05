# YouTube To Text - Chrome Extension

A free, personal Chrome extension that transcribes YouTube videos to text and generates AI-powered summaries using Google's Gemini API. This is a fully functional clone of the popular "YouTube to Text" extension, built for personal use with zero cost.

## Features

| Feature | Description |
| :--- | :--- |
| **Transcript Extraction** | Automatically pulls captions (manual or auto-generated) from any YouTube video |
| **Timestamped Text** | Every line is linked to its timecode; click to jump to that moment in the video |
| **Multi-Language Support** | Switch between all available caption languages for the video |
| **AI Summarization** | Generate concise summaries with key points using Google Gemini (free tier) |
| **Copy to Clipboard** | One-click copy of the full transcript or AI summary |
| **Download as TXT** | Save the transcript as a text file named after the video |
| **Search Within Transcript** | Find specific words or phrases with real-time highlighting |
| **Dark / Light Mode** | Toggle between dark and light themes |
| **Resizable Sidebar** | Drag the left edge to adjust the panel width |
| **SPA Navigation Aware** | Automatically detects when you navigate to a new video |

## Installation

Since this extension is for personal use and not published on the Chrome Web Store, you install it in "Developer Mode":

1. **Unzip** the `youtube-to-text-extension.zip` file to a folder on your computer.
2. Open **Chrome** and navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **"Load unpacked"** and select the unzipped folder.
5. The extension icon will appear in your toolbar. Navigate to any YouTube video to see the sidebar.

## Usage

### Transcript Extraction (Free, No Setup)
1. Go to any YouTube video page (`youtube.com/watch?v=...`).
2. The sidebar panel will appear on the right side of the page.
3. Click **"Load Transcript"** to fetch the video's captions.
4. Click any **timestamp** to jump to that point in the video.
5. Use the **copy** or **download** buttons in the action bar.

### AI Summary (Requires Free Gemini API Key)
1. Click the **gear icon** in the sidebar header to open Settings.
2. Enter your **Gemini API key** and click Save.
3. After loading a transcript, click the **"Summary"** tab, then **"Generate Summary"**.

### Getting a Free Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/apikey).
2. Sign in with your Google account.
3. Click **"Create API Key"** and copy it.
4. Paste it into the extension's Settings panel.

The Gemini Flash model's free tier is generous enough for personal use (hundreds of summaries per day).

## File Structure

```
youtube-to-text-extension/
  manifest.json      # Extension configuration (Manifest V3)
  background.js      # Service worker: transcript fetching & AI summarization
  content.js         # Content script: sidebar UI & interaction logic
  content.css        # Styles for the sidebar (dark/light themes)
  icons/
    icon16.png       # Toolbar icon
    icon48.png       # Extension management icon
    icon128.png      # Chrome Web Store icon
```

## How It Works

The extension does **not** perform speech-to-text processing. Instead, it leverages YouTube's existing caption infrastructure:

1. When you click "Load Transcript", the background service worker fetches the YouTube video page HTML.
2. It extracts the `ytInitialPlayerResponse` JSON object, which contains metadata about all available caption tracks.
3. It fetches the selected caption track's XML data from YouTube's servers.
4. The XML is parsed into timestamped text segments and displayed in the sidebar.
5. For AI summaries, the full transcript text is sent to Google's Gemini API, which returns a structured summary.

## Privacy

This extension operates entirely locally in your browser. No data is sent to any third-party server except:
- **YouTube's servers** (to fetch the transcript data, which happens anyway when you watch a video).
- **Google's Gemini API** (only when you explicitly click "Generate Summary", and only the transcript text is sent).

Your Gemini API key is stored locally in Chrome's `storage.sync`.

## Troubleshooting

| Issue | Solution |
| :--- | :--- |
| "No captions available" | The video doesn't have subtitles (manual or auto-generated). Try a different video. |
| Sidebar doesn't appear | Refresh the page. Make sure you're on a `youtube.com/watch` URL. |
| Transcript loading fails | YouTube may have changed its page structure. Check for extension updates. |
| AI summary fails | Verify your Gemini API key is correct and has not exceeded rate limits. |
| Sidebar overlaps content | Drag the resize handle (left edge) to make the panel narrower. |
