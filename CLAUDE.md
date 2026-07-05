#
 CLAUDE.md - AI Assistant Guide for Entity Manager

This document provides comprehensive guidance for AI assistants working with the Entity Manager codebase.

## Project Overview

**Entity Manager** is a custom Home Assistant integration (v3.0.0) that provides a centralized interface for managing entities across all integrations and devices. It solves the common pain point of navigating through multiple settings pages to manage entities.

### Key Value Proposition
- Bulk enable/disable entities in seconds instead of minutes
- Organized tree view by Integration → Device → Entity
- Multiple smart grouping modes (Integration, Room/Area, Type, Device Name)
- Search and filter capabilities across all entities
- Advanced tools: entity renaming, YAML reference updater, firmware manager, automation impact analysis
- Theme system with 4 built-in themes and a custom theme editor
- Voice assistant support for hands-free control

## Repository Structure

```
entity-manager/
├── custom_components/entity_manager/   # Main integration code
│   ├── __init__.py                     # Entry point, service registration, panel setup
│   ├── config_flow.py                  # UI-based configuration flow
│   ├── const.py                        # Constants (DOMAIN, MAX_BULK_ENTITIES, VALID_ENTITY_ID)
│   ├── manifest.json                   # Integration metadata (v3.0.0)
│   ├── services.yaml                   # Service schema for HA UI
│   ├── strings.json                    # UI strings for config flow
│   ├── voice_assistant.py              # Voice intent handlers
│   ├── websocket_api.py                # WebSocket command handlers (21 commands)
│   ├── frontend/
│   │   ├── entity-manager-panel.js     # Custom web component UI (~16,100 lines)
│   │   └── entity-manager-panel.css    # External stylesheet (~7,050 lines)
│   └── translations/
│       └── en.json                     # English translations
├── sentences/en/
│   └── entity_manager.yaml             # Voice assistant sentence patterns
├── tests/
│   └── test_const.py                   # Basic constant tests
├── hacs.json                           # HACS configuration
├── info.md                             # HACS info page
├── README.md                           # User documentation
├── INSTALL.md                          # Installation guide
├── QUICKSTART.md                       # Quick reference
├── STRUCTURE.md                        # Code structure documentation
├── PROJECT_SUMMARY.md                  # Project overview
├── package.json                        # Node dev dependencies (eslint)
└── LICENSE                             # MIT License
```

## Architecture

### Data Flow

