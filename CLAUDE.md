# CLAUDE.md - AI Assistant Guide for Entity Manager

This document provides comprehensive guidance for AI assistants working with the Entity Manager codebase.

## Project Overview

**Entity Manager** is a custom Home Assistant integration (v2.10.0) that provides a centralized interface for managing entities across all integrations and devices. It solves the common pain point of navigating through multiple settings pages to manage entities.

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
│   ├── manifest.json                   # Integration metadata (v2.10.0)
│   ├── services.yaml                   # Service schema for HA UI
│   ├── strings.json                    # UI strings for config flow
│   ├── voice_assistant.py              # Voice intent handlers
│   ├── websocket_api.py                # WebSocket command handlers (16 commands)
│   ├── frontend/
│   │   ├── entity-manager-panel.js     # Custom web component UI (~9,600 lines)
│   │   └── entity-manager-panel.css    # External stylesheet (~2,500 lines)
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
| `websocket_api.py` | 16 WebSocket handlers covering entity ops, registry access, YAML management |
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
7. **Keyboard Shortcuts**: Ctrl+Z (undo), Ctrl+Y (redo), Ctrl+E (export), Ctrl+G (grouping), Ctrl+B (sidebar)

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

All 16 commands require admin privileges via `@websocket_api.require_admin`.

### Data Retrieval Commands

| Command | Parameters | Description |
|---------|------------|-------------|
| `entity_manager/get_disabled_entities` | `state: "disabled"\|"enabled"\|"all"` | Entities grouped by integration/device |
| `entity_manager/export_states` | _(none)_ | Export all entities to JSON |
| `entity_manager/get_automations` | _(none)_ | List automations with trigger context |
| `entity_manager/get_template_sensors` | _(none)_ | List template entities with connections |
| `entity_manager/get_entity_details` | `entity_id: string` | Full entity metadata from all registries |
| `entity_manager/get_config_entry_health` | _(none)_ | Unhealthy/failed config entries |
| `entity_manager/get_areas_and_floors` | _(none)_ | Area and floor hierarchy |
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
| `entity_manager/remove_entity` | `entity_id: string` | Remove entity from registry |

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

All state is persisted to `localStorage`. Key properties on the `EntityManagerPanel` instance:

| Property | localStorage Key | Description |
|----------|-----------------|-------------|
| `this.data` | _(in-memory)_ | Raw entity data from WebSocket |
| `this.expandedIntegrations` | `em_expandedIntegrations` | Collapsed/expanded integration sections |
| `this.expandedDevices` | `em_expandedDevices` | Collapsed/expanded device sections |
| `this.selectedEntities` | _(in-memory)_ | Current checkbox selections |
| `this.searchTerm` | `em_searchTerm` | Active search string |
| `this.viewState` | `em_viewState` | `"all"`, `"enabled"`, or `"disabled"` |
| `this.selectedDomain` | `em_selectedDomain` | Active domain filter |
| `this.favorites` | `em_favorites` | Favorited entity IDs |
| `this.entityTags` | `em_entityTags` | Custom `#tagname` annotations |
| `this.entityAliases` | `em_entityAliases` | Non-destructive display name overrides |
| `this.activityLog` | `em_activityLog` | Last 100 operations |
| `this.undoStack` | `em_undoStack` | Up to 50 undo steps |
| `this.redoStack` | `em_redoStack` | Up to 50 redo steps |
| `this.customThemes` | `em_customThemes` | User-created themes |
| `this.activeTheme` | `em_activeTheme` | Active theme name |
| `this.filterPresets` | `em_filterPresets` | Saved filter combinations |
| `this.visibleColumns` | `em_visibleColumns` | Column visibility toggles |
| `this.smartGroupsEnabled` | `em_smartGroupsEnabled` | Whether smart grouping is on |
| `this.smartGroupMode` | `em_smartGroupMode` | `"integration"`, `"area"`, `"type"`, `"device"` |
| `this.floorsData` | `em_floorsData` | Cached HA floor/area hierarchy |
| `this.labelsCache` | `em_labelsCache` | Cached HA label registry |
| `this.entityOrder` | `em_entityOrder` | Custom drag-and-drop entity ordering |

### Key Frontend Methods

