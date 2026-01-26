"""Services for the Entity Manager integration."""
import logging

from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import entity_registry as er

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

SERVICE_ENABLE_ENTITY = "enable_entity"
SERVICE_DISABLE_ENTITY = "disable_entity"


async def async_setup_services(hass: HomeAssistant) -> None:
    """Set up services for the Entity Manager integration."""
    
    async def async_enable_entity(call: ServiceCall) -> None:
        """Enable an entity."""
        entity_id = call.data.get("entity_id")
        registry = er.async_get(hass)
        
        if entity_id:
            entry = registry.async_get(entity_id)
            if entry:
                registry.async_update_entity(
                    entity_id, disabled_by=None
                )
                _LOGGER.info("Enabled entity: %s", entity_id)
            else:
                _LOGGER.error("Entity not found: %s", entity_id)
        else:
            _LOGGER.error("No entity_id provided")
    
    async def async_disable_entity(call: ServiceCall) -> None:
        """Disable an entity."""
        entity_id = call.data.get("entity_id")
        registry = er.async_get(hass)
        
        if entity_id:
            entry = registry.async_get(entity_id)
            if entry:
                registry.async_update_entity(
                    entity_id, disabled_by=er.RegistryEntryDisabler.USER
                )
                _LOGGER.info("Disabled entity: %s", entity_id)
            else:
                _LOGGER.error("Entity not found: %s", entity_id)
        else:
            _LOGGER.error("No entity_id provided")
    
    hass.services.async_register(
        DOMAIN, SERVICE_ENABLE_ENTITY, async_enable_entity
    )
    hass.services.async_register(
        DOMAIN, SERVICE_DISABLE_ENTITY, async_disable_entity
    )
