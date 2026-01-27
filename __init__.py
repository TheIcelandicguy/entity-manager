"""Entity Manager Integration."""
import logging
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.components import frontend

from .websocket_api import async_setup_ws_api

_LOGGER = logging.getLogger(__name__)

DOMAIN = "entity_manager"


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the Entity Manager component."""
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Entity Manager from a config entry."""
    
    # Register WebSocket API
    async_setup_ws_api(hass)

    # Serve the frontend assets
    await hass.http.async_register_static_paths(
        [
            {
                "url": f"/{DOMAIN}",
                "path": hass.config.path(f"custom_components/{DOMAIN}/frontend"),
                "cache_headers": False,
            }
        ]
    )

    # Register the sidebar panel
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
                "js_url": f"/{DOMAIN}/entity-manager-panel.js",
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
