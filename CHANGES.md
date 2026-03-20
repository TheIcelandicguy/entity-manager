# Entity Manager UI Changes

## Version 2.17.0 - Last Activity Timeline View & Persistent Timestamps

### New Features

#### Last Activity Timeline Inline View
- New **🕐 Last Activity** sidebar button (Actions section) opens a full inline view showing when every entity, automation, script, helper, template, sensor, switch, light, etc. was last active
- Entities grouped into **15 domain-based sections**: 🤖 Automations, ⚡ Scripts, 🎛️ Helpers, 🧩 Templates, 💡 Lights, 🔌 Switches, 🌡️ Sensors, 🔍 Binary Sensors, 📺 Media Players, ❄️ Climate & Environment, 🔒 Security, 📷 Cameras, 📍 People & Tracking, 🔘 Controls, ⬆️ Updates, ⚙️ Other (sub-grouped by integration)
- **9 time-range filter pills**: All · Today · This Week · 1 Month · 3 Months · 6 Months · 1 Year · Older · Never
- **Live search** across entity ID, friendly name, device name, and integration (debounced 200ms)
- **Live count badge** in the header updates as filter/search changes
- Refresh button invalidates the recorder timestamp cache and re-fetches fresh data
- Clicking any row opens the entity details dialog
- Filter pill selection persisted to `localStorage['em-at-filter']`

#### Persistent "Last Active" Timestamps (Recorder-backed)
- New `entity_manager/get_last_activity` WebSocket endpoint queries the recorder SQLite DB for the most recent non-`unavailable`/`unknown` state change per entity — timestamps survive HA restarts
- Returns `{ entity_id: timestamp_ms }` — chunked SQL queries (500 per batch) to avoid DB limits
- Frontend caches results in `localStorage` (`em_lastActivityCache`) with a 1-hour TTL
- Entity card "Last active" chip now uses recorder-backed timestamps; falls back to `state.last_changed` on cache miss
- `_loadLastActivityCache()` fires non-blocking from `loadData()`; calls `updateView()` after cache loads

---

## Version 2.16.0 - History Dialog, Delete Fixes & Open in HA

### New Features

#### Combined Undo/Redo History Dialog
- Replaced two separate "Undo (N)" / "Redo (N)" sidebar buttons with a single **↺ History** button
- Clicking opens a dialog showing the full action timeline: redo actions (muted, top) → "▶ Current state" divider → undo actions (bottom)
- Each row shows a human-readable description (e.g. "Assigned sensor.shelly_power to Shelly Plug S")
- Clicking any row executes all steps needed to reach that point in history; list refreshes in-place
- Section labels explain each half: "These are actions you have taken — click Undo to reverse them"
- **Clear History** button wipes both stacks and persists to localStorage
- History survives hard refresh (localStorage persistence carried over from undo/redo system)
- New `_describeAction(action)` helper covers: enable, disable, bulk_enable, bulk_disable, rename, display_name_change, labels_change, assign_entity_device, assign_entity_area, assign_device_area
- Device name stored in `assign_entity_device` undo action so history shows the actual device name

#### "Open in HA" Button on Entity Cards
- New house+HA SVG icon button added to every entity card action row
- Navigates to the entity's settings page in HA (`/config/entities/entity/{id}`)
- Mini-cards in all views (dialogs and inline) updated: `↗` replaced with matching house+HA icon; opens entity more-info panel
- Context menu "Open in HA" fixed: `location-changed` event now dispatched with `bubbles: true, composed: true` so HA picks it up
- Persistent delegated listener on `this.content` ensures the button works in async-loaded inline sections (Automations & Helpers, Health & Cleanup, etc.)

#### Assign to Device from Context Menu
- Right-click any entity card → new "🔌 Assign to device" option
- Opens the same device picker dialog (integration-grouped, confirmation warning, undo tracked)
- Stored in undo history with device name shown in history dialog

### Bug Fixes

#### Delete Button on Entity Cards
- Fixed missing click listener for the `🗑` bulk-delete button — button was rendered but had no handler wired up
- Switched WS call from `config/entity_registry/remove` (fails for entities without `unique_id`) to `entity_manager/remove_entity` (handles all entity types)
- Python handler now has proper `try/except` around `entity_reg.async_remove()` — unhandled exceptions no longer cause silent WS failures
- Toast now shows the actual error message instead of just "N failed"

