# Entity Manager UI Changes

## Version 3.0.0 - "Refined" UI Redesign

### Design System

- **Token overhaul** (`EM_THEME_VARS` single source of truth, `PREDEFINED_THEMES`, CSS `:root` fallbacks, `entity-manager-panel[data-theme]` blocks): light surface `#ffffff` / surface-2 `#f7f9fc` / canvas `#eef1f6` / ink `#1a2027` / line `rgba(30,41,59,.16)`; dark `#181c22` / `#14171c` / `#0f1216` / `#e7ebf0` / `rgba(255,255,255,.12)`; success `#2e9e4f`, danger `#e0473a`, warning `#e08a1e`. New `--em-canvas` token and `--em-header-h: 58px` layout constant
- **Overlay token scoping**: dialogs are appended to `document.body`, outside the panel element, so `--em-*` vars resolved from `:root` — where a user's HA theme setting `--divider-color: transparent` blanked every dialog border (`var()` fallbacks don't fire on defined values). Both `[data-theme]` token blocks now also target `.confirm-dialog-overlay[data-theme]`
- Hairline sweep: all decorative `2px solid var(--em-primary)`/`var(--em-border)` boxes reduced to 1px `--em-border` (spinner ring, scrollbars, and update-item accents intentionally kept)

### Main View

- Stat wall split into `.stats-data` (data stats) + nav strip; Suggestions tile shows a live count (cached via `em-suggestions-count`, refreshed by `_showSuggestionsDialog`)
- Integration rows: two-box header (`catsBoxHtml` Categories + `metaBoxHtml` Areas & Labels with `capChips` 4-chip cap and +N overflow); Enable/Disable/View actions collapsed into a `⋯` popover menu (`.integration-menu-*`, one-time document closer, `:has(.integration-menu.open)` overflow release on the clipping card)
- Per-integration accent colors: `_integrationAccent()` name-hash over `EM_ACCENT_PALETTE`, user override via `_showIntegrationColorDialog()` (shared label color picker), persisted to `em-integration-colors`; applied as inline `border-left-color` + `color-mix` logo backdrop
- Health banner → always-compact `.em-health-pill` (amber `color-mix` pill) with settings + dismiss
- "Select all" label stacked above its checkbox (`.integration-select-label` column-reverse)
- Desktop grids for inline views (`@media (min-width: 769px)`, `[data-view="automations-helpers"|"template"|"health-cleanup"|"hacs"]`) with `> :not(.em-mini-card|.hacs-store-item) { grid-column: 1/-1 }`; mobile unchanged

### Entity Details Dialog — Tabbed Rebuild

- `_showEntityDetailsDialog` reassembled from `_collGroup` accordion stack → pinned hero + `.em-ed-tabs` strip + `.em-ed-panels` scroll region (`#em-edd-body` is now a flex column with `overflow: hidden`; panels scroll independently)
- Tabs: Overview (2-col `.em-ed-ov-grid` cards: State / Area & Labels / Device / Integration), Attributes, Registry (full registry+device+integration rows under `.em-ed-subhead`s), Related (same-device entities + async Automation Impact, which also fills a count badge), History
- Hero: chips row first (top-left), centered name + id; duplicate domain chip dropped when `platform === domain`; label manage buttons use `.em-mini-btn`; `.em-ed-value` wraps at word boundaries (`overflow-wrap: anywhere`, was `break-all`)
- All data fetching, action handlers, rename-pencil flow, label-editor callbacks unchanged

### Dialog Internals Polish

- Missing `.btn-sm` modifier defined — ~15 call sites (Suggestions Apply, Area Assignment Apply/Assign, mapping rules, bulk bars) rendered as transparent ghosts because bare `.btn` has a transparent border/background
- Theme Editor modal brought into the Refined system (radius 14, hairline borders, 17px/700 title, 13px scale, compact footer buttons)
- `.em-target-btn` (Apply-to selector in label editors + Assign dialog) moved from ~20 lines of inline styles + JS style toggling to a proper CSS class with `.active` state
- Device Picker groups and Add-to-Group rows: 2px primary/border → hairline; label editors' Create buttons unified to `btn-primary`; `.rename-input` 16px → 13.5px + `box-sizing: border-box` (kills a horizontal scrollbar)

