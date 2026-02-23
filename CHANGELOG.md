# Changelog

## Version 2.9.2 - Entity Detail, Update Manager & UI Polish

### ✨ New Features

#### Entity Detail Dialog
- **Click any entity card** to open a full detail dialog showing everything HA knows about that entity
- New backend WebSocket command `entity_manager/get_entity_details` pulls from entity registry, device registry, area registry, label registry, and config entry — all in one call
- Eight collapsible sections: **Overview** (entity ID, friendly name, domain, platform, unique ID, aliases), **Current State** (large state value + all attributes sorted A–Z), **Registry** (category, device class, disabled/hidden state, icon, unit, supported features), **Device** (manufacturer, model, SW/HW version, serial, config URL, connections), **Integration** (title, domain, source, version, state), **Area**, **Labels**, **State History** (last 30 days, newest first)
- Overview and Current State sections open by default; all others collapsed
- Action buttons in dialog footer: Rename, Enable/Disable toggle, Close
- Dialog is wider (680 px) and scrollable for long attribute lists

#### Entity Card Redesign
- **Dark header band** at top of each card shows device name, state chip, and time-ago chip
- Entity ID is the visual centrepiece of the card body
- Enabled/Disabled badge sits below the entity ID as its own line
- Checkbox and favourite star moved to the bottom-left action row alongside Edit/Enable/Disable buttons
- Clicking the card background (not buttons/checkbox/star) opens the detail dialog

#### Updates — HA Auto-Backup Toggle
- **Banner below Select All** shows the current state of HA's global "backup before update" setting (`core_backup_before_update` / `add_on_backup_before_update`)
- Green tinted border when ON; red tinted border when OFF — impossible to miss either state
- Descriptive subtitle explains what the setting does in each state
- Click the ON/OFF button to toggle instantly via `hassio/update/config/update`
- Only shown on HA OS / Supervised (uses hassio supervisor API); hidden silently on plain HA Core

#### Updates — Per-Row Backup Checkbox
- Each update row with `UpdateEntityFeature.BACKUP` support shows a **🛡 Backup** checkbox
- "Backup All (N)" header checkbox checks every supported entity at once
- Backup label styled with green border/text to match the Update button; Release Notes button styled blue

#### Updates — Sequential Queue with Row-Level Progress
- Bulk updates now **always run sequentially** (one at a time) — parallel execution was unsafe when HA's global auto-backup is enabled since the backup system is single-threaded
- All selected rows immediately enter **⏳ Queued** state (dimmed)
- The active row shows a **blue border**, sweeping indeterminate progress bar at the bottom, spinning circle, and "🛡 Backing up…" or "Updating…" label
- Each completed row shows **✓ Updated** (green) or **✕ Failed** (red) before the list refreshes
- Live toast updates per step; final summary toast shows "✓ N updated · ✕ N failed"
- Single-item updates also show active → done/failed row states

#### Updates — Live Progress Tracking
- Update rows **watch HA entity state in real-time** via the `set hass()` hook — no polling
- When HA reports `update_percentage` on the entity, the spinner switches to an **SVG progress ring** showing the exact percentage
- When the entity transitions to `state: off` (update complete), the row automatically marks done and reloads the list
- A 5-minute fallback timer catches cases where HA does not push a state update

#### Updates — UX Refinements
- **Search bar** repositioned below the action bar (was inline with buttons) for a cleaner layout
- **"Update Selected" pill button** expands smoothly out of the right edge of the Select All pill using a `max-width` CSS animation — collapses to zero when nothing is selected, fully invisible
- **Refresh** while on the Updates page now reloads the updates list instead of navigating away to the entity list

#### Entity List — Total Entities Card
- **Total Entities stat card is now clickable** — opens a grouped entity list dialog (Integration → Device → entity rows)
- Each entity row shows a status dot (green = enabled, grey = disabled), category badge, and disabled badge
- Hash/UUID platform names (raw config entry IDs) are bucketed under an **"Other"** group instead of being shown as cryptic hex strings
- Clicking any entity row in the dialog opens the full entity detail dialog

#### Browser Mod Dialog
- **Active browser detection** — rows show a green "● Active" badge or blue "● Visible" badge based on `binary_sensor.*_active` and `sensor.*_visibility` entity states; current path shown for active/visible browsers; sorted active-first
- **Deregister** button per row calls `browser_mod.deregister_browser` service with the browser's unique ID
- **Clean up stale** bulk button in footer (orange) — deregisters all browsers with no recent activity
- **Deregister all but active** button (dark red) — keeps only the currently active browser; shows a confirmation listing the browser being kept
- **Browser ID chip** — click navigates to `/config/integrations/integration/browser_mod`; separate ⎘ icon copies the ID to clipboard