```
User Interface (JavaScript Web Component)
         ↓ WebSocket
WebSocket API (Python handlers)
         ↓
Home Assistant Core APIs
         ↓
Entity Registry / Device Registry / Area Registry / Label Registry
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| `__init__.py` | Integration setup, service registration, sidebar panel + frontend resource registration |
| `config_flow.py` | Handle UI-based integration setup (single-step, no config options) |
| `const.py` | Domain, bulk operation limits, entity ID validation regex |
| `websocket_api.py` | 21 WebSocket handlers covering entity ops, registry access, YAML management |
| `voice_assistant.py` | Intent handlers for enable/disable voice commands |
| `entity-manager-panel.js` | Complete frontend UI as a custom element |
| `entity-manager-panel.css` | External stylesheet loaded at startup |

## Key Patterns and Conventions

### Python Code Style

1. **Async/Await**: All HA interactions use async patterns
2. **Entity Registry**: Access via `er.async_get(hass)`
3. **Device Registry**: Access via `dr.async_get(hass)`
4. **Logging**: Use module-level `_LOGGER = logging.getLogger(__name__)`
5. **Error Handling**: Wrap registry operations in try/except; return structured error responses
6. **Type Hints**: Use Python type hints (e.g., `dict[str, Any]`)
7. **Bulk Limit**: Never exceed `MAX_BULK_ENTITIES = 500` in bulk operations
8. **Entity ID Validation**: Use `VALID_ENTITY_ID` regex from `const.py` before acting

### JavaScript Code Style

1. **Vanilla JS**: No frameworks — pure ES6+ JavaScript
2. **Web Components**: `EntityManagerPanel extends HTMLElement`
3. **State Management**: Instance properties persisted to `localStorage` (see State section)
4. **HA Integration**: Use `this.hass.callWS()` for WebSocket calls
5. **Styling**: External CSS file + HA CSS variables; avoid inline styles for non-dynamic values
6. **DOM Updates**: Batch changes, use `requestAnimationFrame` where possible

### Home Assistant Conventions

1. **Domain**: `entity_manager` (used consistently across all files)
2. **Services**: `entity_manager.enable_entity`, `entity_manager.disable_entity`
3. **WebSocket Types**: `entity_manager/<command>` naming pattern
4. **Admin Required**: All WebSocket commands use `@websocket_api.require_admin`
5. **IoT Class**: `calculated` (not `local_push`)
6. **Frontend Resources**: Registered at `/api/entity_manager/frontend` via `__init__.py`

## Constants Reference (`const.py`)

```python
DOMAIN = "entity_manager"
MAX_BULK_ENTITIES = 500          # Hard cap on bulk enable/disable operations
VALID_ENTITY_ID = re.compile(    # Use for entity_id validation
    r"^[a-z_]+\.[a-z0-9_]+$"
)
```

## WebSocket API Reference

All 21 commands require admin privileges via `@websocket_api.require_admin`.

### Data Retrieval Commands

| Command | Parameters | Description |
|---------|------------|-------------|
| `entity_manager/get_disabled_entities` | `state: "disabled"\|"enabled"\|"all"` | Entities grouped by integration/device |
| `entity_manager/export_states` | _(none)_ | Export all entities to JSON |
| `entity_manager/import_entity_states` | _(varies)_ | Import previously-exported entity states |
| `entity_manager/get_automations` | _(none)_ | List automations with trigger context |
| `entity_manager/get_template_sensors` | _(none)_ | List template entities with connections |
| `entity_manager/get_entity_details` | `entity_id: string` | Full entity metadata from all registries |
| `entity_manager/get_config_entry_health` | _(none)_ | Unhealthy/failed config entries |
| `entity_manager/get_areas_and_floors` | _(none)_ | Area and floor hierarchy |
| `entity_manager/get_last_activity` | _(none)_ | Recorder-backed last-changed timestamps for the Last Activity Timeline view |
| `entity_manager/list_hacs_items` | _(none)_ | Installed HACS items + community store items |

### Entity Operation Commands

| Command | Parameters | Description |
|---------|------------|-------------|
| `entity_manager/enable_entity` | `entity_id: string` | Enable a single entity |
| `entity_manager/disable_entity` | `entity_id: string` | Disable a single entity |
| `entity_manager/bulk_enable` | `entity_ids: string[]` | Enable multiple entities (max 500) |
| `entity_manager/bulk_disable` | `entity_ids: string[]` | Disable multiple entities (max 500) |
| `entity_manager/rename_entity` | `entity_id: string, new_name: string` | Rename entity (domain preserved) |
| `entity_manager/update_entity_display_name` | `entity_id: string, display_name: string\|null` | Set or clear user display name |
| `entity_manager/remove_entity` | `entity_id: string` | Remove entity (handles templates, YAML, integration-managed) |
| `entity_manager/assign_entity_device` | `entity_id: string, device_id: string` | Assign entity to a device |
| `entity_manager/unassign_entity_device` | `entity_id: string` | Remove device assignment from entity |
| `entity_manager/register_template` | _(varies)_ | Register a new UI-created template sensor config entry |

### YAML Management Commands

| Command | Parameters | Description |
|---------|------------|-------------|
| `entity_manager/update_yaml_references` | `old_entity_id: string, new_entity_id: string, dry_run: bool` | Bulk find/replace across YAML config files with optional preview |

### Response Structure (`get_disabled_entities`)

```python
[
    {
        "integration": "shelly",
        "devices": {
            "device_id": {
                "device_id": "abc123",
                "name": "Shelly Plug S",
                "entities": [
                    {
                        "entity_id": "sensor.shelly_power",
                        "platform": "shelly",
                        "device_id": "abc123",
                        "disabled_by": "user",       # or "integration", "config_entry", null
                        "original_name": "Power",
                        "entity_category": "diagnostic",  # or "config", null
                        "is_disabled": true
                    }
                ],
                "total_entities": 10,
                "disabled_entities": 5
            }
        },
        "total_entities": 50,
        "disabled_entities": 25
    }
]
```

## Frontend State Management

Most state is persisted to `localStorage` via `_loadFromStorage()`/`_saveToStorage()`, but several instance properties below are intentionally in-memory-only (reset on reload). Keys are kebab-case (`em-foo-bar`) except two legacy camelCase-with-underscore holdouts noted below — this table was regenerated from a full grep of every `_loadFromStorage`/`_saveToStorage`/`localStorage.getItem`/`setItem` call site; re-grep before trusting it if it's been a while.

| Property / Feature | localStorage Key | Description |
|----------|-----------------|-------------|
| `this.data` | _(in-memory)_ | Raw entity data from WebSocket |
| `this.expandedIntegrations` / `expandedDevices` | _(in-memory)_ | Collapsed/expanded tree sections — **not persisted**, resets every reload |
| `this.selectedEntities` | _(in-memory)_ | Current checkbox selections |
| `this.searchTerm` | `em-search-term` | Active search string — persisted via getter/setter accessors, not a direct `_saveToStorage` call site |
| `this.viewState` | `em-view-state` | `"all"`, `"enabled"`, `"disabled"`, or `"updates"` — persisted via getter/setter accessors |
| `this.selectedDomain` | `em-selected-domain` | Active domain filter — persisted via getter/setter accessors |
| `this.favorites` | `em-favorites` | Favorited entity IDs |
| `this.entityAliases` | `em-entity-aliases` | Non-destructive display name overrides |
| `this.activityLog` | `em-activity-log` | Last 100 operations |
| `this.undoStack` | `em_undoStack` | Up to 50 undo steps (legacy camelCase key, unlike the rest of this table) |
| `this.redoStack` | `em_redoStack` | Up to 50 redo steps (legacy camelCase key) |
| `this.customThemes` | `em-custom-themes` | User-created themes |
| `this.activeTheme` | `em-active-theme` | Active theme name |
| `this.filterPresets` (sidebar "Saved Views") | `em-filter-presets` | Saved filter combinations — distinct from `em-presets` below, easy to confuse |
| entity-ID presets (sidebar "Presets") | `em-presets` | Saved lists of specific entity IDs — a different feature from `filterPresets`/Saved Views despite the similar name |
| `this.visibleColumns` | `em-visible-columns` | Column visibility toggles |
| `this.smartGroupMode` | `em-smart-group-mode` | `"integration"`, `"room"`, `"type"`, `"floor"`, `"device-name"`, or `"custom"` — there is no separate "smart groups enabled" boolean, `"integration"` mode is the off-equivalent |
| `this.entityOrder` | `em-entity-order` | Custom drag-and-drop entity ordering |
| `this.customGroups` | `em-custom-groups` | User-defined custom groups |
| Sidebar collapsed state | `em-sidebar-collapsed` | Whether the whole sidebar nav is collapsed |
| Sidebar section open/closed | `em-sidebar-sections` | Which ACTIONS/LABELS/GROUPS/etc. sections are expanded |
| "Offline only" toolbar toggle | `em-show-offline-only` | Devices-view filter |
| Device type filter | `em-device-type-filter` | Devices-view filter |
| Backup-before-update toggle | `em-backup-before-update` | Update-flow setting |
| Saved device filters / device-name filter | `em-saved-device-filters` / `em-device-name-filter` | Devices-view filter presets |
| Notification settings | `em-notifications` / `em-notif-prefs` | Notification center data + preferences |
| Area-mapping rules | `em-area-mapping-rules` | Custom name→area suggestion rules |
| Ignore/restore system | `em-ignored-suggestions` / `em-ignore-migrated-v1` | See "Unified Ignore / Restore System" below |
| Health banner | `em-health-alert-threshold` / `em-health-banner-dismissed` | Health & Cleanup alert banner config |
| Dismissed stale-entity warnings | `em-stale-dismissed` | Health & Cleanup |
| Unavailable-entities time filter | `em-unavail-time-filter` | Health & Cleanup |
| Activity Log filter | `em-at-filter` | Activity Log dialog |
| Known entity IDs snapshot | `em-known-entity-ids` | Used to detect newly-added entities |
| Integration accent overrides | `em-integration-colors` | User color-picker overrides for per-integration accents (default = name-hash palette) |
| Suggestions tile count cache | `em-suggestions-count` | Last computed suggestions total, shown on the stat tile; refreshed by `_showSuggestionsDialog` |
| Last-activity cache | `em_lastActivityCache` | Legacy camelCase key, unlike the rest of this table |

Note: there is no `entityTags`/custom `#tagname` feature in this codebase — see "No custom tags — uses HA native Labels exclusively" further down.

