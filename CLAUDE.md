#
 CLAUDE.md - AI Assistant Guide for Entity Manager

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
│   │   └── entity-manager-panel.js     # Custom web component UI (~10 000+ lines)
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
- State: `data`, `deviceInfo`, `expandedIntegrations`, `expandedDevices`, `selectedEntities`, `searchTerm`, `viewState`, `labeledEntitiesCache`, `labeledDevicesCache`, `labeledAreasCache`
- Key methods: `loadData()`, `updateView()`, `render()`, `bulkEnable()`, `bulkDisable()`, `updateSelectedCount()`
- Helper methods: `_collGroup()`, `_reAttachCollapsibles()`, `_renderManagedItem()`, `_renderMiniEntityCard()`, `_triggerBadge()`, `_fmtAgo()`, `_reRenderSidebar()`, `_loadFromStorage()`, `_saveToStorage()`, `_escapeHtml()`, `_escapeAttr()`
- Dialog methods: `createDialog()`, `_showActivityLogDialog()`, `_showSuggestionsDialog()`, `_showHelpGuide()`, `_showAreaPickerDialog()`, `_showFloorPickerDialog()`

### Entity Card Action Row (`icon-btn` pattern)
- Every entity card renders an `.entity-actions` row with `.icon-btn` buttons: Rename (✎), Enable (✓), Disable (✕), Bulk Rename (✎✎), Bulk Labels (🏷️)
- Bulk Rename uses CSS class `bulk-rename-btn` (blue, matches `--em-primary`); Bulk Labels uses `bulk-labels-btn` (amber, matches `--em-warning`)
- Both bulk buttons are **always rendered** but carry the `disabled` attribute when `selectedEntities.size < 2`
- `updateSelectedCount()` flips `disabled` on all `[data-action="bulk-rename"]` and `[data-action="bulk-labels"]` elements in real time — no full re-render needed
- Disabled state styled via `.icon-btn:disabled` CSS rule: `opacity:0.4`, `cursor:not-allowed`, muted border/color
- Additional `.icon-btn` variants: `entity-config-url` (external link, opens config URL in new tab), `toggle-entity` / `toggle-entity.toggle-on` (on/off toggle with active state color)
- Labels: `_loadLabeledEntities()`, `_loadLabeledDevices()`, `_loadLabeledAreas()`, `_renderLabelsList()`
- No custom tags — uses HA native Labels exclusively

## Testing Considerations

1. **Test with multiple integrations** - Ensure grouping works correctly
2. **Test bulk operations** - Verify partial failures are handled
3. **Test search functionality** - Matches entity ID, name, device, integration
4. **Test with no disabled entities** - Empty state should display properly
5. **Test admin requirement** - Non-admin users should be blocked
6. **Test browser cache** - Frontend changes require cache clear

## Version Information

- **Current Version**: 2.13.0
- **Minimum Home Assistant**: 2024.1.0
- **IoT Class**: local_push
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

### Button Styling Rules
- **Always use CSS classes for button appearance — never inline `style` for colors, borders, or sizing.**
- Action row buttons use the `.icon-btn` base class (`padding:8px 12px; font-size:1.25em; border-radius:8px; border:2px solid var(--em-border)`).
- Each button variant gets its own CSS class that sets `color` and `border-color` (e.g. `.rename-entity` → primary, `.enable-entity` → success, `.disable-entity` → danger, `.bulk-rename-btn` → primary, `.bulk-labels-btn` → warning).
- Add a matching `:hover` rule per variant using `background` + `color:white`.
- Disabled state is handled globally by `.icon-btn:disabled` — do **not** duplicate `opacity`/`cursor` inline.
- Sidebar action items that depend on selection state are dimmed via `opacity`/`pointerEvents` in `updateSelectedCount()`, not in the template HTML.
- **When the user points to any existing button that uses inline styles or non-standard classes, treat it as a refactor request: move its appearance to a named CSS class in `entity-manager-panel.css`, remove the inline styles from the JS template, and add a `:hover` rule. Do this proactively without waiting to be explicitly told to "fix" it.**

### UI Styling Conventions (established v2.10.0)

These conventions define the visual language of the panel. All new UI must follow them.

#### Entity Cards (`.entity-item`)
- Dark header band (`.entity-card-header`): device name left, state chip right, time-ago far right
- State chip (`.entity-header-state`): `font-size:13px; font-weight:600; border:2px solid var(--em-primary); border-radius:6px; padding:3px 10px` — prominent and readable
- Body (`.entity-card-body`): entity ID large + bold on top, platform chip below, action row at the bottom
- Action row uses `.icon-btn` buttons; each variant has its own named CSS class

#### Dialog Mini Cards (inside `.em-entity-detail`)
- Same `.entity-item` / `.entity-card-header` / `.entity-card-body` structure as main entity cards but compact
- Grid: `flex: 1 1 160px; min-width: 140px` inside a `display:flex; flex-wrap:wrap; gap:8px` container for 3-column layout
- Header: label chip (type/category) + value or state chip; body: descriptive text, IDs, or numeric values
- Use the `row(label, value)` helper pattern when building sections in `_showEntityDetailsDialog`