#### Sidebar Domains Section
- "All domains" filter moved from the toolbar dropdown into a dedicated **Domains** sidebar section below Quick Filters
- Enable Selected, Disable Selected, Deselect All, and Refresh moved from the toolbar into the **Actions** sidebar section

### 🐛 Bug Fixes
- **Toast obscured by dialogs** — raised toast z-index from `10001` to `99999` to escape `backdrop-filter` compositing layers created by dialog overlays; default display duration extended to 10 seconds
- **Backup label border** — backup checkbox label now uses green border/text (`var(--em-success)`) to match the Update button style instead of the muted grey border
- **Device names missing** — entity list dialogs now show proper device names; backend was not fetching `name_by_user`/`name` from the device registry — raw device UUIDs were displayed instead
- **Hash UUID integration groups** — entity list dialog no longer displays raw 32-char hex config entry IDs as integration group names; these are now bucketed under "Other"
- **Null access in entity list** — three unguarded `this.data` accesses in the entity list dialog are now null-safe
- **Hardcoded update colours** — all update row state colours (`is-active`, `is-done`, `is-failed`, spinner, SVG ring) now use CSS variables (`var(--em-primary)`, `var(--em-success)`, `var(--em-danger)`) for full theme compatibility

### 🔧 Backend
- New `entity_manager/get_entity_details` WebSocket command (admin-only) returning full entity, device, area, config entry, and label data in a single call
- Added imports: `device_registry`, `area_registry`, `label_registry` from `homeassistant.helpers`
- `get_disabled_entities` now fetches device name from the device registry and includes it in the response, resolving the "Unknown Device" display issue

---

## Version 2.9.1 - UX Polish & Consistency

### ✨ New Features

#### Bulk Rename Dialog — Per-Entity Mode
- When entities are selected, the Bulk Rename dialog now shows **one editable row per entity** — old name on the left, new name input pre-filled with the current object_id on the right
- **"Auto-fill with pattern"** collapsible section lets you apply a find/replace (with optional regex) to all rows at once without leaving the dialog
- Live counter shows "N of M entities will be renamed" as you type
- Only rows where the name actually changed are sent to HA — no-ops are skipped
- Original pattern/find-replace mode is retained when no entities are selected (operates on all visible entities)

#### Stat Cards — Edit Navigation
- **Automation Edit** button now looks up the entity's `unique_id` from the entity registry and navigates directly to `/config/automation/edit/{uniqueId}` — the correct HA automation editor page
- **Script Edit** button does the same, navigating to `/config/script/edit/{uniqueId}`
- YAML-defined automations and scripts (no `unique_id`) fall back to their respective list pages with an explanatory toast notification; toast now correctly names the entity type
- **Helper Edit** button navigates to `/config/helpers`; template helpers navigate to `/config/template`

#### Stat Cards — Consistent Item Layout
- Automations, Scripts, and Helpers dialogs now use a shared item renderer with consistent **Edit, Rename, Remove** buttons on every row
- Entity info (live HA state, mode, last triggered/run, current/max runs, domain-specific attributes) moved into a collapsible **Details** dropdown per item — no separate ℹ button needed
- Helper Details are domain-aware: `input_number` shows value/min/max/step, `input_select` shows options list, `timer` shows remaining time and finish timestamp, etc.

### 🐛 Bug Fixes

#### Labels Sidebar Stability
- Labels section no longer flashes "Loading labels..." every time an integration is clicked in the sidebar
- Implemented cache-first rendering — labels are rendered immediately from cache on subsequent sidebar re-renders; cache is only cleared when the Refresh button is clicked
- Added missing `_loadAndDisplayLabels()` calls to all 6 sidebar re-render sites (filter button, clear-filter, show-all, collapse-all, smart-groups toggle, integration click)

#### HACS Stat Card Search
- Search now filters results **live as you type** (no debounce, also listens to the `search` event for browser clear-X button)
- Fixed items with empty `data-repo-name` attributes being hidden instead of shown — switched from fuzzy data-attribute matching to `textContent.includes()` which matches whatever is visible on screen
- Added "No results for …" message when the search term matches nothing

