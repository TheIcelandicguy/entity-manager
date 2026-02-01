"""Entity Manager Integration."""
import logging
from pathlib import Path
from homeassistant.config_entries import ConfigEntry  # type: ignore
from homeassistant.core import HomeAssistant  # type: ignore
from homeassistant.components import frontend  # type: ignore
from homeassistant.components.http import StaticPathConfig  # type: ignore
from homeassistant.helpers import entity_registry as er  # type: ignore

from .websocket_api import async_setup_ws_api
from .voice_assistant import async_setup_intents

_LOGGER = logging.getLogger(__name__)

DOMAIN = "entity_manager"

SERVICE_ENABLE_ENTITY = "enable_entity"
SERVICE_DISABLE_ENTITY = "disable_entity"


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the Entity Manager component."""
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Entity Manager from a config entry."""
    
    # Register frontend resources
    frontend_path = Path(__file__).parent / "frontend"
    await hass.http.async_register_static_paths([
        StaticPathConfig(
            f"/api/{DOMAIN}/frontend",
            str(frontend_path),
            True
        )
    ])
    
    # Register WebSocket API
    async_setup_ws_api(hass)

    # Set up voice assistant intents
    await async_setup_intents(hass)

    # Register services
    entity_reg = er.async_get(hass)

    async def handle_enable_entity(call):
        """Handle enable entity service call."""
        entity_id = call.data.get("entity_id")
        if entity_id:
            try:
                entity_reg.async_update_entity(entity_id, disabled_by=None)
                _LOGGER.info("Enabled entity: %s", entity_id)
            except ValueError as err:
                _LOGGER.error("Failed to enable entity %s: %s", entity_id, err)
            except Exception as err:
                _LOGGER.error("Unexpected error enabling entity %s: %s", entity_id, err)

    async def handle_disable_entity(call):
        """Handle disable entity service call."""
        entity_id = call.data.get("entity_id")
        if entity_id:
            try:
                entity_reg.async_update_entity(
                    entity_id, 
                    disabled_by=er.RegistryEntryDisabler.USER
                )
                _LOGGER.info("Disabled entity: %s", entity_id)
            except ValueError as err:
                _LOGGER.error("Failed to disable entity %s: %s", entity_id, err)
            except Exception as err:
                _LOGGER.error("Unexpected error disabling entity %s: %s", entity_id, err)

    hass.services.async_register(
        DOMAIN,
        SERVICE_ENABLE_ENTITY,
        handle_enable_entity,
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_DISABLE_ENTITY,
        handle_disable_entity,
    )

    # Register the frontend resources
    frontend.async_register_built_in_panel(
        hass,
        component_name="custom",
        sidebar_title="Entity Manager",
        sidebar_icon="mdi:tune",
        frontend_url_path=DOMAIN,
        config={
            "_panel_custom": {
                "name": "entity-manager-panel",
                "embed_iframe": True,
                "trust_external": False,
                "js_url": f"/api/entity_manager/frontend/entity-manager-panel.js",
            }
        },
        require_admin=True,
    )

    _LOGGER.info("Entity Manager panel registered")
    
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    frontend.async_remove_panel(hass, DOMAIN)
    return True
