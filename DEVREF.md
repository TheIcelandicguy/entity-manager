# DEVREF — Entity Manager Panel Internals

Developer reference for `entity-manager-panel.js` (~15,000 lines) and `entity-manager-panel.css` (~6,300 lines). Companion to CLAUDE.md (which covers project overview, setup, git workflow, and contribution guide). This document covers internal architecture only.

---

## 1. Instance State (`this.*`)

### Core Data
| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `_hass` | HomeAssistant | — | HA instance; updated on every state change via `set hass()` |
| `data` | Array | `[]` | Raw entity tree from `entity_manager/get_disabled_entities`: `[{ integration, devices: { id: { name, entities[] } } }]` |
| `deviceInfo` | Object | `{}` | Device registry cache: `device_id → device object` |

### View / Mode State
| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `_activeView` | String\|null | `null` | Active inline view key (`'automations-helpers'`, `'health-cleanup'`, `'template'`, `'hacs'`, `'lovelace'`, `'suggestions'`, `'browsers'`, `'activity-log'`, `'activity-timeline'`) |
| `_bulkRenameMode` | Boolean | `false` | Bulk rename inline panel active |
| `_bulkRenameData` | Array | `[]` | Pre-loaded entity data for bulk rename (state: 'all') |
| `_viewingSelected` | Boolean | `false` | Show only selected entities |
| `_showOnlyFavorites` | Boolean | `false` | Filter entity list to favorites only |
| `viewState` | String | `'all'` | Entity filter mode: `'all'`, `'enabled'`, `'disabled'`, `'updates'` |
| `viewMode` | String | `'integrations'` | Main view: `'integrations'` or `'devices'`. Toggled by `.view-mode-toggle[data-view-mode]` buttons in toolbar. Dispatches `updateView()` to `_renderIntegrationsView()` or `_renderDevicesView()`. |
| `isLoading` | Boolean | `false` | Set during WS fetches; prevents overlapping loads |
| `_playAnimations` | Boolean | `true` | Guards stagger-in CSS animations. Re-armed to `true` on `location-changed` event (user navigates back to the panel). |

### Filtering & Search
| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `searchTerm` | String | `''` | Active search query |
| `selectedDomain` | String | `'all'` | Entity domain filter; always check `!== 'all'` before filtering (default is truthy `'all'`) |
| `selectedLabelFilter` | String\|null | `null` | Active HA label ID filter |
| `selectedIntegrationFilter` | String\|null | `null` | Show only one integration |
| `integrationViewFilter` | Object | `{}` | Per-integration filter: `{ integration: 'enabled'\|'disabled'\|undefined }` |
| `deviceViewFilter` | Object | `{}` | Per-device filter |
| `showOfflineOnly` | Boolean | `false` | Devices view: show only offline devices. Persisted to `em-show-offline-only`. |
| `deviceTypeFilter` | String | `'all'` | Devices view: filter by device type. Persisted to `em-device-type-filter`. |
| `domainOptions` | Array | `[]` | Domain list extracted from `this.data`; used to populate domain dropdown. |

### Selection
| Property | Type | Purpose |
|----------|------|---------|
| `selectedEntities` | Set | Entity IDs currently checked |
| `selectedUpdates` | Set | Update entity IDs selected for bulk update |

### Counts (set by `loadCounts()`)
| Property | Purpose |
|----------|---------|
| `automationCount` | Total automations |
| `scriptCount` | Total scripts |
| `helperCount` | Total helpers |
| `updateCount` | Pending updates |
| `hacsCount` | Installed HACS items |
| `templateCount` | Template entities |
| `lovelaceCardCount` | Lovelace card types |
| `configHealthCount` | Config entry errors |
| `unavailableCount` | Unavailable entities |
| `ghostDeviceCount` | Devices with no entities |
| `neverTriggeredCount` | Automations never triggered |

### Area / Floor / Labels
| Property | Type | Purpose |
|----------|------|---------|
| `areaLookup` | Map | `area_id → { areaName, floorName }` — built from native HA APIs, NOT `entity_manager/get_areas_and_floors` |
| `_lastActivityCache` | Map | `entity_id → timestamp_ms` — recorder-backed last-active timestamps; loaded by `_loadLastActivityCache()`; persisted to `localStorage['em_lastActivityCache']` with 1-hour TTL |
| `floorsData` | Object\|null | `{ areas: [], floors: [] }` cached from HA |
| `entityAreaMap` | Map | `entity_id → area_id` (entity-level area assignments) |
| `entityDeviceMap` | Map | `entity_id → device_id` (for orphan detection) |
| `labelsCache` | Object\|null | HA label registry |
| `labeledEntitiesCache` | Object\|null | `{ label_id → { entities[], byIntegration{} } }` |
| `labeledDevicesCache` | Object\|null | `{ label_id → { deviceIds[], entityIds[] } }` |
| `labeledAreasCache` | Object\|null | `{ label_id → { entityIds[] } }` |

### Preferences
| Property | localStorage Key | Type | Purpose |
|----------|-----------------|------|---------|
| `activeTheme` | `em-active-theme` | String | `'default'`, `'dark'`, `'high-contrast'`, `'oled'`, or custom name |
| `customThemes` | `em-custom-themes` | Object | User-created themes |
| `favorites` | `em-favorites` | Set | Favorited entity IDs |
| `entityAliases` | `em-entity-aliases` | Object | Non-destructive display name overrides |
| `sidebarCollapsed` | `em-sidebar-collapsed` | Boolean | Sidebar hidden |
| `sidebarOpenSections` | `em-sidebar-sections` | Set | IDs of expanded sidebar sections (see §15 for all section IDs) |
| `smartGroupMode` | `em-smart-group-mode` | String | `'integration'`, `'room'`, `'type'`, `'floor'`, `'device-name'`, `'custom'` (6 modes) |
| `deviceNameFilter` | `em-device-name-filter` | String | Active keyword for `device-name` grouping mode |
| `savedDeviceFilters` | `em-saved-device-filters` | Array | `[{ label, pattern }]` — saved device name filter patterns |
| `customGroups` | `em-custom-groups` | Array | `[{ id, name, entityIds[] }]` — user-defined entity groupings for `'custom'` mode |
| `visibleColumns` | `em-visible-columns` | Object | Column visibility toggles |
| `filterPresets` | `em-filter-presets` | Array | Saved filter combinations |
| `entityOrder` | `em-entity-order` | Object | Custom drag-and-drop ordering |
| `showAllSidebarIntegrations` | *(in-memory)* | Boolean | Show full integrations list in sidebar vs truncated |
| `showAllSidebarLabels` | *(in-memory)* | Boolean | Show full labels list in sidebar vs lazy-scrolled |
| `labelsVisibleCount` | *(in-memory)* | Number | `8` — labels visible before lazy scroll loads more |

### History
| Property | localStorage Key | Max | Purpose |
|----------|-----------------|-----|---------|
| `activityLog` | `em-activity-log` | 100 | Recent operations |
| `undoStack` | `em_undoStack` | 50 | Undo steps — **persisted** to survive panel re-creation |
| `redoStack` | `em_redoStack` | 50 | Redo steps — **persisted** |

### Notification Center
| Property | localStorage Key | Max | Purpose |
|----------|-----------------|-----|---------|
| `_notifications` | `em-notifications` | 100 | Persisted notification objects `{ id, type, entityId, message, timestamp, read }` |
| `_notifPrefs` | `em-notif-prefs` | — | Per-type enable flags `{ offline, anomaly, enabled, disabled, newEntity }` |
| `_hassInitialized` | *(in-memory)* | — | Set after first `set hass()` call to prevent false offline/anomaly alerts on panel open |
| `_knownEntityIds` | *(in-memory)* | — | `null` on first load (seeds without firing new-entity events); Set thereafter |
| `_notifRateMap` | *(in-memory)* | — | `"entityId:type" → timestamp_ms` — rate-limit tracker (5-minute window) |

### Updates View
| Property | localStorage Key | Purpose |
|----------|-----------------|---------|
| `updateEntities` | *(in-memory)* | Update entity details |
| `updateFilter` | *(in-memory)* | `'all'`, `'available'`, `'stable'`, `'beta'` |
| `selectedUpdateType` | *(in-memory)* | `'all'`, `'device'`, `'integration'` |
| `hideUpToDate` | *(in-memory)* | Hide up-to-date items from list |
| `backupBeforeUpdate` | `em-backup-before-update` | Auto-backup checkbox state |
| `haAutoBackup` | *(in-memory)* | `null` = unavailable/unknown; `{ core, addon }` = loaded |
| `_pendingUpdateWatches` | *(in-memory)* | Set of entity IDs currently being monitored for update completion (checked on every `set hass()` call) |

### Lazy Loading
| Property | Default | Purpose |
|----------|---------|---------|
| `visibleEntityCounts` | `{}` | Tracks `{ integration: count }` of how many entities are rendered per integration |
| `initialLoadCount` | `20` | Entities to show on first render per integration |
| `loadMoreCount` | `20` | Entities added per "Load More" click |

### Drag & Drop
| Property | Purpose |
|----------|---------|
| `dragDropEnabled` | Global toggle |
| `draggedEntity` | Entity ID being dragged |
| `dragOverEntity` | Entity ID currently hovered during drag |

---

## 2. Lifecycle & Call Flow

### Boot sequence
```
set hass() [first call]
  → render()           — one-time DOM setup, attaches all global listeners
  → loadData()         — fetches entity tree
    → loadDeviceInfo() — fetches registries, builds maps
      → loadCounts()   — counts entity types, sets this.*Count props
  → updateView()       — renders entity list
```

