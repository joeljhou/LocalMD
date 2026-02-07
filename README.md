# LocalMD - Local Markdown Editor Chrome Extension

LocalMD is a modern, lightweight Chrome extension for editing Markdown files locally. It features real-time preview, split-view editing, and support for common Markdown syntax.

## Features

- **Local File Management**: Open, edit, and save `.md` files directly from your local file system.
- **Real-time Preview**: See your changes instantly as you type.
- **Split & Fullscreen Modes**: Toggle between split view (Editor + Preview) and editor-only mode.
- **Modern UI**: Clean interface built with React and Tailwind CSS.
- **Dark/Light Mode**: Automatically adapts to your system theme or can be toggled manually.
- **Syntax Highlighting**: Code blocks are syntax highlighted.
- **Drag & Drop**: Drag a markdown file into the editor to open it.
- **Shortcuts**: `Cmd/Ctrl + S` to save.

## Installation

Since this is a developer build, you need to load it as an "Unpacked Extension" in Chrome.

1. **Build the Project**:
   Ensure you have Node.js installed, then run:
   ```bash
   npm install
   npm run build
   ```
   This will create a `dist` folder containing the extension.

2. **Load into Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`.
   - Enable **Developer mode** (toggle in the top-right corner).
   - Click **Load unpacked** (top-left).
   - Select the `dist` folder inside the `LocalMD` project directory.

3. **Usage**:
   - Click the **LocalMD** extension icon in your Chrome toolbar.
   - A new tab will open with the editor.
   - Click the "Open" icon or drag a `.md` file to start editing.

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- React Markdown + Remark GFM
- File System Access API

## License

MIT