### Key Frontend Methods

| Method | Description |
|--------|-------------|
| `loadData()` | Fetch entity data via WebSocket, refresh view |
| `updateView()` | Apply filters/search/grouping and re-render entity list |
| `render()` | Full component re-render (use sparingly) |
| `bulkEnable()` / `bulkDisable()` | Execute bulk operations on `selectedEntities` — reads the WS response's real `success`/`failed` arrays for undo tracking and toast accuracy, does not just assume the whole batch succeeded |
| `_showEntityDetailsDialog(entityId)` | Open entity detail dialog (there is no `showEntityDetails()` method — a past doc claimed that name, it never existed) |
| `_setActiveTheme(name)` / `updateTheme()` / `_applyCustomTheme(theme)` | Switch/apply active theme (there is no `applyTheme()` method — a past doc claimed one, it never existed) |
| `_pushUndoAction({...})` | Push an undo-able action onto the undo stack before a mutation — **the only real undo helper** (there is no `saveToUndo()` method — see "Undo/Redo" guidance below) |
| `_autoExpandLoneDevice(integrationName)` | If an integration has exactly one device, marks that device pre-expanded too — called only from expand-transition click handlers (integration header click, sidebar nav click, View Enabled/Disabled buttons), never from a render function |
| `_categorizeEntity(entity)` / `_categoryMeta()` | Shared category classification (Controls/Sensors/Configuration/Diagnostic/Connectivity) — used by both `_buildDeviceCard`'s per-device category cards and `renderIntegration`'s integration-row category-count badges, so the two can't drift apart |
| `_showAssignDialog(entities, opts)` | Unified area/floor + label assignment dialog — see "Assign Dialog" below |
| `_assignAreaToEntities(entities, areaId)` | Applies an area to entities (+ their devices, deduped by device). Continues past per-entity failures rather than aborting the batch; returns `{success: [entity_id...], failed: [{entity_id, error}...]}` so callers can report accurate partial-success counts |

## Development Workflow

### Local Development

1. Edit files in `custom_components/entity_manager/`
2. Copy to Home Assistant's `custom_components` directory
3. Restart Home Assistant (backend changes) or just clear browser cache (frontend-only changes)
4. Open the Entity Manager panel via the sidebar

### Making Backend Changes

- **Add WebSocket command**: Edit `websocket_api.py`, add handler with decorators, register in `async_setup_ws_api()`
- **Add service**: Edit `__init__.py` service registration + `services.yaml`
- **Add constant**: Edit `const.py`
- **Add voice intent**: Edit `voice_assistant.py` + `sentences/en/entity_manager.yaml`

### Making Frontend Changes

- Edit `custom_components/entity_manager/frontend/entity-manager-panel.js`
- Edit `custom_components/entity_manager/frontend/entity-manager-panel.css` for styling
- The panel is a single-file web component (16,000+ lines) — use Ctrl+F to navigate
- Use HA CSS variables (e.g., `var(--primary-color)`) for theme compatibility
- Clear browser cache after every change

### Linting

```bash
npx eslint custom_components/entity_manager/frontend/
```

## Common Tasks

### Adding a New WebSocket Command

