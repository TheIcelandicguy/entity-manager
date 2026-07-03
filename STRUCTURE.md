# Project Structure

```
entity-manager/
├── custom_components/
│   └── entity_manager/
│       ├── __init__.py                  # Integration entry point, panel + resource registration
│       ├── config_flow.py               # UI-based configuration flow (single-step, no options)
│       ├── const.py                     # DOMAIN, MAX_BULK_ENTITIES, VALID_ENTITY_ID
│       ├── manifest.json                # Integration metadata (v2.22.0)
│       ├── services.yaml                # Service schema for enable_entity / disable_entity
│       ├── strings.json                 # UI strings for config flow
│       ├── voice_assistant.py           # Voice intent handlers (enable/disable)
│       ├── websocket_api.py             # 21 WebSocket command handlers
│       ├── frontend/
│       │   ├── entity-manager-panel.js  # Custom web component UI (~16,100 lines)
│       │   └── entity-manager-panel.css # External stylesheet (~7,050 lines)
│       └── translations/
│           └── en.json                  # English translations
├── sentences/en/
│   └── entity_manager.yaml             # Voice assistant sentence patterns
├── tests/
│   └── test_const.py                   # Basic constant tests
├── DEVREF.md                           # Internal developer reference (methods, state, CSS)
├── STRUCTURE.md                        # This file — project layout and component overview
├── PROJECT_SUMMARY.md                  # High-level project overview
├── CHANGES.md                          # Version changelog
├── hacs.json                           # HACS configuration
├── info.md                             # HACS info page
├── README.md                           # User documentation
├── INSTALL.md                          # Installation guide
├── QUICKSTART.md                       # Quick reference card
├── package.json                        # Node dev dependencies (eslint, vitest)
└── LICENSE                             # MIT License
```

---

## File Descriptions

### Backend (Python)

**`__init__.py`**
- Registers frontend JS/CSS at `/api/entity_manager/frontend`
- Registers WebSocket API, voice intents, HA services, sidebar panel
- Panel requires admin (`require_admin=True`)

**`config_flow.py`**
- Single-step UI setup flow — no configuration options
- Sets unique ID to prevent duplicate installations

**`const.py`**
- `DOMAIN = "entity_manager"`
- `MAX_BULK_ENTITIES = 500` — hard cap on bulk operations
- `VALID_ENTITY_ID` — regex for entity ID validation before registry writes

**`websocket_api.py`**
21 WebSocket command handlers, all requiring `@websocket_api.require_admin`:

| Command | Description |
|---------|-------------|
| `get_disabled_entities` | Entity tree grouped by integration → device |
| `export_states` | Export all entities to JSON |
| `import_entity_states` | Import previously-exported entity states |
| `get_automations` | Automations with trigger context |
| `get_template_sensors` | Template entities with connections |
| `get_entity_details` | Full entity metadata (registry, device, area, labels) |
| `get_config_entry_health` | Failed/unhealthy config entries |
| `get_areas_and_floors` | Area + floor hierarchy |
| `get_last_activity` | Recorder-backed last-changed timestamps for the Activity Timeline view |
| `list_hacs_items` | Installed HACS items + store items |
| `enable_entity` | Enable single entity |
| `disable_entity` | Disable single entity |
| `bulk_enable` | Enable up to 500 entities |
| `bulk_disable` | Disable up to 500 entities |
| `rename_entity` | Rename entity (domain preserved) |
| `update_entity_display_name` | Set or clear user display name |
| `remove_entity` | Remove entity from registry (handles templates + YAML) |
| `update_yaml_references` | Find/replace entity ID across YAML config files |
| `assign_entity_device` | Assign entity to a device in the registry |
| `unassign_entity_device` | Remove device assignment from entity |
| `register_template` | Register a new UI-created template sensor config entry |

**`voice_assistant.py`**
- Intent handlers for enable/disable voice commands
- Sentence patterns in `sentences/en/entity_manager.yaml`

---

### Frontend (JavaScript + CSS)

**`frontend/entity-manager-panel.js`** (~16,100 lines)

Single `EntityManagerPanel` custom element (`extends HTMLElement`). Key areas:

| Area | Description |
|------|-------------|
| Constructor + `connectedCallback` | Bootstrap state from localStorage, attach DOM, call `loadData()` |
| `set hass(value)` | Called by HA on every state change; drives update watcher |
| `loadData()` / `updateView()` | Fetch WS data → apply filters/grouping → render |
| `render()` | Full component re-render (sidebar + main content, called once) |
| Inline view system | `_activeView` key drives `_renderMergedEntitySections()`, `_renderActivityLogView()`, `_renderActivityTimelineView()`, etc. |
| Bulk rename | `_bulkRenameMode` flag; `_renderBulkRenameView()` renders inline without dialog |
| Undo/Redo | `undoStack` / `redoStack` persisted to localStorage; `_showHistoryDialog()` combined timeline |
| Dialog system | `createDialog({ title, color, contentHtml, actionsHtml })` → `{ overlay, closeDialog }` |
| Theme system | 4 built-in themes + custom themes; all colors via `--em-*` CSS variables |

Key methods:

| Method | Purpose |
|--------|---------|
| `_renderMergedEntitySections(types, bodyEl)` | Async-loads multiple section types into inline view body |
| `_collGroup(label, bodyHtml, openByDefault?)` | Collapsible group helper; pass `true` to start expanded |
| `_renderMiniEntityCard(opts)` | Standard mini entity card used in all dialogs/views |
| `_pushUndoAction(action)` | Push to undo stack + persist to localStorage |
| `_showHistoryDialog()` | Combined undo/redo timeline dialog with Clear History |
| `_describeAction(action)` | Human-readable label for each undo action type |
| `_executeAction(action, isUndo)` | Execute a single undo or redo step |
| `_showDevicePickerDialog(entityId, onSelect)` | Integration-grouped device picker with confirmation |
| `_showAssignDialog(entities, opts)` | Unified area/floor + label assignment dialog, opened from any chip; `opts.focus` scrolls to `'area'` or `'labels'` |
| `_assignAreaToEntities(entities, areaId)` | Applies an area to entities (+ their devices, deduped); continues past per-entity failures, returns `{success, failed}` |
| `_categorizeEntity(entity)` / `_categoryMeta()` | Shared category classification (Controls/Sensors/Configuration/Diagnostic/Connectivity) used by both device cards and integration-row breakdowns |
| `_autoExpandLoneDevice(integrationName)` | Marks a single-device integration's device pre-expanded, called only from expand-transition click handlers |
| `_effectiveEntityLabels(entity)` / `_effectiveDeviceLabels(deviceId, areaId)` | Resolve broadest-scope-wins label set (`[{labelId, scope}]`, A/D/E) |
| `_renderLabelChips(scopedLabels, dataAttrs)` | Render label chip markup with scope badges from the above |
| `_renderLabelColorPickerHtml(pickerId, currentColor)` / `_attachLabelColorPicker(picker)` | Shared 19-preset + custom-hex color picker used by all 4 label color picker call sites |
| `_reAttachCollapsibles(root)` | Wire `.em-collapsible` click listeners; guards with `data-collapsible-bound` |
| `_loadLastActivityCache()` | Queries `entity_manager/get_last_activity` (recorder DB), caches in localStorage 1h TTL; calls `updateView()` when done |
| `_renderActivityTimelineView()` | Last Activity inline view — 15 domain-based sections, filter pills, search, live count badge |
| `_buildTimelineBody(items, filter, search)` | Pure HTML builder for timeline sections; called on initial render and each filter/search change |
| `_updateUndoRedoUI()` | Update `#history-btn` count badge and opacity |
| `_reRenderSidebar()` | Rebuild sidebar HTML in-place |
| `_showToast(msg, type)` | Transient notification (success/info/warning/error) |
| `_escapeHtml(s)` / `_escapeAttr(s)` | XSS-safe HTML/attribute encoding |
| `_loadFromStorage(key, default)` / `_saveToStorage(key, val)` | localStorage I/O |
| `_fmtAbsDate(isoStr, fallback?)` | Locale-aware absolute timestamp (12h/24h + date order from browser locale) |
| `_showEntityDetailsDialog(entityId)` | Full entity detail dialog with hero header, inline rename, state pill, action buttons |
| `_addNotification(type, entityId, msg)` | Push a notification to the bell dropdown; rate-limited, persisted in localStorage |

