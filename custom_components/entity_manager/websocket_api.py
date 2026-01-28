"""WebSocket API for Entity Manager."""
import logging
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er

_LOGGER = logging.getLogger(__name__)


@callback
def async_setup_ws_api(hass: HomeAssistant) -> None:
    """Set up the WebSocket API."""
    websocket_api.async_register_command(hass, handle_get_disabled_entities)
    websocket_api.async_register_command(hass, handle_enable_entity)
    websocket_api.async_register_command(hass, handle_disable_entity)
    websocket_api.async_register_command(hass, handle_bulk_enable)
    websocket_api.async_register_command(hass, handle_bulk_disable)


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


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/enable_entity",
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
