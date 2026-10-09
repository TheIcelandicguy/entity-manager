"""Entity Manager Integration."""

import hashlib
import json
import logging
from pathlib import Path

import voluptuous as vol
from homeassistant.components import frontend  # type: ignore
from homeassistant.components.http import StaticPathConfig  # type: ignore
from homeassistant.config_entries import ConfigEntry  # type: ignore
from homeassistant.core import HomeAssistant  # type: ignore
from homeassistant.exceptions import (  # type: ignore
    HomeAssistantError,
    ServiceValidationError,
    Unauthorized,
)
from homeassistant.helpers import config_validation as cv  # type: ignore

from .const import DOMAIN
from .rename_log import async_setup_rename_log, async_unload_rename_log
from .voice_assistant import async_setup_intents
from .voice_sentences import async_install_sentences
from .websocket_api import async_setup_ws_api, disable_entity, enable_entity

_LOGGER = logging.getLogger(__name__)

SERVICE_ENABLE_ENTITY = "enable_entity"
SERVICE_DISABLE_ENTITY = "disable_entity"

SERVICE_SCHEMA = vol.Schema(
    {
        vol.Required("entity_id"): cv.entity_id,
    }
)


def _make_service_handler(hass: HomeAssistant, action: str, fn):
    """Build a service handler that delegates to the shared enable/disable helper."""

    async def _handler(call):
        # Admin gate — mirrors @websocket_api.require_admin on the WS commands.
        # Calls without a user context (automations/scripts run by HA itself)
        # are system-initiated and allowed, matching core conventions.
        if call.context.user_id:
            user = await hass.auth.async_get_user(call.context.user_id)
            if user is None or not user.is_admin:
                raise Unauthorized(context=call.context)
        entity_id = call.data["entity_id"]
        try:
            fn(hass, entity_id)
            _LOGGER.info("%s entity: %s", action, entity_id)
        except ValueError as err:
            # Raised, not just logged, so an automation or script sees it fail
            raise ServiceValidationError(
                f"Failed to {action} entity {entity_id}: {err}"
            ) from err
        except Exception as err:
            _LOGGER.error(
                "Unexpected error %sing entity %s: %s", action, entity_id, err
            )
            raise HomeAssistantError(
                f"Unexpected error trying to {action} entity {entity_id}: {err}"
            ) from err

    return _handler


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the Entity Manager component."""
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Entity Manager from a config entry."""

    # Register frontend resources
    frontend_path = Path(__file__).parent / "frontend"
    await hass.http.async_register_static_paths(
        [StaticPathConfig(f"/api/{DOMAIN}/frontend", str(frontend_path), True)]
    )

    # Register WebSocket API
    async_setup_ws_api(hass)

    # Record every entity rename, from any source, in a server-side ledger
    await async_setup_rename_log(hass)

    # Set up voice assistant intents
    await async_setup_intents(hass)
    await async_install_sentences(hass)

    # Register services (delegates to shared helpers in websocket_api)
    hass.services.async_register(
        DOMAIN,
        SERVICE_ENABLE_ENTITY,
        _make_service_handler(hass, "enable", enable_entity),
        schema=SERVICE_SCHEMA,
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_DISABLE_ENTITY,
        _make_service_handler(hass, "disable", disable_entity),
        schema=SERVICE_SCHEMA,
    )

    # Register the frontend panel
    manifest_text = await hass.async_add_executor_job(
        (Path(__file__).parent / "manifest.json").read_text
    )
    version = json.loads(manifest_text).get("version", "0")
    # The static path is served with long cache headers, so the ?v= key must
    # change whenever the panel file does, not only when the version is bumped.
    # Otherwise a redeploy under the same version keeps serving the old panel
    # to every browser and Companion app that already cached it.
    panel_bytes = await hass.async_add_executor_job(
        (frontend_path / "entity-manager-panel.js").read_bytes
    )
    cache_key = f"{version}-{hashlib.sha256(panel_bytes).hexdigest()[:10]}"
    frontend.async_register_built_in_panel(
        hass,
        component_name="custom",
        sidebar_title="Entity Manager",
        sidebar_icon="mdi:tune",
        frontend_url_path=DOMAIN,
        config={
            "_panel_custom": {
                "name": "entity-manager-panel",
                "embed_iframe": False,
                "trust_external": False,
                "js_url": f"/api/entity_manager/frontend/entity-manager-panel.js?v={cache_key}",
                "version": version,
            }
        },
        require_admin=True,
    )

    _LOGGER.info("Entity Manager panel registered")

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    frontend.async_remove_panel(hass, DOMAIN)
    await async_unload_rename_log(hass)
    hass.services.async_remove(DOMAIN, SERVICE_ENABLE_ENTITY)
    hass.services.async_remove(DOMAIN, SERVICE_DISABLE_ENTITY)
    return True