**`frontend/entity-manager-panel.css`** (~7,050 lines)

All colors via `--em-*` CSS variables (never HA theme variables directly):

| Variable | Value | Role |
|----------|-------|------|
| `--em-primary` | `#2196f3` | Blue — borders, buttons, focus |
| `--em-success` | `#4caf50` | Green — enabled state |
| `--em-danger` | `#f44336` | Red — disabled, delete |
| `--em-warning` | `#ff9800` | Orange — warnings, updates |
| `--em-border` | theme-dependent | Default border color |
| `--em-text-primary/secondary` | theme-dependent | Text colors |
| `--em-bg-primary/secondary/hover` | theme-dependent | Background colors |

CSS cascade trap: base rules for `.device-entity-list`, `.btn`, `.device-enable-all` are defined late in the file — mobile overrides must go in the `/* MOBILE OVERRIDES */` section at the very end.

---

## Data Flow

```
User Interface (JavaScript Web Component)
         ↓ WebSocket
WebSocket API (Python handlers)
         ↓
Home Assistant Core APIs
         ↓
Entity Registry / Device Registry / Area Registry / Label Registry
```

---

## State Management

All persistent state lives in `localStorage` under `em-*` keys. Key properties:

| Property | Key | Description |
|----------|-----|-------------|
| `undoStack` | `em_undoStack` | Up to 50 undo steps (JSON, persists across HA panel re-creation) |
| `redoStack` | `em_redoStack` | Redo steps |
| `viewState` | `em_viewState` | `'all'`, `'enabled'`, `'disabled'`, `'updates'` |
| `smartGroupMode` | `em_smartGroupMode` | `'integration'`, `'area'`, `'type'`, `'floor'`, `'device'` |
| `activeTheme` | `em-active-theme` | Active theme name |
| `favorites` | `em-favorites` | Favorited entity IDs |
| `activityLog` | `em_activityLog` | Last 100 operations |
| `expandedIntegrations` | `em_expandedIntegrations` | Expanded integration sections |
| `expandedDevices` | `em_expandedDevices` | Expanded device sections |

---

## Development Workflow

1. Edit files in `E:\entity-manager\custom_components\entity_manager\`
2. Run `sync-to-ha.ps1` to copy to the live HA instance on `Z:\`
3. Python changes require HA restart; frontend-only changes need only a hard browser refresh
4. Use `npx eslint custom_components/entity_manager/frontend/` for JS linting

---

## Key Architecture Patterns

### Undo/Redo
- Every mutating operation calls `_pushUndoAction({ type, ...data })` before the WS call
- `undoStack`/`redoStack` JSON-serialised to localStorage to survive panel re-creation
- `_executeAction(action, isUndo)` dispatches to the correct WS command for each action type
- `_showHistoryDialog()` renders a combined timeline; clicking executes N steps to reach that point

### Inline Views vs Dialogs
- **Dialogs**: `createDialog()` returns `{ overlay, closeDialog }`; content wired inside the overlay
- **Inline views**: `_activeView` key; `updateView()` intercepts and renders into `#content`; `_renderMergedEntitySections()` async-loads multiple section types
- **DOM node moving**: sections with delegated listeners (cleanup, config-health) receive `container` directly; simple content sections use temp container + `appendChild` to preserve listeners

### Event Delegation
- Buttons added asynchronously (async-loaded sections) cannot use `querySelectorAll` wiring in `updateView()`
- Use persistent delegated listeners on `this.content` (attached once in `render()`) for buttons that may appear after initial render — e.g. `.em-mini-card-link` open-in-HA buttons

### Dialog Content Wrapper Rule
`createDialog()` applies `flex: 1; overflow-y: auto` to every direct child of `.confirm-dialog-box` that is not the header or actions. Always wrap `contentHtml` in a **single `<div>`** — never pass multiple sibling top-level elements.