### Safety / Accuracy (action-warning audit)

- `renameEntity` returns `true`/`false` and takes `opts.quiet` (no per-failure dialog spam in bulk); `executeRenames` counts real outcomes instead of treating every settled promise as success
- Cleanup "Remove All" orphaned: outcome-aware toast (success / partial / all-failed) instead of unconditional success
- `_addLabelToEntity` pushes a `labels_change` undo (before/after both registries), matching `_removeLabelFromEntity`; the label editor's aggregate Done-time push removed (it double-counted — and had already double-counted removals)
- Health threshold `prompt()` → `_showPromptDialog`
- Confirms unified: sidebar Enable/Disable Selected now routes through the confirm-wrapped `_bulkEnableSelected`/`_disableSelectedEntities`; `_bulkToggleGroup` (device-card + smart-group All buttons), preset Enable/Disable, and Unavailable bulk Disable confirm with counts; Clear History and Clear all notifications confirm
- Import Config pushes a new `states_import` undo action (`enabledIds`/`disabledIds`, reversed as one step; undoing entries the backend failed to apply is a harmless no-op)

### Security

- `enable_entity`/`disable_entity` service handlers enforce admin via `hass.auth.async_get_user` + `Unauthorized` (system-initiated calls without a user context pass, per core convention) — closes the asymmetry with the `@require_admin` WS commands
- `_renderFilterPresets` (Saved Views) escapes `preset.name`/`preset.id` — was the one unescaped `innerHTML` sink in the app
- `import_entity_states` schema capped with `vol.Length(min=1, max=MAX_BULK_ENTITIES)`
- `update_yaml_references` and `register_template` skip any `secrets.yaml` (any directory) and write a `<file>.yaml.em-bak` backup of pre-edit content before modifying a file

### Bug Fixes

- Favorites sidebar filter is a real toggle (was stuck on once activated), with `.active` state and an empty-state message

---

## Version 2.22.0 - One-Click Integration Reveal, Category/Label Rollup & Bulk-Action Fixes

### New Features

#### One-Click Reveal for Single-Device Integrations
- Expanding an integration that has exactly one device now reveals that device's entities immediately — no second click on the device row
- Applies uniformly everywhere an integration can be expanded: the main tree header click, the sidebar's integration nav click, and the "View Enabled"/"View Disabled" buttons
- New `_autoExpandLoneDevice(integrationName)` helper, called from all three expand-transition sites; never runs from inside a render function, so it can't fight a user's manual collapse of that device row

#### Integration Row Category Breakdown & Label Rollup
- Every integration row now shows, without expanding: a category-count breakdown (Controls / Sensors / Configuration / Diagnostic / Connectivity) and a deduped rollup of every HA Label present anywhere in the integration (entity, device, or area scoped)
- Label rollup keeps the broadest scope seen per label (Area > Device > Entity) and is display-only — no click target exists for an integration-wide summary; the row is omitted entirely when an integration has no labels anywhere
- Device-level category classification (previously inline in `_buildDeviceCard`) is now hoisted into shared `_categorizeEntity()` / `_categoryMeta()` methods so the device- and integration-level rollups can't drift apart

#### Energy Monitoring Split Into Four Categories
- Label Suggestions' single "Energy Monitoring" row is now four: **Power Monitoring**, **Energy Consumed**, **Energy Returned**, and generic **Energy Monitoring** (everything else)
- HA has no separate `device_class` for consumed vs. returned energy — both are just `"energy"` — so direction is matched by entity_id substring (`consumed_energy`/`energy_consumed`, `returned_energy`/`energy_return`), verified against real floor-heating switch entity IDs

