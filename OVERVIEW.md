# Entity Manager — Project Overview

> A comprehensive overview of the **Entity Manager** Home Assistant custom integration
> (domain `entity_manager`, version **3.2.0**). Covers both user-facing behaviour and
> developer/architecture detail. Generated from the repository source.

## Table of Contents

1. [What It Is](#1-what-it-is)
2. [Key Features](#2-key-features)
3. [Installation & Configuration](#3-installation--configuration)
4. [Usage](#4-usage)
5. [Architecture](#5-architecture)
6. [WebSocket API & Services Reference](#6-websocket-api--services-reference)
7. [Data Flow — End to End](#7-data-flow--end-to-end)
8. [Development & Deployment](#8-development--deployment)
9. [Known Limitations & Roadmap](#9-known-limitations--roadmap)

---

## 1. What It Is

**Entity Manager** is a HACS-installable Home Assistant custom integration plus a
full-screen frontend admin panel that gives you a single place to **view, enable,
disable, rename, analyze, and bulk-manage every entity across all your integrations**
— along with device/area/label assignment, firmware/software updates, and housekeeping
tools. Instead of digging through per-device settings pages, you get a tree view
(Integration → Device → Entity), smart grouping, fuzzy search, bulk actions, an
undo/redo history, a theming engine, and a voice-assistant hook. It is admin-only
(every operation modifies the HA entity/device registry) and installs as a sidebar
panel titled **Entity Manager** (`mdi:tune`).

It fits in as an **admin/maintenance tool**: a superset of HA's built-in entity
settings, aimed at people running large systems (dozens of integrations, hundreds of
entities) who need to clean up, standardize, and audit their setup efficiently.

---

## 2. Key Features

### Entity Management
- Tree view organized by **Integration → Device → Entity**, alphabetically sorted.
- Enable/disable individual entities in one click; **bulk enable/disable up to 500** at once.
- Every integration and device row carries a **three-box header** (no expand needed):
  **Categories** (Controls/Sensors/Configuration/Diagnostic/Connectivity counts),
  **Hardware** (device-type counts: Hardware/Cloud/Virtual/Mobile/System/Unknown), and
  **Areas & Labels** (area/floor chips + deduped label rollup).
- Row actions collapsed into a compact **⋯ menu** (View Enabled/Disabled, Enable/Disable All, accent color).
- **Opt-in accent colors** per integration; **assignable & custom device types**.

### Renaming
- Click-to-rename any entity; the domain prefix (`sensor.`, `light.`…) is locked.
- **Automatic propagation** of the new entity ID across automations, scripts, and helpers (YAML reference updater).
- Conflict validation prevents duplicate IDs.
- **Bulk Rename** inline view: split entity picker + live-preview rename queue, with Find & Replace (regex + case-sensitive),
  CSV import/export, and a **Duplicate names** filter.
- **Rename a device** from the picker: it writes the device's name and queues its entity IDs and display names to follow,
  previewed first. The changes go through the rename queue rather than a second write path, so they keep its reference
  update, undo and per-entity reporting.
- **Reference rewriting** reaches YAML, storage dashboards, config entry data/options, persons, Assist pipelines and the
  **Energy dashboard preferences** — the last of these because energy sources are statistic IDs, which for a
  recorder-backed sensor is the entity ID, so a rename used to leave those circuits charting nothing.

### Search, Filtering & Grouping
- **Header filter pills**: the Categories / Hardware / Areas / Labels counts in an integration or device header are
  buttons. Same kind OR's, different kinds AND's; filters persist per browser and are summarised in a banner above the
  list, and the ⋯ menu can act on exactly what they show.
- **Fuzzy search**, text search, domain filter, state filter (All/Enabled/Disabled), integration filter, label filter.
- **Filter presets** (save/load filter combos) and entity-ID presets.
- **Grouping modes**: Integration (default), Room/Area, Type, Floor, Device Name, plus custom groups.

### Views & Dialogs
- **Devices view** — all devices with the same rich headers, device-type filter, offline-only toggle, same-name device merging.
- **Entity Detail dialog** — pinned hero (inline rename, colour-coded state pill, Toggle/Press) + five tabs: **Overview, Attributes, Registry, Related** (automation impact), **History**.
- **Last Activity Timeline** — recorder-backed "last active" timestamps in 15 domain sections, 9 time-range pills, live search.
- **Activity Log** — real HA state history grouped by Room → Device → Entity, time ranges 1h–7d.
- **Health & Cleanup** — unavailable / orphaned / stale entities, ghost devices, never-triggered automations, with Ignore/Restore.
- **Suggestions** — six colour-coded sections (Health Issues, Disable Candidates, Naming, Area, Area Mismatch, Label Suggestions across 21 semantic categories).
- **Automations/Scripts/Helpers**, **Templates**, **HACS Store**, **Card Types**, **Browsers** views.

### Names
- **Duplicate Names** card in Health & Cleanup: entities whose displayed name repeats their device name, fixed in bulk by
  setting a display name that carries the whole intended name. Entities whose own name *is* the device name, devices
  whose entities carry another device's name, and integration entries still titled after an old device are reported —
  the last of these fixable where an entry owns exactly one device.
- Entity cards label each name (Name / Entity / Device), mark a name set by hand, suggest one where a name is missing or
  merely repeats the device, and offer Undo straight after a rename.

### Cross-Cutting Tools
- **Undo / Redo** — up to 50 steps, combined timeline dialog, persisted to localStorage.
- **Notification Center** — persistent bell dropdown tracking device offline, state anomaly, entity enabled/disabled, and new-entity events (rate-limited, capped at 100).
- **Firmware/Software Update Manager** — sequential bulk updates with live SVG progress ring, stability/category filters, per-entity and global auto-backup.
- **Favorites**, **entity aliases** (non-destructive display names), **column customization**.
- **Export/Import** entity configurations and custom themes as JSON.
- **Theme system** — Refined design language with 5 built-in modes (Default/follow-HA, Light, Dark, High Contrast, OLED Black) + a custom theme editor (background images, per-theme light/dark).
- **Voice Assistant** — enable/disable entity by voice (admin-only).
- **Responsive** — three breakpoints (≤768/≤600/≤480px) tested on real Android phones.

---

## 3. Installation & Configuration

### Requirements
- **Home Assistant 2024.1.0 or later** (`hacs.json` / `manifest.json`).
- **Admin user account** — every operation modifies the entity/device registry; the panel is registered with `require_admin=True`.
- Modern ES6+ browser. Integration has **no Python `requirements`** (empty list in `manifest.json`).
- `manifest.json`: `integration_type: service`, `iot_class: calculated`, `config_flow: true`, `dependencies: ["frontend"]`.

### HACS (recommended)
1. HACS → Integrations → three-dot menu → **Custom repositories**.
2. Add `https://github.com/TheIcelandicguy/entity-manager` as an **Integration**, install, restart HA.

### Manual
1. Copy `custom_components/entity_manager` into your HA `custom_components` directory and restart.

### Config Flow
`config_flow.py` is a **single-step, no-options** flow (`async_step_user`). It sets a
unique ID (`DOMAIN`) via `async_set_unique_id` + `_abort_if_unique_id_configured()` so
the integration can only be added once, then creates the entry titled "Entity Manager".
There is no options flow (the `options` strings in `strings.json` are vestigial). After
adding it via **Settings → Devices & Services → Add Integration → Entity Manager**, the
panel appears in the sidebar.

---

## 4. Usage

- **Open the panel** from the HA sidebar ("Entity Manager", `mdi:tune`).
- **Manage entities**: expand an integration to see devices/entities; use the checkmark/X
  to enable/disable, or the ⋯ menu for Enable All / Disable All / View Enabled / View Disabled.
  Select multiple with checkboxes for bulk toolbar actions.
- **Rename**: pencil icon → edit (domain locked) → Rename; changes propagate through YAML.
- **Filter**: domain dropdown, search box, Enabled/Disabled/Updates pills, sidebar integration/label filters.
- **Updates**: Updates filter → narrow by stability/category → optionally check per-row Backup
  and confirm the HA auto-backup banner → Select All / pick rows → Update Selected (rows progress
  Queued → Active → ✓/✕).
- **Right-click** any entity (or multi-selection) for a full context menu (rename, enable/disable,
  favorites, labels, aliases, assign to area/device, copy ID, open in HA, delete).
- **Voice** (hands-free, admin-only): *"enable/disable/activate/deactivate entity {name}"*,
  *"registry enable/disable {name}"* — sentence patterns in `sentences/en/entity_manager.yaml`.

---

## 5. Architecture

```
Frontend (Vanilla-JS Web Component: entity-manager-panel.js)
        |  Home Assistant WebSocket (this.hass.callWS)
Backend (Python WebSocket API: websocket_api.py — 21 commands, all admin-gated)
        |
Home Assistant Core: Entity / Device / Area / Label registries, config entries, recorder DB
```

### Repository Layout
```
entity-manager/
├── custom_components/entity_manager/
│   ├── __init__.py            # Entry point: panel + resource/WS/service/intent registration
│   ├── config_flow.py         # Single-step UI config flow (no options)
│   ├── const.py               # DOMAIN, MAX_BULK_ENTITIES (500), VALID_ENTITY_ID regex
│   ├── manifest.json          # Integration metadata (v3.2.0, service, calculated)
│   ├── services.yaml          # enable_entity / disable_entity service schemas
│   ├── strings.json / en.json / translations/en.json  # UI + config-flow strings
│   ├── voice_assistant.py     # Enable/Disable voice intent handlers (admin-gated)
│   ├── websocket_api.py       # 21 WebSocket command handlers (~1,410 lines)
│   ├── frontend/
│   │   ├── entity-manager-panel.js   # Full UI web component (~16,100 lines)
│   │   ├── entity-manager-panel.css  # Stylesheet (~7,050 lines, all --em-* vars)
│   │   └── tests/                     # Vitest frontend tests + setup
│   └── brand/                  # Icons/logos
├── sentences/en/entity_manager.yaml  # Voice sentence patterns
├── tests/                     # Python pytest: test_const.py, test_websocket_api.py, conftest.py
├── .github/workflows/ci.yml   # CI pipeline
├── sync-to-ha.ps1             # Deploy repo → Z:\ HA config (robocopy)
└── docs: README.md, CLAUDE.md, STRUCTURE.md, DEVREF.md, QUICKSTART.md, INSTALL.md, CHANGELOG.md, PROJECT_SUMMARY.md
```

### Backend Modules

| Module | Responsibility |
|---|---|
| `const.py` | `DOMAIN = "entity_manager"`, `MAX_BULK_ENTITIES = 500`, and `VALID_ENTITY_ID` (`^[a-z][a-z0-9_]*\.[a-z0-9_]+$`) used to validate IDs before registry writes. |
| `__init__.py` | `async_setup_entry` registers the frontend static path (`/api/entity_manager/frontend`), the WebSocket API (`async_setup_ws_api`), voice intents (`async_setup_intents`), the two HA services, and the sidebar panel via `frontend.async_register_built_in_panel(..., require_admin=True)`. Services share an admin gate that mirrors the WS `require_admin`; system-initiated calls (no `user_id`) are allowed. `async_unload_entry` removes the panel + services. |
| `config_flow.py` | `EntityManagerConfigFlow` — single-step, unique-ID-guarded, no options. |
| `websocket_api.py` | All 21 admin-gated command handlers plus standalone helpers `enable_entity()` / `disable_entity()` (raise `ValueError` if missing), `_bulk_toggle()` (per-item error handling returning `{"success": [...], "failed": [...]}`), and `_resolve_trigger_context()` (classifies a state change as human/automation/system). Registered in `async_setup_ws_api()` — the single registration point. |
| `voice_assistant.py` | `EnableEntityIntentHandler` / `DisableEntityIntentHandler` — validate admin + `VALID_ENTITY_ID`, then call `entity_registry.async_update_entity(...)`. |

### Frontend Panel
A single `EntityManagerPanel` custom element (`extends HTMLElement`) in one ~16,100-line
file. `connectedCallback()` bootstraps state from `localStorage` and calls `loadData()`;
`set hass()` receives every HA state update. Core loop is `loadData()` → `updateView()`
(apply filters/search/grouping) → render. It uses an **inline-view system** (`_activeView`)
for full-screen views and a `createDialog()` helper for modals. All persistent user state
(favorites, themes, undo/redo, aliases, filters, columns, grouping, ignored suggestions,
device-type overrides, notifications, etc.) lives under `em-*` `localStorage` keys. All
colours come from `--em-*` CSS variables (never HA theme vars directly) so the theme engine
can override light/dark correctly.

### Backend ↔ Frontend Communication
The frontend talks to the backend purely over HA's WebSocket bus using
`this.hass.callWS({ type: 'entity_manager/...' })`. It also calls **native HA WS APIs**
directly for registry data (`config/area_registry/list`, `config/device_registry/list`,
`config/entity_registry/list`, `config/label_registry/list`, `history/history_during_period`)
and for service calls (`update.install`, `button.press`). Custom EM commands are reserved
for operations HA doesn't expose cleanly (grouped entity tree, YAML rewriting, recorder
queries, HACS scanning, config-entry health).

---

## 6. WebSocket API & Services Reference

All 21 WebSocket commands are decorated with `@websocket_api.require_admin` +
`@websocket_api.async_response`. Names below are the real `type` strings registered in
`async_setup_ws_api()`.

### Data-retrieval commands
| Command | Params | Description |
|---|---|---|
| `entity_manager/get_disabled_entities` | `state` = disabled\|enabled\|all | Entity tree grouped by integration → device (prunes empty groups). |
| `entity_manager/export_states` | — | Export every entity's state/metadata to a sorted JSON list. |
| `entity_manager/get_automations` | — | Automations with `last_triggered` + resolved trigger context. |
| `entity_manager/get_template_sensors` | — | Template entities with state and connections. |
| `entity_manager/get_entity_details` | `entity_id` | Full entity + device + area + config-entry + labels (entity & device) from all registries. |
| `entity_manager/get_config_entry_health` | — | Config entries not in `loaded` state (excludes deliberately disabled / ignored). |
| `entity_manager/get_areas_and_floors` | — | Area + floor hierarchy. |
| `entity_manager/get_last_activity` | `entity_ids` (optional) | Recorder-DB query: last non-unavailable/unknown timestamp (ms) per entity. |
| `entity_manager/list_hacs_items` | — | Installed HACS integrations/frontend + parsed community store from `.storage`. |

### Entity-operation commands
| Command | Params | Description |
|---|---|---|
| `entity_manager/enable_entity` | `entity_id` | Enable a single entity. |
| `entity_manager/disable_entity` | `entity_id` | Disable a single entity (`RegistryEntryDisabler.USER`). |
| `entity_manager/bulk_enable` | `entity_ids` (1–500) | Enable many; returns success/failed lists. |
| `entity_manager/bulk_disable` | `entity_ids` (1–500) | Disable many; returns success/failed lists. |
| `entity_manager/rename_entity` | `old_entity_id`, `new_entity_id` | Rename entity ID (validates format, domain match, and no collision). |
| `entity_manager/update_entity_display_name` | `entity_id`, `name` (opt, null clears) | Set/clear a user display name. |
| `entity_manager/remove_entity` | `entity_id` | Remove from registry; removes whole config entry for UI-template entities; warns for YAML templates. |
| `entity_manager/assign_entity_device` | `entity_id`, `device_id` | Assign entity to a device. |
| `entity_manager/unassign_entity_device` | `entity_id` | Clear an entity's device assignment. |
| `entity_manager/import_entity_states` | `entities` (1–500, each `entity_id`+`is_disabled`) | Apply enable/disable states from an exported config. |
| `entity_manager/update_yaml_references` | `old_entity_id`, `new_entity_id`, `dry_run` | Rewrite references after one rename or a `renames` list (≤500) across YAML config files, storage-mode dashboards, config entry data/options, persons and Assist pipelines; reports remaining hits in integration Stores and `custom_components` as `manual_references` (preview when `dry_run`). |
| `entity_manager/register_template` | `entity_id` | Inject a generated `unique_id` into a YAML template entity and reload templates. |

> **YAML safety:** the YAML-writing commands (`update_yaml_references`, `register_template`)
> skip `secrets.yaml` and directories like `custom_components`, `.storage`, `www`, `backups`,
> `.git`, and write a `.em-bak` backup of each file before modifying it.
> `update_yaml_references` additionally rewrites storage dashboards, config entries, persons and
> Assist pipelines through HA's APIs (JSON backups in `.storage/entity_manager_backups/`), reloads automations, scripts,
> scenes and templates after a YAML write, and only *reports* hits in integration Stores and
> `custom_components`.

### Home Assistant Services (`services.yaml`)
| Service | Description |
|---|---|
| `entity_manager.enable_entity` | Enable a disabled entity (field: `entity_id`). |
| `entity_manager.disable_entity` | Disable an enabled entity (field: `entity_id`). |

Both services require admin (calls with no user context — e.g. automations run by HA
itself — are allowed). All other operations are WebSocket-only.

---

## 7. Data Flow — End to End

1. **Load** — On open, `loadData()` calls `entity_manager/get_disabled_entities` (plus native
   registry APIs for areas/devices/labels). Recorder-backed timestamps are fetched via
   `entity_manager/get_last_activity` and cached in localStorage (1-hour TTL).
2. **Render** — `updateView()` applies the active filter/search/grouping and renders the tree,
   stat wall, and sidebar.
3. **Mutate** — A user action (enable, disable, rename, assign, label, import…) first calls
   `_pushUndoAction({...})` to record reversible state, then issues the WS command (or a native
   HA service call). `remove_entity` is the one intentional undo-exempt operation.
4. **Backend applies** — The Python handler validates input, writes to the appropriate HA
   registry (or rewrites YAML with a `.em-bak` backup), and returns a structured result. Bulk
   handlers report `{"success": [...], "failed": [...]}` so the UI can show accurate partial
   success.
5. **Refresh** — The frontend re-runs `loadData()`; the Notification Center diffs old vs new
   state to raise offline/anomaly/enabled/disabled/new-entity notifications.

---

## 8. Development & Deployment

### Repos & Deploy
- Development happens in the repo on **`E:\entity-manager`**.
- **`sync-to-ha.ps1`** mirrors `custom_components\entity_manager` → **`Z:\custom_components\entity_manager`**
  (the live HA config on a shared drive) using `robocopy /MIR`, excluding `__pycache__`, `.claude`,
  `tests`, `.git`, `*.pyc/*.pyo`, and `settings.local.json`. It sanity-checks the Z: mount, warns
  about a stray nested `entity_manager\entity_manager` folder, and reminds you that **Python changes
  need an HA restart** while frontend-only changes just need a browser cache clear.

### Tests
- **Python (pytest)** — `pytest.ini` sets `asyncio_mode = auto`; tests in `tests/`
  (`test_const.py`, `test_websocket_api.py`, `conftest.py`).
- **Frontend (Vitest)** — `vitest.config.js` uses the `jsdom` environment, a
  `frontend/tests/vitest.setup.js` setup file, and `frontend/tests/**/*.test.js`.
  Run via `npm test` (`vitest run`) / `npm run test:watch`.

### Linting & Types
- **JS**: ESLint 9 (flat config `eslint.config.js`) — `npm run lint` / `npx eslint custom_components/entity_manager/frontend/`.
- **Python**: **ruff** (lint + format check) and **mypy** (`--ignore-missing-imports`); repo also has `pyrightconfig.json`.

### CI — `.github/workflows/ci.yml`
Runs on PRs and pushes to `main`:
- **JavaScript Lint** — `npx eslint` on the frontend.
- **Python Lint & Type Check** — `ruff check`, `ruff format --check`, `mypy`.
- **Python Tests (3.12)** — installs `homeassistant>=2024.7.0` + `pytest-homeassistant-custom-component`, runs `pytest tests/`. (A 3.11 job exists but is skipped — HA requires Python ≥3.12.)
- **Frontend Tests** — `node --check` syntax check on the panel JS.
- **E2E** — placeholder (no Playwright tests yet).
- **Security Scan** — `bandit -r custom_components/ --severity-level medium`.

### Dev workflow
1. Edit under `custom_components/entity_manager/`.
2. Run `sync-to-ha.ps1` to deploy to `Z:\`.
3. Restart HA for Python changes; hard-refresh the browser for frontend changes.
   New WS commands: add the handler + decorators and register it in `async_setup_ws_api()`.

---

## 9. Known Limitations & Roadmap

- **Admin-only**: non-admin users are blocked at every command and the panel itself.
- **Browser-local state**: preferences, favorites, aliases, themes, and undo/redo live in
  `localStorage` — they are per-browser and not synced across devices/users.
- **YAML rewriting is heuristic**: `update_yaml_references` / `register_template` do text/regex
  matching over config files (skipping secrets and system dirs, with `.em-bak` backups) rather
  than parsing YAML semantically.
- **`remove_entity` is irreversible** — intentionally undo-exempt; YAML-defined entities can
  return on the next HA restart.
- **No E2E tests** — the CI E2E job is a placeholder.
- **v3.1.0 direction** (from `CHANGELOG.md`): an accuracy release focused on truthful Health &
  Cleanup / Suggestions (redefined "orphaned" as owner-gone, de-noised unavailable/stale/ghost/
  never-triggered), click-to-details on every card/row, and explanatory hints with Help deep-links.
  v3.0.0 introduced the "Refined" UI redesign, assignable/custom device types, and the tabbed
  Entity Details dialog.

---

*This document was generated by reading the repository source; where a doc and the source
disagreed (e.g. the exact `rename_entity` params and the `update_entity_display_name` `name`
field), the source was treated as authoritative.*
