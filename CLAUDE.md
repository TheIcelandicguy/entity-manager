# CLAUDE.md — Entity Manager

Home Assistant custom integration, domain `entity_manager`, **v3.3.0**.
Repo `TheIcelandicguy/entity-manager`; source at `E:\entity-manager`.

An admin-only sidebar panel ("Entity Manager", `mdi:tune`) for viewing, enabling,
disabling, renaming, auditing and bulk-managing every entity across every
integration, plus device/area/label assignment and firmware updates. Built for
large installs. No Python requirements; `integration_type: service`,
`iot_class: calculated`, `config_flow: true`, `dependencies: ["frontend"]`,
minimum HA 2024.1.0.

`OVERVIEW.md` in this repo is current and was verified against source — use it
when you need more depth than this file. The other root docs (`STRUCTURE.md`,
`PROJECT_SUMMARY.md`, `QUICKSTART.md`, `DEVREF.md`, `cursorrules.md`) are not
verified; check source before trusting them.

Before ending a session, run `python check_docs.py` and update this file.
The script checks that every path, constant, line count, test count and service
this file quotes still matches the repo, and exits 1 when one does not.

## Layout

All paths below are relative to the repo root. Note that `tests/` and
`sentences/` live at the **root**, not inside the component directory.

| Path | Responsibility |
|---|---|
| `custom_components/entity_manager/__init__.py` | 121 lines. Registers the static path `/api/entity_manager/frontend`, the WS API, voice intents, the two services, and the sidebar panel (`require_admin=True`). Reads `manifest.json` at runtime for the `?v=` cache-buster on the panel JS. |
| `.../const.py` | `DOMAIN`, `MAX_BULK_ENTITIES = 500`, `VALID_ENTITY_ID = ^[a-z][a-z0-9_]*\.[a-z0-9_]+$`. No VERSION constant — the version lives only in `manifest.json` and `package.json`. |
| `.../websocket_api.py` | 1,655 lines. All 21 WS handlers, `async_setup_ws_api()`, and the `enable_entity()` / `disable_entity()` helpers the services reuse. |
| `.../voice_assistant.py` | Enable/Disable intent handlers; patterns in `sentences/en/entity_manager.yaml`. |
| `.../config_flow.py` | Single step, unique-ID guarded, no options flow. |
| `.../frontend/entity-manager-panel.js` | 16,790 lines. The whole UI as one `EntityManagerPanel extends HTMLElement`. |
| `.../frontend/entity-manager-panel.css` | 7,458 lines, all `--em-*` variables. |
| `tests/` | Python tests: `test_const.py`, `test_websocket_api.py`, `conftest.py`. |
| `.../frontend/tests/` | Vitest specs + `vitest.setup.js`. |
| `deploy.ps1` | Thin wrapper over `E:\tools\deploy-to-ha.ps1` (see Deploy). No `sync-to-ha.ps1` helper is checked in; that old name is still used locally on this machine only. |
| `check_docs.py` | Verifies this file against the repo. Run it before ending a session. |
| `ruff.toml` | Pins Ruff lint rules for this repo so CI does not inherit widened future defaults. |
| `_from_Z/` | The stale copies of this repo's docs that sat loose in the HA config root until 2026-09-10. Archive only; every file matched a Jan–Feb 2026 commit exactly. |

## Architecture

```
entity-manager-panel.js  --this.hass.callWS-->  websocket_api.py  -->  HA registries
```

- The panel talks to the backend **only** over HA's WebSocket bus. There is no
  HTTP view and no REST endpoint.
- All 21 commands are named `entity_manager/<name>` and carry **both**
  `@websocket_api.require_admin` and `@websocket_api.async_response` (21/21 in
  source). The panel itself is `require_admin=True`. Every command reads or
  writes registry data, so a handler missing either decorator is a security hole.
- `async_setup_ws_api()` is the single registration point. A handler that isn't
  registered there silently does not exist.
- Registry writes happen in `websocket_api.py` (`er.async_get` / `dr.async_get`)
  and in `voice_assistant.py`. Nowhere else.
- The frontend uses **native** HA WS APIs for anything HA already exposes:
  `config/{area,floor,device,entity,label}_registry/list|update`,
  `history/history_during_period`, and services like `update.install` /
  `button.press`. Custom `entity_manager/*` commands are reserved for what HA
  does not expose cleanly — the grouped entity tree, YAML rewriting, recorder
  queries, HACS scanning, config-entry health. Do not add a command that
  duplicates a native API.

