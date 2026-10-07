---
name: entity-manager-dev
description: >-
  Reference for developing Davíð's Entity Manager — the Home Assistant custom
  integration at E:\entity-manager (domain entity_manager, v3.7.1 as of 2026-10-07,
  repo TheIcelandicguy/entity-manager, deployed to Z:\custom_components\entity_manager
  with deploy.ps1). An admin-only sidebar panel for viewing, enabling, disabling,
  renaming, auditing and bulk-managing every entity across all integrations, built
  from a 26-command admin-gated WebSocket API plus one large vanilla-JS web
  component. Use whenever working on this integration — WebSocket handlers,
  registry writes, YAML reference rewriting and broken-reference removal, the panel
  UI, undo/redo, bulk operations, voice intents and sentences, the in-panel Help
  Guide, tests, CI, releases — and whenever deploying or verifying it on the house.
  Trigger even when the user just says "entity manager", "EM" or "the entity
  panel". It says which docs to trust, the rules a change must keep, and the
  Windows, CI and release traps that cost time.
---

# Entity Manager — integration development

Admin-only sidebar panel ("Entity Manager", `mdi:tune`) for managing every entity
across every integration: enable/disable, rename (with reference rewriting), audit,
bulk operations, device/area/label assignment, firmware updates, cleanup and
health, voice commands. Built for large installs.

- Source `E:\entity-manager`, repo `TheIcelandicguy/entity-manager`, domain
  `entity_manager`, `integration_type: service`, `config_flow: true`,
  `dependencies: ["frontend"]`, no Python requirements.
- **Minimum Home Assistant is 2024.7.0** (the panel registration imports
  `StaticPathConfig`). It was wrongly 2024.1.0 until 3.7.1.
- The version lives in `manifest.json`; read it, do not trust this file for it.

## Start here, not here

Details in this skill rot (the old version quoted line counts and a 21-command API
for months). So:

1. **Read `CLAUDE.md` at the repo root first.** It is the maintained guide: layout,
   architecture, the commands, unusual behaviour, tests, deploy, gotchas.
2. `OVERVIEW.md` has more depth. `AGENTS.md` is only a pointer to CLAUDE.md.
3. **Run `python check_docs.py` before ending a session.** It fails on stale paths,
   constants, version, test counts, services, and also on command counts, the
   minimum HA version, the OVERVIEW version and a `strings.json` /
   `translations/en.json` mismatch. Update CLAUDE.md when it fails.
4. Source wins over any doc: `websocket_api.py`, `const.py`, `voice_assistant.py`,
   `voice_sentences.py`, `frontend/entity-manager-panel.js`.
5. **This skill lives in the repo** at `.claude/skills/entity-manager-dev/SKILL.md`,
   so Claude Code loads it with the clone. Edit it there, in the same PR as the change
   it describes. `check_docs.py` fails when the version, command count or minimum HA
   it quotes is stale, and warns when the claude.ai copy is behind. claude.ai and
   Cowork read their own library: run `python build_skill.py`, upload
   `dist-skill/entity-manager-dev.skill`, and check in a new chat.

## Rules a change must keep

**Admin-gated, deliberately.** Every WS command has `@websocket_api.require_admin`
and `@websocket_api.async_response`, and the panel is `require_admin=True`. A handler
missing either is a security hole. `async_setup_ws_api()` is the only registration
point; an unregistered handler silently does not exist. Do not add a command that
duplicates a native HA API.

**Bulk calls.** The backend caps one call at `MAX_BULK_ENTITIES` (500) and returns
`{"success": [...], "failed": [...]}`; keep that split. In the panel use
`_bulkSetEnabled(ids, enable)` (batches of 500, merges results) for enable/disable,
`_removeEntitiesSettled` (batches of 10) for removes. Never send a whole group in
one call.

**Config rewrites.** `update_yaml_references`, `remove_broken_reference` and
`register_template` rewrite config by regex/text, never by parsing. They skip
`secrets.yaml` and the dirs `custom_components`, `.storage`, `deps`, `tts`,
`__pycache__`, `backups`, `snapshots`, `www`, `.git`. All writes go through
`_write_yaml_text` (first `.em-bak` is kept, later ones timestamped, atomic replace,
CRLF/BOM kept, symlink out of the config dir refused) and the three handlers run
under `_serialised`. Storage dashboards, config entries, persons, Assist pipelines
and Energy preferences are changed through HA's APIs, never `.storage` on disk.
`remove_broken_reference` validates the ID, refuses an entity that exists, and only
edits `.yaml`; `_remove_yaml_list_entry` must never touch a Jinja subscript.

