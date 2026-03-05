# CLAUDE.md - AI Assistant Guide for Entity Manager

This document provides comprehensive guidance for AI assistants working with the Entity Manager codebase.

## Project Overview

**Entity Manager** is a custom Home Assistant integration that provides a centralized panel for managing, inspecting, and bulk-operating on all entities across every integration and device. It goes far beyond simple enable/disable — it is a full entity management workbench.

### Key Value Proposition
- Bulk enable/disable entities in seconds instead of minutes
- Organized tree view by Integration → Device → Entity (or by Room, Floor, Type)
- Entity detail dialog with live controls, history, logbook, automations, statistics
- Area/room assignment for devices and entities
- Smart suggestions: health issues, disable candidates, naming problems, unassigned devices
- Search, filter, label, and preset capabilities across all entities

## Repository Structure

```
entity-manager/
├── custom_components/entity_manager/   # Main integration code
│   ├── __init__.py                     # Entry point, service registration, panel setup
│   ├── config_flow.py                  # UI-based configuration flow
│   ├── const.py                        # Constants (DOMAIN)
│   ├── manifest.json                   # Integration metadata
│   ├── services.py                     # Service definitions
│   ├── services.yaml                   # Service schema for HA UI
│   ├── strings.json                    # UI strings for config flow
│   ├── voice_assistant.py              # Voice intent handlers
│   ├── websocket_api.py                # WebSocket command handlers
│   ├── frontend/
│   │   ├── entity-manager-panel.js     # Custom web component UI (large single-file)
│   │   └── entity-manager-panel.css    # Extracted CSS (loaded separately)
│   └── translations/
│       └── en.json                     # English translations
├── sentences/en/
│   └── entity_manager.yaml             # Voice assistant sentence patterns
├── hacs.json                           # HACS configuration
├── info.md                             # HACS info page
├── README.md                           # User documentation
├── CHANGELOG.md                        # Version history
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
| `__init__.py` | Integration setup, service registration, sidebar panel registration |
| `config_flow.py` | Handle UI-based integration setup |
| `websocket_api.py` | WebSocket commands for entity operations |
| `voice_assistant.py` | Intent handlers for voice commands |
| `entity-manager-panel.js` | Complete frontend UI as a custom element |
| `entity-manager-panel.css` | All panel styles (loaded via resource registration) |

## Key Patterns and Conventions

### Python Code Style

1. **Async/Await**: All HA interactions use async patterns
2. **Entity Registry**: Access via `er.async_get(hass)`
3. **Logging**: Use module-level `_LOGGER = logging.getLogger(__name__)`
4. **Error Handling**: Wrap registry operations in try/except blocks
5. **Type Hints**: Use Python type hints (e.g., `dict[str, Any]`)

### JavaScript Code Style

1. **Vanilla JS**: No frameworks — pure ES6+ JavaScript
2. **Web Components**: `EntityManagerPanel extends HTMLElement`
3. **State Management**: Instance properties (see State Properties below)
4. **HA Integration**: `this._hass.callWS()` for WebSocket, `this._hass.callService()` for services
5. **Styling**: Separate CSS file + HA CSS variables (`--em-*` custom properties) — never hardcode hex colors
6. **Dialog pattern**: `this.createDialog({ title, contentHtml, actionsHtml })` → `{ overlay, closeDialog }`
7. **Collapsible groups**: `this._collGroup(label, bodyHtml)` — collapsed by default
8. **Dialog buttons**: always use `.btn` CSS classes — never inline `style=` on buttons (see Dialog Conventions below)

### Home Assistant Conventions

1. **Domain**: `entity_manager` (used consistently across all files)
2. **Services**: `entity_manager.enable_entity`, `entity_manager.disable_entity`
3. **WebSocket Types**: `entity_manager/get_disabled_entities`, etc.
4. **Admin Required**: All WebSocket commands use `@websocket_api.require_admin`

## WebSocket API Reference

### Custom Commands (entity_manager/*)

| Command | Parameters | Description |
|---------|------------|-------------|
| `entity_manager/get_disabled_entities` | `state: "disabled"\|"enabled"\|"all"` | Fetch entities grouped by integration/device |
| `entity_manager/enable_entity` | `entity_id: string` | Enable a single entity |
| `entity_manager/disable_entity` | `entity_id: string` | Disable a single entity |
| `entity_manager/bulk_enable` | `entity_ids: string[]` | Enable multiple entities |
| `entity_manager/bulk_disable` | `entity_ids: string[]` | Disable multiple entities |
| `entity_manager/get_entity_details` | `entity_id: string` | Full entity details (registry, device, area, labels, config entry) |
| `entity_manager/get_automations` | — | Automations list with last_triggered + triggered_by user |
| `entity_manager/get_areas_and_floors` | — | Areas grouped by floor (cached in `this.floorsData`) |
| `entity_manager/get_config_entry_health` | — | Config entries in error states |
| `entity_manager/update_yaml_references` | `old_id, new_id, dry_run?` | Update entity_id references in YAML files |
| `entity_manager/rename_entity` | `entity_id, new_id` | Rename entity_id in registry |

### Native HA Commands Used

| Command | Used for |
|---------|----------|
| `config/entity_registry/list` | Area data, label data for suggestions/detail |
| `config/device_registry/list` | Device area data |
| `config/device_registry/update` | Assign device to area |
| `config/entity_registry/update` | Assign entity to area, update labels |
| `config/automation/list` | Find automations referencing an entity |
| `history/history_during_period` | State history (entity detail, last-seen unavailable) |
| `logbook/get_events` | Logbook entries in entity detail |
| `recorder/statistics_during_period` | Long-term statistics in entity detail |
| `lovelace/config` | Dashboard config (Lovelace dialog) |

## Frontend State Properties

Key instance properties on `EntityManagerPanel`:

| Property | Type | Description |
|----------|------|-------------|
| `this.data` | Array | Entity data from `get_disabled_entities`, grouped by integration → device |
| `this._hass` | Object | Home Assistant connection object |
| `this.viewState` | string | `'all'` \| `'disabled'` \| `'enabled'` \| `'updates'` |
| `this.smartGroupMode` | string | `'integration'` \| `'room'` \| `'floor'` \| `'type'` \| `'device-name'` |
| `this.searchTerm` | string | Current search filter |
| `this.selectedEntities` | Set | Currently selected entity IDs |
| `this.expandedIntegrations` | Set | Integration names with expanded device list |
| `this.expandedDevices` | Set | Device IDs with expanded entity list |
| `this.floorsData` | Object\|null | Cached `{ floors, areas }` — set to `null` after area updates |
| `this.favorites` | Set | Favorited entity IDs (localStorage) |
| `this.labelsCache` | Array | HA label objects |
| `this.labelViewMode` | string | `'entity'` \| `'device'` (sidebar labels section) |
| `this.activeTheme` | string | Current theme name (including `'Follow HA Theme'`) |

## Key Frontend Methods

| Method | Description |
|--------|-------------|
| `loadData()` | Fetch all entity data from backend, update stat counts |
| `updateView()` | Re-render the entity list based on current filters/grouping |
| `_reRenderSidebar()` | Rebuild sidebar HTML — always use instead of duplicating sidebar code |
| `_collGroup(label, bodyHtml)` | Render a collapsed group with toggle arrow |
| `createDialog({ title, contentHtml, actionsHtml })` | Create modal dialog, returns `{ overlay, closeDialog }` |
| `_showAreaPickerDialog(title, onSelect)` | Area picker grouped by floor; calls `onSelect(area_id)` |
| `_showEntityDetailsDialog(entityId)` | Full entity detail dialog with 10+ sections |
| `_showSuggestionsDialog()` | Analyze all entities, show 4-category suggestions |
| `_scrollToAndHighlight(entityId)` | Close dialog, expand group, scroll to entity, flash highlight 3s |
| `_showToast(msg, type)` | Show temporary toast notification |
| `showRenameDialog(entityId)` | Open rename dialog with dry-run YAML preview |
| `disableEntity(entityId)` / `enableEntity(entityId)` | Single entity enable/disable with undo |
| `_fmtAgo(isoStr, fallback)` | Format ISO timestamp as relative time ago |
| `_escapeHtml(s)` / `_escapeAttr(s)` | HTML-safe encoding |
| `_loadFromStorage(key, default)` / `_saveToStorage(key, val)` | localStorage I/O |
| `_applyHATheme()` | Read HA CSS vars and map to `--em-*` variables |

## Entity Detail Dialog Sections

Opened by clicking any entity card body. Sections:

1. **Overview** — entity ID, friendly name, domain, platform, unique ID, aliases (open by default)
2. **Current State** — large state value + all attributes (open by default)
3. **Registry** — category, device class, disabled/hidden state, icon, unit
4. **Device** — manufacturer, model, SW/HW version, serial, config URL
5. **Integration** — title, domain, source, version, state
6. **Area** — assigned area name and floor
7. **Labels** — entity and device labels with edit buttons
8. **State History** — last 30 days newest-first
9. **Quick Control** — domain-aware live controls (buttons, sliders, selects)
10. **Entity Picture** — shown when `entity_picture` attribute exists
11. **Automations (N)** — automations referencing this entity
12. **Related Entities** — other entities on the same device
13. **Logbook (last 7 days)** — 25 most recent logbook events
14. **Statistics (30 days)** — avg/min/max stat cards from recorder

Action buttons: **✎ Rename** · **↗ More Info** (hass-more-info event) · **🔌 Device** (navigate to device page) · **Enable/Disable** · **Done**

## Development Workflow

### Local Development

1. Edit files in `custom_components/entity_manager/`
2. Run `./sync-to-ha.ps1` (PowerShell) to copy to Z: drive (Home Assistant network share)
3. Restart HA for Python changes; clear browser cache for JS/CSS changes
4. Test in the Entity Manager sidebar panel

### Sync Script

```powershell
# sync-to-ha.ps1 — uses robocopy, exit code 1 = success (robocopy quirk)
```

### Making Backend Changes

- **Add WebSocket command**: Edit `websocket_api.py`, add handler with decorators, register in `async_setup_ws_api()`
- **Add service**: Edit `__init__.py` service registration, update `services.yaml`

### Making Frontend Changes

- Edit `entity-manager-panel.js` and/or `entity-manager-panel.css`
- Run sync script after each edit
- Clear browser cache after syncing

## Common Patterns

### Adding a New Stat Card

1. Add HTML to `statsEl.innerHTML` block: `<div class="stat-card clickable-stat" data-stat-type="mytype">…</div>`
2. Add handler in the `card.dataset.statType` if/else chain
3. Implement `_showMyTypeDialog()` method using `createDialog` + body update pattern

### Body Update Pattern (dialogs)

```javascript
const { overlay, closeDialog } = this.createDialog({ title, contentHtml: '<div id="my-body">Loading…</div>', actionsHtml: '…' });
// After async work:
const body = overlay.querySelector('.confirm-dialog-box > *:not(.confirm-dialog-header):not(.confirm-dialog-actions)');
body.innerHTML = `…new content…`;
// Wire collapsible toggles:
body.querySelectorAll('.em-collapsible').forEach(h => {
  h.addEventListener('click', () => {
    const b = h.nextElementSibling, arrow = h.querySelector('.em-collapse-arrow');
    const collapsed = b.style.display === 'none';
    b.style.display = collapsed ? '' : 'none';
    if (arrow) arrow.style.transform = collapsed ? '' : 'rotate(-90deg)';
  });
});
```

### Adding a New WebSocket Command

```python
# In websocket_api.py
@websocket_api.websocket_command({ vol.Required("type"): "entity_manager/new_command" })
@websocket_api.require_admin
@websocket_api.async_response
async def handle_new_command(hass, connection, msg):
    connection.send_result(msg["id"], {"success": True})

