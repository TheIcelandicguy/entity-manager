# Entity Manager for Home Assistant
A powerful, feature-rich Home Assistant integration for managing entities across all your integrations. View, enable, disable, rename, analyze, and bulk-manage entities and firmware updates from a single modern interface.
![Version](https://img.shields.io/badge/version-2.14.0-blue)
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
  - [Grouping](#grouping)
  - [Favorites](#favorites)
  - [Entity Aliases](#entity-aliases)
  - [Labels Integration](#labels-integration)
  - [Entity Comparison](#entity-comparison)
  - [Entity Analysis](#entity-analysis)
  - [Activity Log](#activity-log)
  - [Undo / Redo](#undo--redo)
  - [Filter Presets](#filter-presets)
  - [Column Customization](#column-customization)
  - [Devices View](#devices-view)
  - [Entity Detail Dialog](#entity-detail-dialog)
  - [Firmware Update Manager](#firmware-update-manager)
  - [Export & Import](#export--import)
  - [Theme System](#theme-system)
  - [Context Menu](#context-menu)
  - [Voice Assistant](#voice-assistant)
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
- **Bulk Rename** (✎✎) and **Bulk Labels** (🏷️) buttons on every entity card — greyed out until 2+ entities are selected, then activate instantly as you check boxes
### Entity Renaming
- Click-to-rename any entity directly from the panel
- **Domain preservation** -- the `sensor.`, `light.`, etc. prefix is locked and stays intact
- **Automatic propagation** across automations, scripts, and helpers
- Conflict validation prevents duplicate entity IDs
- **Bulk Rename panel** — opens as a full-width inline view with a split layout: entity picker on the left (grouped by integration → device, collapsible, with per-group checkboxes) and the rename queue on the right
- **Live preview** in the queue — each entry shows the original entity ID, an editable new name field, and a live preview of the resulting ID (turns green when changed)
- **Find & Replace** at the top filters the entity picker in real time as you type; supports regex and case-sensitive matching
- **Domain preservation** — the `sensor.`, `light.`, etc. prefix is always locked
- **Automatic propagation** across automations, scripts, and helpers
- Conflict validation prevents duplicate entity IDs
### Search & Filtering
Entity Manager provides multiple ways to find exactly what you need:

| Filter Type | Description |
|---|---|
| **Fuzzy Search** | Smart search with fuzzy matching -- type "snr" to find "sensor", matches characters in order across entity IDs, names, integrations, and devices |
| **Text Search** | Instant search across entity IDs, names, integrations, and devices with real-time filtering |
| **Domain Filter** | Dropdown to filter by entity type (sensor, light, switch, binary_sensor, etc.) |
| **State Filter** | Toggle between All, Enabled, or Disabled with live entity counts |
| **Integration Filter** | Click an integration in the sidebar to show only its entities |
| **Label Filter** | Filter by Home Assistant labels |
| **Filter Presets** | Save and load your favorite filter combinations |

All filter buttons show **live counts** with color-coded indicators: green for enabled, red for disabled, amber for updates.
### Sidebar Navigation
A collapsible sidebar provides quick access to every feature:
- **Actions** -- Undo, Redo, Export, Import, Favorites, Activity Log, Comparison View, Column Settings; bulk selection actions: Enable Selected, Disable Selected, **Assign Area**, **Assign Floor**, View Selected, Deselect All
- **Labels** -- Browse and filter by Home Assistant labels grouped by **Devices**, **Areas**, **Automations**, **Scripts**, **Scenes**, and **Entities**
- **Groups** -- Switch between grouping modes: Integration (default), Room, Type, Floor, Device Name
- **Domains** -- Filter by entity domain
- **Integrations** -- Quick-filter list with integration icons from Home Assistant Brands
- **Help** -- Built-in two-column guide with clickable table of contents
Toggle the sidebar with the mobile menu button. Each section's collapse state is remembered between sessions.
### Grouping
Group entities by different criteria to get the view you need:
- **Integration** (default) -- organized by integration and device
- **Room / Area** -- grouped by Home Assistant area assignments
- **Type** -- grouped by entity domain (all sensors together, all lights together, etc.)
- **Floor** -- grouped by Floor → Area → Device hierarchy
- **Device Name** -- all devices with matching names merged into one group
Switch modes from the **Groups** sidebar section or with **Ctrl+G**. Your preference is saved between sessions.
### Favorites
- Star any entity to mark it as a favorite
- Dedicated **Favorites** filter in the sidebar shows only starred entities
- Favorites count displayed in the sidebar
- Add/remove via right-click context menu or bulk selection
- Persisted in browser local storage
### Entity Aliases
- Create custom display names for entities without renaming them
- Non-destructive -- the actual entity ID is unchanged
- Set aliases through the right-click context menu
- Persisted in browser local storage
### Labels Integration
- View and filter by **Home Assistant's built-in label system**
- Create new labels directly from Entity Manager
- Labels sidebar split into six sub-groups: **Devices**, **Areas**, **Automations**, **Scripts**, **Scenes**, **Entities** — only shown when labels of that type exist
- Clicking a label filters the main view, merging entity IDs from all matching groups
- **Label Suggestions** in the Suggestions dialog — 18 semantic categories (Lights, Dimmable Lights, Switches, Temperature Sensors, Motion Sensors, etc.); one-click "Apply to N" creates and assigns the label in HA
- Expandable list with refresh capability; label data cached for performance
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
- Reads **real Home Assistant state history** — shows every entity state change across your entire HA instance, not just Entity Manager actions
- Events grouped by **Room → Device → Entity** with three collapsible levels
- **Time range**: 1h (default), 6h, 24h, 7d
- **Search bar** filters by entity ID, device, room, or state value
- **Room filter chips** with All / None buttons — select specific rooms to focus on; selection persisted between sessions
- Accessible from the Actions sidebar section
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
- Alias
Toggle columns from the sidebar **Columns** button. Preferences are saved between sessions.
### Devices View
A dedicated **Devices** tab shows all devices sorted alphabetically and organised by category:
- Devices with the same display name are **merged into a single group** — useful for Shelly multi-relay devices where all channels share one name
- Every device (and same-name group) is split into standard HA category cards: **⚡ Controls**, **📊 Sensors**, **⚙️ Configuration**, **🔧 Diagnostic**, **📡 Connectivity**
- Each category card shows entity count, enabled/disabled breakdown, and its own **Enable All / Disable All** buttons
- Cards are independently collapsible — opening one never affects others
- Entities whose device has a `configuration_url` show a **🔗** button to open the device web UI in a new tab

### Entity Detail Dialog
Click any entity card (not a button or checkbox) to open a full detail dialog with everything Home Assistant knows about that entity:

| Section | Contents |
|---------|----------|
| **Overview** | Entity ID, friendly name, domain, platform, unique ID, aliases |
| **Current State** | State value (colour-coded) + all attributes sorted A–Z |
| **Registry** | Entity category, device class, disabled/hidden state, icon, unit, supported features |
| **Device** | Manufacturer, model, SW/HW version, serial number, config URL, connections |
| **Integration** | Config entry title, domain, source, version, state |
| **Area** | Assigned area name and aliases |
| **Labels** | All HA labels attached to the entity |
| **State History** | Last 30 days of state changes, newest first |

All sections render as compact mini cards in a 3-column grid for easy scanning. Action buttons in the dialog footer let you **Rename** or **Enable/Disable** the entity without leaving the dialog.

### Firmware Update Manager
A dedicated **Updates** tab to manage all firmware and software updates:
- View all available updates in one place
- **Filter by stability**: All Updates, Stable Only, Beta Only
- **Filter by category**: All Types, Devices Only, Integrations Only
- **Hide up-to-date** checkbox to focus on pending updates
- **Select All** pill with expanding **Update Selected** button — animates into view when items are selected
- View **release notes** before updating
- **Sequential bulk updates** — runs one at a time for safety; rows progress through Queued → Active → ✓ Updated / ✕ Failed
- **Live progress ring** — SVG ring tracks exact `update_percentage` when HA reports it; indeterminate spinner otherwise
- **HA auto-backup banner** — shows and toggles HA's global "backup before update" setting; green when ON, red when OFF; hidden on plain HA Core
- **Per-entity Backup checkbox** — shown for entities that support backup; "Backup All" header checkbox for bulk selection
- Alphabetical sorting by title; live update count on filter button
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
**Stat Card Color Accents:**
- Every stat card has a unique colored **top-border accent** and **subtle tinted background** — both in light and dark mode
- Text colors automatically compensate so labels and values are always readable against their tinted background
- Works correctly in mixed-mode setups (e.g. HA dark + EM light or EM dark + HA light)
### Context Menu
Right-click any entity (or multi-selection) for a full context menu:
**Single entity:**
- Rename / Enable / Disable
- Add to Favorites
- Manage Labels / Alias
- **Assign to area** — pick from HA areas grouped by floor
- **Assign to floor** — two-step floor picker; auto-selects area when a floor has only one
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
- **Integration count** - Total number of integrations
- **Device count** - Total number of devices
- **Total entity count** - Clickable to open a grouped entity list (Integration → Device) — click any entity row to open its full detail dialog
- **Automation count** - Clickable to view automations list with last-triggered time and edit navigation
- **Script count** - Clickable to view scripts list
- **Helper count** - Clickable to view input helpers and variables
- **Template count** - Clickable to view template entities with state, last active, and edit/remove actions
- **HACS count** - Clickable to browse your HACS store and installed integrations
- **Lovelace Cards count** - Clickable to inspect dashboards, card type distribution, and entity references
- **Update count** - Amber-highlighted when updates are available; clickable to open the Updates view

All counts update in real-time as you make changes.

### Stat Card Dialogs — Mini Entity Cards
Every stat card opens a dedicated dialog where items are displayed as **mini entity cards** matching the visual style of the main view:
- Dark header band showing the friendly name, state chip (On/Off/Running/unavailable/…), and time-ago
- Monospace entity ID in the body with domain or mode info below
- Action buttons (Edit, Rename, Toggle, Remove…) in a row at the bottom
- **Search bar is pinned in the dialog header** — always visible, never scrolls away
- First section expands automatically so content is visible without any extra clicks
- Colour-tinted section backgrounds make different categories instantly recognisable; alternating row tints aid readability in long lists

Each card has a **↗ button** that takes you directly to the right place in HA:
- **Automations** → opens the automation editor for that automation
- **Scripts** → opens the script editor
- **Everything else** → opens the HA more-info popup for the entity

Bulk checkboxes, Rename, and Label assignment work inside dialogs the same as in the main view.

### Cleanup View
The **Cleanup** stat card surfaces housekeeping tasks in four sections:
- **Orphaned entities** — entities with no parent device (YAML remnants or integration leftovers); grouped by integration with collapsible sections; Remove or Assign to device; "Remove All" bulk button
- **Stale entities** — entities with no state change in 30+ days; grouped by domain; Keep (hide for 30 d), Disable, or Remove per entity
- **Ghost devices** — devices registered in HA but with zero entities; Remove
- **Never triggered** — automations and scripts that have never been triggered

### Suggestions Dialog
Five colour-coded sections help you improve your entity setup:
- 🟣 **Health Issues** (purple) — entities unavailable for 7+ days → suggested for disable
- ⬜ **Disable Candidates** (neutral) — diagnostic entities unchanged for 30+ days
- 🟠 **Naming Improvements** (orange) — entities with auto-generated hashes or generic names
- 🔴 **Area Assignment** (red) — devices with no area assigned — bulk-assign directly from the dialog
- 🟡 **Label Suggestions** (amber) — smart HA label recommendations — click *Apply to N* to create and assign instantly

Each section has its own colour tint on the header, body, device groups, and entity rows for quick visual scanning.

### Mobile & Responsive Design
Three-breakpoint responsive layout designed and tested on real Android phones:

| Breakpoint | Target | Key changes |
|---|---|---|
| ≤768px | Tablets | Sidebar becomes overlay, stat cards 3-per-row, device headers wrap; action buttons scale to 13px |
| ≤600px | Medium phones (~540px) | Entity list 1-column, action buttons wrap with 36px touch targets |
| ≤480px | Small phones | Further font/padding reductions (11px), mini cards stack to 1-column |

- Collapsible sidebar with dedicated mobile toggle button; tap outside to close
- Stat cards always show **3 per row** on mobile — labels never truncated
- Device card headers wrap bulk actions and area button to a second line on narrow screens; buttons compact to fit without overflowing or truncating
- Dialog padding scales down at each breakpoint so dialogs use screen space efficiently
- All touch targets minimum 36×36px on mobile
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
3. Check the **HA auto-backup banner** to confirm your global backup setting is correct
4. Optionally check the **🛡 Backup** checkbox on rows you want backed up before updating
5. Check **Select All** (or pick individual rows) — the **Update Selected** button expands to the right
6. Click **Update Selected**; each row progresses through Queued → Active (progress ring) → ✓ / ✕
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
| `em-entity-aliases` | Entity display aliases |
| `em-activity-watch` | Activity Log room filter selection |
| `em-sidebar-sections` | Sidebar section open/closed states |
| `em-filter-presets` | Saved filter combinations |
| `em-visible-columns` | Column visibility preferences |
| `em-sidebar-collapsed` | Sidebar state |
| `em-smart-group-mode` | Active grouping mode |
| `em-entity-order` | Custom entity ordering |
---
## Screenshots

### Main Panel

| Light Theme | Dark Theme |
|:---:|:---:|
| ![Light Theme](screenshots/main-panel-light.png) | ![Dark Theme](screenshots/main-panel-dark.png) |

### Themes

| HA Default | High Contrast | OLED | Theme Editor |
|:---:|:---:|:---:|:---:|
| ![HA Default](screenshots/theme-ha-default.png) | ![High Contrast](screenshots/theme-high-contrast.png) | ![OLED](screenshots/theme-oled.png) | ![Theme Editor](screenshots/theme-editor.png) |

### Entity Cards

| Integration View | Devices View |
|:---:|:---:|
| ![Integration View](screenshots/entity-card-integration.png) | ![Devices View](screenshots/entity-card-devices.png) |

### Bulk Rename

![Bulk Rename](screenshots/bulk-rename.png)

### Stat Dialogs

| Automations | Scripts | Helpers | Templates |
|:---:|:---:|:---:|:---:|
| ![Automations](screenshots/automations-dialog.png) | ![Scripts](screenshots/scripts-dialog.png) | ![Helpers](screenshots/helpers-dialog.png) | ![Templates](screenshots/templates-dialog.png) |

| Unavailable | Updates | HACS Store | Lovelace Cards |
|:---:|:---:|:---:|:---:|
| ![Unavailable](screenshots/unavailable-dialog.png) | ![Updates](screenshots/updates-view.png) | ![HACS Store](screenshots/hacs-store-dialog.png) | ![Cards](screenshots/cards-dialog.png) |

### Cleanup & Health

| Cleanup | Cleanup (expanded) | Card Types | Config Health |
|:---:|:---:|:---:|:---:|
| ![Cleanup](screenshots/cleanup-dialog.png) | ![Cleanup Expanded](screenshots/cleanup-dialog-expanded.png) | ![Card Types](screenshots/card-types-dialog.png) | ![Config Health](screenshots/config-health-dialog.png) |

### Devices View

![Devices View](screenshots/devices-view.png)

### Suggestions

| Overview | Area Suggestions | Naming Suggestions |
|:---:|:---:|:---:|
| ![Suggestions](screenshots/suggestions-dialog.png) | ![Area](screenshots/suggestions-area.png) | ![Naming](screenshots/suggestions-naming.png) |

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
