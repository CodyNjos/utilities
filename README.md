# Utilities

A collection of browser-based developer tools built with React + TypeScript + Vite. No backend, no tracking — everything runs in the browser.

https://tools.njos.dev/

## Tools

| Tool | Route | Description |
|------|-------|-------------|
| **Base64 Tool** | `/base64` | Encode and decode text and files to/from Base64 |
| **Image Converter** | `/image-converter` | Convert images between PNG, JPEG, WebP, BMP, and ICO |
| **Diff Checker** | `/diff-checker` | Compare two texts side-by-side with character-level highlighting |
| **Mark It Down, Cowboy** | `/markdown` | Render markdown files with syntax highlighting |

## Getting Started

```bash
cd Utilities.React
npm install
npm run dev
```

Open `http://localhost:5173` to view the app.

## Build

```bash
npm run build
```

Output goes to `Utilities.React/dist/`.

## Tech Stack

- React 18 + TypeScript
- Vite 5
- React Router DOM
- marked + highlight.js (markdown rendering)

## Project Structure

```
Utilities.React/
├── public/                               # Static assets
├── src/
│   ├── features/
│   │   ├── base64-tool/Base64Tool.tsx    # Base64 encode/decode
│   │   ├── diff-checker/DiffChecker.tsx  # Text diff comparison
│   │   ├── image-converter/ImageConverter.tsx  # Image format conversion
│   │   ├── landing/Landing.tsx           # Landing page
│   │   └── markdown-viewer/MarkdownViewer.tsx  # Markdown renderer
│   ├── App.tsx                           # Router setup
│   ├── main.tsx                          # Entry point
│   └── index.css                         # Global styles
└── Existing/                             # Original source files
```