### Mutation flow (e.g. enable entity)
```
enableEntity(entityId)
  → callWS('entity_manager/enable_entity')
  → _pushUndoAction({ type: 'enable', entityId })
  → _logActivity('enable', { entity: entityId })
  → loadData()  →  updateView()
```

### Filter/search change
```
[user input / click] → update this.searchTerm / selectedDomain / selectedLabelFilter
  → updateView()
```

### Inline view open/close
```
[stat card click] → _openView(viewType)
  → this._activeView = viewType
  → this.content.classList.add('em-view-active')
  → updateView()
    → sees _activeView → calls _renderActiveView() → dispatches to renderer
    → returns early (skips entity list)

[back button] → _closeView()
  → this._activeView = null
  → this.content.classList.remove('em-view-active')
  → updateView() → renders normal entity list

[refresh button] → _refreshView()
  → clears #content innerHTML (bypasses guard)
  → _renderActiveView()
```

### `updateView()` guard chain
```
if (_bulkRenameMode) → _renderBulkRenameView() + return
if (_activeView)     → _renderActiveView()     + return
if (_viewingSelected)→ render selected only    + return
...normal entity list render...
```

### Lifecycle Callbacks

**`connectedCallback()`** — called when element is inserted into the DOM:
1. Starts `this._themeObserver` (MutationObserver on `document.documentElement`, watching `style` and `class` attribute changes → calls `updateTheme()` on any change)
2. Calls `updateTheme()` once immediately
3. Wires `location-changed` window event handler — when user navigates back to the panel, sets `this._playAnimations = true` and calls `updateView()` to re-trigger stagger animations

**`disconnectedCallback()`** — called when element is removed from the DOM:
- Disconnects `_themeObserver`
- Removes `_themeOutsideHandler` and `_domainOutsideHandler` click-outside listeners
- Removes `location-changed` listener

---

### `set hass()` — Three sub-flows on every call

1. **Store:** `this._hass = hass`

2. **Toggle button sync** (runs if `this.content` exists): Queries all `.toggle-entity` buttons in DOM; for each, looks up `hass.states[entityId].state`; applies `.toggle-on` class when state is `on`/`open`/`unlocked`/`playing`/`cleaning` (and removes it otherwise). This is **optimistic UI** — no WS call needed.

3. **Update progress watcher** (runs if `_pendingUpdateWatches?.size > 0`): For each entity ID in the watch Set:
   - `state === 'off'` → installation complete → removes from Set, calls `_setUpdateRowState(id, 'done')`, schedules `loadUpdates()` after 2s
   - `attributes.in_progress === true && attributes.update_percentage != null` → calls `_updateRowProgress(id, pct)`

4. **Initial render trigger** (runs if `!this.content && hass`): Calls `render()` then `loadData()` inside try/catch — if rendering fails, shows an error `<div>` so the panel doesn't stay blank.

---

### `performUpdate(entityId, backup)` — Update install flow

```
performUpdate(entityId, backup=false)
  → _setUpdateRowState(entityId, 'active', { backup })
  → _pendingUpdateWatches.add(entityId)
  → setTimeout(fallback, 300000)        ← 5-min safety net
  → callService('update', 'install', { entity_id, backup? })
      ↓ fire-and-forget; set hass() watcher detects state → 'off'
  → on completion: delete from watch, 'done', loadUpdates()
  → on error:      clearTimeout, delete from watch, 'failed', showErrorDialog
```

**Fallback timer:** If HA never pushes a state update within 5 minutes (e.g. old firmware, slow device), the fallback marks the row as done and reloads. Prevents stuck spinners.

**`_updateRowProgress(entityId, pct)`:** First call replaces the indeterminate spinner with an SVG progress ring (circle r=10, circumference=62.83). Subsequent calls update `stroke-dashoffset = 62.83 × (1 − pct/100)` and the percentage label.

**`_setUpdateRowState(entityId, state, { backup })`:** Toggles `.is-queued / .is-active / .is-done / .is-failed` on `.update-item[data-entity-id]` and replaces `.update-actions` innerHTML with state-appropriate UI.

---

### Updates View Call Flow

```
viewState === 'updates' → updateView() → loadUpdates()
  → get_states (all update.* entities)
  → _loadHaAutoBackup() [non-blocking]
  → renderUpdates()
    → applies updateFilter ('all'|'available'|'stable'|'beta')
    → applies selectedUpdateType ('all'|'device'|'integration')
    → applies hideUpToDate flag
    → renders update cards
```

`loadUpdates()` is separate from `loadData()` — it only fetches `update.*` entities and does not refresh the main entity tree.

### Theme System

**`updateTheme()`** — called by `_themeObserver` (on every `document.documentElement` style/class change) and on `location-changed` navigation:
1. `activeTheme !== 'default'` and matches built-in → `_applyCustomTheme(themeVars)`
2. Matches custom theme → `_applyCustomTheme(customThemes[activeTheme])`
3. Else → auto-follows HA dark/light mode (no intervention)

**`_applyCustomTheme(themeVars)`** — sets `--em-*` CSS variables on `this` (the panel element) via `element.style.setProperty()`. Also propagates vars to any currently-open dialog overlays, which live in `document.body` outside the panel's DOM cascade.

### Activity Log — Two Distinct Systems

| System | Data source | What it tracks |
|--------|-------------|----------------|
| `this.activityLog` (localStorage `em-activity-log`) | EM's own log | enable/disable/rename/label operations performed in EM |
| HA state history (`history/history_during_period`) | HA recorder | Full entity state change history, fetched per time range in the inline view |

`_renderActivityLogView()` uses **both**: displays EM's action log, then enriches with HA state history for entity-level insights.

---

### Last Activity Timeline — Persistent Timestamps

The **🕐 Last Activity** inline view (`_activeView = 'activity-timeline'`) shows last-active timestamps for every HA entity, grouped by domain type.

**Timestamp sources by category:**

| Category | Source | Survives restart? |
|----------|--------|-------------------|
| Automations, Scripts | `s.attributes.last_triggered` from `hass.states` | ✅ (attribute) |
| Helpers | `s.last_changed` from `hass.states` | ❌ (resets on restart) |
| Templates, Sensors, all others | `this._lastActivityCache.get(eid)` → fallback `s.last_changed` | ✅ (recorder) |

**`_loadLastActivityCache()`** — called non-blocking from `loadData()`:
- Checks `localStorage['em_lastActivityCache']` for a fresh entry (TTL: 1 hour)
- If stale/missing: calls `entity_manager/get_last_activity` with all entity IDs from `this.data`
- Stores result as `Map<entity_id, timestamp_ms>` in `this._lastActivityCache`
- Persists to localStorage with `{ ts: Date.now(), data: {...} }` envelope
- Calls `updateView()` after fresh fetch so entity cards re-render with accurate timestamps

**`entity_manager/get_last_activity`** (Python, `websocket_api.py`):
- Queries recorder SQLite: `SELECT sm.entity_id, MAX(last_changed_ts) FROM states JOIN states_meta WHERE entity_id IN (...) AND state NOT IN ('unavailable','unknown') GROUP BY entity_id`
- Chunks entity_ids into batches of 500 (SQL IN-clause limit safety)
- Returns `{ entity_id: float_ms }` — seconds from recorder converted to milliseconds
- Gracefully returns `{}` if recorder is unavailable (older HA or recorder disabled)

**Domain → section mapping** (in `_renderActivityTimelineView`):

```js
const DOMAIN_CATEGORY = {
  light: 'lights',  switch: 'switches',
  sensor: 'sensors',  binary_sensor: 'binary',
  media_player: 'media', remote: 'media',
  climate: 'climate', weather: 'climate', fan: 'climate', humidifier: 'climate',
  cover: 'security', lock: 'security', alarm_control_panel: 'security', siren: 'security',
  camera: 'cameras', image: 'cameras',
  device_tracker: 'tracking', person: 'tracking', zone: 'tracking',
  button: 'controls', number: 'controls', select: 'controls', text: 'controls', event: 'controls',
  update: 'updates',
  // anything else → 'other' (sub-grouped by integration)
};
```

**localStorage key**: `em-at-filter` — active time-range filter pill persisted across sessions.

---

### Key method descriptions
| Method | When called | What it does |
|--------|-------------|--------------|
| `set hass(hass)` | Every HA state update | See §2 "set hass() — Three sub-flows" |
| `render()` | Once, from `set hass()` | Builds full DOM: header, sidebar, toolbar, stats grid, content area |
| `loadData()` | After mutations, on refresh | Calls `get_disabled_entities`, normalizes `this.data`, fires `_loadLastActivityCache()` non-blocking, calls `loadDeviceInfo()` |
| `loadDeviceInfo()` | After `loadData()` | Fetches device/entity/area/floor registries, builds `deviceInfo`, `areaLookup`, `entityAreaMap` |
| `loadCounts()` | After `loadDeviceInfo()` | Calls `get_states`, counts entity types, sets `this.*Count` |
| `updateView()` | After any state change | Applies guards, filters, then renders entity list into `#content` |
| `updateSelectedCount()` | After selection changes | Syncs sidebar badge, selection action buttons, bulk buttons, delete visibility |

---

## 3. Home Assistant WebSocket API Reference

All calls via `this._hass.callWS({ type, ...params })`.

### Native HA APIs

