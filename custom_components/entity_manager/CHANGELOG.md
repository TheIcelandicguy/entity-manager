# Changelog

All notable changes to Entity Manager will be documented in this file.

## [2.9.0] - 2026-02-17

### Added
- Complete changelog entries for v2.8.0 and v2.8.1 in root repository
- Aligned version references across all project files (manifest, README, package.json, docs)
- **Lovelace Dashboard Card Documentation**: Comprehensive guide for using `custom:entity-manager-card` on Lovelace dashboards
  - Card configuration options (state_filter, integration_filter, domain_filter, show_disabled_only, compact_mode)
  - Feature overview and dashboard examples
  - Integration with Lovelace views and cards
- **Template Sensors Configuration**: Support for entity statistics tracking
  - Disabled/enabled entities count sensors
  - Total entities sensor
  - Integration statistics sensor
  - JSON export sensor for automation integration
  - Examples for using in automations and conditions

### Changed
- Updated README version badge to 2.9.0
- Updated manifest.json version to 2.9.0
- Updated package.json version to 2.9.0
- Updated PROJECT_SUMMARY.md version references to 2.9.0
- Enhanced Table of Contents with new Lovelace and Template Sensors sections

### Documentation
- Ensured consistency between Git tags, releases, and version references
- All documentation now reflects accurate release history
- Added comprehensive integration examples for dashboard cards and template sensors

---

## [2.8.1] - 2026-02-17

### Added
- **UI Dialog Improvements**: Replaced browser alert/confirm/prompt dialogs with custom in-app dialogs for theme management and filter presets
- **Clickable Statistics**: Automation, Script, and Helper stats in toolbar now clickable to open filtered lists
- **Entity Action Buttons**: Added info and edit action buttons in entity list dialogs for quick navigation to HA UI
- **Input Sanitization**: Added `_escapeHtml()` and `_escapeAttr()` methods for safe theme/preset name rendering

### Fixed
- **XSS Vulnerability**: Escaped theme names and preset names in DOM rendering to prevent HTML injection
- **Admin Permission Logic**: Improved voice intent authorization checks to explicitly deny non-admin/no-user contexts

### Changed
- **Code Quality**: Consolidated enable/disable entity logic into shared helpers in `websocket_api.py`
- **Voice Assistant**: Refactored permission checks for clarity and consistency between enable/disable intents
- **Services Configuration**: Removed obsolete service definitions (bulk_enable, bulk_disable, rename_entity, export_states) from services.yaml as they're not exposed via service calls

### Technical
- Moved `VALID_ENTITY_ID` regex to `const.py` for consistency with voice assistant and websocket API
- Moved `MAX_BULK_ENTITIES` constant to `const.py` for centralized configuration

---

## [2.8.0] - 2026-02-16

### Added
- ✅ **CI/CD Automation**: Full GitHub Actions workflow for linting, type checking, testing, and security scanning
  - JavaScript linting with ESLint
  - Python linting & formatting with Ruff
  - Type checking with MyPy
  - Python tests on 3.11 and 3.12
  - Security scanning with Bandit
- 📚 **Comprehensive Documentation Overhaul**
  - Rewrote README with detailed feature descriptions, architecture, and troubleshooting
  - Added installation corrections and usage walkthroughs
  - Documented all WebSocket API endpoints and local storage keys
  - Added use cases, requirements, and disclaimer sections
- ⚙️ **ESLint Configuration**: Added `.eslintrc.js` for consistent frontend code standards

### Fixed
- **Installation Docs**: Corrected repository URL from placeholder to `https://github.com/TheIcelandicguy/entity-manager`
- **Component Path**: Updated install instructions to reference `custom_components/entity_manager` correctly

### Changed
- **Code Formatting**: Applied consistent formatting across Python backend (spacing, imports)
- **README Version**: Updated badge from 2.6.0 to 2.8.0

### Technical Details
- Service schema formatting for consistency
- Config flow type hints and formatting improvements
- WebSocket handler formatting and documentation improvements

---

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
