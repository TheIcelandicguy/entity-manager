# Changelog

All notable changes to Entity Manager will be documented in this file.

## [2.8.0] - 2026-02-16

### Added
- **Clickable Stat Cards**: Automations, Scripts, and Helpers stat cards now open entity list dialogs with info and edit action buttons per entity
- **GitHub Actions CI Pipeline**: Comprehensive CI workflow covering JavaScript linting (ESLint), Python linting/formatting (Ruff), type checking (Mypy), Python tests (3.11 & 3.12), frontend tests, E2E tests, and security scanning (Bandit)
- **ESLint Configuration**: `eslint.config.js` with ES2022 rules for consistent JavaScript code quality

### Changed
- **Python Formatting**: Applied Ruff auto-formatting across all Python source files
- **README**: Comprehensive rewrite with full feature documentation, usage instructions, and technical details

## [2.7.0] - 2026-02-09

### Fixed
- **CSS Loading**: Fixed critical issue where CSS styles were not being applied due to Home Assistant's panel isolation. CSS is now injected directly into the component as a `<style>` element instead of relying on external `<link>` tags in `document.head`.
- **Theme Dropdown**: Fixed theme dropdown menu appearing behind page content by using `position: fixed` with proper `z-index: 10000`.
- **Mobile Sidebar Scrolling**: Fixed navigation sidebar not scrolling on mobile devices:
  - Changed `overflow: hidden` to `overflow-y: auto` for scrollable content
  - Used `100vh - 64px` viewport height calculation
  - Added smooth touch scrolling (`-webkit-overflow-scrolling: touch`)
  - Added `overscroll-behavior: contain` to prevent scroll chaining
  - Added `max-width: 85vw` for very small screens
- **Desktop Sidebar Scrolling**: Fixed sidebar scrolling on desktop by adding `height: 100%` and making the header sticky.
- **Header Overflow**: Changed `overflow: hidden` to `overflow: visible` on app header to prevent dropdown clipping.

### Removed
- **Keyboard Shortcuts**: Removed all keyboard shortcut functionality including:
  - Keyboard event handlers and bindings
  - `_handleKeyboard()` method
  - `_showKeyboardShortcutsHelp()` method
  - Sidebar "Keyboard Shortcuts" menu item
  - "Keyboard Shortcuts" button in Help Guide dialog
  - Associated CSS styles for shortcuts dialog
- **Debug Logging**: Removed console.log debug statements (kept console.error for actual errors)

### Changed
- **CSS Cache Busting**: Added `Date.now()` timestamp to CSS URLs to ensure fresh styles on each load.
- **Base URL Fallback**: Changed fallback base URL from `/local/community/entity_manager/` to `/api/entity_manager/frontend/` for correct path resolution.

### Technical Details
- Panel registration uses `embed_iframe: False` for proper integration with Home Assistant
- CSS is fetched via `fetch()` and injected as inline `<style>` element to work within HA's panel isolation
- Service schema uses `vol.Schema` with `cv.entity_id` validation
- WebSocket API endpoints are protected with `@websocket_api.require_admin` decorator

## [2.6.0] - Previous Release

### Features
- Mobile UI improvements
- Theme customization (predefined + custom themes)
- Theme import/export functionality
- Sidebar navigation with integrations list
- Entity filtering (all/enabled/disabled/updates)
- Domain filtering
- Search functionality
- Bulk enable/disable operations
- Entity renaming
- Favorites system
- Label filtering
- Activity log
- Entity comparison
- Smart grouping
- Help guide

---

For more information, visit the [GitHub repository](https://github.com/TheIcelandicguy/entity-manager).