| `type` | Parameters | Key response fields | Purpose |
|--------|-----------|---------------------|---------|
| `get_states` | — | `entity_id, state, attributes, last_updated, last_changed` | All entity states |
| `config/area_registry/list` | — | `area_id, name, floor_id` | All areas |
| `config/area_registry/create` | `name, floor_id` | `area_id` | Create area |
| `config/floor_registry/list` | — | `floor_id, name` | All floors |
| `config/floor_registry/create` | `name` | `floor_id` | Create floor |
| `config/device_registry/list` | — | `id, name, area_id` | All devices |
| `config/device_registry/update` | `device_id, area_id?, labels?` | — | Update device |
| `config/entity_registry/list` | — | `entity_id, area_id, device_id, labels` | All entities |
| `config/entity_registry/update` | `entity_id, area_id?, labels?` | — | Update entity |
| `config/entity_registry/remove` | `entity_id` | — | Delete entity |
| `config/label_registry/list` | — | `label_id, name, color` | All labels |
| `config/label_registry/create` | `name` | `label_id` | Create label |
| `history/history_during_period` | `entity_ids, start_time, minimal_response: true` | `[{state, lu, lc}]` | State history — `lu`/`lc` are Unix seconds (floats); multiply by 1000 for `new Date()` |
| `lovelace/dashboards/list` | — | `[{url_path, title}]` | All dashboards |
| `lovelace/config` | `url_path` | `{views: [{cards, sections}]}` | Dashboard config — use `url_path`, not `dashboard_id` |
| `call_service` | `domain, service, target` | — | HA service call |
| `config_entries/reload` | `entry_id` | — | Reload integration |
| `brands/access_token` | — | `access_token` | Icon token (HA 2026.3+); fails silently on older HA |
| `input_boolean/create` | `name` | Create toggle helper |
| `input_number/create` | `name, min, max, step` | Create number helper |
| `input_text/create` | `name, min, max` | Create text input helper |
| `input_select/create` | `name, options[]` | Create dropdown helper |
| `input_datetime/create` | `name, has_date, has_time` | Create date/time helper |

> **Critical service call rule:** For entity-targeted services with no extra data (e.g. `button.press`), use `callWS` with `target: { entity_id }` — **NOT** `callService(domain, service, { entity_id })`. The latter silently no-ops in modern HA.
>
> ```js
> // CORRECT
> await this._hass.callWS({ type: 'call_service', domain: 'button', service: 'press', target: { entity_id } });
> // WRONG — silently does nothing
> await this._hass.callService('button', 'press', { entity_id });
> ```

### Custom `entity_manager/*` Commands (all require admin)

| `type` | Parameters | Purpose |
|--------|-----------|---------|
| `entity_manager/get_disabled_entities` | `state: 'all'\|'enabled'\|'disabled'` | Main entity tree (used everywhere) |
| `entity_manager/enable_entity` | `entity_id` | Single enable |
| `entity_manager/disable_entity` | `entity_id` | Single disable |
| `entity_manager/bulk_enable` | `entity_ids: string[]` | Bulk enable (max 500) |
| `entity_manager/bulk_disable` | `entity_ids: string[]` | Bulk disable (max 500) |
| `entity_manager/rename_entity` | `entity_id, new_name` | Rename (preserves domain) |
| `entity_manager/update_entity_display_name` | `entity_id, display_name: string\|null` | Set/clear user display name |
| `entity_manager/remove_entity` | `entity_id` | Remove from registry |
| `entity_manager/get_entity_details` | `entity_id` | Full metadata from all registries |
| `entity_manager/get_automations` | — | Automations with trigger context |
| `entity_manager/get_template_sensors` | — | Template entities + history |
| `entity_manager/get_config_entry_health` | — | Unhealthy/failed config entries |
| `entity_manager/list_hacs_items` | — | Installed HACS items |
| `entity_manager/update_yaml_references` | `old_entity_id, new_entity_id, dry_run: bool` | YAML find/replace with optional preview |
| `entity_manager/export_states` | — | Export all entity states to JSON |

> **Do NOT use** `entity_manager/get_areas_and_floors` to build `areaLookup` — that handler silently fails on every load. Use `config/area_registry/list` + `config/floor_registry/list` directly.

---

## 4. localStorage Keys

All I/O via `_loadFromStorage(key, default)` and `_saveToStorage(key, val)`. Keys use `em-` prefix with **hyphens** (not underscores).

| Key | Property | Type | Default | Notes |
|-----|----------|------|---------|-------|
| `em-custom-themes` | `customThemes` | Object | `{}` | User-created themes |
| `em-favorites` | `favorites` | Set (as array) | `[]` | Favorited entity IDs |
| `em-activity-log` | `activityLog` | Array | `[]` | Last 100 operations |
| `em-filter-presets` | `filterPresets` | Array | `[]` | Saved filter combos — shape: `{ id: uuid, name, viewState: 'all'\|'enabled'\|'disabled', selectedDomain, smartGroupMode }` |
| `em-visible-columns` | `visibleColumns` | Object | — | Column visibility |
| `em-entity-aliases` | `entityAliases` | Object | `{}` | Display name overrides |
| `em-entity-order` | `entityOrder` | Object | `{}` | Drag-and-drop ordering |
| `em-stale-dismissed` | dynamic | Object | `{}` | Dismissed stale entities |
| `em-health-alert-threshold` | dynamic | String | `'5'` | Health banner threshold |
| `em-health-banner-dismissed` | dynamic | String | `'-1'` | Health banner dismissal |
| `em-sidebar-collapsed` | `sidebarCollapsed` | Boolean | `false` | Sidebar hidden state |
| `em-sidebar-sections` | `sidebarOpenSections` | Set | — | Expanded sidebar sections |
| `em-show-offline-only` | `showOfflineOnly` | Boolean | `false` | Devices view: offline filter |
| `em-device-type-filter` | `deviceTypeFilter` | String | `'all'` | Devices view: type filter |
| `em-backup-before-update` | `backupBeforeUpdate` | Boolean | `false` | Auto-backup before each update |
| `em-smart-group-mode` | `smartGroupMode` | String | `'integration'` | Active grouping mode |
| `em-device-name-filter` | `deviceNameFilter` | String | `''` | Device-name mode keyword |
| `em-saved-device-filters` | `savedDeviceFilters` | Array | `[]` | Saved device filter patterns |
| `em-custom-groups` | `customGroups` | Array | `[]` | User-defined entity groups |

**Not persisted (in-memory only):** `expandedIntegrations`, `expandedDevices`, `searchTerm`, `viewState`, `selectedDomain`, `data`, `deviceInfo`, `areaLookup`, `entityAreaMap`, `isLoading`, `_pendingUpdateWatches`, `_playAnimations`, `domainOptions`, `haAutoBackup`

**Note:** `undoStack` and `redoStack` ARE now persisted to `em_undoStack` / `em_redoStack` — they survive hard refreshes and HA panel re-creation.

---

## 5. Key Utility Methods

### String & Sanitization
| Method | Returns | Usage |
|--------|---------|-------|
| `_escapeHtml(str)` | String | Always escape user-facing text in template literals |
| `_escapeAttr(str)` | String | Escape values placed in HTML attributes (`data-*`, `href`, etc.) |
| `_sanitizeUrl(url)` | String | Validates URL (allows `data:`, `http(s):`, `/`); returns `''` if invalid |

### Collapsibles
| Method | Purpose |
|--------|---------|
| `_collGroup(label, bodyHtml)` | Returns HTML for a collapsible section: `.em-collapsible` header + `.em-group-body` (initially hidden) |
| `_reAttachCollapsibles(root, opts)` | Wires click handlers to all `.em-collapsible` in `root`. Options: `{ expand: bool, selector: string }` — `expand: true` opens first section; `selector` overrides the default `.em-collapsible` class. |
| `_attachTargetSelector(root)` | Wires `.em-target-btn[data-target]` buttons (used in label dialogs to pick "entities"/"devices"/"both"). Toggles `.active` on the clicked button and fires a `em-target-change` custom event with `detail.target`. |

### Mini Cards
```js
_renderMiniEntityCard({
  entity_id,        // Required — used for data-entity-id
  name,             // Display name
  state,            // State text
  stateColor,       // CSS color/var for state chip
  timeAgo,          // Optional time string
  infoLine,         // Optional platform/info subtitle HTML
  actionsHtml,      // Optional action buttons HTML
  checkboxHtml,     // Optional checkbox for bulk selection
  navigatePath,     // Optional HA navigate path (adds ↗ link button)
  compact,          // No body section
  superLabel,       // Text above entity name (integration group label)
  extraChip,        // Optional chip next to name
})
// Returns: HTML string — .em-mini-card[data-entity-id]
```

### Dialogs
| Method | Returns | Usage |
|--------|---------|-------|
| `createDialog({ title, color, contentHtml, actionsHtml, extraClass, searchPlaceholder })` | `{ overlay, closeDialog }` | Creates modal overlay |
| `showConfirmDialog(title, message, onConfirm)` | void | Wrapper around `createDialog()` — adds Confirm + Cancel buttons; calls `onConfirm()` callback on confirm. Used for destructive action confirmations. |
| `showErrorDialog(message)` | void | Does **not** create a dialog overlay. Fires a `hass-notification` HA event with a dismiss button. Used for non-fatal errors (appears in HA notification area, not a blocking modal). |
| `_renderDialogBulkBar(actions)` | HTML string | Bulk action bar; `actions` = `[{ id, label, variant? }]` |
| `_attachDialogBulkListeners(overlay, actions)` | void | Wires `.em-dlg-sel` checkboxes + bulk buttons |
| `_attachDialogSearch(root)` | void | Wires `#em-stat-search, .em-inline-search` → filters `.em-mini-card` elements |

