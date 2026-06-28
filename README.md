<p align="center">
  <img src="https://raw.githubusercontent.com/Stirling-Tools/Stirling-PDF/main/docs/stirling.png" width="80" alt="Stirling PDF logo">
</p>

<h1 align="center">Stirling PDF - The Open-Source PDF Platform</h1>

Stirling PDF is a powerful, open-source PDF editing platform. Run it as a personal desktop app, in the browser, or deploy it on your own servers with a private API. Edit, sign, redact, convert, and automate PDFs without sending documents to external services.

<p align="center">
  <a href="https://hub.docker.com/r/stirlingtools/stirling-pdf">
    <img src="https://img.shields.io/docker/pulls/frooodle/s-pdf" alt="Docker Pulls">
  </a>
  <a href="https://discord.gg/HYmhKj45pU">
    <img src="https://img.shields.io/discord/1068636748814483718?label=Discord" alt="Discord">
  </a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/Stirling-Tools/Stirling-PDF">
    <img src="https://api.scorecard.dev/projects/github.com/Stirling-Tools/Stirling-PDF/badge" alt="OpenSSF Scorecard">
  </a>
  <a href="https://github.com/Stirling-Tools/stirling-pdf">
    <img src="https://img.shields.io/github/stars/stirling-tools/stirling-pdf?style=social" alt="GitHub Repo stars">
  </a>
</p>

![Stirling PDF - Dashboard](images/home-light.png)

## Custom Modifications (nibir build)

This fork contains the following changes on top of upstream Stirling PDF:

### Editor Sidebar — Spaces

- **Spaces panel** replaces the old files list in the left sidebar. Files are grouped into named spaces (folders that live only inside the app, not on disk).
- **Drag files into spaces** — drag a file row onto a space header to assign it; drag onto Default to unassign.
- **Default space** shows files with no space assignment, collapsible.
- **Click a space header** to activate it and open all its files in the workbench at once.
- **Click a file row** to open it in the viewer. The active space switches automatically to wherever that file lives.
- **Checkbox (icon area only)** toggles workbench membership without opening the file. A checkmark appears only when you explicitly check a file this way.
- **Space color** — pick a color from the kebab menu (⋮) on any space. Color-filter dots appear beside the SPACES header when ≥ 2 distinct colors are in use; click a dot to filter the list.
- **Drag-and-drop OS files** onto the workbench area (while a PDF is already open) to add new files directly.
- **Multi-select** — check files via the icon area, or **shift-click** a row to select a contiguous range, or **Ctrl/Cmd-click** rows to toggle individual files.
- **Multi-select drag** — drag any checked file onto a space to move the whole selection together; the moved files auto-uncheck on drop.
- **Bulk actions** — when one or more files are checked, an **Uncheck all** button and a **Delete N items** button appear above the settings bar.
- **Rename in place** — double-click a file's name in the sidebar to rename it inline.
- **Output stays in its space** — editing/processing a file keeps the result in the same space instead of dropping it into Default.

### Document Tab Bar

A tab bar appears above the workbench showing one tab per open file. Tabs filter to the active space. Clicking × on a tab removes that file from the workbench.

### PDF Viewer / Reader

- **Default zoom is 100%** when opening a PDF (configurable in Settings → General → "Default reader zoom").
- **Auto-hiding bottom toolbar** — the page-navigation/zoom bar sits clear of the horizontal scrollbar, hides while scrolling, and reappears when the cursor moves into the bottom quarter of the page.
- **Toolbar tools** — added a **Text Box** button; removed **Read Aloud** and **Redact** from the viewer toolbar.

### PDF Text Editor — Install Missing Fonts

When a PDF uses a font that isn't embedded, the **Fonts on this page** panel flags it as MISSING. A **Download & install font** button fetches the matching family from Google Fonts and installs it permanently on the server (`customFiles/static/fonts/`), so it survives reloads and is shared across sessions. The font is verified by actually measuring that its glyphs render before the badge flips to PERFECT, and the editor canvas re-renders the text in the real font automatically — no manual reload. Text colour is preserved from the original PDF.