```python
# In websocket_api.py

@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/new_command",
        vol.Required("param"): str,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def handle_new_command(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle new command."""
    try:
        # Implementation using hass registries
        connection.send_result(msg["id"], {"success": True, "data": {}})
    except Exception as err:
        _LOGGER.error("Error in new_command: %s", err)
        connection.send_error(msg["id"], "unknown_error", str(err))


# Register at the bottom of async_setup_ws_api():
websocket_api.async_register_command(hass, handle_new_command)
```

### Modifying Entity State

```python
entity_reg = er.async_get(hass)

# Enable entity
entity_reg.async_update_entity(entity_id, disabled_by=None)

# Disable entity
entity_reg.async_update_entity(
    entity_id,
    disabled_by=er.RegistryEntryDisabler.USER
)

# Rename entity (preserve domain)
domain = entity_id.split(".")[0]
entity_reg.async_update_entity(entity_id, name=new_name)
```

### Frontend WebSocket Calls

```javascript
// Single entity operation
const result = await this.hass.callWS({
    type: 'entity_manager/enable_entity',
    entity_id: 'sensor.example',
});

### Frontend Service Calls — Entity Targeting Rules

**Entity-targeted services with no extra data** (e.g. `button.press`): use `callWS` with `target`. Using `callService` with `entity_id` in service_data silently succeeds but does nothing in modern HA.

```javascript
// CORRECT
await this._hass.callWS({
    type: 'call_service',
    domain: 'button',
    service: 'press',
    target: { entity_id: entityId },
});

// WRONG — silently no-ops in modern HA
await this._hass.callService('button', 'press', { entity_id: entityId }); // ❌
```

**Services with extra data** (e.g. `update.install`): `callService` with `entity_id` in the data object works because those services read it from service_data:

```javascript
await this._hass.callService('update', 'install', { entity_id: entityId, backup: true });
```

## Important Files to Understand
// Bulk operation
const result = await this.hass.callWS({
    type: 'entity_manager/bulk_enable',
    entity_ids: Array.from(this.selectedEntities),
});

// Fetch with parameters
const result = await this.hass.callWS({
    type: 'entity_manager/get_disabled_entities',
    state: 'all',
});
```

### Saving to Undo Stack Before Mutations (Frontend)

### `entity-manager-panel.js` (Frontend UI)
- `EntityManagerPanel` class extending `HTMLElement`
- State: `data`, `deviceInfo`, `expandedIntegrations`, `expandedDevices`, `selectedEntities`, `searchTerm`, `viewState`, `labeledEntitiesCache`, `labeledDevicesCache`, `labeledAreasCache`
- Key methods: `loadData()`, `updateView()`, `render()`, `bulkEnable()`, `bulkDisable()`, `updateSelectedCount()`
- Helper methods: `_collGroup()`, `_reAttachCollapsibles()`, `_renderMiniEntityCard()`, `_renderEntityItem()`, `_buildDeviceCard()`, `_categorizeEntity()`, `_categoryMeta()`, `_autoExpandLoneDevice()`, `_triggerBadge()`, `_fmtAgo()`, `_reRenderSidebar()`, `_loadFromStorage()`, `_saveToStorage()`, `_escapeHtml()`, `_escapeAttr()` (there is no `_renderManagedItem()` — a past doc claimed one, it was renamed/removed without updating this file)
- Label methods: `_effectiveEntityLabels()`, `_effectiveDeviceLabels()`, `_renderLabelChips()`, `_renderLabelColorPickerHtml()`, `_attachLabelColorPicker()` (shared custom-hex + 19-preset color picker used by all 4 label color picker call sites), `_showLabelEditor()` (its returned promise resolves on actual dialog close, not on draw — see "Dialogs That Need to Wait" below)
- Dialog methods: `createDialog()`, `_showActivityLogDialog()`, `_showSuggestionsDialog()`, `_showHelpGuide()`, `_showAssignDialog()` (unified area/floor/label assignment — replaces the old `_showAreaFloorDialog()`/`_showAreaPickerDialog()`/`_showFloorPickerDialog()`, all since deleted)
- Bulk rename methods: `_openBulkRenameDialog()` (async mode-switcher), `_renderBulkRenameView()` (full inline panel)