> **Dialog content rule:** `createDialog()` applies `overflow-y: auto; flex: 1` to every direct child of `.confirm-dialog-box` that is not the header or actions. Always wrap `contentHtml` in a **single `<div>`** — multiple siblings each become independent scroll containers.

### Time & Badges
| Method | Returns | Notes |
|--------|---------|-------|
| `_fmtAgo(isoStr, fallback='Never')` | String | Formats ISO timestamp as "Nd ago" / "Nh ago" / "Nm ago" |
| `_fmtAbsDate(isoStr, fallback='—')` | String | Locale-aware absolute timestamp — 12h/24h and date order follow browser locale (e.g. `en-GB`: `Thursday, 27 March 2026 - 14:35`; `en-US`: `Thursday, March 27, 2026 - 02:35 PM`) |
| `_triggerBadge(item)` | HTML string | "Human (name)" / "Automation" / "System" / "Never triggered" badge |

### Storage
| Method | Purpose |
|--------|---------|
| `_loadFromStorage(key, default)` | `JSON.parse` from localStorage; returns default on error |
| `_saveToStorage(key, val)` | `JSON.stringify` to localStorage; silently fails on quota exceeded |

### Rendering
| Method | Purpose |
|--------|---------|
| `_reRenderSidebar()` | Replaces sidebar DOM + re-attaches listeners + reloads labels. Use instead of duplicating sidebar rebuild code. |
| `_brandIconUrl(domain)` | Returns brand icon URL — uses `/api/brands/` with token (HA 2026.3+) or CDN fallback |
| `_findEntityById(id)` | Searches `this.data` tree; returns entity object or `null` |
| `_resolveEntitiesById(ids[])` | Returns array of entity objects; includes fallback objects (from `entityDeviceMap`) for entities not in current filtered view |

### `loadCounts()` — Stat Card Population

Called at the end of every `loadDeviceInfo()` call. Makes 4 parallel WS calls:

| WS call | Count properties populated |
|---------|---------------------------|
| `get_states` | `automationCount`, `scriptCount`, `helperCount`, `updateCount`, `unavailableCount`, `neverTriggeredCount` |
| `entity_manager/get_config_entry_health` | `configHealthCount` (also drives health stat card red/green color) |
| `entity_manager/get_template_sensors` | `templateCount` |
| `entity_manager/list_hacs_items` | `hacsCount` |
| (derived from `this.data` in-memory) | `orphanedCount`, `ghostDeviceCount` |

All 12 stat cards are disabled (pointer-events off, opacity reduced) during the fetch and re-enabled when complete.

### Toast
```js
_showToast(message, type = 'info', duration = 10000)
// type: 'success' | 'error' | 'warning' | 'info'
// duration: 0 = sticky (manual close only)
```
Appended to `document.body`. Slide-up animation via `requestAnimationFrame`. Auto-dismissed after `duration` ms.

### Undo
```js
// Always call before any state-changing operation:
_pushUndoAction({ type, ...fields })
_logActivity(action, details)
```

---

## 6. Notable Patterns

### Hash UUID Detection
```js
const isHashId = s => s.length >= 20 && /^[0-9a-f]+$/i.test(s);
```
Config entry IDs (auto-generated hex hashes) sometimes appear as `platform` names in entity data. `isHashId` detects them so they can be bucketed under an "Other" group instead of rendered as a confusing platform name. Used in the Suggestions dialog and entity name checks.

### Keyboard Shortcuts
**Not currently implemented in JS.** CLAUDE.md mentions Ctrl+Z/Y/E/G/B shortcuts — these do not exist in the current code. The only keyboard handler is `Enter`/`Escape` on inputs within the bulk rename inline view.

### Drag & Drop Entity Ordering

Entities within an integration can be reordered via drag-and-drop. Order is persisted to `em-entity-order` (localStorage).

```
_attachDragDropListeners()  — called after every updateView(); wires all entity items
_initDragDrop(entityItem)   — attaches draggable="true" + event listeners

dragstart → this.draggedEntity = entityId; add .dragging class
dragover  → detect top/bottom half of target → add .drag-over-top or .drag-over-bottom
drop      → reorder this.entityOrder[integrationId] array
           → _saveToStorage('em-entity-order', ...)
           → updateView()
dragend   → remove .dragging + .drag-over-* classes
```

`dragDropEnabled` (default `true`) — setting this to `false` skips `_attachDragDropListeners()`.

---

## 7. Undo / Redo

### Action Object Shapes
```js
{ type: 'enable',              entityId }
{ type: 'disable',             entityId }
{ type: 'bulk_enable',         entityIds: [] }
{ type: 'bulk_disable',        entityIds: [] }
{ type: 'rename',              oldId, newId }
{ type: 'display_name_change', entityId, oldName, newName }
{ type: 'assign_entity_area',  entityId, oldAreaId, newAreaId }
{ type: 'assign_device_area',  deviceId, oldAreaId, newAreaId }
{ type: 'labels_change',       entityId?, deviceId?, beforeEntity, afterEntity, beforeDevice, afterDevice }
{ type: 'assign_entity_device',entityId, oldDeviceId, newDeviceId, deviceName }
```

### Pattern
Every mutation:
1. `_pushUndoAction(action)` — pushes to `undoStack` (max 50), clears `redoStack`, **persists to localStorage**
2. `_logActivity(action, details)` — appends to `activityLog` (max 100)
3. Perform the WS call
4. `loadData()` to refresh

### History Dialog
`_showHistoryDialog()` — combined undo/redo timeline:
- Redo stack rows (muted, top) → "▶ Current state" divider → Undo stack rows
- Each row shows `_describeAction(action)` — human-readable label
- Clicking a row executes N steps to reach that point, then rebuilds list in-place
- "Clear History" button wipes both stacks and localStorage
- Section labels describe each half to guide the user

`_describeAction(action)` — covers all action types with friendly strings (e.g. `"Assigned sensor.power to Shelly Plug S"`).

---

## 8. Inline View System

### `_renderActiveView()` Dispatch Map
```js
'automations-helpers' → _renderAutomationsHelpersView()   // 3 merged sections
'health-cleanup'      → _renderHealthCleanupView()         // cleanup + config errors + unavailable
'template'            → showEntityListDialog('template',  { inline: true })
'hacs'                → showEntityListDialog('hacs',      { inline: true })
'lovelace'            → showEntityListDialog('lovelace',  { inline: true })
'suggestions'         → _showSuggestionsDialog(null,      { inline: true })
'browsers'            → _showBrowserModDialog(            { inline: true })
'activity-log'        → _renderActivityLogView()
'activity-timeline'   → _renderActivityTimelineView()
```

### Guard Pattern
Prevents re-render when HA sends state updates while the user is in the view:
```js
if (contentEl.querySelector('.em-inline-view[data-view="TYPE"]')) return;
```
`_refreshView()` clears `#content` to bypass the guard and force a fresh fetch.

### `showEntityListDialog(type, opts)` — Type Map

| `type` | WS call(s) | Content rendered |
|--------|-----------|-----------------|
| `'automation'` | `entity_manager/get_automations` | Cards: toggle, edit, rename; last triggered; mode |
| `'script'` | `get_states` | Cards: edit, rename; Running/Idle state; last triggered |
| `'helper'` | `get_states` | All `input_*` + counter/timer/schedule/template/group/scene |
| `'template'` | `entity_manager/get_template_sensors` | Template entities + connections |
| `'unavailable'` | `this._hass.states` | All entities where `state === 'unavailable'` |
| `'hacs'` | `entity_manager/list_hacs_items` | Installed HACS items |
| `'lovelace'` | `lovelace/dashboards/list` + `lovelace/config` per dashboard | Card type analysis |

**Two modes:**
- **Section mode** `{ inline: true, container: el }` — injects content into existing element. No guard. No `_collGroup` wrapper.
- **Full mode** `{ inline: true }` — replaces `#content` with the full inline view shell (header + body). Has guard.

### `_renderMergedEntitySections(types, bodyEl)` — Async Section Loader

Used by `_renderAutomationsHelpersView` and `_renderHealthCleanupView` to load multiple independent sections into one view:

1. For each type in the array, renders a loading-placeholder collapsible immediately
2. Fetches each section asynchronously, replacing the placeholder on completion
3. Per-section error handling — one failing section does not break the others

```
types: 'automation' | 'script' | 'helper'  → showEntityListDialog(type, { inline:true, container })
       'config-health'                       → _showConfigEntryHealthDialog({ inline:true, container })
       'cleanup'                             → _showCleanupDialog({ inline:true, container })
       'unavailable'                         → showEntityListDialog('unavailable', { inline:true, container })
```

### Inline View HTML Shell
```html
<div class="em-inline-view" data-view="TYPE">
  <div class="em-inline-view-header">
    <button class="em-inline-back-btn">← Back</button>
    <span class="em-inline-view-title">Title <span class="em-inline-count">(N)</span></span>
    <input class="em-inline-search em-dialog-search" placeholder="Search…">
    <button class="em-inline-refresh-btn" title="Refresh">…svg…</button>
  </div>
  <div class="em-inline-view-body">…content…</div>
</div>
```