---

## Version 2.9.0 - Documentation & Consistency

### 🧹 Changelog Completion
- Added comprehensive v2.8.0 and v2.8.1 release notes
- Documented UI improvements, security fixes, and backend refactoring
- Aligned changelog entries with Git history

### 📚 Version Alignment
- Updated all version references (manifest, README, package.json, docs) to 2.9.0
- Synchronized version across frontend, backend, and configuration files

### ✨ New Features
- **Lovelace Dashboard Card** — added documentation and configuration guide for custom `entity-manager-card`
  - Search and filter entities directly from dashboard
  - Bulk operations support
  - Compact and full-size layout options
  - Integration and domain filtering
- **Template Sensors** — added configuration examples for entity statistics
  - Disabled entities count
  - Enabled entities count
  - Total entities tracking
  - Integration-based statistics
  - Automation-ready sensor states

---

## Version 2.8.1 - UI Polish, Selection & Contrast Fixes

### ✨ New Features
- **Integration select-all checkbox** — each integration header now has a "Select all" checkbox that selects/deselects all entities within that integration. Supports indeterminate state when partially selected. Works even when the integration is collapsed (operates directly on data). Clicking the checkbox does not toggle expand/collapse
- **Updates filter counter** — the Updates filter button now shows the real count of pending HA updates (entities with domain `update.*` and `state = on`)
- **Bulk rename: selected entity list** — collapsible "Show selected entities" list in the Bulk Rename dialog so you can verify exactly which entities will be renamed before running
- **Bulk rename: regex help button** — a `?` button next to "Use regex" toggles an inline reference panel with common patterns and capture group examples
- **Bulk label: selected entity list** — same collapsible entity list in the Add Labels to Selected dialog
- **Bulk rename placeholders** — Find/Replace inputs now use realistic HA entity name examples (`living_room_temperature` → `lounge_temperature`)

### 🐛 Bug Fixes
- **Label chip text contrast** — label chips in the Manage Labels dialog now compute text color from the background luminance using a canvas context, handling all CSS color formats including HA's named colors (`yellow`, `amber`, etc.). Previously always used white text, making light-colored labels unreadable
- **Label dialog Done button** — fixed the Done button not closing the dialog; it was incorrectly bound to the Create button (first `.btn-primary` in the overlay) instead of the button in the actions footer
- **Sidebar active item contrast** — active sidebar items no longer fill with the primary color as background (which was unreadable on yellow/light themes). Now uses a left border accent with primary color text instead

### ✨ UI Improvements
- Replaced browser alerts/prompts with in-app dialogs for themes and filter presets
- Added clickable stat cards to open automation/script/helper lists
- Added inline entity list action buttons (info + edit)

### 🔐 Security & Validation
- Escaped theme names in dropdown rendering to prevent HTML injection
- Centralized entity ID validation and bulk limit constants

### 🔧 Backend & Services
- Shared enable/disable helpers across services and WebSocket API with clearer errors
- Removed outdated service descriptions for bulk/rename/export from services.yaml

### 🧪 Tooling
- Streamlined CI workflow and added npm-based ESLint config

---

## Version 2.8.0 - Dashboard Intelligence & UX Polish

### ✨ New Features

#### Lovelace Dashboard Inspector
- **Dashboard overview** — lists all dashboards with view counts, recursive card counts, and direct "Open ↗" links
- **Card type usage chart** — horizontal bar chart sorted by frequency; cards tagged as `built-in` (blue), `custom:*` (orange), or `unknown` (grey) for all 40+ known HA built-in card types
- **Entity reference map** — shows every entity referenced across all dashboards, sorted by how many times it appears, with location paths (Dashboard › View)
- Fixed Lovelace WS API to use correct `url_path` parameter instead of `dashboard_id`
- Card counting is now fully recursive (counts nested cards inside vertical-stack, horizontal-stack, grid, conditional, picture-elements, etc.)

