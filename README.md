# Entity Manager for Home Assistant
A powerful, feature-rich Home Assistant integration for managing entities across all your integrations. View, enable, disable, rename, analyze, and bulk-manage entities and firmware updates from a single modern interface.
![Version](https://img.shields.io/badge/version-3.1.0-blue)
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
  - [Entity Analysis](#entity-analysis)
  - [Activity Log](#activity-log)
  - [Last Activity Timeline](#last-activity-timeline)
  - [Undo / Redo](#undo--redo)
  - [Filter Presets](#filter-presets)
  - [Column Customization](#column-customization)
  - [Devices View](#devices-view)
  - [Entity Detail Dialog](#entity-detail-dialog)
  - [Notification Center](#notification-center)
  - [Firmware Update Manager](#firmware-update-manager)
  - [Export & Import](#export--import)
  - [Theme System](#theme-system)
  - [Context Menu](#context-menu)
  - [Voice Assistant](#voice-assistant)
  - [Health & Cleanup View](#health--cleanup-view)
  - [Suggestions View](#suggestions-view)
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
- **One-click reveal** — expanding an integration with exactly one device shows its entities immediately, no extra click on the device row
- Every integration row carries a **three-box header** without needing to expand: **Categories** (Controls/Sensors/Configuration/Diagnostic/Connectivity counts), **Hardware** (device-type counts: ⚡ Hardware, ☁️ Cloud, 🔧 Virtual, 📱 Mobile, 🏠 System, ❓ Unknown), and **Areas & Labels** (area/floor chips + a deduped HA Label rollup)
- Row actions (View Enabled / View Disabled / Enable All / Disable All / Accent color) live in a compact **⋯ menu** on each integration and device card
- **Opt-in accent colors** — integrations stay neutral by default; give the ones that matter a colored bar + tinted logo from the ⋯ menu (with a **None** option to remove it)
- **Device types you control** — click an ❓ Unknown chip or badge to assign a type, reset to Auto anytime, and **create your own types** (name + color) that show up in chips, badges, and the Devices-view type filter
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
- **Actions** -- **↺ History** (combined undo/redo timeline dialog), Export, Import, Favorites, **🕐 Last Activity** (recorder-backed timeline view), Activity Log, Column Settings; bulk selection actions: Enable Selected, Disable Selected, **Assign Area** (includes floor), View Selected, Deselect All
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
Switch modes from the **Groups** sidebar section. Your preference is saved between sessions.
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
- **Label Suggestions** in the Suggestions dialog — 21 semantic categories (Lights, Dimmable Lights, Switches, Temperature Sensors, Motion Sensors, etc.), including Power Monitoring, Energy Consumed, Energy Returned, and generic Energy Monitoring as four separate rows; one-click "Apply to N" creates and assigns the label in HA
- **Custom color picker** — every label color picker (label editor, bulk labels, Assign dialog) offers the 19 HA presets plus a custom-hex swatch
- Expandable list with refresh capability; label data cached for performance
### Entity Analysis
Click any entity card to open the Entity Details dialog, whose tabs cover deep analysis:
- **Related tab** -- other entities on the same device, plus **Automation Impact**: automations and scripts that appear to reference the entity
- **Registry tab** -- detailed entity properties, metadata, and configuration
- **History tab** -- entity state changes over the last 30 days
### Activity Log
- Reads **real Home Assistant state history** — shows every entity state change across your entire HA instance, not just Entity Manager actions
- Events grouped by **Room → Device → Entity** with three collapsible levels
- **Time range**: 1h (default), 6h, 24h, 7d
- **Search bar** filters by entity ID, device, room, or state value
- **Room filter chips** with All / None buttons — select specific rooms to focus on; selection persisted between sessions
- Accessible from the Actions sidebar section
### Last Activity Timeline
A dedicated inline view showing **recorder-backed "last active" timestamps** for every entity, automation, script, helper, template, and more — in one consolidated, searchable, filterable list:
- **🕐 Last Activity** button in the Actions sidebar section opens the full inline view
- Entities split into **15 domain-based sections**: 🤖 Automations, ⚡ Scripts, 🎛️ Helpers, 🧩 Templates, 💡 Lights, 🔌 Switches, 🌡️ Sensors, 🔍 Binary Sensors, 📺 Media Players, ❄️ Climate & Environment, 🔒 Security, 📷 Cameras, 📍 People & Tracking, 🔘 Controls, ⬆️ Updates, ⚙️ Other (sub-grouped by integration)
- **9 time-range filter pills**: All · Today · This Week · 1 Month · 3 Months · 6 Months · 1 Year · Older · Never — filter selection persisted between sessions
- **Live search** across entity ID, friendly name, device name, and integration with 200ms debounce
- **Live count badge** in the header updates as you filter/search
- Timestamps come from the **HA recorder database** — survive HA restarts (unlike in-memory `last_changed` which resets when entities briefly go unavailable)
- Automations and scripts use `last_triggered` from HA state attributes
- Refresh button invalidates the 1-hour localStorage cache and fetches fresh recorder data
- Clicking any row opens the full entity detail dialog
### Undo / Redo
Full operation history with combined timeline dialog:
- **↺ History** button in the sidebar opens a combined undo/redo timeline dialog
- Shows the full action history: redo actions (top, muted) → current state divider → undo actions (bottom)
- Click any row in the dialog to jump to that point in history; the list refreshes in-place
- **Clear History** button wipes both stacks (with confirmation)
- Supports: enable, disable, rename, display name change, label changes, device/area assignment, config import, and all bulk operations
- History survives page refresh (localStorage persistence)
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
- Every device card has the **same rich header as integration rows**: name + stats, **Categories** / **Hardware** / **Areas & Labels** boxes, and a **⋯ actions menu** (View Enabled / View Disabled / Enable All / Disable All)
- **Device type filter** in the toolbar: ⚡ Hardware, ☁️ Cloud, 🔧 Virtual, 📱 Mobile, 🏠 HA System, ❓ Unknown — plus any custom types you've created
- **Assignable device types** — Unknown badges are clickable; pick one of the built-in types, one of your own custom types, or Auto (heuristic detection). Manually assigned badges show a ✎ and can be changed or reset anytime
- Devices with the same display name are **merged into a single group** — useful for Shelly multi-relay devices where all channels share one name
- Every device (and same-name group) is split into standard HA category cards: **⚡ Controls**, **📊 Sensors**, **⚙️ Configuration**, **🔧 Diagnostic**, **📡 Connectivity** with per-card entity counts and enabled/disabled breakdowns
- Cards are independently collapsible — opening one never affects others
- Entities whose device has a `configuration_url` show a **🔗** button to open the device web UI in a new tab
- **Offline only** toggle to focus on devices whose entities are all unavailable

### Entity Detail Dialog
Click any entity card (not a button or checkbox) to open a full detail dialog with everything Home Assistant knows about that entity — organised as a **pinned hero + five tabs**.

**Hero Header** (always visible while tab content scrolls):
- Type chips top-left: domain, platform, Disabled badge (if applicable), Area name
- Friendly name centered, with an inline pencil to rename (saves via `update_entity_display_name`)
- Entity ID in monospace below the name
- State displayed as a colour-coded pill (green for on/open, orange for unavailable/unknown, grey for off), with an inline **Toggle / Press** button for controllable entities, and Last changed / Last updated timestamps in locale-aware format

**Tabs** (count badges show attribute/related/history totals; the Related badge fills in as the automation scan completes):

| Tab | Contents |
|-----|----------|
| **Overview** | Card grid: State (status, state, changed/updated, category), Area & Labels (entity + device label chips with manage buttons), Device (name, manufacturer, model, SW), Integration (title, domain, version, state) |
| **Attributes** | All state attributes in a 2-column grid |
| **Registry** | Full entity registry, device, and integration detail rows (unique ID, device class, connections, identifiers, config URL, …) |
| **Related** | Other entities on the same device + Automation Impact (automations/scripts that appear to reference this entity) |
| **History** | Compact timeline of state changes: coloured dot + state value + absolute timestamp |

**Footer Action Buttons:**
- **Copy ID** — copies entity ID to clipboard with a toast confirmation
- **Enable / Disable** — toggles entity state and closes the dialog
- **Open in HA** — opens the entity's HA settings page
- **Close**

### Notification Center
A live notification feed built into the panel header:
- **Bell icon** (🔔) sits right of the panel title — a red badge shows unread count; the icon fills to `mdi:bell-badge` when unread items exist
- Clicking the bell opens a dropdown listing all notifications newest-first
- **Four tracked event types:**
  - **Device offline** (red) — fires when any entity transitions to `unavailable`
  - **State anomaly** (orange) — fires when an entity transitions to `unknown` from a known state
  - **Entity enabled / disabled** (green / red) — detected on each data refresh by comparing states between loads
  - **New entity** (blue) — fires when a new entity ID appears in the registry
- **Persistent** — stored in `localStorage`, survives page refreshes and HA restarts
- **Rate-limited** — same entity + event type fires at most once per 5 minutes (prevents spam on flapping devices)
- **Capped** at 100 entries — oldest dropped when the limit is reached
- **Mark all read**, **dismiss individual**, and **clear all** controls
- **Gear icon** opens per-type preference toggles — silence any event type individually
- **Click any notification** to open the full Entity Detail Dialog for that entity
- **EM-action suppression** — enable/disable actions performed inside Entity Manager itself do not generate notifications

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
- Access from the sidebar's Actions section; imports confirm before applying and are undoable in one step
### Theme System
Entity Manager ships with a comprehensive theming engine built on the v3.0 "Refined" design language (hairline borders, calm light/dark palettes, soft tints):
**Built-in Themes:**
1. **Default** -- follows your Home Assistant theme (light or dark)
2. **Light** -- the Refined light palette
3. **Dark** -- the Refined dark palette
4. **High Contrast** -- optimized for accessibility
5. **OLED Black** -- true-black backgrounds for OLED displays
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
- Add to / Remove from Favorites
- Manage Labels / Set Alias
- **Assign to area** — opens the unified **Assign dialog**: floor + area picker on top (create new floors/areas inline, "No area" clears the assignment) and label management below, with `E`/`D`/`A` scope badges
- **🔌 Assign to device** — opens an integration-grouped device picker with confirmation; stored in undo history with device name
- Copy Entity ID
- Open in Home Assistant
**Multiple entities selected:**
- Bulk Rename Selected
- Enable / Disable All Selected (with confirmation)
- Add / Remove Labels on Selected
- Add All to Favorites
- Clear Selection
- Delete Selected (with confirmation)

### Voice Assistant
Control Entity Manager hands-free with voice commands:
- *"Enable entity {name}"*
- *"Disable entity {name}"*
- *"Activate entity {name}"*
- *"Deactivate entity {name}"*
- *"Registry enable/disable {name}"*
Voice commands enforce admin-only access for safety.

### Statistics Dashboard
The stat wall at the top is split in two rows:

**Data stats** — Integrations · Devices · Total Entities (clickable, opens a grouped entity list) · Enabled · Disabled

**Navigation strip** — compact tiles that each open a dedicated view:
- **Auto / Scripts / Helpers** - automations (with last-triggered + edit navigation), scripts, and input helpers in one view
- **Templates** - template entities with state, last active, and edit/remove actions
- **Health & Cleanup** - housekeeping across unavailable/orphaned/stale entities, ghost devices, never-triggered automations
- **HACS Store** - browse your installed HACS items and the community store
- **Card Types** - inspect dashboards, card type distribution, and entity references
- **Suggestions** - live count of improvement suggestions across all six suggestion types
- **Browsers** - browser_mod browsers

The **Enabled / Disabled / Updates** filter pills show live counts, with Updates amber-highlighted when updates are available. All counts update in real-time as you make changes.

### Stat Card Dialogs — Mini Entity Cards
Every stat card opens a dedicated dialog where items are displayed as **mini entity cards** matching the visual style of the main view:
- **Click any card** (outside its buttons/checkboxes) to open the full Entity Details dialog for that entity — works in every dialog and inline view (Cleanup, Unavailable, Suggestions, Automations, …)
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

### Health & Cleanup View
The **Health & Cleanup** inline view surfaces housekeeping tasks across five sections:
- **Unavailable entities** — entities currently in `unavailable` state; per-row actions: **Ignore**, **Disable**, **Add to Group**, **Remove**; Disable and Remove show a confirmation dialog
- **Orphaned entities** — registry entries whose *owner is gone*, split into three groups: **Missing Device** (`device_id` points at a deleted device), **Missing Config Entry** (the integration entry was removed — classic leftovers), and **Not Loaded** (enabled but nothing provides a state anymore). Entities that are simply device-less by design — automations, scripts, helpers, persons, groups — are **not** treated as orphans. Per-row actions: **Ignore**, **Assign to device** (Missing Device only), **Add to Group**, **Remove**, plus a **Remove All** with confirmation
- **Stale entities** — value unchanged in 30+ days, using recorder-backed timestamps that survive HA restarts; static-by-design domains (automations, scenes, zones, buttons…) and config-category settings are excluded; Keep (hide for 30 d), Disable, or Remove per entity
- **Ghost devices** — devices registered in HA with zero entities, excluding hubs/bridges that other devices connect through; click to open the device page in HA
- **Never triggered** — automations and scripts that have never been triggered (restored remnants excluded — those are orphans)

**Ignore / Restore**: clicking **Ignore** persistently dismisses a row. A **View ignored (N)** bar in each section reveals everything dismissed there, with one-click **Restore** per item and **Restore all**. The ignored state is shared with the Suggestions view.

**Add to Group**: opens a dialog with all five grouping modes from the sidebar — By Area, By Floor, By Device Name, By Integration, By Type — plus any custom groups you've created. By Area and By Floor open the area assignment dialog; By Device Name opens the device picker.

### Suggestions View
Six colour-coded sections help you improve your entity setup:
- 🟣 **Health Issues** (purple) — entities unavailable for 7+ days → suggested for disable
- ⬜ **Disable Candidates** (neutral) — diagnostic entities unchanged for 30+ days
- 🟠 **Naming Improvements** (orange) — entities with auto-generated hashes or generic names
- 🔴 **Area Suggestions** (red) — devices with no area assigned — bulk-assign directly from the view, with name-based auto-matching and user-defined **mapping rules**
- 🟠 **Area Mismatch** — entities whose own area differs from their device's area; sync or reassign per entity
- 🟡 **Label Suggestions** (amber) — smart HA label recommendations across 21 semantic categories — click *Apply to N* to create and assign instantly

Each section has its own colour tint for quick visual scanning, and every suggestion row has an **Ignore** button (persistent, with a central View ignored / Restore list). The related **Area Assignment tool** gives a full-screen device-by-device view with per-device Apply, per-area Apply All, and an Apply All Matched header action.

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
- Use the **⋯ menu** on an integration or device card for Enable All / Disable All / View Enabled / View Disabled
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
- Filter by **Home Assistant labels** from the sidebar's Labels section
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
| `websocket_api.py` | 19 WebSocket command handlers |
| `voice_assistant.py` | Voice intent handlers |
| `config_flow.py` | UI-based configuration flow |
| `entity-manager-panel.js` | Full frontend as a single web component |
| `entity-manager-panel.css` | Extracted stylesheet |
### WebSocket API
All commands require admin privileges.

| Command | Parameters | Description |
|---|---|---|
| `entity_manager/get_disabled_entities` | `state`: disabled, enabled, or all | Entities grouped by integration/device |
| `entity_manager/export_states` | — | Export all entity states to JSON |
| `entity_manager/get_automations` | — | Automations with last-triggered and trigger context |
| `entity_manager/get_template_sensors` | — | Template entities with state + connections |
| `entity_manager/get_entity_details` | `entity_id` | Full entity metadata (registry, device, area, labels) |
| `entity_manager/get_config_entry_health` | — | Failed/unhealthy config entries |
| `entity_manager/get_areas_and_floors` | — | Area + floor hierarchy |
| `entity_manager/list_hacs_items` | — | Installed HACS items + store items |
| `entity_manager/get_last_activity` | `entity_ids` (optional) | Recorder-backed last-active timestamps per entity |
| `entity_manager/enable_entity` | `entity_id` | Enable a single entity |
| `entity_manager/disable_entity` | `entity_id` | Disable a single entity |
| `entity_manager/bulk_enable` | `entity_ids` (max 500) | Enable multiple entities |
| `entity_manager/bulk_disable` | `entity_ids` (max 500) | Disable multiple entities |
| `entity_manager/rename_entity` | `entity_id`, `new_name` | Rename entity (domain preserved) |
| `entity_manager/update_entity_display_name` | `entity_id`, `display_name` | Set or clear user display name |
| `entity_manager/remove_entity` | `entity_id` | Remove entity (handles templates, YAML, integration-managed) |
| `entity_manager/update_yaml_references` | `old_entity_id`, `new_entity_id`, `dry_run` | Find/replace entity ID across YAML config files |
| `entity_manager/assign_entity_device` | `entity_id`, `device_id` | Assign entity to a device |
| `entity_manager/unassign_entity_device` | `entity_id` | Remove device assignment from entity |
| `entity_manager/import_entity_states` | `entities` (max 500) | Apply enable/disable states from an exported config |
| `entity_manager/register_template` | `entity_id` | Inject a unique_id into a YAML template entity and reload |

YAML-writing commands (`update_yaml_references`, `register_template`) never touch `secrets.yaml` and write a `.em-bak` backup of the original file before modifying it.
### Home Assistant Services
- `entity_manager.enable_entity`
- `entity_manager.disable_entity`

Both services require **admin privileges** (calls from automations/scripts run by HA itself are allowed). All other operations are WebSocket-only.
### Local Storage Keys
Entity Manager stores user preferences in the browser:
| Key | Data |
|---|---|
| `em-favorites` | Starred entities |
| `em-activity-log` | Last 100 operation log entries |
| `em_undoStack` | Up to 50 undo steps (survives page refresh) |
| `em_redoStack` | Redo steps |
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
| `em_lastActivityCache` | Recorder-backed timestamps (1-hour TTL) |
| `em-at-filter` | Last Activity Timeline active filter pill |
| `em-integration-colors` | User-set integration accent colors (default is none) |
| `em-device-type-overrides` | Manually assigned device types |
| `em-custom-device-types` | User-created device types (name + color) |
| `em-ignored-suggestions` | Persistently ignored suggestion/cleanup rows |
---
## Screenshots

### ✨ New in v3.0 — the Refined UI

Version 3.0 is a full visual redesign: hairline borders, calm light/dark palettes, three-box integration and device headers (Categories · Hardware · Areas & Labels), ⋯ action menus, opt-in accent colors, assignable device types, and a tabbed Entity Details dialog.

![Main View](screenshots/v3/v3%2001%20Main%20View%20-%20All%20Entities.png)

| Entity Details — tabbed | Device Type Picker (with custom types) |
|:---:|:---:|
| ![Entity Details Dialog](screenshots/v3/v3%2007%20Entity%20Details%20Dialog.png) | ![Device Type Picker](screenshots/v3/v3%2045%20Device%20Type%20Picker.png) |

| Devices tab — rich headers | Integration ⋯ menu |
|:---:|:---:|
| ![Devices Tab](screenshots/v3/v3%2005%20Devices%20Tab.png) | ![Integration Menu](screenshots/v3/v3%2044%20Integration%20Menu.png) |

| Light theme | Notification Center |
|:---:|:---:|
| ![Light Theme](screenshots/v3/v3%2027%20Main%20View%20-%20Light%20Theme.png) | ![Notification Center](screenshots/v3/v3%2028%20Notification%20Center.png) |

| Mobile main view | Mobile sidebar | Mobile entity cards |
|:---:|:---:|:---:|
| ![Mobile Main](screenshots/v3/v3%2039%20Mobile%20-%20Main%20View.png) | ![Mobile Sidebar](screenshots/v3/v3%2040%20Mobile%20-%20Sidebar%20Drawer.png) | ![Mobile Cards](screenshots/v3/v3%2041%20Mobile%20-%20Entity%20Cards.png) |

### Main Panel

| All Entities | Enabled Filter | Disabled Filter |
|:---:|:---:|:---:|
| ![All Entities](screenshots/v3/v3%2001%20Main%20View%20-%20All%20Entities.png) | ![Enabled Filter](screenshots/v3/v3%2002%20Main%20View%20-%20Enabled%20Filter.png) | ![Disabled Filter](screenshots/v3/v3%2003%20Main%20View%20-%20Disabled%20Filter.png) |

### Entity Cards

![Integration Expanded](screenshots/v3/v3%2006%20Integration%20Expanded%20-%20Entity%20Cards.png)

### Entity Details Dialog

| Overview | Registry | Related | History |
|:---:|:---:|:---:|:---:|
| ![Overview](screenshots/v3/v3%2007%20Entity%20Details%20Dialog.png) | ![Registry](screenshots/v3/v3%2007b%20Entity%20Details%20-%20Registry%20Tab.png) | ![Related](screenshots/v3/v3%2007c%20Entity%20Details%20-%20Related%20Tab.png) | ![History](screenshots/v3/v3%2007d%20Entity%20Details%20-%20History%20Tab.png) |

### Devices View

![Devices Tab](screenshots/v3/v3%2005%20Devices%20Tab.png)

### Last Activity Timeline

![Last Activity](screenshots/v3/v3%2020%20Last%20Activity%20Timeline.png)

### Activity Log & Undo / Redo History

| Activity Log | History (Undo/Redo) |
|:---:|:---:|
| ![Activity Log](screenshots/v3/v3%2021%20Activity%20Log%20View.png) | ![Undo Redo History](screenshots/v3/v3%2037%20History%20Undo-Redo%20Dialog.png) |

### Themes

| Theme Menu | High Contrast | OLED Black | Theme Editor |
|:---:|:---:|:---:|:---:|
| ![Theme Menu](screenshots/v3/v3%2026%20Theme%20Menu.png) | ![High Contrast](screenshots/v3/v3%2042%20Theme%20-%20High%20Contrast.png) | ![OLED Black](screenshots/v3/v3%2043%20Theme%20-%20OLED%20Black.png) | ![Theme Editor](screenshots/v3/v3%2031%20Custom%20Theme%20Editor.png) |

### Grouping Modes

| By Area | By Type | By Floor | By Device Name |
|:---:|:---:|:---:|:---:|
| ![By Area](screenshots/v3/v3%2032%20Grouping%20-%20By%20Area.png) | ![By Type](screenshots/v3/v3%2033%20Grouping%20-%20By%20Type.png) | ![By Floor](screenshots/v3/v3%2034%20Grouping%20-%20By%20Floor.png) | ![By Device Name](screenshots/v3/v3%2035%20Grouping%20-%20By%20Device%20Name.png) |

### Bulk Rename

![Bulk Rename](screenshots/v3/v3%2022%20Bulk%20Rename%20View.png)

### Automations, Scripts & Helpers

![Automations Scripts Helpers](screenshots/v3/v3%2010%20Automations%20Scripts%20Helpers%20View.png)

### Templates

![Templates](screenshots/v3/v3%2011%20Templates%20View.png)

### Unified Assign Dialog — Area, Floor & Labels

One dialog reachable from any clickable chip on an entity or device card — area/floor picker on top, label management below, with `E`/`D`/`A` scope badges showing whether a label lives on the entity, its device, or its area.

| Area & Floor | Labels (scoped, Apply-to target) |
|:---:|:---:|
| ![Assign Dialog — Area and Floor](screenshots/v3/v3%2008%20Assign%20Dialog%20-%20Area%20and%20Floor.png) | ![Assign Dialog — Labels](screenshots/v3/v3%2009%20Assign%20Dialog%20-%20Labels.png) |

### Updates

![Updates](screenshots/v3/v3%2004%20Main%20View%20-%20Updates%20Filter.png)

### HACS Store

![HACS Store](screenshots/v3/v3%2016%20HACS%20Store%20View.png)

### Card Types

![Card Types](screenshots/v3/v3%2017%20Card%20Types%20View.png)

### Health & Cleanup

| Overview | Orphaned Entities | Unavailable Entities |
|:---:|:---:|:---:|
| ![Health and Cleanup](screenshots/v3/v3%2012%20Health%20and%20Cleanup%20View.png) | ![Orphaned](screenshots/v3/v3%2013%20Cleanup%20-%20Orphaned%20Entities.png) | ![Unavailable](screenshots/v3/v3%2015%20Unavailable%20Entities%20Dialog.png) |

### Suggestions

Every suggestion row has an **Ignore** button that persistently dismisses it. A **View ignored** bar reveals everything you've dismissed — with its type (Health Issue, Disable Candidate, Naming, Area Suggestion, Area Mismatch, Label) and origin — and a one-click **Restore**.

| Naming Improvements | Label Suggestions | Area Assignment Tool |
|:---:|:---:|:---:|
| ![Naming Improvements](screenshots/v3/v3%2018%20Suggestions%20-%20Naming%20Improvements.png) | ![Label Suggestions](screenshots/v3/v3%2023%20Label%20Suggestions.png) | ![Area Assignment](screenshots/v3/v3%2024%20Area%20Assignment%20Tool.png) |

---
## Use Cases
- **Cleaning up after integrations** -- disable the dozens of unused entities that some integrations create
- **Organizing large systems** -- manage hundreds of entities efficiently with filters, labels, and groups
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
