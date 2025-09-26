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