#### Template Entity Management
- **Edit dialog** — rename entity_id (object_id part) and display name in one place
- **Entity ID rename** propagates through HA automatically — UI-created automations and scripts update their references via `entity_registry_updated` event
- **YAML config update** — new `entity_manager/update_yaml_references` backend command scans all `.yaml` files in the HA config directory and replaces old entity_id with new one using word-boundary regex (safe, won't match partial IDs). Skips `custom_components/`, `.storage/`, `deps/`, `tts/`, `backups/`, `www/`
- **Remove entity** — removes UI-created template helpers by deleting the config entry (prevents HA recreating on restart); YAML-defined templates removed from registry with a warning
- Rename result toast shows exactly how many references were updated and in how many files

#### Sidebar Navigation
- All 6 sidebar sections (Actions, Quick Filters, Labels, Smart Groups, Integrations, Help) are now **collapsible** with an animated `▾` arrow indicator
- **Default closed** — sidebar starts compact on first load
- Section open/closed state persisted per-section in `localStorage` — survives page reloads

### 🗑️ Removed
- **Updates stat card** removed — redundant with HA's built-in update notification button

### 🐛 Bug Fixes
- Fixed scroll clipping — last entity row was hidden due to `min-height: 100vh` on `#main-content` conflicting with the flex layout container. Fixed by adding `min-height: 0` override on the layout-context rule
- Added `padding-bottom: 32px` to main content area so last item has breathing room
- Fixed null access errors in Lovelace dialog when `card.conditions[]` or `view.sections[]` contain null entries
- Fixed `entities.map()` crash when entities array contains nulls — now uses `filter(Boolean)` before map
- Fixed entity list sort crash when entities array contains nulls — sort comparator now uses optional chaining

---

## Version 2.7.0 - Tooling & Docs

### 🧰 Tooling
- Added CI workflow for linting, type checks, tests, and security scanning
- Added ESLint configuration for frontend linting

### 📚 Documentation
- Overhauled README with detailed feature list, usage, troubleshooting, and architecture notes
- Updated installation docs with correct repository URL and component path

### 🔧 Internal
- Formatting and consistency cleanups in backend code

---

## Version 2.6.1 - Bug Fix

### 🐛 Bug Fixes
- **Fixed Icon Availability**: Removed invalid `"icon"` field from manifest.json that was not supported by Home Assistant
  - The `"icon"` field in manifest.json is not part of the official Home Assistant integration manifest specification
  - Integration icons must be submitted to the [home-assistant/brands](https://github.com/home-assistant/brands) repository to appear in the UI
  - This fix ensures the integration manifest is compliant with Home Assistant standards

---

## Version 2.5.0 - Update Manager & UI Improvements

### 🔄 Firmware Update Manager
- **New Updates Tab**: Dedicated view for managing all firmware and software updates
- **Update Filters**: Filter by All Updates, Stable Only, or Beta Only
- **Type Filters**: Filter by All Types, Devices, or Integrations
- **Hide Up-to-Date**: Checkbox to hide items that are already up to date
- **Select All**: Checkbox to quickly select/deselect all available updates
- **Bulk Updates**: Update multiple items at once with confirmation dialog
- **Release Notes**: View release notes before updating
- **Auto-hide**: Automatically enables "Hide Up-to-Date" when selecting a filter
- **Alphabetical Sorting**: Updates sorted alphabetically by title

### 📈 Statistics & Counts
- **Live Counts on Filter Buttons**: All, Enabled, Disabled, and Updates buttons now show live counts
- **Color-Coded Buttons**:
  - Green border/text for Enabled filter
  - Red border/text for Disabled filter
  - Amber border/text for Updates filter
- **Bold Counts**: Count numbers are bold for better visibility
- **Simplified Stats**: Removed redundant Enabled/Disabled stat cards
- **Blue Stats**: Scripts and Helpers counts now use blue color for consistency

### 🎨 UI Enhancements
- **Alphabetical Integration List**: Integrations now sorted A-Z
- **Simplified Entity View**: Entities listed directly under integration (no device accordion)
- **Device Name Display**: Device name shown inline with each entity
- **Grouped Device Dialogs**: Device popup groups devices by integration
- **Improved Dialog Styling**: Better dark theme support for all dialogs
- **Mobile Responsive**: Better word-wrap and layout on small screens

### 🔧 Technical Improvements
- **Update Count Tracking**: New `updateCount` property for tracking available updates
- **Cleaner Code**: Removed unused popup dialog code and simplified state management
- **Better Theme Detection**: Improved dark mode detection for dialogs appended to body

### 🐛 Bug Fixes
- Fixed dialog backgrounds not being solid in dark mode
- Fixed mobile word-wrap issues in entity list dialogs
- Fixed filter button styling when active

---

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

---

## Version 1.0.0 - Initial Release

### Features
- View all entities grouped by integration and device
- Enable/disable individual entities
- Bulk enable/disable operations
- Entity state visibility
- Device organization
