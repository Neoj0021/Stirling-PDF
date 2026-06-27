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

### Document Tab Bar

A tab bar appears above the workbench showing one tab per open file. Tabs filter to the active space. Clicking × on a tab removes that file from the workbench.

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

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

This project uses [Task](https://taskfile.dev/) as a unified command runner for all build, dev, and test commands. Run `task dev` to get started running the editor, run `task` to see the most common commands, or see the [Developer Guide](DeveloperGuide.md) for full details.

For adding translations, see the [Translation Guide](devGuide/HowToAddNewLanguage.md).

## License

Stirling PDF is open-core. See [LICENSE](LICENSE) for details.