#### Device Cards (`.device-item`)
- Header (`.device-header`): **[checkbox] [chevron] [name] [type badge] [entity count] [bulk actions] [area button]** — exact order for both integration view and devices view
- **Select all checkbox** (`.device-select-label` + `.device-select-checkbox`): before the chevron; click propagation stopped via `e.target.closest('.device-select-label')` guard in the header click handler; change handler calls `updateSelectedCount()` + `_updateDeviceSelectionIndicators()`
- Category chip (`.device-cat-chip .cat-*`): coloured border/text using `var(--em-*)` variables; no filled background
- Chip colours: Controls/Connectivity = `--em-success`; Sensors/Configuration = `--em-primary`; Diagnostic = `--em-warning`
- Entity list inside expands/collapses via CSS `display:none` toggle, chevron rotates via `.expanded` class

#### Device Header Buttons (integration view headers + device card headers)
All buttons in device/integration headers share the same **outlined secondary style** — transparent background, coloured border + text, fills solid on hover. Never use solid-filled background for header-level action buttons.

| Button | Class(es) | Colour |
|--------|-----------|--------|
| View Enabled | `.btn.btn-secondary.view-integration-enabled` / `.view-device-enabled` | `--em-success` border+text |
| View Disabled | `.btn.btn-secondary.view-integration-disabled` / `.view-device-disabled` | `--em-danger` border+text |
| Enable All | `.device-enable-all` | `--em-success` outlined → fills on hover |
| Disable All | `.device-disable-all` | `--em-danger` outlined → fills on hover |
| Assign Area | `.em-assign-btn.device-assign-area-btn` | `--em-primary` outlined → fills on hover; `.no-area` uses `opacity:0.6` but keeps blue border |

- All header buttons use `padding:10px 20px; font-size:18px; font-weight:600; border-radius:10px` — matches `.btn` base size
- **Never use solid-filled backgrounds on header action buttons** — outlined only
- The `.device-assign-area-btn` CSS overrides the base `.em-assign-btn` solid-fill style; do not revert it to solid in device header contexts

#### Per-Device / Per-Integration State Filters
- `this.integrationViewFilter[integrationId]` — `'enabled' | 'disabled' | undefined` per integration
- `this.deviceViewFilter[deviceId]` — `'enabled' | 'disabled' | undefined` per device (devices view)
- Filter applied as CSS class `em-filter-enabled` / `em-filter-disabled` on the container element
- CSS rules: `.em-filter-enabled .entity-item[data-disabled="true"] { display:none }` and vice versa
- Toggle by clicking the active button again; expand the container immediately; apply class directly to DOM without full re-render

#### "View Selected" Mode
- Triggered by sidebar "View Selected" action (`data-action="view-selected"`); sets `this._viewingSelected = true`
- `updateView()` intercepts early: collects selected entities from `this.data`, renders them grouped by integration via `renderIntegration()`
- Blue banner at top: `.em-view-selected-banner` with count + "✕ Exit" button (`.em-view-selected-exit`)
- Cleared when: filter button clicked, "Deselect All" clicked, exit button clicked, or selection becomes empty
- All normal entity card actions work inside this view

#### Category Card Pattern (`.em-cat-card-toggle`)
- Category cards share `.device-header` but also carry `.em-cat-card-toggle` class
- **Critical**: The standard `.device-header` click listener MUST use selector `.device-header:not(.em-cat-card-toggle)` to avoid double-firing
- Category card toggle is pure DOM only (no `updateView()`) — this prevents sibling cards from resetting on click
- Same rule applies to `_updateDeviceSelectionIndicators` selector
- Bulk enable/disable on category cards uses `data-entity-ids` (comma-separated) instead of `data-device`

#### Collapsible Sections (`_collGroup` / `_reAttachCollapsibles`)
- Use `_collGroup(label, bodyHtml)` for all expandable dialog sections — never inline the chevron + toggle pattern
- Sections default to **collapsed**; listener is attached once after `createDialog()` via `_reAttachCollapsibles(root)`
- After `_reAttachCollapsibles`, always expand the first section: query `.em-group-body` and `.em-collapse-arrow, .em-collapsible-icon`, set `display = ''` and `transform = ''`
- Chevron: SVG `<polyline points="6 9 12 15 18 9"/>` (down), rotates to right when collapsed
- `_reAttachCollapsibles(root, { expand = false, selector } = {})` — wires click-toggle listeners onto all `.em-collapsible` headers within `root`; pass `{ expand: true }` to force all sections open (used in Suggestions dialog); pass `{ selector: '.custom-class' }` to target a different header class

