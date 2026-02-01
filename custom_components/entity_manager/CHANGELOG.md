# Changelog

## Version 2.0.0 - Major UI/UX Update

### 🎨 UI Enhancements
- **Modern Card Design**: Updated integration cards with colored borders and blue glow effects for better visibility
- **Integration Logos**: Added official Home Assistant brand logos to each integration card
- **Custom Icon**: Added custom Entity Manager icon for the integration card in Home Assistant's integrations page
- **Improved Theme Support**: Full automatic light/dark theme switching with MutationObserver
- **Better Borders**: Enhanced border visibility in both light and dark modes with colored shadows

### 🔍 Search & Filtering
- **Domain Filter**: Added dropdown filter to show entities by domain (sensor, light, switch, etc.)
- **Text Search**: Enhanced search functionality for entities, integrations, and devices
- **View State Filter**: Filter by All, Enabled, or Disabled entities
- **Custom Dropdown**: Built custom themed dropdown for domain selection with proper dark mode support

### ✨ New Features
- **Entity Renaming**: Added ability to rename entities with automatic propagation across all automations, scripts, and helpers
  - Click the ✎ (pencil) button next to any entity
  - Edit the entity name while preserving the domain
  - Updates automatically propagate throughout Home Assistant
- **Confirmation Dialogs**: Added Yes/No confirmation dialogs for Enable All and Disable All actions
  - Prevents accidental bulk operations
  - Clear warning messages about impact on automations and dashboards

### 🔧 Technical Improvements
- **Cache Busting**: Added timestamp-based cache busting for frontend updates
- **WebSocket API**: New `entity_manager/rename_entity` endpoint
- **Better Error Handling**: Improved error messages and validation
- **Optimized Performance**: Better state management and rendering

### 🐛 Bug Fixes
- Fixed domain dropdown background transparency in dark mode
- Fixed border visibility in dark mode
- Improved CSS custom property handling for theme variables

### 📦 Files Modified
- `frontend/entity-manager-panel.js` - Major UI overhaul
- `websocket_api.py` - Added rename entity handler
- `manifest.json` - Version bump and icon addition
- `icon.svg` - New custom integration icon
- `__init__.py` - Cache busting support

---

## Version 1.0.0 - Initial Release

### Features
- View all entities grouped by integration and device
- Enable/disable individual entities
- Bulk enable/disable operations
- Entity state visibility
- Device organization