# Register in async_setup_ws_api():
websocket_api.async_register_command(hass, handle_new_command)
```

### Dialog Conventions

**Button classes** (defined in `entity-manager-panel.css`):

| Class | Use |
|---|---|
| `btn btn-primary` | Positive/submit action (Save, Rename, Apply, Enable All) |
| `btn btn-secondary` | Neutral dismiss or secondary action (Done, Cancel, Clear, Preview) |
| `btn btn-success` | Enable / confirm safe action |
| `btn btn-danger` | Delete / destructive action (Disable, Remove, Deregister) |
| `btn btn-warning` | Caution action (Clean up stale, etc.) |

**Rules:**
- Dismiss-only buttons always use label **"Done"** + `btn-secondary` — never "Close", never `btn-primary`
- Cancel buttons always use label **"Cancel"** + `btn-secondary`
- Destructive buttons use `btn-danger` — never inline `style="background:#..."`
- Never write inline `style=` on `<button>` elements; always use a `.btn-*` class

**`color` param on `createDialog`** — sets the dialog header accent stripe:

| Situation | Value |
|---|---|
| Info / neutral | `'var(--em-primary)'` |
| Success / healthy | `'var(--em-success)'` |
| Warning / stale / pending | `'var(--em-warning)'` |
| Error / destructive | `'var(--em-danger)'` |
| Helper / purple accent | `'var(--em-purple)'` |

**CSS variable reference** (all defined in `:root` in `entity-manager-panel.css`):

```
--em-primary / --em-primary-dark / --em-primary-light
--em-success / --em-success-dark
--em-danger  / --em-danger-dark
--em-warning / --em-warning-dark
--em-purple  / --em-purple-dark
--em-text-primary / --em-text-secondary / --em-text-disabled
--em-bg-primary / --em-bg-secondary / --em-bg-hover
--em-border / --em-border-light
--em-badge-builtin-bg / --em-badge-builtin-fg   (Lovelace built-in card badge)
--em-badge-custom-bg  / --em-badge-custom-fg    (Lovelace custom card badge)
```

Never hardcode hex colors anywhere in JS or inline styles — use the vars above.

### Area Picker

```javascript
this._showAreaPickerDialog('Dialog title', async (areaId) => {
  await this._hass.callWS({ type: 'config/device_registry/update', device_id: deviceId, area_id: areaId });
  this.floorsData = null; // Force refresh
  await this.loadData();
});
```

## Version Information

- **Current Version**: 2.10.0 (in development on `feat/v2.10.0` branch)
- **Last Release**: 2.9.2
- **Minimum Home Assistant**: 2024.1.0
- **HACS Compatible**: Yes

## Git Workflow

- Feature branches off `main`; squash-merge PRs (linear history required)
- After merge: create GitHub release, tag `vX.Y.Z`, target `main`
- GitHub username: **TheIcelandicguy**
- gh CLI not installed — create PRs manually at `github.com/TheIcelandicguy/entity-manager/compare`

## Troubleshooting

### Common Issues

1. **Panel not showing**: Check integration is added via Settings → Integrations
2. **403 errors**: Ensure user has admin privileges
3. **Frontend not updating**: Clear browser cache, check console for JS errors
4. **503 on card load**: Remove `?v=1` cache-busting param from resource registration
5. **Services not working**: Check Home Assistant logs for registration errors

### Debug

```javascript
// Browser console
customElements.get('entity-manager-panel')  // check registration
fetch('/local/entity-manager-panel.js').then(r => r.text()).then(t => console.log(t.length))
```

## Code Quality Guidelines

- Keep functions focused and single-purpose
- Handle errors gracefully — wrap `callWS` in `.catch(() => null)` for non-critical fetches
- Use `this._escapeHtml()` / `this._escapeAttr()` for all user-sourced strings in HTML
- Use `--em-*` CSS variables for all colors — never hardcode hex values anywhere in JS or inline styles (semantic colors like red=error, green=success are covered by `--em-danger`, `--em-success`, etc.)
- Set `this.floorsData = null` after any area registry update to force refresh
- Deduplicate device-level suggestions (use a `Set` of device_id)
- Always call `this._reRenderSidebar()` instead of duplicating the sidebar rebuild block