#### Bulk Delete Performance (Large Batches)
- Batches > 10 entities now skip per-entity WS scans (was firing 2× N parallel calls — e.g. 198 simultaneous WS requests for 99 entities)
- Large batches show count warning immediately and list entity IDs
- Deletion runs in parallel chunks of 10 instead of sequentially one-by-one

---

## Version 2.15.0 - Area & Floor Assignment Dialog Redesign

### New Features

#### Area & Floor Assignment Dialog (complete redesign)
- Two-panel dialog replaces the old flat area picker
- **Left panel**: Step 1 — select floor (filters new area creation only; all areas always visible); Step 2 — select area with floor subtitle on each row
- **Right panel top**: entity info box showing device name, friendly name, entity ID, and current area/floor assignment
- **Right panel bottom**: live preview box — border turns green when area is selected, shows new area + floor
- Apply button fills solid blue with white text when an area is chosen; disabled/faded when nothing selected
- Dialog title dynamically shows "Assigning [friendly name] to area"
- "+ Create an area" / "+ Create a new floor" inline create buttons with auto-selection after creation
- "No area" option to clear existing assignment
- Sidebar "Area Assignments" and context menu "Assign to area" both use the new dialog
- Removed "Assign to floor" from context menu (floor is a property of area in HA's data model)

#### Entity Card Area/Floor Chips
- Entity cards now show 📍 area and 🏢 floor chips in the header band
- Fixed: chips were always empty because `entity_manager/get_areas_and_floors` was silently failing on every load; switched to native `config/area_registry/list` + `config/floor_registry/list` APIs
- Entity-level area assignment takes precedence over device-level area (matching HA behaviour)
- `entityAreaMap` now covers ALL entities with entity-level area (not just orphans)
- `loadDeviceInfo()` is now properly awaited in `loadData()` so cards always render with fresh data after assignment

#### Suggestions Dialog
- Fixed: "Naming Improvements" and "Label Suggestions" sidebar links now correctly expand the relevant section in the dialog (was querying `.em-coll-group-header` which does not exist; fixed to `.em-collapsible`)

---

## Version 2.0.6 - UI Overhaul, Theme Consistency & Firmware Update Manager

### Overview
Complete redesign of the Entity Manager UI with consistent color theming, improved mobile responsiveness, better light/dark mode support, and a new firmware update management feature with stable/beta filtering.

---

## Major Changes

### 1. Firmware Update Manager (NEW)
**New dedicated tab for managing firmware updates:**
- **Updates Tab**: New 4th filter button to view all available updates
- **Update Filter**: Dropdown to filter between:
  - All Updates
  - Stable Only (excludes beta/rc/dev versions)
  - Beta Only (shows only beta/rc/dev versions)
- **Bulk Update**: Select multiple updates and install them all at once
- **Individual Updates**: Each update has its own update button
- **Release Notes**: Direct links to release notes when available
- **Version Display**: Shows current version and latest available version
- **Visual Indicators**:
  - Orange highlight for available updates
  - Blue accent for beta versions
  - Green checkmark for up-to-date items
- **Update Status**: Clear display showing current vs. latest version
- **Smart Detection**: Automatically identifies stable vs. beta based on version naming patterns

### 2. Consistent Color Theme
**All UI elements now follow a unified color scheme:**
- **Primary Color**: Blue (`#2196f3`) for all borders
- **Success Color**: Green (`#4caf50`) for enabled states
- **Danger Color**: Red (`#f44336`) for disabled states
- **Warning Color**: Orange (`#ff9800`) for update indicators
- **Borders**: All borders are 2px solid blue in both light and dark modes

### 3. Light/Dark Mode Support
**Light Mode:**
- Text: Black (`#000000`)
- Secondary Text: Gray (`#666666`)
- Background: White (`#ffffff`)
- Secondary Background: Light Gray (`#f5f5f5`)

**Dark Mode:**
- Text: White (`#ffffff`)
- Secondary Text: Light Gray (`#cccccc`)
- Background: Dark Gray (`#1e1e1e`)
- Secondary Background: Darker Gray (`#2d2d2d`)

**Theme Detection:**
- Multiple detection methods for Home Assistant themes
- System preference support via `prefers-color-scheme`
- Automatic theme switching with MutationObserver

### 3. Mobile Responsive Design
**Complete mobile optimization:**
- Reduced padding and spacing for mobile screens
- Full-width buttons and filters
- Stacked toolbar elements
- Grid layout for entity items preventing overflow
- Better text wrapping and word breaks
- Touch-friendly button sizes

**Breakpoints:**
- `@media (max-width: 768px)` - Tablets and mobile
- `@media (max-width: 480px)` - Small phones

### 4. Entity Status Badges
**Changed from state display to status display:**
- Shows "Enabled" with green background for enabled entities
- Shows "Disabled" with red background for disabled entities
- Replaced the "unknown" state display with clear status indicators

### 5. Button Styling
**All buttons updated with consistent styling:**
- Blue borders throughout
- Enable buttons: Green borders and text
- Disable buttons: Red borders and text
- Rename buttons: Blue borders and text
- Proper hover states with background fills
- White text on colored backgrounds when active

### 6. Search Box & Input Fields
**Unified input styling:**
- Blue borders (2px solid)
- Proper background colors for light/dark modes
- Placeholder text uses secondary text color
- Focus states with blue highlight
- Consistent styling for search box and rename input

### 7. Entity Items
**Desktop:**
- Blue borders around each entity
- Proper background colors
- Clear hover states

**Mobile:**
- Grid layout (checkbox, info, actions)
- Blue borders visible on dark backgrounds
- Proper text wrapping
- Actions aligned at bottom right

### 8. Integration & Device Cards
**Consistent card styling:**
- Blue borders for all cards
- Proper backgrounds for light/dark modes
- Enable All / Disable All buttons with color-coded borders
- Better spacing and alignment on mobile

---

## Technical Changes

### CSS Variables Added
```css
--em-primary: #2196f3;
--em-success: #4caf50;
--em-danger: #f44336;
--em-warning: #ff9800;
--em-text-primary: (black/white based on theme)
--em-text-secondary: (gray based on theme)
--em-bg-primary: (white/dark based on theme)
--em-bg-secondary: (light-gray/darker-gray based on theme)
--em-border: #2196f3;
```

### JavaScript Updates
**Enhanced `updateTheme()` method:**
- Checks `data-theme` attribute
- Checks computed background colors
- Checks text colors
- Falls back to system preference
- Sets `data-theme` attribute on component

**New Update Manager Functions:**
- `loadUpdates()` - Fetches all update entities from Home Assistant
- `renderUpdates()` - Displays filtered update list with version info
- `renderUpdateItem()` - Creates HTML for individual update items
- `attachUpdateListeners()` - Handles checkbox and button events
- `performUpdate()` - Executes single update via update.install service
- `confirmBulkUpdate()` - Shows confirmation dialog for bulk updates
- `performBulkUpdate()` - Executes multiple updates in parallel
- `updateSelectedUpdateCount()` - Updates selected count badge

**Update Filter Logic:**
- Stable filter: Excludes versions containing "beta", "rc", or "dev"
- Beta filter: Includes only versions containing "beta", "rc", or "dev"
- Search integration: Filters updates by title/entity ID

### Files Modified
1. `frontend/entity-manager-panel.js` - Complete UI overhaul + update manager
2. `manifest.json` - Version updated to 2.0.6
3. `CHANGES.md` - This documentation file

---

## User Experience Improvements

### Before
- Inconsistent colors across light/dark modes
- Hardcoded colors not adapting to themes
- Mobile layout had overflow issues
- "Unknown" state labels were confusing
- Borders not visible in some modes
- No firmware update management

### After
- Unified blue borders throughout
- Clear green/red color coding for states
- Perfect mobile responsiveness
- Clear "Enabled/Disabled" status badges
- Consistent theme support
- No content overflow on mobile
- Professional, polished appearance
- **Centralized firmware update management**
- **Stable/beta version filtering**
- **Bulk update capabilities**
- **Release notes integration**

---

## Browser Compatibility
- Works in all modern browsers
- Requires CSS Grid support for mobile layout
- CSS Custom Properties (CSS Variables) required
- Tested with Chrome, Firefox, Safari, Edge

---

## Maintenance Notes
- All colors centralized in CSS variables
- Easy to change color scheme by updating variables
- Mobile styles inherit from desktop where possible
- Theme detection is automatic and reactive
- Version increments required for cache busting

---

## Future Considerations
- Could add color customization options
- Could support additional theme presets
- Could add animation preferences
- Could add compact mode toggle
