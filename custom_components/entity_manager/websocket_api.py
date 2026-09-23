"""WebSocket API for Entity Manager."""

import json
import logging
import re
import uuid as uuid_module
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, cast

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import label_registry as lr

from .const import MAX_BULK_ENTITIES, VALID_ENTITY_ID

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
    entity_reg.async_update_entity(entity_id, disabled_by=er.RegistryEntryDisabler.USER)


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
                        # The display name the user set, if any. Without it the
                        # panel can only show the integration's name, so a
                        # rename looks like it did nothing.
                        "name": entity.name,
                        "has_entity_name": entity.has_entity_name,
                        "entity_category": entity.entity_category.value
                        if entity.entity_category
                        else None,
                        "is_disabled": is_disabled,
                        "config_entry_id": entity.config_entry_id,
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


def _bulk_toggle(
    hass: HomeAssistant,
    entity_ids: list[str],
    action: str,
) -> dict[str, list]:
    """Enable or disable a list of entities, returning success/failed lists."""
    fn = enable_entity if action == "enable" else disable_entity
    results: dict[str, list] = {"success": [], "failed": []}
    for entity_id in entity_ids:
        try:
            fn(hass, entity_id)
            results["success"].append(entity_id)
        except Exception as err:
            _LOGGER.error("Error %sing entity %s: %s", action, entity_id, err)
            results["failed"].append({"entity_id": entity_id, "error": str(err)})
    return results


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
    connection.send_result(msg["id"], _bulk_toggle(hass, msg["entity_ids"], "enable"))


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
    connection.send_result(msg["id"], _bulk_toggle(hass, msg["entity_ids"], "disable"))


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

        export_data.sort(key=lambda e: str(e["entity_id"]))
        connection.send_result(msg["id"], export_data)
    except Exception as err:
        _LOGGER.error("Error exporting entity states: %s", err, exc_info=True)
        connection.send_error(msg["id"], "export_failed", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/import_entity_states",
        vol.Required("entities"): vol.All(
            [
                {
                    vol.Required("entity_id"): cv.entity_id,
                    vol.Required("is_disabled"): bool,
                }
            ],
            vol.Length(min=1, max=MAX_BULK_ENTITIES),
        ),
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def handle_import_entity_states(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Apply enable/disable state from an exported config file."""
    entity_reg = er.async_get(hass)
    success_count = 0
    failed: list[dict[str, str]] = []

    for item in msg["entities"]:
        entity_id = item["entity_id"]
        is_disabled = item["is_disabled"]
        entry = entity_reg.async_get(entity_id)
        if entry is None:
            failed.append({"entity_id": entity_id, "error": "not found"})
            continue
        try:
            currently_disabled = bool(entry.disabled_by)
            if is_disabled and not currently_disabled:
                entity_reg.async_update_entity(
                    entity_id, disabled_by=er.RegistryEntryDisabler.USER
                )
            elif not is_disabled and currently_disabled:
                entity_reg.async_update_entity(entity_id, disabled_by=None)
            success_count += 1
        except Exception as err:  # noqa: BLE001
            _LOGGER.warning("Failed to import state for %s: %s", entity_id, err)
            failed.append({"entity_id": entity_id, "error": str(err)})

    connection.send_result(
        msg["id"],
        {"success": success_count, "failed": len(failed), "failed_entities": failed},
    )


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
            new_downloads = [
                item for item in installed if item.get("mtime", 0) >= new_cutoff_ts
            ]
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
    try:
        entity_reg.async_remove(entity_id)
    except Exception as err:
        _LOGGER.error("Error removing entity %s: %s", entity_id, err)
        connection.send_error(msg["id"], "remove_failed", str(err))
        return

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
        vol.Required("type"): "entity_manager/assign_entity_device",
        vol.Required("entity_id"): cv.entity_id,
        vol.Required("device_id"): str,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def handle_assign_entity_device(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Assign an entity to a device in the entity registry."""
    entity_id = msg["entity_id"]
    device_id = msg["device_id"]
    entity_reg = er.async_get(hass)
    dev_reg = dr.async_get(hass)
    entry = entity_reg.async_get(entity_id)
    if not entry:
        connection.send_error(msg["id"], "not_found", f"Entity {entity_id} not found")
        return
    if not dev_reg.async_get(device_id):
        connection.send_error(msg["id"], "not_found", f"Device {device_id} not found")
        return
    entity_reg.async_update_entity(entity_id, device_id=device_id)
    connection.send_result(msg["id"], {"success": True})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/unassign_entity_device",
        vol.Required("entity_id"): cv.entity_id,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def handle_unassign_entity_device(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Remove a device assignment from an entity in the entity registry."""
    entity_id = msg["entity_id"]
    entity_reg = er.async_get(hass)
    entry = entity_reg.async_get(entity_id)
    if not entry:
        connection.send_error(msg["id"], "not_found", f"Entity {entity_id} not found")
        return
    entity_reg.async_update_entity(entity_id, device_id=None)
    connection.send_result(msg["id"], {"success": True})


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
        states = list(hass.states.async_all("automation"))
        results: list[dict[str, Any]] = []
        for state in states:
            try:
                triggered_by, triggered_by_name = await _resolve_trigger_context(
                    hass, state
                )
            except Exception:  # noqa: BLE001
                triggered_by, triggered_by_name = None, None
            attrs = dict(state.attributes)
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
        seen: set[str] = set()

        # Collect partial result dicts and their associated states for parallel resolution
        partials: list[dict[str, Any]] = []
        trig_states: list[Any] = []

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
            partials.append(
                {
                    "entity_id": entity_id,
                    "name": entity.original_name
                    or attrs.get("friendly_name")
                    or entity_id,
                    "platform": entity.platform or "template",
                    "unique_id": entity.unique_id,
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
                }
            )
            trig_states.append(state)

        # Pick up any template.* states not in the registry
        for state in hass.states.async_all():
            if state.entity_id.startswith("template.") and state.entity_id not in seen:
                seen.add(state.entity_id)
                attrs = dict(state.attributes)
                connected = attrs.get("entity_id", [])
                if isinstance(connected, str):
                    connected = [connected]
                partials.append(
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
                    }
                )
                trig_states.append(state)

        results: list[dict[str, Any]] = []
        for partial, state in zip(partials, trig_states):
            try:
                triggered_by, triggered_by_name = await _resolve_trigger_context(
                    hass, state
                )
            except Exception:  # noqa: BLE001
                triggered_by, triggered_by_name = None, None
            results.append(
                {
                    **partial,
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
        vol.Exclusive("old_entity_id", "rename"): cv.entity_id,
        vol.Optional("new_entity_id"): cv.entity_id,
        vol.Exclusive("renames", "rename"): vol.All(
            [
                {
                    vol.Required("old_entity_id"): cv.entity_id,
                    vol.Required("new_entity_id"): cv.entity_id,
                }
            ],
            vol.Length(min=1, max=MAX_BULK_ENTITIES),
        ),
        vol.Optional("dry_run", default=False): bool,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def handle_update_yaml_references(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Rewrite entity ID references after a rename, wherever HA config holds them.

    Takes one ``old_entity_id``/``new_entity_id`` pair or a ``renames`` list.
    Rewrites YAML config files, storage-mode dashboards, config entry
    data/options (UI helpers keep their source entity there), persons,
    Assist pipelines and the Energy dashboard preferences, then reloads
    automations/scripts/scenes/templates if YAML changed. Integration Stores in .storage and files under custom_components
    are only reported in ``manual_references``.

    When dry_run=True nothing is modified; the response lists what *would*
    change so the caller can show a preview.
    """
    if "renames" in msg:
        pairs = [(r["old_entity_id"], r["new_entity_id"]) for r in msg["renames"]]
    elif "old_entity_id" in msg and "new_entity_id" in msg:
        pairs = [(msg["old_entity_id"], msg["new_entity_id"])]
    else:
        connection.send_error(
            msg["id"],
            "invalid_format",
            "Pass old_entity_id and new_entity_id, or a renames list",
        )
        return

    rewriter = _Rewriter(dict(pairs))
    dry_run: bool = msg["dry_run"]
    config_path = Path(hass.config.config_dir)

    def _do_replace() -> dict[str, Any]:
        results: list[dict[str, Any]] = []
        errors: list[dict[str, Any]] = []

        for filepath in sorted(config_path.rglob("*.yaml")):
            # Skip any path whose parent parts include an excluded directory
            rel = filepath.relative_to(config_path)
            if any(p in _YAML_SKIP or p.startswith(".") for p in rel.parts[:-1]):
                continue
            # Never touch secrets files (any directory level)
            if filepath.name == "secrets.yaml":
                continue
            try:
                content = filepath.read_text(encoding="utf-8")
                new_content, count = rewriter.sub(content)
                if count:
                    if not dry_run:
                        # Keep a one-shot backup of the pre-edit content next to the file
                        filepath.with_name(filepath.name + ".em-bak").write_text(
                            content, encoding="utf-8"
                        )
                        filepath.write_text(new_content, encoding="utf-8")
                    results.append(
                        {"file": str(rel), "replacements": count, "kind": "yaml"}
                    )
            except Exception as exc:  # noqa: BLE001
                errors.append({"file": str(rel), "error": str(exc)})

        return {
            "success": True,
            "dry_run": dry_run,
            "files_updated": results,
            "errors": errors,
        }

    result = await hass.async_add_executor_job(_do_replace)
    yaml_changed = bool(result["files_updated"])

    # Dashboards, config entries, persons and pipelines live in .storage. HA
    # holds those in memory and overwrites the files on its next save, so they
    # are rewritten through HA's own APIs, never on disk.
    backup_dir = config_path / ".storage" / "entity_manager_backups"
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")

    def _write_backup(name: str, payload: Any) -> None:
        backup_dir.mkdir(parents=True, exist_ok=True)
        safe = re.sub(r"[^A-Za-z0-9_.-]", "_", name)
        (backup_dir / f"{stamp}.{safe}.json").write_text(
            json.dumps(payload, indent=2, ensure_ascii=False, default=str),
            encoding="utf-8",
        )

    for kind, rewrite in (
        ("dashboard", _replace_in_dashboards),
        ("config_entry", _replace_in_config_entries),
        ("person", _replace_in_persons),
        ("assist_pipeline", _replace_in_pipelines),
        ("energy", _replace_in_energy_prefs),
    ):
        for label, count, error in await rewrite(
            hass, rewriter, dry_run, _write_backup
        ):
            if error:
                result["errors"].append({"file": label, "error": error})
            else:
                result["files_updated"].append(
                    {"file": label, "replacements": count, "kind": kind}
                )

    result["total_replacements"] = sum(
        r["replacements"] for r in result["files_updated"]
    )

    # Everything else that mentions an old ID is owned by a running
    # integration (its Store) or is source code that belongs in a git repo,
    # so it is reported for manual follow-up and never rewritten.
    result["manual_references"] = await hass.async_add_executor_job(
        _scan_manual_references, config_path, rewriter
    )

    if not dry_run:
        # UI automations and scripts are YAML on disk; without a reload the
        # running copies keep the old ID until the next restart.
        if yaml_changed:
            for domain in _RELOAD_AFTER_YAML:
                if hass.services.has_service(domain, "reload"):
                    try:
                        await hass.services.async_call(domain, "reload", blocking=True)
                    except Exception as exc:  # noqa: BLE001
                        result["errors"].append(
                            {"file": f"{domain}.reload", "error": str(exc)}
                        )
        _LOGGER.info(
            "Reference update for %d rename(s): %d replacement(s) in %d place(s), "
            "%d manual reference(s) left",
            len(pairs),
            result["total_replacements"],
            len(result["files_updated"]),
            len(result["manual_references"]),
        )
    connection.send_result(msg["id"], result)


_RELOAD_AFTER_YAML = ("automation", "script", "scene", "template")

# .storage files that mention entity IDs but must not be reported: registries
# and state caches HA migrates itself, stores rewritten via the API above,
# history or caches that are expected to hold old IDs, and credentials.
# Directories inside config_dir whose YAML is never rewritten. "snapshots" holds
# point-in-time copies of automations (e.g. amira/snapshots), not live config.
_YAML_SKIP = {
    "custom_components",
    ".storage",
    "deps",
    "tts",
    "__pycache__",
    "backups",
    "snapshots",
    "www",
    ".git",
}


_STORAGE_REPORT_SKIP = re.compile(
    r"^(core\.(entity_registry|device_registry|restore_state|config_entries)"
    r"|lovelace|person$|assist_pipeline\.|trace\.|auth|http|cloud|onboarding"
    r"|energy$"
    r"|hacs\.|repairs\.|homeassistant\.exposed_entities|entity_manager_backups"
    r"|google\.|local_calendar\.|local_todo\.|bluetooth\.|backup$)"
    r"|\.(pem|ics)$|bak|pre-|rollback",
)

_MANUAL_SCAN_SUFFIXES = {".py", ".js", ".ts", ".json", ".yaml", ".yml"}
_MANUAL_SCAN_MAX_BYTES = 5_000_000


class _Rewriter:
    """Replace entity ID tokens from an old→new table in one linear regex pass.

    A token is a whole entity ID: not preceded by a letter, digit, underscore
    or dot, and not followed by a letter, digit or underscore — so
    ``binary_sensor.x`` never matches ``sensor.x``. Matching every token and
    looking it up keeps a 2,000-rename batch as fast as one rename, and swaps
    (a→b together with b→a) cannot chain.
    """

    _TOKEN = re.compile(
        r"(?<![a-zA-Z0-9_\.])[a-z][a-z0-9_]*\.[a-z0-9_]+(?![a-zA-Z0-9_])"
    )

    def __init__(self, mapping: dict[str, str]) -> None:
        self.mapping = mapping

    def sub(self, text: str) -> tuple[str, int]:
        count = 0

        def _repl(match: re.Match[str]) -> str:
            nonlocal count
            new = self.mapping.get(match.group(0))
            if new is None:
                return match.group(0)
            count += 1
            return new

        return self._TOKEN.sub(_repl, text), count

    def count(self, text: str) -> int:
        return sum(1 for m in self._TOKEN.finditer(text) if m.group(0) in self.mapping)


def _replace_in_obj(obj: Any, rewriter: _Rewriter) -> tuple[Any, int]:
    """Return a copy of a JSON-like value with entity ID tokens replaced, plus the count.

    Dict keys are rewritten too — integrations often key options by entity ID.
    """
    if isinstance(obj, str):
        return rewriter.sub(obj)
    if isinstance(obj, list):
        total = 0
        items = []
        for item in obj:
            new_item, n = _replace_in_obj(item, rewriter)
            items.append(new_item)
            total += n
        return items, total
    if isinstance(obj, dict):
        total = 0
        out: dict[Any, Any] = {}
        for key, value in obj.items():
            new_key, nk = _replace_in_obj(key, rewriter)
            new_value, nv = _replace_in_obj(value, rewriter)
            out[new_key] = new_value
            total += nk + nv
        return out, total
    return obj, 0


async def _replace_in_dashboards(
    hass: HomeAssistant, rewriter: _Rewriter, dry_run: bool, write_backup: Any
) -> list[tuple[str, int, str | None]]:
    """Rewrite entity ID references in storage-mode Lovelace dashboards."""
    lovelace = hass.data.get("lovelace")
    if lovelace is None:
        return []
    dashboards = (
        lovelace.get("dashboards", {})
        if isinstance(lovelace, dict)
        else getattr(lovelace, "dashboards", {})
    )
    out: list[tuple[str, int, str | None]] = []
    for url_path, dashboard in list(dashboards.items()):
        # YAML dashboards are already covered by the file scan.
        if getattr(dashboard, "mode", None) != "storage":
            continue
        label = f"dashboard: {url_path or 'lovelace'}"
        try:
            config = await dashboard.async_load(False)
        except Exception:  # noqa: BLE001 — empty/auto-generated dashboard
            continue
        new_config, count = _replace_in_obj(config, rewriter)
        if not count:
            continue
        if not dry_run:
            try:
                await hass.async_add_executor_job(
                    write_backup, f"lovelace.{url_path or 'lovelace'}", config
                )
                await dashboard.async_save(new_config)
            except Exception as exc:  # noqa: BLE001
                out.append((label, 0, str(exc)))
                continue
        out.append((label, count, None))
    return out


async def _replace_in_config_entries(
    hass: HomeAssistant, rewriter: _Rewriter, dry_run: bool, write_backup: Any
) -> list[tuple[str, int, str | None]]:
    """Rewrite entity ID references in config entry data and options.

    UI helpers (utility_meter, derivative, threshold, group, template…) keep
    their source entity here; they reload through their update listener.
    """
    out: list[tuple[str, int, str | None]] = []
    for entry in hass.config_entries.async_entries():
        new_data, n_data = _replace_in_obj(dict(entry.data), rewriter)
        new_options, n_options = _replace_in_obj(dict(entry.options), rewriter)
        count = n_data + n_options
        if not count:
            continue
        label = f"config entry: {entry.domain} ({entry.title})"
        if not dry_run:
            try:
                await hass.async_add_executor_job(
                    write_backup,
                    f"config_entry.{entry.domain}.{entry.entry_id}",
                    {"data": dict(entry.data), "options": dict(entry.options)},
                )
                changes: dict[str, Any] = {}
                if n_data:
                    changes["data"] = new_data
                if n_options:
                    changes["options"] = new_options
                hass.config_entries.async_update_entry(entry, **changes)
            except Exception as exc:  # noqa: BLE001
                out.append((label, 0, str(exc)))
                continue
        out.append((label, count, None))
    return out


async def _replace_in_persons(
    hass: HomeAssistant, rewriter: _Rewriter, dry_run: bool, write_backup: Any
) -> list[tuple[str, int, str | None]]:
    """Rewrite device_tracker references on UI-managed persons."""
    person_data = hass.data.get("person")
    if not isinstance(person_data, tuple) or len(person_data) < 2:
        return []
    collection = person_data[1]
    out: list[tuple[str, int, str | None]] = []
    for item in list(collection.async_items()):
        trackers, count = _replace_in_obj(
            list(item.get("device_trackers", [])), rewriter
        )
        if not count:
            continue
        label = f"person: {item.get('name', item.get('id'))}"
        if not dry_run:
            try:
                await hass.async_add_executor_job(
                    write_backup, f"person.{item.get('id')}", item
                )
                await collection.async_update_item(
                    item["id"], {"device_trackers": trackers}
                )
            except Exception as exc:  # noqa: BLE001
                out.append((label, 0, str(exc)))
                continue
        out.append((label, count, None))
    return out


_PIPELINE_ENTITY_FIELDS = (
    "conversation_engine",
    "stt_engine",
    "tts_engine",
    "wake_word_entity",
)


async def _replace_in_pipelines(
    hass: HomeAssistant, rewriter: _Rewriter, dry_run: bool, write_backup: Any
) -> list[tuple[str, int, str | None]]:
    """Rewrite engine/wake-word entity references in Assist pipelines."""
    pipeline_data = hass.data.get("assist_pipeline")
    store = getattr(pipeline_data, "pipeline_store", None)
    if store is None:
        return []
    out: list[tuple[str, int, str | None]] = []
    for pipeline in list(store.async_items()):
        changes: dict[str, Any] = {}
        for field in _PIPELINE_ENTITY_FIELDS:
            value = getattr(pipeline, field, None)
            if isinstance(value, str):
                new_value, n = rewriter.sub(value)
                if n:
                    changes[field] = new_value
        if not changes:
            continue
        label = f"assist pipeline: {getattr(pipeline, 'name', pipeline.id)}"
        if not dry_run:
            try:
                from homeassistant.components.assist_pipeline import (  # noqa: PLC0415
                    async_update_pipeline,
                )

                await hass.async_add_executor_job(
                    write_backup, f"assist_pipeline.{pipeline.id}", pipeline.to_json()
                )
                await async_update_pipeline(hass, pipeline, **changes)
            except Exception as exc:  # noqa: BLE001
                out.append((label, 0, str(exc)))
                continue
        out.append((label, len(changes), None))
    return out


# The keys EnergyManager.async_update merges; it ignores anything else.
_ENERGY_PREF_KEYS = ("energy_sources", "device_consumption", "device_consumption_water")


async def _replace_in_energy_prefs(
    hass: HomeAssistant, rewriter: _Rewriter, dry_run: bool, write_backup: Any
) -> list[tuple[str, int, str | None]]:
    """Rewrite statistic references in the Energy dashboard preferences.

    The Energy dashboard stores a statistic ID per source, which for a
    recorder-backed sensor is its entity ID. A rename leaves those pointing at
    an ID that no longer exists and the affected circuits silently stop
    charting, so they are rewritten here through the energy manager's own API.
    Statistics themselves are migrated by the recorder with the rename.
    """
    try:
        from homeassistant.components.energy.data import (  # noqa: PLC0415
            async_get_manager,
        )
    except ImportError:  # energy not available in this HA build
        return []

    label = "energy preferences"
    try:
        manager = await async_get_manager(hass)
    except Exception as exc:  # noqa: BLE001
        return [(label, 0, str(exc))]

    prefs = manager.data
    if not prefs:
        return []

    new_prefs, count = _replace_in_obj(dict(prefs), rewriter)
    if not count:
        return []
    if not dry_run:
        try:
            await hass.async_add_executor_job(write_backup, "energy", dict(prefs))
            # Only the keys the manager merges; anything else it would drop.
            update = {
                key: value
                for key, value in new_prefs.items()
                if key in _ENERGY_PREF_KEYS
            }
            await manager.async_update(cast(Any, update))
        except Exception as exc:  # noqa: BLE001
            return [(label, 0, str(exc))]
    return [(label, count, None)]


def _scan_manual_references(
    config_path: Path, rewriter: _Rewriter
) -> list[dict[str, Any]]:
    """Find references EM will not rewrite: integration Stores and custom_components."""
    found: list[dict[str, Any]] = []

    def _check(path: Path, kind: str) -> None:
        try:
            if path.stat().st_size > _MANUAL_SCAN_MAX_BYTES:
                return
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            return
        count = rewriter.count(text)
        if count:
            found.append(
                {
                    "file": str(path.relative_to(config_path)),
                    "matches": count,
                    "kind": kind,
                }
            )

    storage = config_path / ".storage"
    if storage.is_dir():
        for path in sorted(storage.iterdir()):
            if path.is_file() and not _STORAGE_REPORT_SKIP.search(path.name):
                _check(path, "storage")

    components = config_path / "custom_components"
    if components.is_dir():
        for path in sorted(components.rglob("*")):
            rel = path.relative_to(components)
            if any(p == "__pycache__" or p.startswith(".") for p in rel.parts):
                continue
            if path.is_file() and path.suffix in _MANUAL_SCAN_SUFFIXES:
                _check(path, "custom_component")

    return found


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
            "entity_category": str(entry.entity_category.value)
            if entry.entity_category
            else None,
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
                "state": ce.state.value,
                "disabled_by": str(ce.disabled_by.value) if ce.disabled_by else None,
            }

    # Labels (entity + device)
    label_reg = lr.async_get(hass)

    if labels:
        resolved = []
        for label_id in labels:
            label = label_reg.async_get_label(label_id)
            if label:
                resolved.append(
                    {"id": label.label_id, "name": label.name, "color": label.color}
                )
        result["labels"] = resolved

    dev_label_ids: list[str] = list(dev.labels) if dev and dev.labels else []
    resolved_dev: list[dict[str, Any]] = []
    for label_id in dev_label_ids:
        label = label_reg.async_get_label(label_id)
        if label:
            resolved_dev.append(
                {"id": label.label_id, "name": label.name, "color": label.color}
            )
    result["device_labels"] = resolved_dev

    connection.send_result(msg["id"], result)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/get_config_entry_health",
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def handle_get_config_entry_health(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return config entries that are not in a healthy (loaded) state.

    Deliberate non-loaded states are excluded: entries the user disabled
    (disabled_by set) and ignored discoveries (source == "ignore") are
    choices, not errors.
    """
    try:
        unhealthy: list[dict[str, Any]] = []
        for entry in hass.config_entries.async_entries():
            state_val = entry.state.value
            if state_val == "loaded":
                continue
            if entry.disabled_by is not None:
                continue
            if entry.source == "ignore":
                continue
            unhealthy.append(
                {
                    "entry_id": entry.entry_id,
                    "domain": entry.domain,
                    "title": entry.title,
                    "state": state_val,
                    "disabled_by": str(entry.disabled_by.value)
                    if entry.disabled_by
                    else None,
                }
            )
        unhealthy.sort(key=lambda e: (e["state"], e["domain"], e["title"]))
        connection.send_result(msg["id"], unhealthy)
    except Exception as err:
        _LOGGER.error("Error getting config entry health: %s", err, exc_info=True)
        connection.send_error(msg["id"], "get_failed", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/get_areas_and_floors",
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def handle_get_areas_and_floors(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return all areas and floors for use in the floor-based smart group view."""
    try:
        area_reg = ar.async_get(hass)
        areas: list[dict[str, Any]] = []
        for area in area_reg.async_list_areas():
            areas.append(
                {
                    "area_id": area.id,
                    "name": area.name,
                    "floor_id": getattr(area, "floor_id", None),
                }
            )

        floors: list[dict[str, Any]] = []
        try:
            from homeassistant.helpers import floor_registry as fr  # noqa: PLC0415

            floor_reg = fr.async_get(hass)
            for floor in floor_reg.async_list_floors():
                floor_area_ids = [
                    a["area_id"] for a in areas if a["floor_id"] == floor.floor_id
                ]
                floors.append(
                    {
                        "floor_id": floor.floor_id,
                        "name": floor.name,
                        "level": getattr(floor, "level", 0),
                        "area_ids": floor_area_ids,
                    }
                )
            floors.sort(key=lambda f: (f.get("level", 0), f["name"]))
        except (ImportError, AttributeError):
            # floor_registry not available in this HA version — floors stay empty
            pass

        connection.send_result(msg["id"], {"floors": floors, "areas": areas})
    except Exception as err:
        _LOGGER.error("Error getting areas and floors: %s", err, exc_info=True)
        connection.send_error(msg["id"], "get_failed", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/register_template",
        vol.Required("entity_id"): cv.entity_id,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def handle_register_template(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Inject a unique_id into a YAML-defined template entity and reload templates."""
    entity_id: str = msg["entity_id"]
    entity_reg = er.async_get(hass)
    entity = entity_reg.async_get(entity_id)

    if not entity:
        connection.send_error(msg["id"], "not_found", f"Entity {entity_id} not found")
        return

    if entity.unique_id:
        connection.send_error(
            msg["id"],
            "already_registered",
            "This template already has a unique_id — use Edit to open it in HA.",
        )
        return

    new_uuid = str(uuid_module.uuid4())
    entity_name: str = entity.original_name or ""
    object_id: str = entity_id.split(".", 1)[1]
    config_path = Path(hass.config.config_dir)

    def _find_and_inject() -> dict[str, Any]:
        for filepath in sorted(config_path.rglob("*.yaml")):
            rel = filepath.relative_to(config_path)
            if any(p in _YAML_SKIP or p.startswith(".") for p in rel.parts[:-1]):
                continue
            # Never touch secrets files (any directory level)
            if filepath.name == "secrets.yaml":
                continue
            try:
                content = filepath.read_text(encoding="utf-8")

                # Strategy 1 — new-style template block: find `name: <entity_name>`
                if entity_name:
                    name_pat = re.compile(
                        r'^(\s*)(name\s*:\s*["\']?)'
                        + re.escape(entity_name)
                        + r'(["\']?\s*)$',
                        re.MULTILINE,
                    )
                    m = name_pat.search(content)
                    if m:
                        indent = m.group(1)
                        new_content = (
                            content[: m.end()]
                            + f"\n{indent}unique_id: {new_uuid}"
                            + content[m.end() :]
                        )
                        # Keep a one-shot backup of the pre-edit content
                        filepath.with_name(filepath.name + ".em-bak").write_text(
                            content, encoding="utf-8"
                        )
                        filepath.write_text(new_content, encoding="utf-8")
                        return {
                            "success": True,
                            "file": str(rel),
                            "unique_id": new_uuid,
                        }

                # Strategy 2 — old-style platform template: `<object_id>:` as a YAML key
                old_pat = re.compile(
                    r"^(\s+)(" + re.escape(object_id) + r")\s*:\s*$",
                    re.MULTILINE,
                )
                m = old_pat.search(content)
                if m:
                    indent = m.group(1)
                    new_content = (
                        content[: m.end()]
                        + f"\n{indent}  unique_id: {new_uuid}"
                        + content[m.end() :]
                    )
                    # Keep a one-shot backup of the pre-edit content
                    filepath.with_name(filepath.name + ".em-bak").write_text(
                        content, encoding="utf-8"
                    )
                    filepath.write_text(new_content, encoding="utf-8")
                    return {
                        "success": True,
                        "file": str(rel),
                        "unique_id": new_uuid,
                    }

            except Exception:  # noqa: BLE001
                continue

        return {
            "success": False,
            "unique_id": new_uuid,
            "error": (
                "Could not find the template definition in your YAML files. "
                "Add the following line manually inside the template block:\n"
                f"  unique_id: {new_uuid}"
            ),
        }

    result = await hass.async_add_executor_job(_find_and_inject)

    if result["success"]:
        # Reload template integration so HA picks up the new unique_id
        try:
            await hass.services.async_call("template", "reload", {}, blocking=True)
        except Exception:  # noqa: BLE001
            try:
                await hass.services.async_call(
                    "homeassistant", "reload_config_entry", {}, blocking=True
                )
            except Exception:  # noqa: BLE001
                pass
        _LOGGER.info(
            "Registered template %s with unique_id %s in %s",
            entity_id,
            new_uuid,
            result.get("file"),
        )

    connection.send_result(msg["id"], result)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/get_last_activity",
        vol.Optional("entity_ids"): [cv.entity_id],
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def handle_get_last_activity(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return last non-unavailable/unknown state timestamp per entity from the recorder DB.

    Returns a dict mapping entity_id → timestamp_ms (Unix milliseconds).
    """
    entity_ids: list[str] | None = msg.get("entity_ids") or None

    try:
        from homeassistant.components.recorder import get_instance  # noqa: PLC0415
        from sqlalchemy import text as sa_text  # noqa: PLC0415
    except ImportError:
        connection.send_result(msg["id"], {})
        return

    try:
        recorder = get_instance(hass)
    except Exception:  # noqa: BLE001
        connection.send_result(msg["id"], {})
        return

    def _run_query() -> dict[str, float]:
        result: dict[str, float] = {}
        CHUNK = 500
        try:
            with recorder.get_session() as session:
                if entity_ids:
                    for i in range(0, len(entity_ids), CHUNK):
                        chunk = entity_ids[i : i + CHUNK]
                        params = {f"e{j}": eid for j, eid in enumerate(chunk)}
                        in_clause = ", ".join(f":e{j}" for j in range(len(chunk)))
                        # in_clause contains only :eN parameter placeholders — not user input
                        _q = (
                            "SELECT sm.entity_id, MAX(s.last_changed_ts)"  # nosec B608
                            " FROM states s"
                            " JOIN states_meta sm ON sm.metadata_id = s.metadata_id"
                            " WHERE sm.entity_id IN (" + in_clause + ")"
                            " AND s.state NOT IN ('unavailable', 'unknown')"
                            " GROUP BY sm.entity_id"
                        )
                        rows = session.execute(sa_text(_q), params).fetchall()
                        for row in rows:
                            if row[1] is not None:
                                result[row[0]] = float(row[1]) * 1000  # s → ms
                else:
                    rows = session.execute(
                        sa_text(
                            """
                            SELECT sm.entity_id, MAX(s.last_changed_ts)
                            FROM states s
                            JOIN states_meta sm ON sm.metadata_id = s.metadata_id
                            WHERE s.state NOT IN ('unavailable', 'unknown')
                            GROUP BY sm.entity_id
                            """
                        )
                    ).fetchall()
                    for row in rows:
                        if row[1] is not None:
                            result[row[0]] = float(row[1]) * 1000
        except Exception as exc:  # noqa: BLE001
            _LOGGER.warning("Last activity recorder query failed: %s", exc)
        return result

    try:
        # Recorder DB work must run on the recorder's own executor, not the
        # generic hass executor, or HA logs a "accesses the database without
        # the database executor" warning.
        result = await recorder.async_add_executor_job(_run_query)
        connection.send_result(msg["id"], result)
    except Exception as err:
        _LOGGER.error("Error in get_last_activity: %s", err, exc_info=True)
        connection.send_error(msg["id"], "query_failed", str(err))


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
    websocket_api.async_register_command(hass, handle_import_entity_states)
    websocket_api.async_register_command(hass, handle_list_hacs_items)
    websocket_api.async_register_command(hass, handle_get_automations)
    websocket_api.async_register_command(hass, handle_get_template_sensors)
    websocket_api.async_register_command(hass, handle_update_entity_display_name)
    websocket_api.async_register_command(hass, handle_remove_entity)
    websocket_api.async_register_command(hass, handle_assign_entity_device)
    websocket_api.async_register_command(hass, handle_unassign_entity_device)
    websocket_api.async_register_command(hass, handle_update_yaml_references)
    websocket_api.async_register_command(hass, handle_get_entity_details)
    websocket_api.async_register_command(hass, handle_get_config_entry_health)
    websocket_api.async_register_command(hass, handle_get_areas_and_floors)
    websocket_api.async_register_command(hass, handle_register_template)
    websocket_api.async_register_command(hass, handle_get_last_activity)
    _LOGGER.debug("Entity Manager WebSocket API commands registered")