| Method | Description |
|--------|-------------|
| `loadData()` | Fetch entity data via WebSocket, refresh view |
| `updateView()` | Apply filters/search/grouping and re-render entity list |
| `render()` | Full component re-render (use sparingly) |
| `bulkEnable()` / `bulkDisable()` | Execute bulk operations on `selectedEntities` |
| `showEntityDetails(entityId)` | Open entity detail dialog |
| `applyTheme(themeName)` | Switch active theme |
| `saveToUndo()` | Push current state to undo stack before mutations |

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
- The panel is a single-file web component (9,600+ lines) — use Ctrl+F to navigate
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

```javascript
// Always call before any state-changing operation
this.saveToUndo();
// ... perform mutation ...
await this.loadData();
```

## Important Files Deep-Dive

### `__init__.py` (Entry Point)
- `async_setup()`: Registers frontend JS/CSS resources at `/api/entity_manager/frontend`
- `async_setup_entry()`: Registers WebSocket API, voice intents, services, and sidebar panel
- `async_unload_entry()`: Cleanup on unload
- Panel registered via `frontend.async_register_built_in_panel()` with `require_admin=True`

### `websocket_api.py` (Backend Logic, ~1,041 lines)
- All 16 command handlers live here
- `async_setup_ws_api(hass)` registers all commands — **this is the only registration point**
- Helper `_resolve_trigger_context()` tracks human/automation/system trigger sources
- `enable_entity()` / `disable_entity()` are standalone async helpers called by both single and bulk handlers
- Bulk handlers iterate with per-item error handling and return `{"succeeded": [...], "failed": [...]}`

### `entity-manager-panel.js` (Frontend UI, ~9,600 lines)
- Single `EntityManagerPanel` custom element class
- `connectedCallback()` → bootstraps state from localStorage, attaches shadow DOM, calls `loadData()`
- `set hass(value)` → called by HA on every state change; used to update `this.hass` reference
- Theme system: 4 built-in themes (`default`, `dark`, `high-contrast`, `oled`) + arbitrary custom themes
- Smart grouping: toggled per-session, modes = `integration` / `area` / `type` / `device`
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
2. **Bulk operations** — test with > 100 entities; verify `succeeded`/`failed` reporting
3. **Search** — matches entity ID, display name, device name, integration name
4. **Smart grouping** — test all 4 modes (Integration, Room/Area, Type, Device Name)
5. **Undo/Redo** — perform mutations and verify undo restores previous state
6. **Themes** — apply each built-in theme; create/import/export a custom theme
7. **YAML updater** — run with `dry_run: true` first, verify preview, then apply
8. **Empty states** — no disabled entities, no entities at all, no HACS
9. **Admin gate** — non-admin users must be blocked at every WebSocket command
10. **Browser cache** — confirm frontend resource URL includes a cache-busting mechanism

## Version Information

- **Current Version**: 2.10.0
- **Minimum Home Assistant**: 2024.1.0
- **IoT Class**: `calculated`
- **HACS Compatible**: Yes
- **Config Flow**: Yes (required for panel registration)

## Git Workflow

- Main development branch specified in task context
- Commit messages should be descriptive and reference the feature/fix
- Push changes to the designated feature branch (`claude/` prefix)
- Version bumps live in `manifest.json` and `package.json`

## Troubleshooting

### Common Issues

1. **Panel not showing**: Confirm integration is added via Settings → Integrations; check `require_admin`
2. **403 / WebSocket errors**: User must have admin privileges
3. **Frontend not updating**: Hard-refresh (Ctrl+Shift+R); check browser console for JS errors
4. **Services not registering**: Check HA logs at startup for `custom_components.entity_manager` errors
5. **Bulk op partially failing**: Normal — returns `{"succeeded": [...], "failed": [...]}` for per-entity errors
6. **YAML updater not finding files**: HA config directory path may vary; check `hass.config.config_dir`

### Debug Logging

Add to Home Assistant `configuration.yaml`:
```yaml
logger:
  default: info
  logs:
    custom_components.entity_manager: debug
```

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
- In JS, always call `saveToUndo()` before any mutating operation
- Use HA CSS variables (`var(--primary-color)`, `var(--card-background-color)`, etc.) for all colors
- Prefer `this.hass.callWS()` over `this.hass.callService()` for entity manager operations
