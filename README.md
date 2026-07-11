# smilk launcher 🥛🧊

A custom, premium Minecraft launcher built with **Electron**, **Node.js**, and **minecraft-launcher-core**. Designed with a sleek, modern UI, dynamic animations, and built-in support for downloading and installing `.mrpack` modpacks (Modrinth).

## Features ✨

- **Beautiful Modern UI**: Glassmorphism, dynamic gradients, interactive hover effects, and smooth page transitions.
- **Modrinth (`.mrpack`) Support**: Automatically downloads, extracts, and parses modpacks directly from Modrinth formats.
- **Fabric & Forge Support**: Seamlessly installs and configures custom mod loaders.
- **Customizable RAM & JVM Args**: Easily change allocated RAM and Java arguments from the settings menu.
- **Built-in Console**: Real-time log streaming for game output and launcher events.
- **Auto-Updates**: Checks for modpack updates via remote `version.json` configurations.
- **Portable Architecture**: User data (logs, settings, instances) is safely stored in the OS's `AppData` directory, preventing permission issues in production builds.

## Tech Stack 🛠️

- **Frontend**: HTML5, CSS3 (Vanilla, custom properties, animations), JavaScript.
- **Backend**: Electron (Main process), Node.js.
- **Core Library**: `minecraft-launcher-core` (MCLC)
- **Modpack Handling**: `adm-zip` for `.mrpack` extraction.

## Installation & Running Locally 🚀

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or newer recommended)
- Java (Required to actually launch Minecraft)

### Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/Saiko/smilk-launcher.git
   cd smilk-launcher
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the launcher in development mode:
   ```bash
   npm start
   ```

## Building for Production 📦

To build a standalone `.exe` installer for Windows:

```bash
npm run build
```

The compiled installer will be available in the `dist/` directory.

## File Structure 📂

- `main.js`: Electron main process, IPC handlers, window management.
- `launcher.js`: Core logic for launching Minecraft via MCLC and handling classpath/libraries.
- `updater.js`: Logic for downloading, extracting `.mrpack` files, and verifying updates.
- `renderer.js`: Frontend logic, UI interactions, Settings state management.
- `preload.js` / `preload-console.js`: Context bridges for secure IPC communication.
- `index.html` / `style.css`: The main UI structure and styling.

---

*Made with ❤️ by Saiko*
