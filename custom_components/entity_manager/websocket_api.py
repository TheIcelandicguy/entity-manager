"""WebSocket API for Entity Manager."""
import logging
import re
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import entity_registry as er

_LOGGER = logging.getLogger(__name__)

MAX_BULK_ENTITIES = 500
VALID_ENTITY_ID = re.compile(r"^[a-z][a-z0-9_]*\.[a-z0-9_]+$")


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/get_disabled_entities",
        vol.Optional("state", default="disabled"): vol.In(["disabled", "enabled", "all"]),
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
                devices[device_id] = {
                    "device_id": device_id if device_id != "no_device" else None,
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
                        "disabled_by": entity.disabled_by.value if entity.disabled_by else None,
                        "original_name": entity.original_name,
                        "entity_category": entity.entity_category.value if entity.entity_category else None,
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
        vol.Required("entity_id"): str,
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
    entity_reg = er.async_get(hass)
    entity_id = msg["entity_id"]
    
    try:
        entity_reg.async_update_entity(entity_id, disabled_by=None)
        connection.send_result(msg["id"], {"success": True})
    except Exception as err:
        _LOGGER.error("Error enabling entity %s: %s", entity_id, err)
        connection.send_error(msg["id"], "enable_failed", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/disable_entity",
        vol.Required("entity_id"): cv.entity_id,
    }
)
        vol.Required("entity_id"): str,
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
    entity_reg = er.async_get(hass)
    entity_id = msg["entity_id"]
    
    try:
        entity_reg.async_update_entity(entity_id, disabled_by=er.RegistryEntryDisabler.USER)
        connection.send_result(msg["id"], {"success": True})
    except Exception as err:
        _LOGGER.error("Error disabling entity %s: %s", entity_id, err)
        connection.send_error(msg["id"], "disable_failed", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/bulk_enable",
        vol.Required("entity_ids"): vol.All([cv.entity_id], vol.Length(min=1, max=MAX_BULK_ENTITIES)),
    }
)
        vol.Required("entity_ids"): [str],
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
    entity_reg = er.async_get(hass)
    entity_ids = msg["entity_ids"]
    
    results = {"success": [], "failed": []}
    
    for entity_id in entity_ids:
        try:
            entity_reg.async_update_entity(entity_id, disabled_by=None)
            results["success"].append(entity_id)
        except Exception as err:
            _LOGGER.error("Error enabling entity %s: %s", entity_id, err)
            results["failed"].append({"entity_id": entity_id, "error": str(err)})
    
    connection.send_result(msg["id"], results)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/bulk_disable",
        vol.Required("entity_ids"): vol.All([cv.entity_id], vol.Length(min=1, max=MAX_BULK_ENTITIES)),
    }
)
        vol.Required("entity_ids"): [str],
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
    entity_reg = er.async_get(hass)
    entity_ids = msg["entity_ids"]
    
    results = {"success": [], "failed": []}
    
    for entity_id in entity_ids:
        try:
            entity_reg.async_update_entity(entity_id, disabled_by=er.RegistryEntryDisabler.USER)
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
        vol.Required("old_entity_id"): str,
        vol.Required("new_entity_id"): str,
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
        connection.send_result(msg["id"], {
            "success": True,
            "old_entity_id": old_entity_id,
            "new_entity_id": new_entity_id
        })
    except Exception as err:
        _LOGGER.error("Error renaming entity from %s to %s: %s", old_entity_id, new_entity_id, err)
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
                    "disabled_by": entity.disabled_by.value if entity.disabled_by else None,
                    "is_disabled": bool(entity.disabled),
                    "original_name": entity.original_name,
                    "entity_category": entity.entity_category.value if entity.entity_category else None,
                }
            )

        export_data.sort(key=lambda e: e["entity_id"])
        connection.send_result(msg["id"], export_data)
    except Exception as err:
        _LOGGER.error("Error exporting entity states: %s", err, exc_info=True)
        connection.send_error(msg["id"], "export_failed", str(err))


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
    _LOGGER.debug("Entity Manager WebSocket API commands registered")