**Panel code.**
- Escape registry and device data with `_escapeHtml` / `_escapeAttr`. `createDialog`
  inserts `title` as raw HTML, so escape names you pass into it.
- Colour only from `--em-*` variables. Preferences only through `_loadFromStorage`
  (checks shape), `_readPref` / `_writePref` (survive blocked storage).
- Files in and out only through `_pickFile`, `_readImportText`, `_downloadFile`
  (they work in the Companion apps). Export CSV cells through `_csvCell`.
- Undo: `_pushUndoAction` after the command succeeds; undo/redo paths call
  `enableEntity`/`disableEntity` with `skipUndo` and must let errors propagate.
- Document-level listeners must be stored and removed in `disconnectedCallback`.
- **A user-facing change updates the Help Guide in the same PR**
  (`_showHelpGuide()`; the `sections` list and the `help-<id>` divs must agree).

**Voice.** Commands change the registry's enabled state only. A partial word match
is read back and not acted on; only an entity ID, exact or substring match acts.
Sentences must live in `<config>/custom_sentences/<lang>/`; `voice_sentences.py`
installs them, and a non-UTF-8 copy is treated as user-edited.

## Working on Davíð's machine

- **Branch and PR per piece of work; nothing lands on `main`.** He merges. PR bodies
  and release notes carry content only: no versioning section, no process notes, no
  Claude Code footer. Commits use `git commit -F <tempfile>`.
- **`pytest` does not run on Windows** (Home Assistant imports `fcntl`). The PR's CI
  run is the first real Python test run, so write Python tests carefully and expect
  CI to find mistakes. Locally run `npm test`, `npx eslint --max-warnings 0
  custom_components/entity_manager/frontend/`, `ruff check`, `ruff format --check`,
  `mypy custom_components/entity_manager`, `node --check` on the panel.
- **CI required checks include two placeholders**, "Python Tests (3.11)" and "E2E
  Tests" (they only echo). The repo ruleset requires them, so deleting the jobs
  blocks every merge until the ruleset is edited on GitHub.
- **Bash-tool traps:** backslashes in heredocs are halved and broke several scripts
  this way. Write scripts with the Write tool and run them by path. Source files are
  CRLF; a script that rewrites them must detect and keep the line endings. cwd
  persists between calls, so use absolute paths.
- Conflicts between sibling PRs are usually two blocks appended at the same spot in
  a test file. Keep both sides, then check the closing lines of the first block.

## Deploy and verify

`.\deploy.ps1` (thin wrapper over `E:\tools\deploy-to-ha.ps1`: `robocopy /E /R:2
/W:2`, never `/MIR`; exit 0–7 is success, 1 means files copied; `-DryRun` writes
nothing). Python changes need an HA restart, which is pre-authorised after a deploy;
frontend-only changes need a hard refresh.

**Never accept "it's deployed" without checking.** On 2026-10-07 `Z:` was still on
3.6.2 while 3.7.1 was released. Check: read `Z:\custom_components\entity_manager\
manifest.json` and `EM_VERSION` in the panel, run `.\deploy.ps1 -DryRun` (it prints
source and target versions and the file count), compare HA's last restart with the
file dates, then after the restart confirm the config entry is `loaded` and the
system log has no `entity_manager` entries. The connector returns 502 for about a
minute while HA starts; poll with an authenticated call, not unauthenticated curl
(that logs an invalid-login warning toward an IP ban). `ha_read_file` needs the
optional HA-MCP File & YAML Tools entry, which is not set up here; read `Z:`
directly instead.

## Releasing

Four version places (`manifest.json`, `package.json` + lock via `npm version
--no-git-tag-version`, the README badge, `EM_VERSION`) plus the version in CLAUDE.md
and OVERVIEW.md and in this skill's description, and a CHANGELOG entry (plain-noun headings, no emoji, no test counts
or PR numbers). Ship the bump as its own PR after the work merges. Then
`gh release create vX.Y.Z --target <full 40-char SHA> --title "vX.Y.Z — Title"
--notes-file <entry>` (a short SHA is rejected). The release workflow attaches
`entity_manager.zip`; HACS installs fail without it, so confirm it is there.

## Known gaps

`register_template` cannot reach its YAML-editing path for registry entities (they
always have a `unique_id`). Backups of config entries and persons under
`.storage/entity_manager_backups/` are never pruned. The broken-reference scan reports
nothing, not an error, if HA changes the shape of an internal store, and a domain
with no surviving entities is invisible to it. Browser-local state (preferences,
favourites, local aliases, themes, undo/redo) is per-browser. `remove_entity` is
irreversible and undo-exempt. There are no E2E tests.