### CSS — `em-view-active`
```css
#main-content.em-view-active .toolbar,
#main-content.em-view-active .toolbar-row-2,
#main-content.em-view-active .toolbar-search,
#main-content.em-view-active #stats { display: none; }
```
Applied to `this.content` (the `#main-content` div) when a view is active.

---

## 9. Bulk Rename System

```
_openBulkRenameDialog()
  → sets _bulkRenameMode = true
  → adds em-bulk-rename-active to #main-content (hides toolbar, stats)
  → pre-loads all entities via get_disabled_entities state:'all' into _bulkRenameData
  → updateView() → _renderBulkRenameView()

exitMode()
  → _bulkRenameMode = false
  → removes em-bulk-rename-active
  → loadData()
```

**Layout:** Banner → `.brv-split` flex row:
- Left `.bulk-rename-top-box` (flex:2): entity picker grouped by integration → device; collapsible; group-level checkboxes
- Right `.bulk-rename-bottom-box` (flex:1): rename queue; rows show `old_id → new_id` live preview (green `.brq-preview-changed` when changed)
- Below: Find & Replace card with regex + case-sensitive toggles

---

## 10. Context Menu

Triggered by `contextmenu` on `.entity-item`. Built by `_buildContextMenuHTML()`, positioned near cursor with viewport clamping, appended to `document.body`, closed on next click.

**Single entity:** rename, enable/disable, favorite (toggle), labels, assign-area, alias, copy-id, open-ha

**Multi-select (when `selectedEntities.size > 1`):** bulk-rename, bulk-enable/disable, bulk-labels, bulk-remove-labels, bulk-favorite, bulk-delete, clear-selection

**CSS:**
```
.em-context-menu     position:fixed; bg-primary; border:1px solid --em-border; border-radius:8px;
                     min-width:180px; padding:6px 0; z-index:10002; animation:contextMenuFadeIn 0.15s
.em-context-item     flex; gap:10px; padding:10px 16px; font-size:13px; hover → --em-bg-hover
.em-context-danger   color:--em-danger; hover → bg:--em-danger + white text
.em-context-divider  height:1px; background:--em-border; margin:6px 0
```
`contextMenuFadeIn` keyframe: `opacity:0; scale:0.95` → `opacity:1; scale:1`.

---

## 11. Main Entity List — Delegated Events

All wired in `attachIntegrationListeners()` after each `updateView()`:

| Selector | Handler |
|----------|---------|
| `.em-cat-card-toggle` | Pure DOM toggle (no `updateView`) |
| `.device-header:not(.em-cat-card-toggle)` | Expand/collapse device → `updateView` |
| `.integration-header` | Expand/collapse integration → `updateView` |
| `.entity-checkbox` | Add/remove from `selectedEntities` → `updateSelectedCount()` |
| `.device-select-checkbox` | Select all in device |
| `.integration-select-checkbox` | Select all in integration |
| `.rename-entity` | `showRenameDialog()` |
| `.enable-entity` / `.disable-entity` | Single WS enable/disable |
| `.toggle-entity` | `homeassistant/toggle` WS call (optimistic UI) |
| `.press-entity` | `call_service` button/press WS call |
| `[data-action="bulk-rename"]` | `_openBulkRenameDialog()` |
| `[data-action="bulk-labels"]` | `_showBulkLabelEditor()` |
| `.view-integration-enabled/disabled` | Apply `em-filter-enabled/disabled` CSS class |
| `.favorite-btn` | `_toggleFavorite()` |
| `.entity-item` (body click) | `_showEntityDetailsDialog()` |
| `.entity-item` (contextmenu) | `_showContextMenu()` |
| `.load-more-btn` / `.load-all-btn` | Lazy-load next batch |

> **Critical:** The `.device-header` click listener must use `:not(.em-cat-card-toggle)` selector. Category card headers have both classes — without `:not()` the device expand handler fires on category card clicks too, calling `updateView()` and resetting the DOM toggle.

---

## 12. `updateSelectedCount()` — What It Syncs

Called after every selection change:
1. `#sidebar-selected-count` badge + `em-sel-active` class
2. `#em-selection-group` sidebar section visibility
3. Sidebar action buttons (`enable-selected`, `disable-selected`, `assign-area-selected`, `deselect-all`, `view-selected`) — opacity 0.4 + pointer-events:none when count = 0
4. Auto-expands Actions sidebar section when selection goes from 0 → any
5. `[data-action="bulk-rename"]` and `[data-action="bulk-labels"]` — disabled when `selectedEntities.size < 2`
6. Delete button — only visible on the card of the currently selected entity

---

## 13. Labels System

Three caches built from HA registry WS calls (loaded by `_loadLabeledEntities/Devices/Areas()`):

```
labeledEntitiesCache: { label_id → { label_id, name, color, entities[], byIntegration{} } }
labeledDevicesCache:  { label_id → { deviceIds[], entityIds[] } }
labeledAreasCache:    { label_id → { entityIds[] } }
```

Sidebar labels section lazy-renders via `IntersectionObserver` as user scrolls. Click a label → `selectedLabelFilter = label_id` → `updateView()` re-renders filtered list. Caches are invalidated (set to `null`) after label mutations.

---

## 14. `showRenameDialog` — Two-Step Flow

```
showRenameDialog(entityId)
  → Dialog with new-name input (lowercase + underscores only)
  → User types new name → confirms

  Step 1 — Dry run:
    entity_manager/update_yaml_references { old_entity_id, new_entity_id, dry_run: true }
    → if 0 references:  rename immediately (entity_manager/rename_entity)
    → if N references:  show in-dialog preview (file paths + count)

  Step 2 (if references found) — User confirms again:
    entity_manager/rename_entity { entity_id, new_name }
    entity_manager/update_yaml_references { old_entity_id, new_entity_id, dry_run: false }
```

This keeps YAML files in sync automatically. The dry-run preview happens **inside** the existing dialog (no second overlay), so the user sees what will change before committing.

---

## 15. Sidebar Section IDs

All sections tracked in `sidebarOpenSections` Set (localStorage `em-sidebar-sections`):

| Section ID | Content |
|------------|---------|
| `'actions'` | Selection actions (enable/disable/assign-area/deselect/view-selected/bulk-rename) |
| `'labels'` | HA label list (lazy-scrolled via IntersectionObserver) |
| `'smart-groups'` | Group mode selector + device name filter |
| `'views'` | View toggles (All / Enabled / Disabled / Updates / Favorites) |
| `'presets'` | Saved filter presets |
| `'integrations'` | Integration list for quick jump |
| `'help'` | Help guide link + quick tips |

Click a section header → toggles ID in/out of `sidebarOpenSections` → `_saveToStorage('em-sidebar-sections', [...set])` → section body `display:none/block`.

---

## 16. Brand Icon URLs

```js
_brandIconUrl(domain)
// HA 2026.3+: /api/brands/integration/${domain}/icon.png?token=${this._brandsToken}
// Fallback:   https://brands.home-assistant.io/_/${domain}/icon.png
```

**`_brandsToken` state machine** (three states):
- `''` (empty string, initial) — token not yet fetched
- `null` — fetch failed or older HA without `brands/access_token` API → CDN fallback used
- `'abc...'` (string) — valid token, use `/api/brands/` URL

Token fetched once at startup. Always use `onerror="this.style.display='none'"` on brand icon `<img>` elements.

---

## 17. CSS Architecture

### File: `entity-manager-panel.css` (~6,100 lines)

### Top-Level Layout
```
entity-manager-panel (display:flex; flex-direction:column; height:100%)
├── .app-header           (height:64px; position:sticky; z-index:100)
└── .em-layout            (flex:1; display:flex; overflow:hidden)
    ├── .em-sidebar       (width:250px; flex-shrink:0; overflow-y:auto)
    └── #main-content     (flex:1; overflow-y:auto; padding:24px)
        ├── .toolbar / .toolbar-search
        ├── #stats        (CSS grid)
        └── #content      (entity list or inline view)
```

> **Scroll fix:** `#main-content` has two rules: an early `min-height:100vh` rule AND a later layout rule that must set `min-height:0` to allow flex scrolling. Both must coexist.

### All `--em-*` CSS Variables (`:root`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `--em-primary` | `var(--primary-color, #2196f3)` | Buttons, borders, links |
| `--em-primary-dark` | `var(--primary-color-dark, #1565c0)` | Hover/active |
| `--em-primary-light` | `var(--primary-color-light, #64b5f6)` | Tinted bg |
| `--em-success` | `var(--success-color, #4caf50)` | Enable, on-state |
| `--em-success-dark` | `var(--success-color-dark, #388e3c)` | Active success |
| `--em-danger` | `var(--error-color, #f44336)` | Disable, delete |
| `--em-danger-dark` | `var(--error-color-dark, #d32f2f)` | Active danger |
| `--em-warning` | `var(--warning-color, #ff9800)` | Warnings |
| `--em-warning-dark` | `var(--warning-color-dark, #f57c00)` | Active warning |
| `--em-purple` | `var(--accent-color, #9c27b0)` | Purple accent |
| `--em-muted` | `#607d8b` | Muted elements |
| `--em-text-primary` | `var(--primary-text-color, #212121)` | Main text |
| `--em-text-secondary` | `var(--secondary-text-color, #757575)` | Subtitles |
| `--em-text-disabled` | `var(--disabled-text-color, #9e9e9e)` | Placeholder |
| `--em-bg-primary` | `var(--card-background-color, #fff)` | Card backgrounds |
| `--em-bg-secondary` | `var(--secondary-background-color, #fafafa)` | Toolbars, headers |
| `--em-bg-hover` | `var(--table-row-alt-background-color, #f5f5f5)` | Hover |
| `--em-border` | `var(--divider-color, #e0e0e0)` | Borders |
| `--em-border-light` | `var(--divider-color, #eee)` | Subtle separators |
| `--em-shadow` | `var(--shadow-elevation-2dp, ...)` | Card shadow |
| `--em-shadow-hover` | `var(--shadow-elevation-4dp, ...)` | Hover shadow |

