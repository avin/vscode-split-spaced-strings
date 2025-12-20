# Change Log

All notable changes to the "Split Spaced Strings" extension will be documented in this file.

## [0.2.0] - 2024-12-20

### Added
- **Auto-Collapse on Save** feature: New optional setting to automatically collapse split strings back to single line when saving files
  - Controlled by `splitSpacedStrings.autoCollapseOnSave` setting (disabled by default)
  - Visual tracking of split strings with yellow background highlighting
  - Hover messages to indicate auto-collapse behavior
  - Multiple split strings can be tracked and collapsed simultaneously
  - Automatic cleanup of tracking data when documents are closed

### Changed
- Enhanced extension to track which strings have been split using the toggle command
- Added visual decorators to highlight strings that will be auto-collapsed

## [0.1.1] - Previous Version

### Features
- Toggle between single-line and multi-line string formats
- Smart string detection for quotes, double quotes, and template literals
- Word-per-line splitting for better readability
- Preserves indentation
- Keyboard shortcut: Alt+Shift+S
- Cursor position tracking during transformations

## How Auto-Collapse Works

When `splitSpacedStrings.autoCollapseOnSave` is enabled:

1. Split a string using `Alt+Shift+S` - it will be highlighted with a yellow background
2. The extension tracks all split strings in the current file
3. When you save the file (`Ctrl+S`), all tracked strings automatically collapse back to single line
4. Tracking is cleared after save or when the file is closed

This is useful for:
- Temporarily expanding long strings for easier editing
- Ensuring committed code stays compact
- Quick review of long className or style strings
- Working with Tailwind CSS classes during development
