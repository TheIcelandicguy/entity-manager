"""Voice assistant intents for Entity Manager."""
import logging

from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import intent

_LOGGER = logging.getLogger(__name__)

INTENT_ENABLE_ENTITY = "entity_manager_enable_entity"
INTENT_DISABLE_ENTITY = "entity_manager_disable_entity"


class EnableEntityIntentHandler(intent.IntentHandler):
    """Handle enable entity intent."""
    
    intent_type = INTENT_ENABLE_ENTITY
    
    async def async_handle(self, intent_obj) -> intent.IntentResponse:
        """Handle the enable entity intent."""
        entity_id = intent_obj.slots.get("entity", {}).get("value")
        
        if not entity_id:
            response = intent_obj.create_response()
            response.async_set_speech("Please specify which entity to enable")
            return response
        
        entity_reg = er.async_get(self.hass)
        
        try:
            entity_reg.async_update_entity(entity_id, disabled_by=None)
            response = intent_obj.create_response()
            response.async_set_speech(f"Enabled {entity_id}")
            return response
        except Exception as err:
            _LOGGER.error("Error enabling entity: %s", err)
            response = intent_obj.create_response()
            response.async_set_speech(f"Failed to enable {entity_id}")
            return response


class DisableEntityIntentHandler(intent.IntentHandler):
    """Handle disable entity intent."""
    
    intent_type = INTENT_DISABLE_ENTITY
    
    async def async_handle(self, intent_obj) -> intent.IntentResponse:
        """Handle the disable entity intent."""
        entity_id = intent_obj.slots.get("entity", {}).get("value")
        
        if not entity_id:
            response = intent_obj.create_response()
            response.async_set_speech("Please specify which entity to disable")
            return response
        
        entity_reg = er.async_get(self.hass)
        
        try:
            entity_reg.async_update_entity(
                entity_id, 
                disabled_by=er.RegistryEntryDisabler.USER
            )
            response = intent_obj.create_response()
            response.async_set_speech(f"Disabled {entity_id}")
            return response
        except Exception as err:
            _LOGGER.error("Error disabling entity: %s", err)
            response = intent_obj.create_response()
            response.async_set_speech(f"Failed to disable {entity_id}")
            return response


async def async_setup_intents(hass: HomeAssistant) -> None:
    """Set up voice assistant intents."""
    intent.async_register(hass, EnableEntityIntentHandler())
    intent.async_register(hass, DisableEntityIntentHandler())