Also in `:root` (reduced at mobile breakpoints):
`--dialog-padding`, `--dialog-border-width`, `--dialog-border-radius`, `--dialog-header-padding`, `--dialog-content-padding`, `--dialog-actions-padding`, `--dialog-gap`

> **Rule:** Never use HA native variables (`--card-background-color`, `--primary-color`, etc.) directly in CSS — always use `--em-*` equivalents so theme overrides take effect.

### Four Built-in Themes
Override `--em-*` via `element.style.setProperty()` in JS: `default` (follows HA), `dark`, `high-contrast`, `oled`.

### Responsive Breakpoints
| Breakpoint | Key changes |
|------------|------------|
| `≤ 768px` | Sidebar becomes fixed overlay (translateX -100%, z-index:1000); stat grid → 3-col; device cards → 1-col; dialogs → 95vh |
| `≤ 600px` | Entity actions wrap; `device-entity-list` → 1-col (cascade trap — override at end of file) |
| `≤ 480px` | 56px header; 12px padding; dialogs → 98vh; 36px touch targets |

### CSS Cascade Traps
Some base rules are defined **after** `@media` blocks. Their mobile overrides must go at the **end of the file** in `/* ===== MOBILE OVERRIDES ===== */`:
- `.device-entity-list` 2-col grid → 1-col at ≤600px
- `.btn`, `.device-enable-all`, `.device-disable-all` → font-size override at ≤768px

### Z-Index Stack
| Z-Index | Element |
|---------|---------|
| 99999 | `.em-toast` — always above everything including dialogs |
| 10002 | `.em-context-menu` |
| 10000 | Dialogs (`.confirm-dialog-overlay`) |
| 1000 | Domain dropdown (`.domain-menu`), mobile sidebar |
| 300 | Theme editor overlay |
| 100 | `.app-header` |

### Key Animations (`@keyframes`)
`slideInDown` (header entrance), `fadeIn` (dialog backdrop), `slideUp` (dialog entrance), `contextMenuFadeIn` (scale + fade), `highlightPulse` (integration flash), `em-update-progress` (sweep), `em-spin` (spinner), `em-stagger-in` (list entrance), `em-ripple-expand` (button ripple), `fadeInUp` (toast entrance)

### Dialog Structure
```
.confirm-dialog-overlay  position:fixed; inset:0; z-index:10000; backdrop-filter:blur(4px)
.confirm-dialog-box      flex-column; max-height:90vh; border:2px solid --em-primary-dark
  .confirm-dialog-header   flex-shrink:0; border-bottom
  [content div]            overflow-y:auto; flex:1; min-height:0   ← scrolls
  .confirm-dialog-actions  flex-shrink:0
```

### Sidebar
```
.em-sidebar              width:250px; background:--em-bg-secondary; border-right:1px solid --em-border;
                         transition:width 0.3s ease; overflow-y:auto; flex-shrink:0
.em-sidebar.collapsed    width:50px  (icon-only mode)

.sidebar-section         margin:6px 8px; border-radius:8px; background:--em-bg-primary;
                         box-shadow: 0 0 0 1.5px var(--em-primary), 0 2px 6px rgba(0,0,0,0.1)
                         ↑ double shadow: primary-color outline + drop shadow

.sidebar-section-title   font-size:11px; text-transform:uppercase; letter-spacing:0.5px;
                         color:--em-text-secondary; cursor:pointer; hover→--em-bg-hover

.em-chev (SVG chevron)   opacity:0.5; transition:transform 0.2s
                         .section-collapsed → transform:rotate(-90deg)
.sidebar-section.section-collapsed > *:not(.sidebar-section-title) { display:none }

.sidebar-item            padding:10px 12px; border-radius:6px; font-size:13px; min-height:40px
                         hover → --em-bg-hover
.sidebar-item.active     color:--em-primary; border-left:3px solid --em-primary; font-weight:600
```

Mobile (`≤768px`): sidebar becomes `position:fixed; transform:translateX(-100%); z-index:1000`.

### Toast
```
.em-toast           position:fixed; bottom:20px; right:20px; max-width:400px; z-index:99999
                    background:--em-bg-primary; border-left:4px solid --em-primary; border-radius:8px
                    transform:translateX(120%)  ← start off-screen
.em-toast-show      transform:translateX(0)    ← slide in
```
Type variants set `border-left-color` and icon `color` (success/danger/warning/primary). Close button (×) in top-right.

### Area/Floor Assignment Dialog (`em-afd-*`)
```
.em-afd-dialog      max-width:680px

.em-afd-top         display:flex; min-height:240px        ← two-panel row
  .em-afd-left      flex:0 0 260px; overflow-y:auto       ← floor + area picker
  .em-afd-right     flex:1; overflow-y:auto               ← entity info cards

.em-afd-section     border:2px solid --em-primary; border-radius:8px
.em-afd-selected    background:color-mix(in srgb, --em-primary 12%, transparent); font-weight:600

Entity card states:
  .em-afd-entity-card               border:2px solid --em-danger   (nothing selected yet)
  .em-afd-info-selected .em-afd-entity-card  border-color:--em-success  (area chosen)
```

### Label Swatch Color Picker
```
.em-label-swatch     width:24px; height:24px; border-radius:50%; border:2px solid transparent;
                     transition:transform 0.1s, border-color 0.1s; cursor:pointer
:hover               transform:scale(1.2)
.selected            border-color:white; box-shadow:0 0 0 2px var(--em-primary); transform:scale(1.15)
```

### Entity Header Chips
```
.entity-header-state   font-size:13px; font-weight:600; border:2px solid --em-primary;
                       border-radius:8px; padding:4px 10px  (always primary blue border)
.entity-header-area    font-size:11px; color:--em-text-secondary; background:--em-bg-secondary;
                       border:2px solid --em-border; border-radius:10px; padding:4px 12px
```

### Custom Scrollbar
```css
#main-content::-webkit-scrollbar       { width: 10px }
#main-content::-webkit-scrollbar-track { background: var(--em-bg-secondary) }
#main-content::-webkit-scrollbar-thumb { background: var(--em-border); border-radius:5px;
                                          border:2px solid var(--em-bg-secondary) /* floating effect */ }
::-webkit-scrollbar-thumb:hover        { background: var(--em-text-secondary) }
```

### Stat Card Grid
```css
#stats { display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:16px }
```
Each card color-tinted via `data-stat-type` attribute (top border + rgba background in light mode). Types: `integrations`, `devices`, `entities`, `automations-helpers`, `health-cleanup`, `template`, `hacs`, `lovelace`, `suggestions`, `browsers`.

### Entity Card (`.entity-item`)
```
flex-column; flex:1 1 300px; border:2px solid --em-primary
  .entity-card-header   dark band (--em-bg-secondary); margin:-12px -10px 10px
    .entity-header-device   12px muted text (device name)
    .entity-header-state    13px 600w chip (primary border)
    .entity-header-area     11px chip (secondary bg+border)
  .entity-card-body     entity ID (16px 500w), name (14px muted)
  .entity-actions       flex row of .icon-btn
```

**`.icon-btn` variants:** `.rename-entity` (primary), `.enable-entity` (success), `.disable-entity` (danger), `.toggle-entity` + `.toggle-on` (success active bg), `.bulk-rename-btn` (primary), `.bulk-labels-btn` (warning), `.bulk-delete-btn` (danger). Disabled state: opacity 0.4 via `.icon-btn:disabled`.

### Device Card (`.device-item`)
```
border:2px solid --em-primary; flex:1 1 300px
  .device-header     --em-bg-secondary; cursor:pointer
    chevron + name + count (enabled/disabled) + .device-cat-chip + bulk btns + area btn
  .device-entity-list  grid 2-col (overridden to 1-col at ≤600px)
```

Category chips (`.device-cat-chip`): `.cat-controls`/`.cat-connectivity` → success; `.cat-sensors`/`.cat-config` → primary; `.cat-diagnostic` → warning.

> **Category card toggle rule:** Category cards use `.device-header.em-cat-card-toggle`. The `.device-header` click listener MUST use `:not(.em-cat-card-toggle)`. Category toggle is pure DOM (`body.style.display` flip) — never calls `updateView()`.

### Tinted Dialog Sections (`.em-sug-*`)
Each class cascades a color tint through the section header, body background, alternating rows, and the chevron icon inside:

| Class | Color | Hex |
|-------|-------|-----|
| `.em-sug-health` | Purple | `#9c27b0` |
| `.em-sug-naming` | Orange | `#ff9800` |
| `.em-sug-area` | Red | `#f44336` |
| `.em-sug-labels` | Yellow | `rgb(220,200,0)` |
| `.em-sug-disable` | Neutral gray | `rgba(200,200,200,…)` |

### Expanding Button Pattern
```css
.em-update-expand-wrap { max-width:0; overflow:hidden; transition:max-width 0.4s ease }
.em-update-expand-wrap.is-visible { max-width:200px }
```
Button inside uses `white-space:nowrap`. Use a wrapper `<div>` — divs have no `min-width`, buttons do.