#### Custom Color Picker for Labels
- All 4 label color pickers in the app (label edit dialog, entity label editor's create-new-label, bulk label dialog's create-new-label, Assign dialog's inline label creator) now share one custom-color swatch alongside the 19 preset colors
- New shared `_renderLabelColorPickerHtml()` / `_attachLabelColorPicker()` helpers replace 4 near-duplicate inline implementations; HA's label registry backend accepts arbitrary hex colors with no server-side validation, confirmed live

### Bug Fixes

- **Stacked-dialog scroll-lock**: closing an inner confirm sub-dialog no longer strips the page scroll-lock while its parent dialog is still open — `createDialog()`'s `closeDialog` now only removes `em-dialog-open` once no `.confirm-dialog-overlay` elements remain
- **Bulk Rename / Bulk Labels from list dialogs**: fixed a stale-closure bug where invoking "Bulk Rename" or "Add Labels to Selected" from the Automations/Scripts/Helpers list dialog's bulk-action bar silently operated on the wrong (previous toolbar) selection — the save-and-restore-around-an-unawaited-async-call pattern reverted `selectedEntities` before the rename queue or label list ever read it. Both dialogs now take an explicit `entityIds` override instead
- **Entity Details label chips going stale**: the "Manage Entity/Device Labels" buttons left the dialog's own label chips showing pre-edit data after use — `_showLabelEditor`'s returned promise resolved as soon as its own dialog was drawn, not when the user actually finished editing. It now resolves when that dialog truly closes (Done, Escape, or backdrop click)
- **Entity Details rename pre-fill**: the hero pencil-edit pre-filled from the live `friendly_name` state attribute, which for `has_entity_name` devices is often a "{device name} {entity name}" composite — saving unedited wrote that composite back as the display-name override. Now prefers the raw registry name/`original_name`
- **Bulk area assignment reporting total failure on partial success**: `_assignAreaToEntities` aborted the whole batch on the first per-entity failure while entities processed before the failure were already mutated (and undone) — it now continues past failures and returns `{success, failed}` so all 4 call sites report accurate `X/Y succeeded` counts
- **Context-menu "Enable/Disable Selected" bypassing the bulk endpoint**: this path looped individual `enable_entity`/`disable_entity` calls instead of the real `bulk_enable`/`bulk_disable` WS commands, evading the server-side 500-entity cap entirely and flooding the 50-slot undo stack with one entry per entity. It now delegates to the same `bulkEnable()`/`bulkDisable()` the sidebar already uses correctly
- **Bulk Labels editor/remover**: both mutated labels with no way to undo (violating the app-wide convention that only `remove_entity` is undo-exempt) and never refreshed the entity tree afterward, leaving label chips stale. Both now push proper undo actions and call `loadData()`
- **"Open in HA" from Entity Details**: previously force-opened a new tab at a different (edit-form) route than the entity card's own "Open in HA" button. Now uses the same `data-open-path` delegation already proven reliable elsewhere in the app (the automation/script list dialogs' "Edit" rows) — two other approaches (manual `history.pushState`, and the sibling `data-open-entity`/`hass-more-info` mechanism) were tried live and discarded first
- **Entity Details toggle/press button**: had no error handling (a failed service call was a silent unhandled rejection), no success toast, and no UI refresh — the button label and state chip stayed frozen at the pre-click value for the dialog's remaining lifetime. Now matches the entity card's toggle/press pattern: try/catch with a toast either way, optimistic label/state update on success
- **Sidebar `bulkEnable()`/`bulkDisable()`**: reported the requested count as the success count regardless of the actual WS response, and pushed undo/cleared selection for entities that may have failed server-side. Now reads the response's real `success`/`failed` arrays; removed dead `undo` closures that were never read anywhere (undo/redo already reverses these generically) and couldn't have survived the undo stack's JSON persistence regardless

---

## Version 2.21.0 - Clickable Chips, Unified Assign Dialog & Suggestion Ignore/Restore

### New Features

#### Clickable Area / Floor / Label Chips
- Entity card header chips for **area**, **floor**, and (new) **label** are now real buttons — hover tint, press nudge — instead of static text
- Empty states render as dashed, still-clickable placeholders: "No area", "No floor", "No label"
- Device card header gets the same treatment: clickable area chip (with "No area" placeholder) plus device-level label chips
- Every label chip carries a **scope badge**:
  - `E` — the label is set directly on the entity
  - `D` — inherited from the entity's device
  - `A` — inherited from the entity's area
  - Resolution is **broadest-source-wins**: if a label is set at multiple levels, the widest scope (Area > Device > Entity) is shown, and chips are grouped broadest-first
