## 2025-09-29

### Added
- **Installer Package Manager**: New `reploy installer` command for quick access to installer packages
  - Auto-detection of latest installer files by modification time
  - Support for wildcard pattern matching (e.g., `*.exe`, `Example-enterprise-x64-*.exe`)
  - Interactive mode for installer selection
  - Cross-platform support (Windows, macOS, Linux)
- **Configuration Schema**: Extended config schema to support installer directories
- **Sample Configuration**: Added `reploy.config.sample.json` with comprehensive examples

### Changed
- **Documentation**: Updated README with installer functionality and improved setup instructions

### Features
- `reploy installer --list`: List all configured installers
- `reploy installer --name <name>`: Open specific installer (latest version)
- `reploy installer --interactive`: Interactive installer selection
- `reploy installer`: Show available installers

## 2025-09-26

### Changed
- Pipeline new-window behavior simplified: run target command then `pause` to ensure windows stay open consistently across environments.
- Documented `openWindow` precedence (command > step > default) in README.

### Notes
- If using Windows Terminal, transient failures may still appear as quick-close windows. The launcher now avoids complex batch constructs to reduce mis-parsing.
- Manual verification snippet (for reference):
  ```bat
  cmd /c start "" /D "<target-dir>" cmd /s /k "yarn run dev"
  ```