### Update Row States
```
.update-item.is-queued   opacity:0.55; muted border
.update-item.is-active   primary bg tint; indeterminate progress bar
.update-item.is-done     success border
.update-item.is-failed   danger border
```

### Key CSS Class Quick Reference
| Class | Purpose |
|-------|---------|
| `.em-inline-view[data-view="…"]` | Inline view wrapper; `data-view` used as guard selector |
| `.em-inline-view-header` | Header: back btn + title + search + refresh btn |
| `.em-inline-view-body` | Scrollable content area |
| `.em-inline-back-btn` | Back button (primary border) |
| `.em-inline-refresh-btn` | Refresh button (muted border, primary on hover) |
| `.em-inline-search` / `.em-dialog-search` | Search inputs (used interchangeably) |
| `.em-collapsible` | Collapsible section header (click toggles next sibling) |
| `.em-collapsible-icon` / `.em-collapse-arrow` | Chevron (rotates on expand) |
| `.em-group-body` | Collapsible body (initially `display:none`) |
| `.em-mini-card[data-entity-id]` | Compact entity row in stat dialogs |
| `.em-sug-row` | Row in Suggestions inline view |
| `.em-view-active` | On `this.content` when inline view open — hides toolbar/stats |
| `.em-bulk-rename-active` | On `#main-content` during bulk rename — hides toolbar/stats |
| `.em-dlg-sel` | Checkbox for bulk select in dialogs |
| `.em-dialog-btn` / `-secondary` / `-danger` | Dialog action buttons |
| `.em-filter-enabled` / `.em-filter-disabled` | Per-integration/device state filter (applied via CSS, hides matching entity cards) |
| `.brv-split` / `.bulk-rename-top-box` / `.bulk-rename-bottom-box` | Bulk rename split layout |
| `.brq-preview-changed` | Queue row with changed name (green left border) |
| `.is-queued` / `.is-active` / `.is-done` / `.is-failed` | Update row states |
| `.device-type-badge` | Device type pill (Hardware/Virtual/System/Mobile/Cloud/Unknown) — all styles inline, no CSS class rule |
| `.device-cat-chip .cat-*` | Entity category chip on device card headers (diagnostic/config/controls/sensors/connectivity) |

---

## 18. Device Type System

Two methods classify every device and drive color-coded pill badges in the Devices view.

### `getDeviceType(deviceId)` — Classification Logic

Inspects `this.deviceInfo[deviceId]` (the device registry entry):

| Check (evaluated in order) | Returned type |
|----------------------------|--------------|
| identifiers includes `'mobile_app'` | `'mobile'` |
| identifiers includes `'homeassistant'`, `'hassio'`, `'hassio_os'`, `'hassio_supervisor'`, or `'system_health'` | `'system'` |
| `connections.length > 0` (any physical network/serial connection) | `'hardware'` |
| `entry_type === 'service'` | `'virtual'` |
| Fallback (cloud integrations, anything else) | `'cloud'` |
| Device ID not in `deviceInfo` | `'unknown'` |

### `_deviceTypeMeta()` — Label & Color Map

| Type | Label | Color | Swatch |
|------|-------|-------|--------|
| `hardware` | Hardware | `var(--em-success)` | green |
| `virtual` | Virtual | `var(--em-primary)` | blue |
| `system` | System | `var(--em-warning)` | amber |
| `mobile` | Mobile | `#9c27b0` *(literal)* | purple |
| `cloud` | Cloud | `#00bcd4` *(literal)* | cyan |
| `unknown` | Unknown | `var(--em-text-secondary)` | gray |

> Note: `mobile` and `cloud` use hardcoded hex colors — they are **not** overridden by EM themes.

### Badge Rendering

All styling is **inline** — there are no CSS class rules for `.device-type-badge`:

```js
const { label, color } = this._deviceTypeMeta()[this.getDeviceType(deviceId)];
// → <span class="device-type-badge"
//       style="font-size:10px; padding:1px 7px; border-radius:10px;
//              border:1px solid ${color}; color:${color};
//              white-space:nowrap; flex-shrink:0">
//     ${label}
//   </span>
```

### Where It's Used

| Location | Purpose |
|----------|---------|
| `_buildDeviceCard()` | Badge on every device header in the Devices view |
| `_renderDevicesView()` | Filters device list when `deviceTypeFilter !== 'all'` |
| Stats toolbar | Counts matching devices for the active type filter |

---

## 19. Color & Style Usage Guide

### A. Semantic Color Rules

| Color | Variable | Use for |
|-------|----------|---------|
| Green | `--em-success` | Enable, on-state, connected, done, success toast |
| Red | `--em-danger` | Disable, delete, error, failed, error toast |
| Orange | `--em-warning` | Diagnostic chip, stale, health warning, has-update, warning toast |
| Blue | `--em-primary` | Default action, rename, info link, accent, info toast |
| Purple | `--em-purple` / `#9c27b0` | Labels, helpers, health suggestions section |
| Cyan | `#00bcd4` | Cloud device type badge, Browser Mod stat card |
| Gray | `--em-text-secondary` | Muted/off state, unknown, disabled text, unknown device type |

### B. Button Pattern (Universal Rule)

**Outline at rest → filled on hover → white text when filled. Disabled = `opacity: 0.4; cursor: not-allowed`.**

| Button | Rest (border + text) | Hover fill |
|--------|---------------------|------------|
| `.rename-entity`, `.bulk-rename-btn`, `.press-entity`, `.entity-config-url` | `--em-primary` | `--em-primary` → white |
| `.enable-entity`, `.device-enable-all`, `.toggle-entity` | `--em-success` | `--em-success` → white |
| `.disable-entity`, `.device-disable-all`, `.bulk-delete-btn` | `--em-danger` | `--em-danger` → white |
| `.bulk-labels-btn` | `--em-warning` | `--em-warning` → white |
| `.btn` (primary large) | `--em-primary` bg + white text | `--em-primary-dark` bg |
| `.btn-secondary` | transparent + `--em-text-primary` | `--em-bg-secondary` + `--em-primary` border |
| `.confirm-yes` | `--em-primary` bg + white | `--em-primary-dark` bg |
| `.confirm-no` | `--em-bg-secondary` bg | `--em-bg-hover` bg |
| `.em-inline-back-btn` | `--em-primary` border | `--em-primary` bg → white |
| `.em-inline-refresh-btn` | `--em-border` border | `--em-primary` border + text (no bg fill) |
| `.filter-toggle` (default) | `--em-primary-dark` border | `--em-primary` bg → white |
| `.filter-toggle[data-filter="enabled"]` | `--em-success` border + text | `--em-success` bg → white |
| `.filter-toggle[data-filter="disabled"]` | `--em-danger` border + text | `--em-danger` bg → white |
| `.filter-toggle[data-filter="updates"]` | `--em-warning` border + text | `--em-warning` bg → white |

### C. Card Borders

| Element | Default | State / Hover |
|---------|---------|---------------|
| `.entity-item` | `2px solid var(--em-border)` | hover → `--em-primary`; `.entity-is-on` → `--em-success` + glow shadow |
| `.device-item` | `2px solid var(--em-primary)` (always blue) | — |
| `.update-item` | `2px solid var(--em-border)` | `.has-update` → `4px left solid var(--em-warning)` |
| `.update-item.is-active` | `2px solid var(--em-primary)` | — |
| `.update-item.is-done` | `2px solid var(--em-success)` | — |
| `.update-item.is-failed` | `2px solid var(--em-danger)` | — |

### D. Checkboxes

**Rule:** All checkboxes use `accent-color: var(--em-primary)` — browser renders checked/indeterminate state in that color.

**Exceptions:**
- `.brp-int-cb` (bulk rename integration header, dark background) → `accent-color: #fff`
- `.entity-checkbox` → `accent-color: var(--primary-color)` (HA native var)

**Indeterminate state** (partial group selection): set in JS via `checkbox.indeterminate = true`. No CSS rule — browser renders native dash in the accent color.

**Checked row highlight** in bulk rename: `.bulk-rename-picker-row.is-checked` → `background: rgba(33,150,243,0.07); border-color: rgba(33,150,243,0.4)`.

### E. Chevrons & Collapse Arrows

**`.em-collapsible-icon`** base style:
- `background: var(--em-bg-hover)` + `border: 1.5px solid var(--em-border)` + `color: var(--em-primary)`
- Hover: fills to `background: var(--em-primary); color: #fff`
- Transition: `transform 0.25s ease` (rotates on expand/collapse)

**Section-tinted chevrons** — inside `.em-sug-*` sections the chevron color matches the section:

| Section | Chevron color |
|---------|--------------|
| `.em-sug-health` | `rgb(156,39,176)` purple |
| `.em-sug-naming` | `rgb(255,152,0)` orange |
| `.em-sug-area` | `rgb(244,67,54)` red |
| `.em-sug-labels` | `rgb(220,200,0)` yellow |
| `.em-sug-disable` | `rgba(180,180,180,0.8)` gray |

**`.brp-chevron`** (bulk rename group headers): no explicit color (inherits from header text); `transition: transform 0.15s`.

### F. Entity State Color Map (JS inline)

Used in `_renderMiniEntityCard` state chips, entity card state chips, and bulk rename previews:

| State value | Color | Swatch |
|-------------|-------|--------|
| `on`, `home`, `open` | `var(--em-success)` | green |
| `off`, `not_home`, `closed` | `var(--em-text-secondary)` | muted |
| `unavailable`, `unknown` | `var(--em-warning)` | orange |
| `disabled` | `var(--em-danger)` | red |
| anything else | `var(--em-text-primary)` | default |