### The 21 commands

Read: `get_disabled_entities` (`state` = disabled|enabled|all), `export_states`,
`get_automations`, `get_template_sensors`, `get_entity_details`,
`get_config_entry_health`, `get_areas_and_floors`, `get_last_activity`
(optional `entity_ids`; recorder query), `list_hacs_items`.

Write: `enable_entity`, `disable_entity`, `bulk_enable`, `bulk_disable`
(`entity_ids`, 1–500), `rename_entity` (`old_entity_id`, `new_entity_id`),
`update_entity_display_name` (`entity_id`, optional `name`; null clears),
`remove_entity`, `assign_entity_device`, `unassign_entity_device`,
`import_entity_states` (`entities`, 1–500), `update_yaml_references`
(`old_entity_id`, `new_entity_id`, `dry_run`), `register_template`.

Only two HA services exist: `entity_manager.enable_entity` and
`entity_manager.disable_entity`. They share an admin gate in `__init__.py` that
mirrors `require_admin`; calls with no `context.user_id` (system-initiated) are
allowed. Everything else is WebSocket-only.

### Unusual bits

- Bulk ops go through `_bulk_toggle()`, which handles each entity individually
  and returns `{"success": [...], "failed": [...]}`. The panel depends on that
  split for accurate toasts and undo — do not collapse it to a boolean.
- `update_yaml_references` and `register_template` do regex text replacement over
  YAML config files, not semantic YAML parsing. They skip `secrets.yaml` and the
  dirs `custom_components`, `.storage`, `deps`, `tts`, `__pycache__`, `backups`,
  `www`, `.git`, and write a `<file>.em-bak` beside every file they modify. Keep
  all three guards in any change to that path. Only `update_yaml_references`
  takes `dry_run`; `register_template` has no preview mode.
- `update_yaml_references` takes one `old_entity_id`/`new_entity_id` pair or a
  `renames` list (≤500). `_Rewriter` matches every entity-ID token in one regex
  pass and looks it up in the old→new table, so big batches stay linear and
  swaps cannot chain. Besides YAML it rewrites **storage-mode dashboards**
  (`async_load` / `async_save`), **config entry data/options**
  (`async_update_entry` — UI helpers keep their source entity there),
  **persons** (`device_trackers`) and **Assist pipelines**
  (`async_update_pipeline`) through HA's APIs — never by editing `.storage` on
  disk, which HA would overwrite from memory, so no HA stop is needed. Each gets
  a JSON backup under `.storage/entity_manager_backups/`. After a YAML write it
  reloads `automation`, `script`, `scene`, `template`. Integration Stores in
  `.storage` and files under `custom_components` are only **reported** in
  `manual_references` (`_STORAGE_REPORT_SKIP` filters registries, caches and
  credentials).
- `rename_entity` only touches the entity registry. The panel rewrites
  references itself via `_updateReferences()` after every rename path: the bulk
  rename queue (dry-run preview → renames → one update for the successes), the
  single-rename dialog (`_renameWithReferences`) and undo/redo of a rename.
  Before 3.2.0 no rename path wrote references at all.
- Bulk rename has **Import CSV / Export CSV** (`old_entity_id,new_entity_id,display_name`).
  Import is frontend-only: `_parseCsv` (quotes, BOM, `;` or `sep=`) →
  `_validateRenameCsv` → a summary dialog → rows land in the normal queue, so the
  reference preview and undo apply unchanged. Rows targeting an ID already in use
  are rejected, which rules out swaps and chains. Display names are set after the
  renames, through `update_entity_display_name`, with a `display_name_change` undo step.
- A release bumps **four** places: `manifest.json`, `package.json` (+ lock, via
  `npm version`), the README badge, and `EM_VERSION` at the top of
  `entity-manager-panel.js` — the panel prints that constant in its header when
  the panel config carries no version. `check_docs.py` now fails on a stale one.
- Frontend mutations call `_pushUndoAction({...})` to record reversible state
  *before* issuing the command. Undo/redo is 50 steps, persisted to
  `localStorage`. `remove_entity` is deliberately undo-exempt.
- All colour comes from `--em-*` CSS variables, never HA theme variables
  directly, so the theme engine can override light/dark correctly.
- Persistent user state lives under `em-*` `localStorage` keys, with three
  legacy camelCase holdouts (`em_undoStack`, `em_redoStack`,
  `em_lastActivityCache`). All of it is per-browser and never synced.

## Tests and lint

Run from the repo root:

```
npm test                                                  # vitest run
npm run test:watch
npm run lint                                              # eslint .
npx eslint custom_components/entity_manager/frontend/     # what CI runs
pytest tests/ -v --tb=short
ruff check custom_components/
ruff format --check custom_components/
mypy custom_components/entity_manager --ignore-missing-imports
node --check custom_components/entity_manager/frontend/entity-manager-panel.js
bandit -r custom_components/ --severity-level medium
```

- `pytest.ini` sets `asyncio_mode = auto`.
- Vitest uses jsdom; config in `vitest.config.js`, specs matched at
  `custom_components/entity_manager/frontend/tests/**/*.test.js`.
- CI is `.github/workflows/ci.yml`, on PRs and pushes to `main`, Python 3.12 with
  `pytest-homeassistant-custom-component`. `ruff format --check` fails the build
  on formatting alone, so run ruff and mypy before pushing. The
  "Python Tests (3.11)" job is a deliberate no-op and the E2E job is a
  placeholder — no Playwright tests exist. The "frontend-tests" job only runs
  `node --check` on the panel; CI never runs the Vitest specs, so run `npm test`
  yourself.

## Deploy

```
.\deploy.ps1
.\deploy.ps1 -DryRun    # show what would change, write nothing
```

The checked-in wrapper is a thin wrapper over `E:\tools\deploy-to-ha.ps1`,
shared by every integration on this machine. No `sync-to-ha.ps1` script is in
the repo; a local gitignored helper with that name points at the same
underlying script for muscle memory and old permission lists. It copies
`custom_components\entity_manager` →
`Z:\custom_components\entity_manager` with `robocopy /E /R:2 /W:2` (`/E`,
never `/MIR`), excluding the dirs `__pycache__`, `.git`, `.claude`, `.venv`,
`tests` and the files `*.pyc`, `*.pyo`, `settings.local.json`, `test_*.py`.
Before copying it refuses to run unless `Z:\configuration.yaml` exists and
warns about anything on `Z:` that is newer than its `E:` counterpart (a hand
edit on the HA side about to be overwritten); afterwards it lists files on
`Z:` that the repo no longer has and fails if the deployed `manifest.json`
version does not match the source. Robocopy exit codes 0–7 are success (1 =
files copied); only ≥8 is a failure. The pre-2026-08-30 standalone script the
wrappers replaced is kept locally as sync-to-ha.ps1.bak-2026-08-30; it is
gitignored along with sync-to-ha.ps1 itself, so neither is in the repo.

- **Python changes need an HA restart; frontend-only changes need only a hard
  browser refresh.** Getting this backwards is the usual reason a change looks
  like it did not apply.
- `/E` never deletes, so a module you delete from the repo stays on `Z:`,
  still importable, until you remove it by hand — the deploy output names it.
  Never edit under `Z:\custom_components\entity_manager` directly; the next
  deploy overwrites it and the edit was never in git.
- `/R:2 /W:2` matters: robocopy's default is a million retries at 30 s, so a
  file HA holds open becomes a hang rather than an error. If the copy fails on a
  lock, restart HA and re-run.

## Gotchas

- **There is no `Z:\CLAUDE.md` any more.** Until 2026-09-10 a Jan–Feb 2026 copy
  of this repo's docs sat loose in the Home Assistant config root (`CLAUDE.md`,
  `README.md`, `INSTALL.md`, `STRUCTURE.md`, `PROJECT_SUMMARY.md`,
  `QUICKSTART.md`, `CHANGELOG.md`, `CHANGES.md`, `info.md`, `cursorrules.md`,
  `CODE_OF_CONDUCT.md`, `eslint.config.js`, `sentences\`). They were moved to
  `_from_Z/` here. If any of them reappear on `Z:`, something is copying the
  repo root instead of `custom_components\entity_manager`.
- The pre-2026-08-30 version of this file is in git history at commit
  `656230b`, not in the working tree. It contradicted itself on the version and
  documented wrong parameter names for `rename_entity`,
  `update_entity_display_name`, `get_last_activity` and `import_entity_states`.
  Do not reintroduce anything from it without checking source.
- Version bumps must touch both `manifest.json` and `package.json`.
- `VALID_ENTITY_ID` is stricter than it looks — the domain must start with a
  letter, not an underscore. Validate against it before any registry write.
- `remove_entity` is irreversible, and YAML-defined entities can return on the
  next HA restart.
- `strings.json` contains vestigial `options` strings; there is no options flow.