### Entity Card Action Row (`icon-btn` pattern)
- Every entity card renders an `.entity-actions` row with `.icon-btn` buttons: Rename (✎), Enable (✓), Disable (✕), Bulk Rename (✎✎), Bulk Labels (🏷️), plus `open-ha-btn` (open in HA's own entity dialog), `press-entity` (button-domain entities), `assign-area-btn`, `bulk-delete-btn`
- Bulk Rename uses CSS class `bulk-rename-btn` (blue, matches `--em-primary`); Bulk Labels uses `bulk-labels-btn` (amber, matches `--em-warning`)
- Both bulk buttons are **always rendered** but carry the `disabled` attribute when `selectedEntities.size < 2`
- `updateSelectedCount()` flips `disabled` on all `[data-action="bulk-rename"]` and `[data-action="bulk-labels"]` elements in real time — no full re-render needed
- Disabled state styled via `.icon-btn:disabled` CSS rule: `opacity:0.4`, `cursor:not-allowed`, muted border/color
- Additional `.icon-btn` variants: `entity-config-url` (external link, opens config URL in new tab), `toggle-entity` / `toggle-entity.toggle-on` (on/off toggle with active state color)
- Labels: `_loadLabeledEntities()`, `_loadLabeledDevices()`, `_loadLabeledAreas()`, `_renderLabelsList()`
- No custom tags — uses HA native Labels exclusively
```javascript
// Always call before any state-changing operation
this._pushUndoAction({ type: '...', /* enough before-state to reverse it */ });
// ... perform mutation ...
await this.loadData();
```
`remove_entity` is the one intentional exception — it's irreversible by design and has no undo support anywhere in `_executeAction`'s switch, so don't treat its lack of an undo call as a bug.

## Important Files Deep-Dive

### `__init__.py` (Entry Point)
- `async_setup()`: Registers frontend JS/CSS resources at `/api/entity_manager/frontend`
- `async_setup_entry()`: Registers WebSocket API, voice intents, services, and sidebar panel
- `async_unload_entry()`: Cleanup on unload
- Panel registered via `frontend.async_register_built_in_panel()` with `require_admin=True`

### `websocket_api.py` (Backend Logic, ~1,380 lines)
- All 21 command handlers live here
- `async_setup_ws_api(hass)` registers all commands — **this is the only registration point**
- Helper `_resolve_trigger_context()` tracks human/automation/system trigger sources
- `enable_entity()` / `disable_entity()` are standalone async helpers called by both single and bulk handlers
- Bulk handlers iterate with per-item error handling and return `{"success": [...], "failed": [...]}` (note the key is `success`, not `succeeded` — this doc previously said `succeeded`, and at least one frontend bulk-toggle handler had copied that wrong key, always reporting full success even on partial failure)

### `entity-manager-panel.js` (Frontend UI, ~16,100 lines)
- Single `EntityManagerPanel` custom element class
- `connectedCallback()` → bootstraps state from localStorage, attaches shadow DOM, calls `loadData()`
- `set hass(value)` → called by HA on every state change; used to update `this.hass` reference
- Theme system: `PREDEFINED_THEMES` has 4 built-in themes, Title Case keys in code (`'Light'`, `'Dark'`, `'High Contrast'`, `'OLED Black'`) — plus a 5th `'default'` mode meaning "follow HA's own theme" — arbitrary custom themes on top. Persisted via `em-active-theme`/`em-custom-themes` (see Frontend State Management above).
- Smart grouping: persisted via `em-smart-group-mode`, modes = `integration` (off-equivalent) / `room` / `type` / `floor` / `device-name` / `custom`
- Lazy loading: large entity lists use intersection observer for performance

### `config_flow.py` (Setup Flow)
- Single-step flow (`async_step_user`)
- No configuration options — just creates the entry
- Unique ID prevents duplicate installations

## Testing

### Existing Tests

`tests/test_const.py` covers:
- `DOMAIN` equals `"entity_manager"`
- `MAX_BULK_ENTITIES` equals `500`

### Manual Testing Checklist

1. **Multi-integration grouping** — verify Integration → Device → Entity tree is correct
2. **Bulk operations** — test with > 100 entities; verify `success`/`failed` reporting
3. **Search** — matches entity ID, display name, device name, integration name
4. **Smart grouping** — test all 4 modes (Integration, Room/Area, Type, Device Name)
5. **Undo/Redo** — perform mutations and verify undo restores previous state
6. **Themes** — apply each built-in theme; create/import/export a custom theme
7. **YAML updater** — run with `dry_run: true` first, verify preview, then apply
8. **Empty states** — no disabled entities, no entities at all, no HACS
9. **Admin gate** — non-admin users must be blocked at every WebSocket command
10. **Browser cache** — confirm frontend resource URL includes a cache-busting mechanism

## Version Information

- **Current Version**: 3.0.0
- **Minimum Home Assistant**: 2024.1.0
- **IoT Class**: `calculated`
- **HACS Compatible**: Yes
- **Config Flow**: Yes (required for panel registration)

## Git Workflow

- Main development branch specified in task context
- Commit messages should be descriptive and reference the feature/fix
- Push changes to the designated feature branch (`claude/` prefix)
- Version bumps live in `manifest.json` and `package.json`

### Assign Dialog (`_showAssignDialog(entities, opts)`)

Unified area/floor + label assignment dialog, opened from any chip (area, floor, label, or a device header's chips). Replaces the old `_showAreaFloorDialog()`/`_showAreaPickerDialog()`/`_showFloorPickerDialog()`, all since deleted — do not re-add a separate area-only dialog; extend this one.

**Key architecture points:**
- `opts.focus` (`'area'` or `'labels'`) auto-scrolls the dialog to that section; `opts.labelTarget` pre-selects Entity/Device/Both/Area in the labels section's Apply-to selector
- **Area & Floor section** uses native HA APIs only: `config/area_registry/list`, `config/floor_registry/list`, `config/device_registry/update`, `config/entity_registry/update` — does NOT use `entity_manager/get_areas_and_floors` (see the trap below)
- Apply calls `_assignAreaToEntities(entities, areaId)`, which sets area at BOTH device level AND entity level so both registry layers stay in sync, and continues past per-entity failures rather than aborting the whole batch — check `result.failed` for accurate partial-success reporting rather than assuming all-or-nothing
- `selectedAreaId = undefined` → nothing chosen (Apply disabled); `= null` → clear assignment; `= string` → assign
- **Labels section** — Apply-to target selector includes Area alongside Entity/Device/Both; current labels list shows `E`/`D`/`A` scope badges with per-label remove; removing a `D`/`A` (inherited) label prompts a confirmation since it affects every entity on that device/area

**`areaLookup` map** (built in `loadDeviceInfo`):
- Built from `config/area_registry/list` + `config/floor_registry/list` (NOT the custom WS handler)
- Maps `area_id → { areaName, floorName }`
- `entityAreaMap` maps `entity_id → area_id` for ALL entities with entity-level area set

**Common trap:** `entity_manager/get_areas_and_floors` was used to build `areaLookup` but silently failed on every load, leaving all area chips blank. Always use native HA registry APIs for this data.

## Troubleshooting

### Common Issues

1. **Panel not showing**: Confirm integration is added via Settings → Integrations; check `require_admin`
2. **403 / WebSocket errors**: User must have admin privileges
3. **Frontend not updating**: Hard-refresh (Ctrl+Shift+R); check browser console for JS errors
4. **Services not registering**: Check HA logs at startup for `custom_components.entity_manager` errors
5. **Bulk op partially failing**: Normal — returns `{"success": [...], "failed": [...]}` for per-entity errors
6. **YAML updater not finding files**: HA config directory path may vary; check `hass.config.config_dir`

### Debug Logging

Add to Home Assistant `configuration.yaml`:
```yaml
logger:
  default: info
  logs:
    custom_components.entity_manager: debug
```

## Key HA WebSocket APIs Used

| API | Purpose |
|-----|---------|
| `entity_manager/get_disabled_entities` | Main entity tree |
| `entity_manager/get_entity_details` | Entity detail dialog |
| `history/history_during_period` | Activity Log state history (requires `entity_ids`) |
| `config/area_registry/list` | Area names and floor assignments |
| `config/device_registry/list` | Device → area mapping |
| `config/entity_registry/list` | Entity → area/label mapping |
| `config/label_registry/list` | All HA labels |
| `logbook/get_events` | **Deprecated in this codebase** — replaced by history API |

> **Note**: `history/history_during_period` with `minimal_response: true` returns timestamps as Unix seconds (floats in `lc`/`lu` fields) and states as `s`. Multiply by 1000 before passing to `new Date()`.

## Extension Points

For adding new features:

1. **New filter type**: Add filter property to state, update `updateView()`, add UI toggle in toolbar
2. **New grouping mode**: Add case to smart group switch in `updateView()`, add option to group selector
3. **New bulk action**: Add WebSocket command in `websocket_api.py`, add button to bulk action bar
4. **Scheduling**: New backend service + HA storage helper, UI for schedule config
5. **Statistics dashboard**: New `get_statistics` WebSocket command, dedicated panel view

## Code Quality Guidelines

- Keep Python handlers focused: validate input → call helper → send result
- Always validate `entity_id` with `VALID_ENTITY_ID` regex before registry operations
- Handle errors per-item in bulk loops — don't abort the whole batch on a single failure
- Use HA entity/device registries directly; never cache stale data beyond a single request
- In JS, always call `this._pushUndoAction({...})` before any mutating operation (except `remove_entity`, which is intentionally undo-exempt — irreversible by design)
- Never reference HA theme variables (e.g. `var(--secondary-background-color)`, `var(--card-background-color)`) directly in component CSS — always use `--em-*` equivalents so EM light/dark mode overrides take effect correctly
- Prefer `this.hass.callWS()` over `this.hass.callService()` for entity manager operations

### `showEntityListDialog` — Block-Scope Trap

`showEntityListDialog` dispatches to type-specific `else if (type === '...')` branches inside a `try` block. Variables declared with `let`/`const` inside a branch are **block-scoped** to that branch and are NOT accessible after the branch closes — including in the delegated click handlers that are registered at the outer try-block level.

**Pattern to follow**: Never reference a branch-local variable directly in the post-render handler section. Instead expose it via a getter on the context object:

```javascript
// Inside if (type === 'unavailable') { ... }
unavailCtx = {
  getIgnoredSet: () => _uvIgnoredSet,   // ← getter; closes over the let variable
  rebuildSet:    () => { _uvIgnoredSet = _uvBuildSet(); },
};

// In the outer click handler (outside the if block):
if (unavailCtx.getIgnoredSet().has(eid)) { ... }  // ✓
// NOT: if (_uvIgnoredSet.has(eid)) { ... }        // ✗ ReferenceError
```

The same pattern applies to any future type-specific context objects (e.g. `unavailCtx`).

**Delegation pattern**: All six section types in `_renderMergedEntitySections` (`config-health`, `cleanup`, `unavailable`, `automation`, `script`, `helper`) use direct-container delegation — pass `groupBody` as `container` so `overlay = groupBody` and click listeners remain on a live DOM ancestor. Never use the temp+move pattern for sections that rely on delegated event handlers; it silently drops any DOM that isn't inside `.em-group-body` (the bulk-action bar and tint wrapper included) since only children get moved, not siblings. `automation`/`script`/`helper` pass `skipOuterGroup: true` to `showEntityListDialog` so it doesn't add a second, redundant `_collGroup` header on top of the one `_renderMergedEntitySections` already built.

### CSS Cascade Traps

Several base rules are defined late in `entity-manager-panel.css` (after the `@media` blocks), so their mobile overrides **must** be placed at the end of the file, after the base rules:

| Rule | Location | Notes |
|------|----------|-------|
| `.device-entity-list` grid columns | Late in file | 1-col override at end in `@media (max-width: 600px)` |
| `.btn`, `.btn-secondary` | Line ~1316 | Font-size 18px; mobile overrides at end of file |
| `.device-enable-all`, `.device-disable-all` | Line ~4660 | Font-size 18px; mobile overrides at end of file |
| `.device-assign-area-btn` | Line ~4583 | Same cascade issue; end-of-file overrides |

**Rule**: When a base CSS rule comes after existing `@media` blocks, add the mobile override in the `/* ===== MOBILE OVERRIDES ===== */` section at the bottom of the CSS file.

### Dialog Content Wrapper Rule

`createDialog()` applies `flex: 1; overflow-y: auto` to **every direct child** of `.confirm-dialog-box` that is not the header or actions. Always wrap `contentHtml` content in a single `<div>` — never pass multiple sibling elements as top-level content — or each element becomes its own independent scroll box.

### Dialog Conventions

All `createDialog()`-based dialogs follow one shared convention (established during the UI structural consistency pass — see `CHANGES.md` for the version this landed in):

- **Buttons**: secondary `Cancel` on the left, a verb-labeled primary action on the right (never a bare "OK"). Solo-dismiss dialogs (nothing to cancel) get a single secondary-styled `Close`.
- **Escape** closes the topmost dialog — wired once, centrally, inside `createDialog()` itself. Don't add a per-dialog `keydown` handler for Escape; it's redundant and `createDialog()` already resolves the "only the topmost of several stacked dialogs closes" case.
- **Width**: use `extraClass` + the `--dialog-width-md/lg/xl/2xl` CSS custom properties (defined in `:root`) instead of a one-off `max-width` value. Never set `width` directly on `.confirm-dialog-box` — only `max-width`, so the dialog still shrinks on narrow viewports.
- **`color`**: always pass a semantic `color` (`var(--em-primary)`, `var(--em-danger)`, etc.) — it tints the header border/title and is the dialog's only visual severity cue.
- **Search**: prefer `searchPlaceholder` (renders the input in the fixed header, outside the scrolling body) + `_attachDialogSearch(overlay)` over a hand-rolled `<input>` inside `contentHtml`. `_attachDialogSearch` filters both `.em-mini-card[data-entity-id]` rows and Suggestions-style rows (`.em-sug-row`/`.em-sug-area-card`/`.em-label-sug-card`) and hides empty `.em-group-body` sections. If a dialog's search needs to filter a re-rendered data list rather than hide/show existing DOM rows (e.g. Activity Log, Device Picker), still use `searchPlaceholder` for the input's placement, but wire its `input` event to the dialog's own re-render function instead of calling `_attachDialogSearch`.
- **Native `confirm()`/`window.confirm()` is banned** — use `await this._confirmAsync(title, message)` instead, which resolves `true`/`false` and correctly resolves `false` on any dismissal path (No, backdrop click, Escape), not just an explicit Cancel click.

### Display-Name Rename — Two Implementations, Not Three

There are two legitimate rename flows, kept separate because they edit different fields:

- **`showRenameDialog(entityId)`** — renames the entity's `entity_id` itself (the object-id after the domain), with a YAML dry-run/reference-update preview. Used for regular entities.
- **`_showDisplayNameEditDialog(entityId, currentName, onSave)`** — renames only the display name (`entity_manager/update_entity_display_name`, WS param is `name`, **not** `display_name`) for automations/scripts/helpers, which don't have a user-facing renameable object-id the same way. Both the automation/script list rename button and the Entity Details dialog's hero pencil-edit route through this one shared helper — don't add a third bespoke implementation for a new display-name-rename entry point.

### Unified Ignore / Restore System

There is exactly **one** persistent dismiss mechanism in the app: `this._ignoredSugKeys` (a `Set` of `"type:id"` strings, persisted to the `em-ignored-suggestions` localStorage key). It's used by Suggestions (health/disable/naming/area/mismatch/label) **and** Health & Cleanup's Orphaned + Unavailable sections. Ignoring is **permanent** — there is no snooze/duration picker (`_showIgnoreSnoozeDialog` was deleted; don't re-add a time-boxed variant without deliberately deciding to reintroduce that concept).

- **`this._ignoreBtn(key)`** — returns the "✕ Ignore" button markup for a row. `key` is `"type:id"`, e.g. `"orphaned:sensor.foo"`.
- **`this._describeIgnoredKey(key)`** — resolves a key to `{ type, id, meta, name, sub }` for display in the restore list.
- **`this._renderIgnoredListUI(container, typeFilter?)`** — renders the "View ignored (N) / Restore all" bar + expandable restore list into `container`. Pass `typeFilter` (array of type prefixes, e.g. `['orphaned']`) to scope a dialog's ignored-list to just its own types — Suggestions omits it (shows everything, since it's the app's one central "recently dismissed" view); Cleanup's Orphaned and the Unavailable branch each scope to their own type so they don't show each other's unrelated ignores.
- **`IGN_TYPE_META`** (module-level const) — label + accent color per type. Add an entry here before introducing a new ignorable type.
- New ignorable types must each add a `container.querySelector('.em-sug-ignored-wrap')` div in their markup and call `_renderIgnoredListUI` after render (and again after any ignore/restore action, scoped to that container).

**Migration**: `_migrateLegacyIgnoreData()` (constructor, guarded by the `em-ignore-migrated-v1` localStorage flag) is a **one-time, one-way** migration from the old `em-orphan-ignored`/`em-unavail-ignored` snooze stores into `_ignoredSugKeys` — do not remove this without confirming existing users have already migrated, since it's what preserves ignores set before the unified system existed.

### Bulk Rename Inline View Pattern

Bulk rename is an **inline panel view**, not a dialog. It follows the same pattern as `_viewingSelected`:

- `this._bulkRenameMode = false` — state flag initialized in constructor
- `_openBulkRenameDialog()` — async; pre-loads all entities via `get_disabled_entities` with `state:'all'` into `this._bulkRenameData`, adds `em-bulk-rename-active` class to `#main-content`, calls `updateView()`
- `updateView()` intercepts at the top: `if (this._bulkRenameMode) { this._renderBulkRenameView(); return; }`
- `_renderBulkRenameView()` — guards with `.em-bulk-rename-view` check to preserve in-progress inputs during hass state updates; renders into `#content` (not a dialog overlay)
- `exitMode()` — sets `_bulkRenameMode = false`, removes `em-bulk-rename-active`, calls `loadData()`
- CSS: `#main-content.em-bulk-rename-active` hides `.toolbar`, `.toolbar-row-2`, `.toolbar-search`, `#stats`
- Layout: `.brv-split` flex row — `.bulk-rename-top-box` (flex:2, entity picker) + `.bulk-rename-bottom-box` (flex:1, rename queue)
- Entity picker grouped by integration → device from `this._bulkRenameData`; enriched with state from `this._hass.states`; if `preSelected.size > 0` only those entities are shown
- Group headers (`.brp-int-header`, `.brp-dev-header`) have checkboxes (`.brp-int-cb`, `.brp-dev-cb`) to select all in group; clicking the chevron area collapses/expands; the checkbox change handler uses capture phase to fire before the collapse click handler
- Queue rows (`.bulk-rename-entity-row`) show three lines: original ID, input for new name, live preview (`.brq-preview-id`) that turns green (`brq-preview-changed`) when changed — updated in `syncRenameBtn()`

### Dialogs That Need to "Wait" for the User — Resolve on Close, Not on Draw

`async` dialog-opening methods (e.g. `_showLabelEditor(entityId, target)`) return as soon as their `createDialog()` call finishes and listeners are attached — **not** when the user actually finishes and dismisses the dialog. A caller that does `this._showLabelEditor(id, 'entity').then(refreshSomething)` expecting `refreshSomething` to run *after* the user is done editing will instead run it almost immediately, using pre-edit data, and never again.

**Fix pattern** (used in `_showLabelEditor`): resolve the method's own promise only when the dialog's overlay is actually removed from the DOM, regardless of exit path (Done button, Escape, backdrop click):

```javascript
const closedPromise = new Promise(resolve => {
  const observer = new MutationObserver(() => {
    if (!document.body.contains(overlay)) { observer.disconnect(); resolve(); }
  });
  observer.observe(document.body, { childList: true });
});
// ... attach listeners, wire up Done/Cancel/etc ...
await closedPromise;
```

Apply this to any future dialog-opening method whose caller needs to know when the user is *actually done*, not just when the dialog was drawn.

### Bulk Actions From a Different Selection Than the Toolbar's — Pass IDs Explicitly, Don't Swap `selectedEntities`

Several entry points (e.g. the Automations/Scripts/Helpers list dialogs' bulk-action bar) need to run a toolbar-oriented bulk action (`_openBulkRenameDialog()`, `_showBulkLabelEditor()`) against a *different* set of entities than whatever's currently in `this.selectedEntities`. The tempting fix — save `this.selectedEntities`, swap in the desired ids, call the function, restore the saved value — is a bug if the called function is `async` and doesn't `await` synchronously to the point where it reads the selection: the restore runs before the function's later code (often past its first `await`) ever reads `this.selectedEntities`, so it silently operates on the *previous* selection instead.

**Fix pattern**: give the function an explicit override parameter (`entityIds = null`) that it uses everywhere instead of `this.selectedEntities` when provided — including inside click handlers that fire later (e.g. an Apply button), not just at initial render. Never reach for save-swap-restore around `this.selectedEntities` for this; it doesn't work once any `await` is involved.

### "Open in HA" / Cross-Navigation From a Custom Dialog — Use `data-open-path`, Not Manual pushState or `hass-more-info`

`createDialog()`'s overlay already delegates clicks on any `[data-open-path]`/`[data-open-entity]` element: `data-open-path` pushes the route + dispatches `location-changed` + closes the dialog; `data-open-entity` instead dispatches a `hass-more-info` event. Live-tested this session trying to send an Entity Details dialog button to HA's own entity page:
- A bespoke `history.pushState` + `location-changed` handler written inline (not going through the shared delegation) was order-sensitive relative to `closeDialog()` in a way that silently dropped the navigation depending on which ran first
- `data-open-entity` (the `hass-more-info` event path) never actually opened HA's more-info dialog in testing, for reasons not fully root-caused
- `data-open-path` targeting the same route (`/config/entities/entity/{id}`) — the same mechanism the automation/script list dialogs' "Edit" rows already use successfully — worked reliably

**Takeaway**: for any new "jump to a HA page" button inside a `createDialog()`-based dialog, add `data-open-path="..."` to the element and skip writing a bespoke click handler; don't reach for `data-open-entity` unless you've verified `hass-more-info` actually opens something in this environment first.
