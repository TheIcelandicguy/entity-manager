# Entity Manager for Home Assistant
A powerful, feature-rich Home Assistant integration for managing entities across all your integrations. View, enable, disable, rename, compare, analyze, and bulk-manage entities and firmware updates from a single modern interface.
![Version](https://img.shields.io/badge/version-2.9.0-blue)
![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2024.1+-blue)
![Downloads](https://img.shields.io/github/downloads/TheIcelandicguy/entity-manager/total?color=brightgreen)
[![HACS](https://img.shields.io/badge/HACS-Custom-orange)](https://github.com/hacs/integration)
![License](https://img.shields.io/badge/license-MIT-green)
---
## Table of Contents
- [Features](#features)
  - [Entity Management](#entity-management)
  - [Entity Renaming](#entity-renaming)
  - [Search & Filtering](#search--filtering)
  - [Sidebar Navigation](#sidebar-navigation)
  - [Smart Grouping](#smart-grouping)
  - [Favorites](#favorites)
  - [Custom Tags](#custom-tags)
  - [Entity Aliases](#entity-aliases)
  - [Labels Integration](#labels-integration)
  - [Entity Comparison](#entity-comparison)
  - [Entity Analysis](#entity-analysis)
  - [Activity Log](#activity-log)
  - [Undo / Redo](#undo--redo)
  - [Filter Presets](#filter-presets)
  - [Column Customization](#column-customization)
  - [Firmware Update Manager](#firmware-update-manager)
  - [Export & Import](#export--import)
  - [Theme System](#theme-system)
  - [Context Menu](#context-menu)
  - [Voice Assistant](#voice-assistant)
  - [Lovelace Dashboard Card](#lovelace-dashboard-card)
  - [Template Sensors](#template-sensors)
  - [Statistics Dashboard](#statistics-dashboard)
  - [Mobile & Responsive Design](#mobile--responsive-design)
- [Installation](#installation)
- [Usage](#usage)
- [Technical Details](#technical-details)
- [Screenshots](#screenshots)
- [Contributing](#contributing)
- [License](#license)
---
## Features
### Entity Management
- View all entities organized by **Integration > Device > Entity**
- Enable or disable individual entities with one click
- Bulk enable/disable with confirmation dialogs (up to 500 entities at once)
- Real-time entity state display with color-coded status badges
- Alphabetically sorted integrations for easy navigation
- Device grouping with entity counts per device and integration
### Entity Renaming
- Click-to-rename any entity directly from the panel
- **Domain preservation** -- the `sensor.`, `light.`, etc. prefix is locked and stays intact
- **Automatic propagation** across automations, scripts, and helpers
- Conflict validation prevents duplicate entity IDs
- **Bulk rename** with regex find/replace -- preview changes before applying
- Case-sensitive and regex pattern matching options
### Search & Filtering
Entity Manager provides multiple ways to find exactly what you need:
| Filter Type | Description |
|---|---|
| **Text Search** | Search across entity IDs, names, integrations, and devices in real time |
| **Domain Filter** | Dropdown to filter by entity type (sensor, light, switch, binary_sensor, etc.) |
| **State Filter** | Toggle between All, Enabled, or Disabled with live entity counts |
| **Integration Filter** | Click an integration in the sidebar to show only its entities |
| **Label Filter** | Filter by Home Assistant labels |
| **Tag Filter** | Filter by custom tags using `#tagname` syntax |
| **Filter Presets** | Save and load your favorite filter combinations |
All filter buttons show **live counts** with color-coded indicators: green for enabled, red for disabled, amber for updates.
### Sidebar Navigation
A collapsible sidebar provides quick access to every feature:
- **Actions** -- Undo, Redo, Export, Import
- **Quick Filters** -- Favorites, Activity Log, Comparison View, Column Settings
- **Labels** -- Browse and filter by Home Assistant labels with entity counts
- **Smart Groups** -- Switch between grouping modes
- **Integrations** -- Quick-filter list with integration icons from Home Assistant Brands
- **Help** -- Built-in guide and keyboard shortcuts reference
Toggle the sidebar with **Ctrl+B** or the mobile menu button. Collapse state is remembered between sessions.
### Smart Grouping
Group entities by different criteria to get the view you need:
- **Integration** (default) -- organized by integration and device
- **Room / Area** -- grouped by Home Assistant area assignments
- **Type** -- grouped by entity domain (all sensors together, all lights together, etc.)
Toggle with **Ctrl+G** or from the sidebar. Your preference is saved.
### Favorites
- Star any entity to mark it as a favorite
- Dedicated **Favorites** filter in the sidebar shows only starred entities
- Favorites count displayed in the sidebar
- Add/remove via right-click context menu or bulk selection
- Persisted in browser local storage
### Custom Tags
- Add unlimited custom tags to any entity (e.g., `#critical`, `#outdoor`, `#basement`)
- Tag chips displayed on entities with one-click removal
- Search entities by tag using `#` prefix in the search box
- Auto-complete suggestions from your existing tags
- Manage tags via right-click context menu
- Persisted in browser local storage
### Entity Aliases
- Create custom display names for entities without renaming them
- Non-destructive -- the actual entity ID is unchanged
- Set aliases through the right-click context menu
- Persisted in browser local storage
### Labels Integration
- View and filter by **Home Assistant's built-in label system**
- Create new labels directly from Entity Manager
- Labels shown in the sidebar with entity counts
- Expandable list with refresh capability
- Label data is cached for performance
### Entity Comparison
- Compare up to **4 entities side-by-side** in a table view
- View all properties and metadata for each entity
- Add entities via right-click context menu or sidebar
- Comparison counter shown in the sidebar
- Clear comparison with one click
### Entity Analysis
Right-click any entity to access deep analysis tools:
- **Impact Analysis** -- shows which automations reference the entity and would be affected by changes
- **Dependencies** -- displays all related automations and scripts
- **Statistics** -- detailed entity properties, metadata, and configuration
- **State History** -- view entity state changes over time
### Activity Log
- Tracks your recent operations: enables, disables, renames, and bulk actions
- Stores up to **100 recent activities** with timestamps
- Accessible from the sidebar
- Clear log button to start fresh
- Persisted in browser local storage
### Undo / Redo
Full operation history with unlimited undo/redo:
- **Ctrl+Z** to undo the last operation
- **Ctrl+Shift+Z** or **Ctrl+Y** to redo
- Supports: enable, disable, rename, and all bulk operations
- Undo/Redo buttons also available in the sidebar
### Filter Presets
- Save your current filter configuration (domain, search term, state) as a named preset
- Load any saved preset to instantly restore a filter combination
- Delete presets you no longer need
- Quick-access buttons for each saved preset
### Column Customization
Choose which columns to display in the entity table:
- Entity ID
- State
- Device
- Entity Category
- Disabled By
- Automations Count
- Tags
- Alias
Toggle columns from the sidebar **Columns** button. Preferences are saved between sessions.
### Firmware Update Manager
A dedicated **Updates** tab to manage all firmware and software updates:
- View all available updates in one place
- **Filter by stability**: All Updates, Stable Only, Beta Only
- **Filter by category**: All Types, Devices Only, Integrations Only
- **Hide up-to-date** checkbox to focus on pending updates
- **Select All** checkbox for quick bulk selection
- View **release notes** before updating
- **Bulk update** multiple items at once
- Alphabetical sorting by title
- Live update count tracking
### Export & Import
- **Export entity configurations** to JSON -- includes enabled/disabled states for all entities
- **Import configurations** from a previously exported JSON file to restore states
- **Export/Import custom themes** separately
- Date-stamped export files for easy versioning
- Access from the sidebar or **Ctrl+E**
### Theme System
Entity Manager ships with a comprehensive theming engine:
**4 Built-in Themes:**
1. **Default** -- follows your Home Assistant theme
2. **Dark** -- dedicated dark mode
3. **High Contrast** -- optimized for accessibility
4. **Purple** -- alternative color scheme
**Custom Theme Editor:**
- Create unlimited custom themes with a visual color picker
- Customize every color: primary, success, danger, warning, text, backgrounds, borders, shadows
- **Background image support** with adjustable overlay opacity
- Light/dark mode toggle per theme
- Real-time preview with color chips
- Import/export themes as JSON to share with others
**Automatic Mode:**
- Detects Home Assistant light/dark mode
- Respects system color scheme preferences
- Manual override available per theme
### Context Menu
Right-click any entity (or multi-selection) for a full context menu:
**Single entity:**
- Rename / Enable / Disable
- Add to Favorites
- Manage Tags / Labels / Alias
- Add to Comparison
- View Statistics / State History
- Show Dependencies / Analyze Impact
- Copy Entity ID
- Open in Home Assistant
**Multiple entities selected:**
- Bulk Rename (with regex)
- Bulk Enable / Disable
- Bulk Add to Favorites
- Bulk Add Labels
- Bulk Compare
- Clear Selection

### Voice Assistant
Control Entity Manager hands-free with voice commands:
- *"Enable entity {name}"*
- *"Disable entity {name}"*
- *"Activate entity {name}"*
- *"Deactivate entity {name}"*
- *"Registry enable/disable {name}"*
Voice commands enforce admin-only access for safety.

### Lovelace Dashboard Card
Embed Entity Manager directly into your Lovelace dashboard with the custom card:

```yaml
type: custom:entity-manager-card
```

**Card Features:**
- Search and filter entities by ID, device, or integration
- Multi-select entity management with bulk operations
- Quick enable/disable toggle for entities
- Expandable groups by integration and device
- Live entity counts and status badges
- Mobile-friendly responsive layout

**Example Dashboard Configuration:**
```yaml
views:
  - title: Entity Management
    cards:
      - type: custom:entity-manager-card
        title: Manage Entities
```

**Card Options:**
| Option | Type | Description |
|--------|------|-------------|
| `state_filter` | string | Filter: `all`, `enabled`, or `disabled` |
| `integration_filter` | string | Show only entities from specific integration |
| `domain_filter` | string | Show only entities of specific domain (e.g., `sensor`, `light`) |
| `show_disabled_only` | boolean | Show only disabled entities (default: false) |
| `compact_mode` | boolean | Reduce card height with compact layout (default: false) |

### Template Sensors
Entity Manager exposes template sensors for entity statistics and automation conditions:

**Available Template Sensors:**
```yaml
template:
  - sensor:
      - name: Entity Manager Disabled Entities
        unique_id: entity_manager_disabled_count
        state: "{{ states.entity_manager.disabled_entity_count | default(0) }}"
        unit_of_measurement: entities
        state_class: measurement
        icon: mdi:checkbox-marked-outline

      - name: Entity Manager Enabled Entities
        unique_id: entity_manager_enabled_count
        state: "{{ states.entity_manager.enabled_entity_count | default(0) }}"
        unit_of_measurement: entities
        state_class: measurement
        icon: mdi:checkbox-blank-outline

      - name: Entity Manager Total Entities
        unique_id: entity_manager_total_count
        state: "{{ states.entity_manager.total_entity_count | default(0) }}"
        unit_of_measurement: entities
        state_class: measurement
        icon: mdi:layers

      - name: Entity Manager Disabled Entities by Integration
        unique_id: entity_manager_integration_stats
        state: "{{ states.entity_manager.integration_disabled_stats | default('{}') }}"
        icon: mdi:layers-multiple
```

**Using in Automations:**
```yaml
automation:
  - alias: "Alert on too many disabled entities"
    trigger:
      - platform: numeric_state
        entity_id: sensor.entity_manager_disabled_entities
        above: 100
    action:
      - service: persistent_notification.create
        data:
          title: "Entity Manager Alert"
          message: >
            {{ trigger.to_state.state }} entities are currently disabled.
            Consider reviewing in Entity Manager panel.
```

**JSON Sensor for Advanced Tracking:**
```yaml
template:
  - sensor:
      - name: Entity Manager Export
        unique_id: entity_manager_export
        state: "{{ now().isoformat() }}"
        attributes:
          disabled_entities: "{{ state_attr('sensor.entity_manager_export', 'disabled_entities') }}"
          by_integration: "{{ state_attr('sensor.entity_manager_export', 'by_integration') }}"
          by_domain: "{{ state_attr('sensor.entity_manager_export', 'by_domain') }}"
```

### Statistics Dashboard
The toolbar displays live stats for your Home Assistant instance:
- Integration count
- Device count
- Total entity count
- Automation count
- Script count
- Helper count
- Update count (amber-highlighted when updates are available)
### Mobile & Responsive Design
- Fully responsive layout for phones, tablets, and desktops
- Collapsible sidebar with dedicated mobile toggle button
- Touch-friendly buttons and controls
- Optimized dialogs and overlays for small screens
- Auto-close sidebar on mobile when tapping outside
---
## Installation
### HACS (Recommended)
1. Open **HACS** in Home Assistant
2. Go to **Integrations**
3. Click the three dots menu in the top right
4. Select **Custom repositories**
5. Add `https://github.com/TheIcelandicguy/entity-manager` as an **Integration**
6. Click **Install**
7. Restart Home Assistant
### Manual Installation
1. Download the `custom_components/entity_manager` folder from this repository
2. Copy it to your Home Assistant `custom_components` directory
3. Restart Home Assistant
---
## Usage
### Getting Started
1. After installation, go to **Settings > Integrations > Add Integration**
2. Search for **Entity Manager** and add it
3. The **Entity Manager** panel will appear in your Home Assistant sidebar
4. Click it to open the full management interface
### Managing Entities
- **Expand an integration** to see all its devices and entities
- Click the **checkmark** to enable or the **X** to disable an entity
- Use **Enable All / Disable All** buttons for entire integrations
- **Select multiple entities** with checkboxes, then use bulk actions in the toolbar
### Renaming Entities
1. Click the **pencil icon** next to any entity
2. Edit the name (the domain prefix is locked)
3. Click **Rename** to confirm
4. The change automatically propagates across all automations, scripts, and helpers
### Using Filters
- Pick a **domain** from the dropdown to narrow by entity type
- Type in the **search box** to find entities by name, ID, or integration
- Click **Enabled / Disabled / Updates** buttons to filter by state
- Click an **integration** in the sidebar to show only its entities
- Use **#tagname** in search to find tagged entities
### Managing Updates
1. Click the **Updates** filter button in the toolbar
2. Use the filter dropdowns to narrow by stability or category
3. Check the **Select All** box or pick individual updates
4. Click **Update Selected** to apply
---
## Technical Details
### Requirements
- **Home Assistant** 2024.1.0 or later
- Modern web browser with ES6+ support
- Admin user account (all operations require admin privileges)
### Architecture
```
Frontend (Vanilla JS Web Component)
         | WebSocket
Backend (Python WebSocket API)
         |
Home Assistant Entity & Device Registries
```
### Components
| Component | Description |
|---|---|
| `__init__.py` | Integration setup, service registration, sidebar panel |
| `websocket_api.py` | 7 WebSocket command handlers |
| `voice_assistant.py` | Voice intent handlers |
| `config_flow.py` | UI-based configuration flow |
| `entity-manager-panel.js` | Full frontend as a single web component |
| `entity-manager-panel.css` | Extracted stylesheet |
### WebSocket API
| Command | Parameters | Description |
|---|---|---|
| `entity_manager/get_disabled_entities` | `state`: disabled, enabled, or all | Fetch entities grouped by integration/device |
| `entity_manager/enable_entity` | `entity_id` | Enable a single entity |
| `entity_manager/disable_entity` | `entity_id` | Disable a single entity |
| `entity_manager/bulk_enable` | `entity_ids` (max 500) | Enable multiple entities |
| `entity_manager/bulk_disable` | `entity_ids` (max 500) | Disable multiple entities |
| `entity_manager/rename_entity` | `entity_id`, `new_entity_id` | Rename an entity |
| `entity_manager/export_states` | -- | Export all entity states to JSON |
### Home Assistant Services
- `entity_manager.enable_entity`
- `entity_manager.disable_entity`
- `entity_manager.bulk_enable`
- `entity_manager.bulk_disable`
- `entity_manager.rename_entity`
- `entity_manager.export_states`
### Local Storage Keys
Entity Manager stores user preferences in the browser:
| Key | Data |
|---|---|
| `em-favorites` | Starred entities |
| `em-activity-log` | Recent operation history |
| `em-custom-themes` | User-created themes |
| `em-active-theme` | Currently selected theme |
| `em-entity-tags` | Custom entity tags |
| `em-entity-aliases` | Entity display aliases |
| `em-filter-presets` | Saved filter combinations |
| `em-visible-columns` | Column visibility preferences |
| `em-sidebar-collapsed` | Sidebar state |
| `em-smart-group-mode` | Active grouping mode |
| `em-entity-order` | Custom entity ordering |
---
## Screenshots
### Light Theme
![Entity Manager Light Mode](screenshots/light-mode.png)
### Rename Dialog
![Rename Entity](screenshots/rename-dialog.png)
---
## Use Cases
- **Cleaning up after integrations** -- disable the dozens of unused entities that some integrations create
- **Organizing large systems** -- manage hundreds of entities efficiently with filters, tags, and groups
- **Standardizing naming** -- bulk rename entities with regex to fix naming conventions across your setup
- **Troubleshooting** -- analyze entity dependencies and automation impact before making changes
- **Performance optimization** -- disable unnecessary entities to reduce system load
- **Firmware management** -- keep all devices and integrations up to date from one screen
- **Backup & restore** -- export entity configurations before major changes, import to roll back
---
## Troubleshooting
### Panel Not Showing
- Ensure the integration is added via **Settings > Integrations**
- Check that your user has **admin privileges**
### Frontend Not Updating
- Clear your browser cache (Ctrl+Shift+R)
- Check the browser console for JavaScript errors
### Debug Logging
Add to your `configuration.yaml`:
```yaml
logger:
  default: info
  logs:
    custom_components.entity_manager: debug
```
---
## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.
## License
This project is licensed under the MIT License -- see the [LICENSE](LICENSE) file for details.
## Author
**TheIcelandicguy**
- GitHub: [@TheIcelandicguy](https://github.com/TheIcelandicguy)
## Acknowledgments
- Home Assistant community for inspiration and support
- [Home Assistant Brands](https://github.com/home-assistant/brands) for integration icons
- All contributors and users of Entity Manager
---
**If you find this integration helpful, please consider giving it a star on GitHub!**