### G. Stat Card Color Map (`data-stat-type`)

4px top border + 6% tinted background in light mode (10% in dark mode):

| `data-stat-type` | Border color | Light bg tint |
|-----------------|-------------|--------------|
| `integrations` | `#2196f3` | `rgba(33,150,243,0.06)` |
| `devices` | `#5c6bc0` | `rgba(92,107,192,0.06)` |
| `entities` | `#26a69a` | `rgba(38,166,154,0.06)` |
| `automations-helpers` | `#2196f3` | `rgba(33,150,243,0.06)` |
| `health-cleanup` | `#f44336` | `rgba(244,67,54,0.06)` |
| `template` | `#ff9800` | `rgba(255,152,0,0.06)` |
| `hacs` | `#4caf50` | `rgba(76,175,80,0.06)` |
| `lovelace` | `#03a9f4` | `rgba(3,169,244,0.06)` |
| `suggestions` | `#ffc107` | `rgba(255,193,7,0.07)` |
| `browsers` | `#00bcd4` | `rgba(0,188,212,0.06)` |

### H. Toast Colors

4px left border + matching icon color per type:

| Type | Color |
|------|-------|
| `success` | `var(--em-success)` |
| `error` | `var(--em-danger)` |
| `warning` | `var(--em-warning)` |
| `info` | `var(--em-primary)` |

### I. Domain Color Map (JS `domainColors` object)

Used for grouping mode icons and sidebar accent dots:

```js
light: '#f59e0b'         // amber
switch: '#3b82f6'        // blue
sensor: '#10b981'        // teal
binary_sensor: '#8b5cf6' // purple
automation: '#ec4899'    // pink
script: '#6366f1'        // indigo
input_boolean: '#14b8a6' // teal
media_player: '#f97316'  // orange
climate: '#ef4444'       // red
cover: '#84cc16'         // lime
```

### J. HA Label Color Palette (`HA_LABEL_COLORS`)

19 Material Design swatches shown in the label creation color picker:
`red` `pink` `purple` `deep-purple` `indigo` `blue` `light-blue` `cyan` `teal` `green` `light-green` `lime` `yellow` `amber` `orange` `deep-orange` `brown` `grey` `blue-grey`

Each entry: `[name, hex]` — e.g. `['blue', '#2196f3']`.

---

## 20. Under-Documented Dialogs

Methods that exist in the code with state properties in §1 but no prior method-level documentation.

### `_showAliasEditor(entityId)`

Non-destructive display name override. Opens a modal with a single text input. The entered alias is stored in `entityAliases[entityId]` (persisted to `em-entity-aliases`). The alias replaces the HA name in entity cards within EM only — it does **not** rename the entity in the HA registry. Clear the input to remove the alias.

### `_showColumnSettings()`

Modal with a checkbox list to toggle which columns are visible in the entity table. Persisted to `em-visible-columns`. Each column checked via `col(id)` helper at render time. Available column IDs:

`checkbox` (always visible) · `favorite` · `entity_id` · `device` · `integration` · `area` · `labels` · `config_url` · `entity_category` · `state` · `icon` · `platform` · `last_changed` · `aliases`

### `_showCreateHelperDialog()`

Creates HA input helpers from within EM without navigating to HA settings. Supported types:

| Type | HA domain | Extra fields |
|------|-----------|-------------|
| Toggle | `input_boolean` | name only |
| Number | `input_number` | min, max, step |
| Text | `input_text` | min length, max length |
| Dropdown | `input_select` | options list (comma-separated) |
| Date/Time | `input_datetime` | has_date toggle, has_time toggle |

WS calls: native `input_*/create` (see §3). After successful creation calls `loadCounts()` to refresh the helpers stat card.

### `_showGroupEditorDialog(existingGroup = null)`

Create or edit a custom entity group used by `smartGroupMode = 'custom'`. Shows a live integration → device → entity tree (collapsible, with search). Checkboxes sync the selection in real time. Persisted to `em-custom-groups` as `{ id, name, entityIds[] }`. When `existingGroup` is provided, the name field and all entity checkboxes are pre-filled from the existing group data.

### `_showSuggestionsDialog(section, { inline })` — 6 Categories

Six collapsible sections built with `_collGroup()` + `.em-sug-*` tinting (§17 for exact colors):

| Section | `.em-sug-*` class | Content |
|---------|------------------|---------|
| Health Issues | `.em-sug-health` (purple) | Unavailable + unhealthy-state entities |
| Disable Candidates | `.em-sug-disable` (gray) | Entities not updated 30+ days; each row has "dismiss for 30d" |
| Naming Improvements | `.em-sug-naming` (orange) | Entities with generic or hash-ID names (see `isHashId` in §6) |
| Area Assignment | `.em-sug-area` (red) | Entities with no area assigned; clicking a row opens the area/floor dialog |
| Label Suggestions | `.em-sug-labels` (yellow) | Grouped by domain (Lights, Locks, etc.) — entities without any label |
| Custom Groups | *(no tint)* | Current custom group memberships; only shown when entering from sidebar |

Search bar in the dialog header filters across all sections simultaneously. Refresh button re-scans the data. `section` parameter (if non-null) opens to a specific section; `inline` follows the standard inline view pattern.

### `_showCleanupDialog({ inline, container })`

Can run as a modal or inline — injected into `container` when called from `_renderMergedEntitySections`. Four collapsible sub-sections:

| Sub-section | Content | Row actions |
|-------------|---------|-------------|
| Orphaned Entities | No device assigned; cards grouped by integration | Ignore (snooze) / Assign to device / Add to Group / Remove |
| Stale Entities | Not updated in 30+ days | Keep (dismiss 30d) / Disable (confirm) / Remove (confirm) |
| Ghost Devices | In device registry but has no entities | Open in HA |
| Never Triggered | Automations/scripts with no `last_triggered` attribute | Open editor (↗) |

**Orphaned ignore state** (`em-orphan-ignored`): stored as `{ entity_id: expiry_ms }` where `0` = permanent. Shared storage key with `showEntityListDialog('orphaned')`. Migration from old `string[]` format is automatic. `_clnIgnoredMap`, `_clnBuildSet()`, `_clnIsIgnored()`, `let _clnIgnoredSet` manage state locally in the function closure. `_clnOrphanBodyHtml(showIgnored)` and `_clnOrphanHeaderHtml(showIgnored)` rebuild the orphaned section independently.

Rows are removed from the DOM immediately on successful action — no full re-render needed. `em-stale-dismissed` (localStorage) tracks dismissed stale entity IDs with expiry timestamps.

### `_showIgnoreSnoozeDialog(entityId, onSnooze)`

Opens a duration-picker dialog for snoozing entity visibility. Options: 1 Day / 3 Days / 1 Week / 2 Weeks / 1 Month / 3 Months / Permanent. Calls `onSnooze(expiryMs)` where `expiryMs = 0` means permanent, otherwise `Date.now() + durationMs`. Used by both unavailable and orphaned ignore handlers.

### `_showAddToGroupDialog(entityIds)`

Shows a two-section picker dialog matching the sidebar Groups section:

**Grouping Modes** (top):
- By Area / By Floor → `_showAreaFloorDialog('Assign area', entities)`
- By Device Name → `_showDevicePickerDialog(entityIds[0], ...)` (single entity only; disabled if `entityIds.length > 1`)
- By Integration / By Type → informational only (greyed out — automatic grouping, not assignable)

**Custom Groups** (bottom): lists `this.customGroups` (re-read fresh from `em-custom-groups` on open). Clickable rows add entities instantly; `+N` badge shows how many new entities will be added. "+ New Custom Group" button opens `_showGroupEditorDialog(null, entityIds)`.

Inner helper `_attachRowHover(el)` attaches identical mouseenter/mouseleave border+background effects to both mode rows and custom group rows.

### `_showConfigEntryHealthDialog({ inline, container })`

Shows config entries in a failed state. WS call: `entity_manager/get_config_entry_health` — returns entries where `state === 'failed'` or `reason === 'reconfigure_failed'`. Each card shows: integration name, state badge, failure reason string. "Reload" button calls `config_entries/reload` with the entry's `entry_id`; on success the card updates in-place (state badge changes to healthy). Can run modal or inline (used by `_renderMergedEntitySections`).

### `_showLovelaceDialog()` / `showEntityListDialog('lovelace')` — 3 Sections

The §8 type map lists this as "Card type analysis" — here is the full breakdown. Three collapsible sections rendered inside the inline view shell:

**1. Dashboards** — lists every dashboard (from `lovelace/dashboards/list`) with view count, total card count, and an external-link button to open it in HA.

**2. Card Types** — horizontal bar chart showing how many cards of each type exist across all dashboards. Custom cards are labeled with the `custom:` prefix. Cards matching installed HACS plugin names are labeled with the plugin name in parentheses (e.g. "mushroom-chips-card (HACS)").

**3. Entities in Lovelace** — every entity referenced in any card across all dashboards, with the total reference count and a list of sample card locations.

Card extraction is recursive across `views[]` → `cards[]` and `sections[]`. Parsed fields: `entity`, `entity_id`, `camera_image`, `entities[]` array items, and `conditions[].entity`.

---

*This document covers the code architecture as of v2.19.0. For project setup, services, WebSocket backend (Python), and git workflow see [CLAUDE.md](CLAUDE.md).*