#### Dialogs (`.em-dialog`)
- Close button always uses `border: 2px solid var(--em-primary)` (blue)
- Section headers use `.em-section-header` with `.em-collapsible-icon` boxed chevron
- Content areas use `display:flex; flex-wrap:wrap; gap:8px` for card grids, `padding:8px 0` container
- `createDialog({ title, color, contentHtml, actionsHtml, extraClass, searchPlaceholder })` — pass `searchPlaceholder` to render an `<input id="em-stat-search">` in the **header** (always visible, never scrolls); do not inject a search input inside `contentHtml`
- `_showAreaPickerDialog(title, onSelect)` — groups areas by floor, collapsible; "＋ New area" button
- `_showFloorPickerDialog(title, onAreaSelect)` — two-step: pick floor → pick area within floor (auto-assigns when floor has 1 area); uses `this.floorsData` lazy cache

#### Chips
- **State chip**: `--em-primary` border, `font-size:13px`, `font-weight:600` — for entity/state display
- **Type/category chip**: `font-size:10px; text-transform:uppercase; letter-spacing:0.5px` — for labels like "sensor", "config", etc.
- **Platform chip** (`.entity-platform`): muted `--em-text-secondary` color, small font

#### Entity Detail Dialog Specifics
- Entity ID in dialog body: `font-size:12px; opacity:0.8; font-family:monospace` — monospace, slightly muted
- Section headers use `.entity-list-group-title` with `border:2px solid var(--em-primary); border-radius:8px` — full blue box, no border-bottom-only
- Do NOT add `border-bottom-color` overrides on `.entity-list-group-title` in theme rules — it breaks the full border

#### Mobile / Responsive Rules
- Three breakpoints: **768px** (tablet), **600px** (medium phone), **480px** (small phone)
- Stat cards: `repeat(3, 1fr)` at both 768px and 480px — always 3 per row
- Device entity list: 1-column at ≤600px — must be placed **after** the base `grid-template-columns: 1fr 1fr` rule in the CSS file (cascade order matters)
- Device headers: `flex-wrap:wrap` + `order:10/11` on bulk actions / area button at ≤768px so they move to a second line
- Dialog CSS vars (`--dialog-header-padding`, `--dialog-content-padding`, `--dialog-actions-padding`) must be overridden inside `:root {}` in each media query — they are not responsive by default
- Touch targets: `min-width:36px; min-height:36px` on `.icon-btn` at ≤480px
- Any new base CSS rule that needs a mobile override must be added **after** the existing media query blocks, or the override will be silently ignored due to cascade order

#### Stat Dialog Mini Cards (`.em-mini-card`)
- Rendered by `_renderMiniEntityCard(opts)` — the **single source of truth** for all stat dialog item rows; never build a custom entity row in a stat dialog
- Wrapper classes: `entity-item entity-list-item em-mini-card [extraClass]` — dual class ensures `btn.closest('.entity-list-item')` selectors in existing listeners still work
- Parameters: `entity_id`, `name`, `state`, `stateColor`, `timeAgo`, `infoLine`, `actionsHtml`, `checkboxHtml`, `extraClass`, `navigatePath`
- Actions row: `.em-mini-card-actions` div — `display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end; border-top:1px solid var(--em-border); padding:5px 10px 8px`

#### Mini Card Link Button (`.em-mini-card-link`)
- Lives inside `.entity-card-header` as the last child on every mini card
- Appearance: `border:2px solid var(--em-primary); color:var(--em-primary); border-radius:6px; padding:3px 8px; font-size:15px`
- Hover: fills `var(--em-primary)` background with `color:#fff`
- Navigation logic lives in the `createDialog()` overlay click listener — two modes controlled by which data-attribute is set:
  - `data-open-path="/config/…"` → `history.pushState` + `location-changed` event (navigates in HA SPA)
  - `data-open-entity="domain.id"` → fires `hass-more-info` CustomEvent (opens HA entity popup)
- `navigatePath` param selects the mode in `_renderMiniEntityCard()`:
  - Automations: `/config/automation/edit/${attrs.id}` (numeric unique_id from state attributes)
  - Scripts: `/config/script/edit/${entity_id.split('.')[1]}` (object_id — always available)
  - All others: omit `navigatePath` → falls back to `hass-more-info`

#### Suggestions Dialog Section Tinting (`.em-sug-section`)
- Each `_collGroup()` block is wrapped: `<div class="em-sug-section em-sug-[type]">…</div>`
- Five types and their accent colours (used in `background` + `border-color`):
  - `em-sug-health`  → purple  `rgb(156,39,176)` / `rgba(156,39,176,0.15)`
  - `em-sug-disable` → neutral (no tint — matches base theme colours)
  - `em-sug-naming`  → orange  `rgb(255,152,0)` / `rgba(255,152,0,0.10)`
  - `em-sug-area`    → red     `rgb(244,67,54)` / `rgba(244,67,54,0.10)`
  - `em-sug-labels`  → yellow  `rgb(255,235,59)` / `rgba(255,235,59,0.15)`
- CSS descendant selectors target: `.entity-list-group-title` (header), `.em-group-body` (body), `.em-naming-device-group` (device box border), `.em-naming-device-toggle` (toggle border-bottom), `.em-collapsible-icon` (chevron), `.em-sug-row` (entity row border)
- Suggestions dialog width: `.confirm-dialog-box.em-suggestions { max-width:720px }`
