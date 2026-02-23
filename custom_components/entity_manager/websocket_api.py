"""WebSocket API for Entity Manager."""

import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import label_registry as lr

from .const import DOMAIN, MAX_BULK_ENTITIES, VALID_ENTITY_ID

_LOGGER = logging.getLogger(__name__)


async def _resolve_trigger_context(
    hass: HomeAssistant, state: Any
) -> tuple[str, str | None]:
    """Return (triggered_by, triggered_by_name) from a state's context.

    triggered_by: 'human' | 'automation' | 'system'
    triggered_by_name: user display name when human, else None
    """
    if state is None:
        return "system", None
    ctx = state.context
    if ctx.user_id:
        name: str | None = None
        try:
            user = await hass.auth.async_get_user(ctx.user_id)
            if user:
                name = user.name or None
        except Exception:
            pass
        return "human", name
    if ctx.parent_id:
        return "automation", None
    return "system", None


def enable_entity(hass: HomeAssistant, entity_id: str) -> None:
    """Enable a single entity. Raises ValueError if entity not found."""
    entity_reg = er.async_get(hass)
    if not entity_reg.async_get(entity_id):
        raise ValueError(f"Entity {entity_id} not found")
    entity_reg.async_update_entity(entity_id, disabled_by=None)


def disable_entity(hass: HomeAssistant, entity_id: str) -> None:
    """Disable a single entity. Raises ValueError if entity not found."""
    entity_reg = er.async_get(hass)
    if not entity_reg.async_get(entity_id):
        raise ValueError(f"Entity {entity_id} not found")
    entity_reg.async_update_entity(
        entity_id, disabled_by=er.RegistryEntryDisabler.USER
    )


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/get_disabled_entities",
        vol.Optional("state", default="disabled"): vol.In(
            ["disabled", "enabled", "all"]
        ),
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def handle_get_disabled_entities(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle get disabled entities request."""
    try:
        entity_reg = er.async_get(hass)
        dev_reg = dr.async_get(hass)
        state = msg.get("state", "disabled")

        grouped_data: dict[str, Any] = {}

        for entity in entity_reg.entities.values():
            is_disabled = bool(entity.disabled)
            include_entity = (
                state == "all"
                or (state == "disabled" and is_disabled)
                or (state == "enabled" and not is_disabled)
            )

            platform = entity.platform or "unknown"
            device_id = entity.device_id or "no_device"

            if platform not in grouped_data:
                grouped_data[platform] = {
                    "integration": platform,
                    "devices": {},
                    "total_entities": 0,
                    "disabled_entities": 0,
                }

            integration_entry = grouped_data[platform]
            integration_entry["total_entities"] += 1
            if is_disabled:
                integration_entry["disabled_entities"] += 1

            devices = integration_entry["devices"]
            if device_id not in devices:
                device_name: str | None = None
                if device_id != "no_device":
                    dev = dev_reg.async_get(device_id)
                    if dev:
                        device_name = dev.name_by_user or dev.name
                devices[device_id] = {
                    "device_id": device_id if device_id != "no_device" else None,
                    "name": device_name,
                    "entities": [],
                    "total_entities": 0,
                    "disabled_entities": 0,
                }

            device_entry = devices[device_id]
            device_entry["total_entities"] += 1
            if is_disabled:
                device_entry["disabled_entities"] += 1

            if include_entity:
                device_entry["entities"].append(
                    {
                        "entity_id": entity.entity_id,
                        "platform": platform,
                        "device_id": entity.device_id,
                        "disabled_by": entity.disabled_by.value
                        if entity.disabled_by
                        else None,
                        "original_name": entity.original_name,
                        "entity_category": entity.entity_category.value
                        if entity.entity_category
                        else None,
                        "is_disabled": is_disabled,
                    }
                )

        # Prune devices and integrations with no matching entities
        filtered_integrations = []
        for integration in grouped_data.values():
            filtered_devices = {
                device_id: device
                for device_id, device in integration["devices"].items()
                if device["entities"]
            }
            if not filtered_devices:
                continue
            integration["devices"] = filtered_devices
            filtered_integrations.append(integration)

        connection.send_result(msg["id"], filtered_integrations)
    except Exception as err:
        _LOGGER.error("Error getting disabled entities: %s", err, exc_info=True)
        connection.send_error(msg["id"], "get_failed", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/enable_entity",
        vol.Required("entity_id"): cv.entity_id,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def handle_enable_entity(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle enable entity request."""
    entity_id = msg["entity_id"]

    try:
        enable_entity(hass, entity_id)
        connection.send_result(msg["id"], {"success": True})
    except ValueError as err:
        _LOGGER.error("Error enabling entity %s: %s", entity_id, err)
        connection.send_error(msg["id"], "enable_failed", str(err))
    except Exception as err:
        _LOGGER.error("Unexpected error enabling entity %s: %s", entity_id, err)
        connection.send_error(msg["id"], "enable_failed", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/disable_entity",
        vol.Required("entity_id"): cv.entity_id,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def handle_disable_entity(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle disable entity request."""
    entity_id = msg["entity_id"]

    try:
        disable_entity(hass, entity_id)
        connection.send_result(msg["id"], {"success": True})
    except ValueError as err:
        _LOGGER.error("Error disabling entity %s: %s", entity_id, err)
        connection.send_error(msg["id"], "disable_failed", str(err))
    except Exception as err:
        _LOGGER.error("Unexpected error disabling entity %s: %s", entity_id, err)
        connection.send_error(msg["id"], "disable_failed", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/bulk_enable",
        vol.Required("entity_ids"): vol.All(
            [cv.entity_id], vol.Length(min=1, max=MAX_BULK_ENTITIES)
        ),
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def handle_bulk_enable(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle bulk enable request."""
    entity_ids = msg["entity_ids"]

    results = {"success": [], "failed": []}

    for entity_id in entity_ids:
        try:
            enable_entity(hass, entity_id)
            results["success"].append(entity_id)
        except Exception as err:
            _LOGGER.error("Error enabling entity %s: %s", entity_id, err)
            results["failed"].append({"entity_id": entity_id, "error": str(err)})

    connection.send_result(msg["id"], results)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/bulk_disable",
        vol.Required("entity_ids"): vol.All(
            [cv.entity_id], vol.Length(min=1, max=MAX_BULK_ENTITIES)
        ),
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def handle_bulk_disable(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle bulk disable request."""
    entity_ids = msg["entity_ids"]

    results = {"success": [], "failed": []}

    for entity_id in entity_ids:
        try:
            disable_entity(hass, entity_id)
            results["success"].append(entity_id)
        except Exception as err:
            _LOGGER.error("Error disabling entity %s: %s", entity_id, err)
            results["failed"].append({"entity_id": entity_id, "error": str(err)})

    connection.send_result(msg["id"], results)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/rename_entity",
        vol.Required("old_entity_id"): cv.entity_id,
        vol.Required("new_entity_id"): cv.entity_id,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def handle_rename_entity(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle rename entity request."""
    entity_reg = er.async_get(hass)
    old_entity_id = msg["old_entity_id"]
    new_entity_id = msg["new_entity_id"]

    try:
        # Validate entity ID format
        if not VALID_ENTITY_ID.match(new_entity_id):
            raise ValueError(
                f"Invalid entity ID format: {new_entity_id}. "
                "Must be lowercase with format 'domain.object_id' "
                "using only a-z, 0-9, and underscores."
            )

        # Validate that old entity exists
        old_entity = entity_reg.async_get(old_entity_id)
        if not old_entity:
            raise ValueError(f"Entity {old_entity_id} not found")

        # Validate domain matches
        old_domain = old_entity_id.split(".")[0]
        new_domain = new_entity_id.split(".")[0]
        if old_domain != new_domain:
            raise ValueError(
                f"Domain mismatch: cannot change domain from '{old_domain}' to '{new_domain}'"
            )

        # Check if new entity ID is already taken
        if entity_reg.async_get(new_entity_id):
            raise ValueError(f"Entity {new_entity_id} already exists")

        # Update the entity ID in the entity registry
        entity_reg.async_update_entity(old_entity_id, new_entity_id=new_entity_id)

        _LOGGER.info("Renamed entity from %s to %s", old_entity_id, new_entity_id)
        connection.send_result(
            msg["id"],
            {
                "success": True,
                "old_entity_id": old_entity_id,
                "new_entity_id": new_entity_id,
            },
        )
    except Exception as err:
        _LOGGER.error(
            "Error renaming entity from %s to %s: %s", old_entity_id, new_entity_id, err
        )
        connection.send_error(msg["id"], "rename_failed", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/export_states",
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def handle_export_states(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle export entity states request."""
    try:
        entity_reg = er.async_get(hass)

        export_data = []
        for entity in entity_reg.entities.values():
            export_data.append(
                {
                    "entity_id": entity.entity_id,
                    "platform": entity.platform or "unknown",
                    "device_id": entity.device_id,
                    "disabled_by": entity.disabled_by.value
                    if entity.disabled_by
                    else None,
                    "is_disabled": bool(entity.disabled),
                    "original_name": entity.original_name,
                    "entity_category": entity.entity_category.value
                    if entity.entity_category
                    else None,
                }
            )

        export_data.sort(key=lambda e: e["entity_id"])
        connection.send_result(msg["id"], export_data)
    except Exception as err:
        _LOGGER.error("Error exporting entity states: %s", err, exc_info=True)
        connection.send_error(msg["id"], "export_failed", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/list_hacs_items",
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def handle_list_hacs_items(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle list HACS-installed items request."""

    def _list_dirs(path: Path, category: str) -> list[dict[str, Any]]:
        if not path.exists():
            return []
        items: list[dict[str, Any]] = []
        for entry in sorted(path.iterdir(), key=lambda p: p.name.lower()):
            if not entry.is_dir() or entry.name.startswith("."):
                continue
            try:
                mtime = entry.stat().st_mtime
            except OSError:
                mtime = 0.0
            items.append(
                {
                    "name": entry.name,
                    "path": str(entry),
                    "category": category,
                    "mtime": mtime,
                }
            )
        return items

    def _load_hacs_storage(base: Path) -> list[dict[str, Any]]:
        """Load HACS store from hacs.data (category lists) + hacs.repositories (details)."""
        hacs_data_path = base / ".storage" / "hacs.data"
        hacs_repos_path = base / ".storage" / "hacs.repositories"

        # Build a detail map keyed by full_name from hacs.repositories
        details_by_name: dict[str, dict[str, Any]] = {}
        if hacs_repos_path.exists():
            try:
                raw = json.loads(hacs_repos_path.read_text(encoding="utf-8"))
                for repo in (raw.get("data") or {}).values():
                    if isinstance(repo, dict) and repo.get("full_name"):
                        details_by_name[repo["full_name"]] = repo
            except Exception:
                pass

        # Build store list from hacs.data (categorised repo lists)
        store: list[dict[str, Any]] = []
        if not hacs_data_path.exists():
            return store
        try:
            raw = json.loads(hacs_data_path.read_text(encoding="utf-8"))
            repos_by_cat = (raw.get("data") or {}).get("repositories") or {}
            for category, items in repos_by_cat.items():
                if not isinstance(items, list):
                    continue
                for item in items:
                    if not isinstance(item, dict):
                        continue
                    full_name = item.get("full_name") or ""
                    repo_id = str(item.get("id") or "")
                    det = details_by_name.get(full_name, {})
                    name = full_name.split("/")[-1] if "/" in full_name else full_name
                    store.append(
                        {
                            "id": repo_id,
                            "name": name,
                            "full_name": full_name,
                            "category": category,
                            "description": det.get("description") or "",
                            "downloads": det.get("downloads") or 0,
                            "stars": det.get("stargazers_count") or 0,
                            "last_updated": det.get("last_updated") or "",
                            "new": bool(item.get("new") or det.get("new")),
                        }
                    )
        except Exception:
            pass
        return store

    try:
        base_path = Path(hass.config.path())
        custom_components = base_path / "custom_components"
        community = base_path / "www" / "community"

        now_ts = datetime.now(timezone.utc).timestamp()
        new_cutoff_ts = now_ts - (7 * 24 * 60 * 60)

        def _scan() -> dict[str, Any]:
            integrations = _list_dirs(custom_components, "integration")
            frontend = _list_dirs(community, "frontend")
            installed = integrations + frontend
            new_downloads = [item for item in installed if item.get("mtime", 0) >= new_cutoff_ts]
            store = _load_hacs_storage(base_path)
            # Build a set of installed names for the frontend to cross-reference
            installed_names = {item["name"].lower() for item in installed}
            return {
                "integrations": integrations,
                "frontend": frontend,
                "installed": installed,
                "installed_names": list(installed_names),
                "new_downloads": new_downloads,
                "store": store,
                "cutoff_days": 7,
            }

        result = await hass.async_add_executor_job(_scan)
        connection.send_result(msg["id"], result)
    except Exception as err:
        _LOGGER.error("Error listing HACS items: %s", err, exc_info=True)
        connection.send_error(msg["id"], "hacs_list_failed", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/update_entity_display_name",
        vol.Required("entity_id"): cv.entity_id,
        vol.Optional("name"): vol.Any(str, None),
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def handle_update_entity_display_name(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Set (or clear) a user-defined display name on an entity."""
    entity_id = msg["entity_id"]
    name: str | None = msg.get("name") or None
    entity_reg = er.async_get(hass)
    if not entity_reg.async_get(entity_id):
        connection.send_error(msg["id"], "not_found", f"Entity {entity_id} not found")
        return
    entity_reg.async_update_entity(entity_id, name=name)
    connection.send_result(msg["id"], {"success": True})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/remove_entity",
        vol.Required("entity_id"): cv.entity_id,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def handle_remove_entity(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Remove an entity from the entity registry (and its config entry if UI-created)."""
    entity_id = msg["entity_id"]
    entity_reg = er.async_get(hass)
    entry = entity_reg.async_get(entity_id)
    if not entry:
        connection.send_error(msg["id"], "not_found", f"Entity {entity_id} not found")
        return

    config_entry_id = entry.config_entry_id
    platform = entry.platform or ""

    # For UI-created template entities: remove the whole config entry so HA
    # doesn't recreate the entity on restart.
    if config_entry_id:
        config_entry = hass.config_entries.async_get_entry(config_entry_id)
        if config_entry and config_entry.domain == "template":
            await hass.config_entries.async_remove(config_entry_id)
            connection.send_result(
                msg["id"],
                {"success": True, "removed_config_entry": True, "warning": None},
            )
            return

    # YAML-defined or other entities: remove from registry only.
    entity_reg.async_remove(entity_id)
    yaml_warning = (
        "This entity is defined in YAML and will return after the next HA restart."
        if not config_entry_id and platform == "template"
        else None
    )
    connection.send_result(
        msg["id"],
        {"success": True, "removed_config_entry": False, "warning": yaml_warning},
    )


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/get_automations",
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def handle_get_automations(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return all automations with last_triggered and trigger context."""
    try:
        results: list[dict[str, Any]] = []
        for state in hass.states.async_all("automation"):
            attrs = dict(state.attributes)
            triggered_by, triggered_by_name = await _resolve_trigger_context(hass, state)
            results.append(
                {
                    "entity_id": state.entity_id,
                    "name": attrs.get("friendly_name") or state.entity_id,
                    "state": state.state,
                    "last_triggered": attrs.get("last_triggered"),
                    "last_changed": state.last_changed.isoformat()
                    if state.last_changed
                    else None,
                    "triggered_by": triggered_by,
                    "triggered_by_name": triggered_by_name,
                }
            )
        results.sort(key=lambda e: e["entity_id"])
        connection.send_result(msg["id"], results)
    except Exception as err:
        _LOGGER.error("Error getting automations: %s", err, exc_info=True)
        connection.send_error(msg["id"], "get_failed", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/get_template_sensors",
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def handle_get_template_sensors(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle get template sensors request."""
    try:
        entity_reg = er.async_get(hass)
        results: list[dict[str, Any]] = []
        seen: set[str] = set()

        for entity in entity_reg.entities.values():
            entity_id = entity.entity_id
            if entity.platform != "template" and not entity_id.startswith("template."):
                continue
            seen.add(entity_id)
            state = hass.states.get(entity_id)
            attrs: dict[str, Any] = dict(state.attributes) if state else {}
            connected = attrs.get("entity_id", [])
            if isinstance(connected, str):
                connected = [connected]
            triggered_by, triggered_by_name = await _resolve_trigger_context(hass, state)
            results.append(
                {
                    "entity_id": entity_id,
                    "name": entity.original_name
                    or attrs.get("friendly_name")
                    or entity_id,
                    "platform": entity.platform or "template",
                    "disabled": bool(entity.disabled),
                    "state": state.state if state else None,
                    "last_changed": state.last_changed.isoformat()
                    if state and state.last_changed
                    else None,
                    "last_updated": state.last_updated.isoformat()
                    if state and state.last_updated
                    else None,
                    "connected_entities": list(connected),
                    "unit_of_measurement": attrs.get("unit_of_measurement"),
                    "device_class": attrs.get("device_class"),
                    "triggered_by": triggered_by,
                    "triggered_by_name": triggered_by_name,
                }
            )

        # Pick up any template.* states not in the registry
        for state in hass.states.async_all():
            if state.entity_id.startswith("template.") and state.entity_id not in seen:
                seen.add(state.entity_id)
                attrs = dict(state.attributes)
                connected = attrs.get("entity_id", [])
                if isinstance(connected, str):
                    connected = [connected]
                triggered_by, triggered_by_name = await _resolve_trigger_context(hass, state)
                results.append(
                    {
                        "entity_id": state.entity_id,
                        "name": attrs.get("friendly_name") or state.entity_id,
                        "platform": "template",
                        "disabled": False,
                        "state": state.state,
                        "last_changed": state.last_changed.isoformat()
                        if state.last_changed
                        else None,
                        "last_updated": state.last_updated.isoformat()
                        if state.last_updated
                        else None,
                        "connected_entities": list(connected),
                        "unit_of_measurement": attrs.get("unit_of_measurement"),
                        "device_class": attrs.get("device_class"),
                        "triggered_by": triggered_by,
                        "triggered_by_name": triggered_by_name,
                    }
                )

        results.sort(key=lambda e: e["entity_id"])
        connection.send_result(msg["id"], results)
    except Exception as err:
        _LOGGER.error("Error getting template sensors: %s", err, exc_info=True)
        connection.send_error(msg["id"], "get_failed", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/update_yaml_references",
        vol.Required("old_entity_id"): str,
        vol.Required("new_entity_id"): str,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def handle_update_yaml_references(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Replace all occurrences of old_entity_id with new_entity_id in YAML config files."""
    old_id = msg["old_entity_id"]
    new_id = msg["new_entity_id"]
    config_path = Path(hass.config.config_dir)

    # Matches old_entity_id as a whole token — not part of a longer identifier.
    # Lookbehind excludes alphanumeric, underscore, and dot (prevents matching
    # e.g. "binary_sensor.x" when searching for "sensor.x").
    pattern = re.compile(
        r"(?<![a-zA-Z0-9_\.])" + re.escape(old_id) + r"(?![a-zA-Z0-9_])"
    )

    # Directories inside config_dir that should never be touched
    _SKIP = {
        "custom_components",
        ".storage",
        "deps",
        "tts",
        "__pycache__",
        "backups",
        "www",
        ".git",
    }

    def _do_replace() -> dict[str, Any]:
        results: list[dict[str, Any]] = []
        errors: list[dict[str, Any]] = []

        for filepath in sorted(config_path.rglob("*.yaml")):
            # Skip any path whose parent parts include an excluded directory
            rel = filepath.relative_to(config_path)
            if any(p in _SKIP or p.startswith(".") for p in rel.parts[:-1]):
                continue
            try:
                content = filepath.read_text(encoding="utf-8")
                if old_id not in content:
                    continue
                new_content, count = pattern.subn(new_id, content)
                if count:
                    filepath.write_text(new_content, encoding="utf-8")
                    results.append({"file": str(rel), "replacements": count})
            except Exception as exc:  # noqa: BLE001
                errors.append({"file": str(rel), "error": str(exc)})

        return {
            "success": True,
            "files_updated": results,
            "errors": errors,
            "total_replacements": sum(r["replacements"] for r in results),
        }

    result = await hass.async_add_executor_job(_do_replace)
    _LOGGER.info(
        "YAML reference update %s → %s: %d replacement(s) in %d file(s)",
        old_id,
        new_id,
        result["total_replacements"],
        len(result["files_updated"]),
    )
    connection.send_result(msg["id"], result)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/get_entity_details",
        vol.Required("entity_id"): cv.entity_id,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def handle_get_entity_details(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return full details for a single entity from all registries."""
    entity_id = msg["entity_id"]
    entity_reg = er.async_get(hass)
    entry = entity_reg.async_get(entity_id)

    if not entry:
        connection.send_error(msg["id"], "not_found", f"Entity {entity_id} not found")
        return

    # Build entity info
    aliases: list[str] = list(entry.aliases) if entry.aliases else []
    labels: list[str] = list(entry.labels) if entry.labels else []
    capabilities = entry.capabilities or {}

    result: dict[str, Any] = {
        "entity": {
            "entity_id": entry.entity_id,
            "unique_id": entry.unique_id,
            "original_name": entry.original_name,
            "name": entry.name,
            "aliases": aliases,
            "platform": entry.platform,
            "domain": entry.domain,
            "config_entry_id": entry.config_entry_id,
            "device_id": entry.device_id,
            "area_id": entry.area_id,
            "entity_category": str(entry.entity_category.value) if entry.entity_category else None,
            "device_class": entry.device_class,
            "original_device_class": entry.original_device_class,
            "icon": entry.icon,
            "original_icon": entry.original_icon,
            "disabled_by": str(entry.disabled_by.value) if entry.disabled_by else None,
            "hidden_by": str(entry.hidden_by.value) if entry.hidden_by else None,
            "unit_of_measurement": entry.unit_of_measurement,
            "supported_features": entry.supported_features,
            "capabilities": {k: str(v) for k, v in capabilities.items()},
        },
        "device": None,
        "area": None,
        "config_entry": None,
        "labels": [],
    }

    # Device registry
    dev = None
    if entry.device_id:
        dev_reg = dr.async_get(hass)
        dev = dev_reg.async_get(entry.device_id)
        if dev:
            result["device"] = {
                "name": dev.name,
                "name_by_user": dev.name_by_user,
                "manufacturer": dev.manufacturer,
                "model": dev.model,
                "model_id": getattr(dev, "model_id", None),
                "sw_version": dev.sw_version,
                "hw_version": dev.hw_version,
                "serial_number": getattr(dev, "serial_number", None),
                "configuration_url": dev.configuration_url,
                "connections": [[c[0], c[1]] for c in dev.connections],
                "identifiers": [[i[0], i[1]] for i in dev.identifiers],
                "area_id": dev.area_id,
            }

    # Area (entity area takes priority, fall back to device area)
    area_id = entry.area_id or (dev.area_id if dev else None)
    if area_id:
        area_reg = ar.async_get(hass)
        area = area_reg.async_get_area(area_id)
        if area:
            result["area"] = {
                "id": area.id,
                "name": area.name,
                "aliases": list(area.aliases) if area.aliases else [],
            }

    # Config entry
    if entry.config_entry_id:
        ce = hass.config_entries.async_get_entry(entry.config_entry_id)
        if ce:
            result["config_entry"] = {
                "domain": ce.domain,
                "title": ce.title,
                "source": ce.source,
                "version": ce.version,
                "state": str(ce.state.value),
                "disabled_by": str(ce.disabled_by.value) if ce.disabled_by else None,
            }

    # Labels (entity + device)
    label_reg = lr.async_get(hass)

    if labels:
        resolved = []
        for label_id in labels:
            label = label_reg.async_get_label(label_id)
            if label:
                resolved.append({"id": label.label_id, "name": label.name, "color": label.color})
        result["labels"] = resolved

    dev_label_ids: list[str] = list(dev.labels) if dev and dev.labels else []
    resolved_dev: list[dict[str, Any]] = []
    for label_id in dev_label_ids:
        label = label_reg.async_get_label(label_id)
        if label:
            resolved_dev.append({"id": label.label_id, "name": label.name, "color": label.color})
    result["device_labels"] = resolved_dev

    connection.send_result(msg["id"], result)


@callback
def async_setup_ws_api(hass: HomeAssistant) -> None:
    """Set up the WebSocket API."""
    websocket_api.async_register_command(hass, handle_get_disabled_entities)
    websocket_api.async_register_command(hass, handle_enable_entity)
    websocket_api.async_register_command(hass, handle_disable_entity)
    websocket_api.async_register_command(hass, handle_bulk_enable)
    websocket_api.async_register_command(hass, handle_bulk_disable)
    websocket_api.async_register_command(hass, handle_rename_entity)
    websocket_api.async_register_command(hass, handle_export_states)
    websocket_api.async_register_command(hass, handle_list_hacs_items)
    websocket_api.async_register_command(hass, handle_get_automations)
    websocket_api.async_register_command(hass, handle_get_template_sensors)
    websocket_api.async_register_command(hass, handle_update_entity_display_name)
    websocket_api.async_register_command(hass, handle_remove_entity)
    websocket_api.async_register_command(hass, handle_update_yaml_references)
    websocket_api.async_register_command(hass, handle_get_entity_details)
    _LOGGER.debug("Entity Manager WebSocket API commands registered")