### All Tools Unlocked (No Sign-In Lock)

Every tool is enabled by default — there is no "sign in to unlock" gate. Tools that rely on an external backend program still need it installed: for example **Office conversions (.docx → .pdf, etc.) require LibreOffice**. On Windows the backend auto-detects LibreOffice at its standard install location (`C:\Program Files\LibreOffice\program\soffice.exe`), so installing it is enough — no PATH setup.

### Sign Tool — Saved Signatures

The Saved tab now shows all saved signatures as a scrollable list rather than a one-at-a-time carousel. Click a card to place the signature. Hover to reveal rename (pencil) and delete icons. Inline rename edits the label without leaving the list. Up to 10 signatures can be saved in browser storage.

### No Login Required

`security.enableLogin` is set to `false` in `app/core/configs/settings.yml`. The app opens directly without a login page. To re-enable authentication, set it back to `true` and restart.

---

## Key Capabilities

- **Everywhere you work** - Desktop client, browser UI, and self-hosted server with a private API.
- **50+ PDF tools** - Edit, merge, split, sign, redact, convert, OCR, compress, and more.
- **Automation & workflows** - No-code pipelines direct in UI with APIs to process millions of PDFs.
- **Enterprise‑grade** - SSO, auditing, and flexible on‑prem deployments.
- **Developer platform** - REST APIs available for nearly all tools to integrate into your existing systems.
- **Global UI** - Interface available in 40+ languages.

For a full feature list, see the docs: **https://docs.stirlingpdf.com**

## Quick Start

```bash
docker run -p 8080:8080 docker.stirlingpdf.com/stirlingtools/stirling-pdf
```

Then open: http://localhost:8080

For full installation options (including desktop and Kubernetes), see our [Documentation Guide](https://docs.stirlingpdf.com/#documentation-guide).

## Resources

- [**Documentation**](https://docs.stirlingpdf.com)
- [**Homepage**](https://stirling.com)
- [**API Docs**](https://registry.scalar.com/@stirlingpdf/apis/stirling-pdf-processing-api/)
- [**Server Plan & Enterprise**](https://docs.stirlingpdf.com/Paid-Offerings)

## Support

- **Community** [Discord](https://discord.gg/HYmhKj45pU)
- **Bug Reports**: [Github issues](https://github.com/Stirling-Tools/Stirling-PDF/issues)

## Running Locally

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| [Task](https://taskfile.dev/installation/) | ≥ 3.x | Unified command runner (`task dev`) |
| JDK | 25 | Auto-provisioned by Gradle on first run — no manual install needed |
| Node.js | ≥ 22 LTS | Required for the frontend |

**Windows only — allow npm scripts in PowerShell** (one-time, in a new PowerShell window):
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
```
Or use **Git Bash / cmd** instead of PowerShell — they don't have this restriction.

### Install dependencies

```bash
task install
```

### Start backend + frontend together

```bash
task dev
```

This picks two free ports (default 8080 for backend, 5173 for frontend) and opens the app in your browser automatically. The backend recompiles on save; the frontend has Vite HMR.

### Start them separately

```bash
task backend:dev    # Spring Boot on :8080
task frontend:dev   # Vite dev server on :5173
```

When running separately the frontend proxies API calls to `http://localhost:8080` by default.

### Other useful commands

```bash
task                    # List common commands
task --list             # List all available tasks
task frontend:typecheck # TypeScript type-check
task frontend:lint      # ESLint + cycle detection
task frontend:test      # Run tests
```

For desktop app (Tauri) development, see [frontend/README.md](frontend/README.md#tauri).

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

This project uses [Task](https://taskfile.dev/) as a unified command runner for all build, dev, and test commands. See the [Developer Guide](DeveloperGuide.md) for full details.

For adding translations, see the [Translation Guide](devGuide/HowToAddNewLanguage.md).

## License

Stirling PDF is open-core. See [LICENSE](LICENSE) for details.
