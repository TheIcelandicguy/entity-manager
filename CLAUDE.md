# CLAUDE.md - AI Assistant Guide for Entity Manager

This document provides comprehensive guidance for AI assistants working with the Entity Manager codebase.

## Project Overview

**Entity Manager** is a custom Home Assistant integration that provides a centralized interface for managing disabled and enabled entities across all integrations and devices. It solves the common pain point of navigating through multiple settings pages to manage entities.

### Key Value Proposition
- Bulk enable/disable entities in seconds instead of minutes
- Organized tree view by Integration → Device → Entity
- Search and filter capabilities across all entities
- Voice assistant support for hands-free control

## Repository Structure

```
entity-manager/
├── custom_components/entity_manager/   # Main integration code
│   ├── __init__.py                     # Entry point, service registration, panel setup
│   ├── config_flow.py                  # UI-based configuration flow
│   ├── const.py                        # Constants (DOMAIN)
│   ├── manifest.json                   # Integration metadata
│   ├── services.py                     # Service definitions (alternative implementation)
│   ├── services.yaml                   # Service schema for HA UI
│   ├── strings.json                    # UI strings for config flow
│   ├── voice_assistant.py              # Voice intent handlers
│   ├── websocket_api.py                # WebSocket command handlers
│   ├── frontend/
│   │   └── entity-manager-panel.js     # Custom web component UI (~720 lines)
│   └── translations/
│       └── en.json                     # English translations
├── sentences/en/
│   └── entity_manager.yaml             # Voice assistant sentence patterns
├── hacs.json                           # HACS configuration
├── info.md                             # HACS info page
├── README.md                           # User documentation
├── INSTALL.md                          # Installation guide
├── QUICKSTART.md                       # Quick reference
├── STRUCTURE.md                        # Code structure documentation
├── PROJECT_SUMMARY.md                  # Project overview
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
Entity Registry / Device Registry
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| `__init__.py` | Integration setup, service registration, sidebar panel registration |
| `config_flow.py` | Handle UI-based integration setup |
| `websocket_api.py` | WebSocket commands for entity operations |
| `voice_assistant.py` | Intent handlers for voice commands |
| `entity-manager-panel.js` | Complete frontend UI as a custom element |

## Key Patterns and Conventions

### Python Code Style

1. **Async/Await**: All HA interactions use async patterns
2. **Entity Registry**: Access via `er.async_get(hass)`
3. **Logging**: Use module-level `_LOGGER = logging.getLogger(__name__)`
4. **Error Handling**: Wrap registry operations in try/except blocks
5. **Type Hints**: Use Python type hints (e.g., `dict[str, Any]`)

### JavaScript Code Style

1. **Vanilla JS**: No frameworks - pure ES6+ JavaScript
2. **Web Components**: `EntityManagerPanel extends HTMLElement`
3. **State Management**: Instance properties (`this.data`, `this.selectedEntities`)
4. **HA Integration**: Access `this.hass.callWS()` for WebSocket calls
5. **Styling**: CSS-in-JS using template literals, HA CSS variables

### Home Assistant Conventions

1. **Domain**: `entity_manager` (used consistently across all files)
2. **Services**: `entity_manager.enable_entity`, `entity_manager.disable_entity`
3. **WebSocket Types**: `entity_manager/get_disabled_entities`, `entity_manager/enable_entity`, etc.
4. **Admin Required**: All WebSocket commands use `@websocket_api.require_admin`

## WebSocket API Reference

### Commands

| Command | Parameters | Description |
|---------|------------|-------------|
| `entity_manager/get_disabled_entities` | `state: "disabled"\|"enabled"\|"all"` | Fetch entities grouped by integration/device |
| `entity_manager/enable_entity` | `entity_id: string` | Enable a single entity |
| `entity_manager/disable_entity` | `entity_id: string` | Disable a single entity |
| `entity_manager/bulk_enable` | `entity_ids: string[]` | Enable multiple entities |
| `entity_manager/bulk_disable` | `entity_ids: string[]` | Disable multiple entities |

### Response Structure (get_disabled_entities)

```python
[
    {
        "integration": "shelly",
        "devices": {
            "device_id": {
                "device_id": "abc123",
                "entities": [
                    {
                        "entity_id": "sensor.shelly_power",
                        "platform": "shelly",
                        "device_id": "abc123",
                        "disabled_by": "user",  # or "integration", "config_entry"
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

## Development Workflow

### Local Development

1. Edit files in `custom_components/entity_manager/`
2. Copy to Home Assistant's `custom_components` directory
3. Restart Home Assistant
4. Clear browser cache (for frontend changes)
5. Test changes in the Entity Manager panel

### Making Backend Changes

- **Add WebSocket command**: Edit `websocket_api.py`, add handler with decorators
- **Add service**: Edit `__init__.py` service registration, update `services.yaml`
- **Add voice intent**: Edit `voice_assistant.py`, add patterns to `sentences/en/entity_manager.yaml`

### Making Frontend Changes

- Edit `custom_components/entity_manager/frontend/entity-manager-panel.js`
- The panel is a single-file web component
- Uses Home Assistant theme CSS variables for styling
- Clear browser cache after changes

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
    # Implementation
    connection.send_result(msg["id"], {"success": True})

# Register in async_setup_ws_api():
websocket_api.async_register_command(hass, handle_new_command)
```

### Modifying Entity State

```python
# Enable entity
entity_reg.async_update_entity(entity_id, disabled_by=None)

# Disable entity
entity_reg.async_update_entity(
    entity_id,
    disabled_by=er.RegistryEntryDisabler.USER
)
```

### Frontend WebSocket Call

```javascript
// In entity-manager-panel.js
const result = await this.hass.callWS({
    type: 'entity_manager/enable_entity',
    entity_id: 'sensor.example',
});
```

## Important Files to Understand

### `__init__.py` (Entry Point)
- `async_setup()`: Basic component setup
- `async_setup_entry()`: Config entry setup, registers services and panel
- `async_unload_entry()`: Cleanup on unload
- Registers sidebar panel using `frontend.async_register_built_in_panel()`

### `websocket_api.py` (Backend Logic)
- Core business logic for entity operations
- Groups entities by platform (integration) and device
- Handles bulk operations with success/failure tracking

### `entity-manager-panel.js` (Frontend UI)
- `EntityManagerPanel` class extending `HTMLElement`
- State: `data`, `deviceInfo`, `expandedIntegrations`, `expandedDevices`, `selectedEntities`, `searchTerm`, `viewState`
- Key methods: `loadData()`, `updateView()`, `render()`, `bulkEnable()`, `bulkDisable()`

## Testing Considerations

1. **Test with multiple integrations** - Ensure grouping works correctly
2. **Test bulk operations** - Verify partial failures are handled
3. **Test search functionality** - Matches entity ID, name, device, integration
4. **Test with no disabled entities** - Empty state should display properly
5. **Test admin requirement** - Non-admin users should be blocked
6. **Test browser cache** - Frontend changes require cache clear

## Version Information

- **Current Version**: 2.8.0
- **Minimum Home Assistant**: 2024.1.0
- **IoT Class**: calculated
- **HACS Compatible**: Yes

## Git Workflow

- Main development branch specified in task context
- Commit messages should be descriptive and concise
- Push changes to the designated feature branch

## Troubleshooting

### Common Issues

1. **Panel not showing**: Check that integration is added via Settings → Integrations
2. **403 errors**: Ensure user has admin privileges
3. **Frontend not updating**: Clear browser cache, check console for JS errors
4. **Services not working**: Check Home Assistant logs for registration errors

### Debug Logging

Add to Home Assistant `configuration.yaml`:
```yaml
logger:
  default: info
  logs:
    custom_components.entity_manager: debug
```

## Extension Points

For adding new features, consider:

1. **Filtering options**: Modify `updateView()` in JS, add filter UI
2. **Export functionality**: Add new WebSocket command, button in toolbar
3. **Scheduling**: New backend service, UI for schedules, storage in HA
4. **Presets**: Save/load entity configurations
5. **Statistics**: Track enable/disable history

## Code Quality Guidelines

- Keep functions focused and single-purpose
- Handle errors gracefully with user feedback
- Use Home Assistant's entity/device registries, don't cache stale data
- Follow Home Assistant's async patterns
- Use CSS variables for theming compatibility
- Minimize DOM updates by batching changes