- New data layer built once per `loadDeviceInfo()` load (no per-card async calls): `entityLabelsMap`, `deviceLabelsMap`, `areaLabelsMap`, `labelLookup`, plus `_effectiveEntityLabels()` and `_scopeToTarget()` helpers

#### Unified "Assign" Dialog
- New `_showAssignDialog(entities, { focus, labelTarget })` — a single dialog for area/floor assignment **and** label management, opened from any chip (area, floor, label, or the device header's chips)
- **Area & Floor section** — reuses the existing two-pane floor/area picker and `_assignAreaToEntities()` apply logic; create-area / create-floor supported inline
- **Labels section** — Apply-to target selector now includes **Area** alongside Entity / Device / Both (previously areas could only be *viewed* via the `A` badge, never *set*); current labels list shows the same `E`/`D`/`A` badges with per-label remove
  - Removing a `D` or `A` (inherited) label prompts a confirmation, since it affects every entity on that device/area
  - "Already on" state for the Add-label list is target-specific — a label already on the entity can still be added to the area from the same list
- **Cancel** button in the dialog footer (alongside Done) closes without side effects
- Dialog opens auto-scrolled to whichever section (`area` or `labels`) the clicked chip corresponds to

#### Suggestion Ignore / Restore System
- Every suggestion row across **Health Issues**, **Disable Candidates**, **Naming Improvements**, **Area Assignment**, **Area Mismatch**, and **Label Suggestions** now has an **Ignore** button
- Ignoring persists to `localStorage['em-ignored-suggestions']` (keyed `type:id`) so the suggestion stays hidden across sessions/re-scans
- A **View ignored (N)** checkbox at the top of the Suggestions view expands a list showing each ignored item's **type badge**, name, and origin (entity ID / device / label group)
- Per-item **Restore** button un-ignores just that one; **Restore all** clears the whole list at once — both trigger an immediate re-scan

### Visual / UX Fixes

- **Label color picker** in the label editor moved off the cramped single-column layout — name + Create button on one row, full-width labeled color-swatch row underneath
- **Ignore button** changed from a bare ✕ icon to a labeled "✕ Ignore" text button for clarity
- Removed the duplicate per-category **Enable All / Disable All** buttons on device category sub-cards (Controls/Sensors/Configuration/Diagnostic/Connectivity) — redundant with the device header's buttons

### Bug Fixes

- Fixed a dangling `overlay.querySelector('.em-floor-cancel-btn')` reference in the Area & Floor dialog that threw a null-reference error on every open (the class doesn't exist in that dialog's markup; the working cancel binding was elsewhere)
- Fixed the Unified Assign dialog clipping content on mobile — the Area & Floor picker's two-pane flex layout was collapsing to a fixed height inside the dialog's bounded-height wrap, cutting off the area list. Sections no longer shrink (`flex-shrink: 0`), so the whole dialog scrolls instead

---

## Version 2.20.0 - Notification Center & Entity Details Redesign

### New Features

#### Bell Icon Notification Center
- A bell icon (🔔) appears in the panel header, right of the title and left of the Theme button
- Badge shows unread notification count in red; fills to `mdi:bell-badge` when unread items exist
- Clicking the bell opens a dropdown panel listing all notifications newest-first

#### Four Tracked Event Types
- **Device offline** (`mdi:wifi-off`, red left border) — fires when any entity transitions from a non-unavailable state to `unavailable` in live HA state updates
- **State anomaly** (`mdi:help-circle`, orange border) — fires when an entity transitions to `unknown` from a previously known state
- **Entity enabled/disabled** (`mdi:toggle-switch` / off-outline, green / red border) — detected on each `loadData()` refresh by comparing `is_disabled` maps between loads
- **New entity added** (`mdi:new-box`, blue border) — fires when a new entity ID appears in the registry that wasn't known on the previous `loadData()` call

#### Notification Behaviour
- **Persistent** — stored in `localStorage['em-notifications']`, survives page refreshes and HA restarts
- **Rate-limited** — same entity + event type can fire at most once every 5 minutes (prevents spam on flapping devices)
- **Capped** — max 100 notifications; oldest are dropped when the limit is reached
- **Mark all read** — badge clears; all items dim to 50% opacity
- **Dismiss** — individual × button removes a single notification
- **Clear all** — empties the list entirely

#### First-Load Safety
- `_hassInitialized` flag: first `set hass()` call snapshots state without firing offline/anomaly notifications (prevents false alerts on panel open)
- `_knownEntityIds = null` sentinel: first `loadData()` seeds the known-entity set from localStorage without firing "new entity" notifications (prevents flood on first install)

#### Notification Preferences
- Gear icon in the dropdown opens a settings panel with toggles for each notification type (offline, anomaly, enabled, disabled, new)
- Preferences stored in `localStorage['em-notif-prefs']`; each type can be individually silenced

#### EM-Action Suppression
- Notifications are **not** fired for enable/disable actions performed inside Entity Manager itself — only for changes made externally in HA

---

### Entity Details Dialog — Full Redesign

#### Hero Header
- Friendly name displayed prominently with an inline pencil icon; clicking it opens an editable text field — saves via `update_entity_display_name`, cancel with ✕ or Escape, confirm with ✓ or Enter, click outside to cancel
- Entity ID shown below name in monospace
- Chip row: domain (blue border), platform, Disabled badge (if applicable), Area name
- State displayed as a colored pill badge (orange for unavailable/unknown, green for on/open, grey for off) with "State" label prefix
- Timestamps show locale-aware absolute format via `_fmtAbsDate` — 12h/24h and date order follow the browser locale (e.g. `en-GB`: `Thursday, 27 March 2026 - 14:35`; `en-US`: `Thursday, March 27, 2026 - 02:35 PM`)
- Toggle / Press button appears inline for controllable entities (switch, light, fan, cover, automation, etc.) and button/script entities — fires the appropriate HA service directly

#### Action Buttons
Four buttons in the dialog footer:
- **Copy ID** — copies entity ID to clipboard with a toast confirmation
- **Enable / Disable** — enables or disables the entity and closes the dialog
- **Open in HA** — opens the entity's HA settings page in a new tab
- **Close**

#### Attribute Display
- Attributes shown in a 2-column CSS grid with key above value — much more compact than the previous card-per-attribute layout

#### Flat Label/Value Rows
- Registry, Device, Integration sections now use clean horizontal `Label → Value` rows instead of mini entity cards with dark header bands

#### History Timeline
- State history entries show as compact rows: coloured dot + state value + absolute timestamp

#### Area & Labels — Merged Section
- Area and Labels combined into one collapsible section; area shown as two side-by-side bordered chips (`[Area]` `[Kitchen]`)

#### Structure Improvements
- Sections reduced from 11 to 8 (Statistics section removed — was a duplicate of Overview + Current State)
- Attributes section open by default
- `_collGroup()` now accepts an `openByDefault` parameter

### Bug Fixes

- **ISO-valued states in mini entity cards** — entities whose HA state value is an ISO timestamp (e.g. `tts.home_assistant_cloud`, `stt.home_assistant_cloud`) were showing the raw `2026-01-27T21:46:17.330074+00:00` string in the Cleanup/Orphaned dialog and all other mini card contexts; they now display a relative time ("2 days ago") consistent with the main entity list

---

## Version 2.19.0 - Health & Cleanup Inline View Improvements

### New Features

#### Unavailable Entities — Full Per-Row Actions
- Entity cards in the Unavailable Entities section now show per-row action buttons: **Ignore**, **Disable**, **Add to Group**, **Remove**
- Disable and Remove show a confirmation dialog before acting to prevent accidental destructive changes

#### Ignore with Snooze (Unavailable & Orphaned)
- The **Ignore** button now opens a duration picker instead of silently hiding the entity: 1 Day / 3 Days / 1 Week / 2 Weeks / 1 Month / 3 Months / Permanent
- Snoozed entities disappear from the list until their snooze expires; permanently ignored entities stay hidden until manually unignored
- **Unignore** is instant — no dialog
- A **Show ignored (N)** toggle appears in the section header once any entities are ignored
- Ignore state is stored as `{ entity_id: expiry_ms }` (0 = permanent) — old array format migrated automatically
- `em-unavail-ignored` and `em-orphan-ignored` storage keys shared between the inline Health & Cleanup view and the standalone stat card dialogs

#### Cleanup → Orphaned — New Actions
- Orphaned entity cards now have the same action row as Unavailable: **Ignore** (with snooze), **Assign to device**, **Add to Group**, **Remove**
- **Show ignored (N)** toggle in the Orphaned section header
- Checkboxes added to all orphaned entity cards

#### Add to Group Dialog — Redesigned
- "Add to Group" button now opens a dialog listing the same grouping modes as the sidebar Groups section: **By Area**, **By Floor**, **By Device Name** (actionable), **By Integration**, **By Type** (automatic / informational)
- **By Area / By Floor** → opens the area assignment dialog
- **By Device Name** → opens the device picker (single entity only)
- **Custom Groups** section below shows any groups created via "+ New Group"; click to add instantly
- **+ New Custom Group** button at the bottom to create a new group with the entity pre-selected
- Button has blue outline border (`em-dialog-btn-outline-primary` style)

### Help Guide Updates
- New **Unavailable Entities** section added to the help guide covering ignore snooze, per-row actions, and Show Ignored
- **Cleanup** section updated with new per-row actions, ignore snooze, Show Ignored toggle, and Never Triggered category
- **Groups** section completely rewritten to describe all 5 grouping modes, custom groups, and the Add to Group dialog

### Bug Fixes

#### Ignore Button Not Responding in Health & Cleanup Inline View
- **Root cause 1 — event delegation lost**: The `'unavailable'` section in `_renderMergedEntitySections` was using the temp+move DOM pattern (nodes moved from a detached `temp` element into `groupBody`), so all delegated click listeners were registered on the now-detached `temp` rather than on any live DOM ancestor. Fixed by passing `groupBody` directly as `container` (same pattern already used for `cleanup` and `config-health`).
- **Root cause 2 — block-scope ReferenceError**: `_uvIgnoredSet` and `_orIgnoredSet` are declared with `let` inside their respective `if (type === 'unavailable')` / `if (type === 'orphaned')` blocks inside `showEntityListDialog`. The delegated click handlers at the outer try-block level referenced these variables directly, causing a silent `ReferenceError` on every click. Fixed by adding `getIgnoredSet: () => _uvIgnoredSet` / `getIgnoredSet: () => _orIgnoredSet` getters to `unavailCtx` / `orphanCtx`, and updating the handlers to call `unavailCtx.getIgnoredSet().has(eid)` / `orphanCtx.getIgnoredSet().has(eid)`.

### Code Quality
- Extracted `_attachRowHover(el)` helper in `_showAddToGroupDialog` — eliminates duplicate mouseenter/mouseleave listener blocks
- Removed `!important` declarations from `.btn-danger` CSS rule

---

## Version 2.18.0 - HA Native Icons

### Changes

#### Replaced All Emoji with HA Native Icons
- Replaced every emoji and Unicode symbol character throughout the UI with `<ha-icon icon="mdi:...">` elements — the same icon system Home Assistant itself uses
- Added `EM_ICONS` top-level constant mapping semantic names to MDI icon strings for centralised management (single place to change any icon)
- Added `_icon(icon, size)` helper method that returns a properly sized `<ha-icon>` element, or passes raw SVG/HTML through unchanged for flexibility
- Added CSS sizing rules for `ha-icon` in all contexts: sidebar items, icon buttons, toast, entity card chips, inline view titles, dialog headers, area picker rows, stat cards
- Icons now render identically on all operating systems — no more OS-level emoji variation between Windows, macOS, iOS, and Android

---

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
