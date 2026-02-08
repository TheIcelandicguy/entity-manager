"""Voice assistant intents for Entity Manager."""
import logging
import re

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
        
VALID_ENTITY_ID = re.compile(r"^[a-z][a-z0-9_]*\.[a-z0-9_]+$")


class EnableEntityIntentHandler(intent.IntentHandler):
    """Handle enable entity intent."""

    intent_type = INTENT_ENABLE_ENTITY

    async def async_handle(self, intent_obj) -> intent.IntentResponse:
        """Handle the enable entity intent."""
        # Check admin permission
        user = intent_obj.context.user_id
        if user:
            user_obj = await self.hass.auth.async_get_user(user)
            if user_obj and not user_obj.is_admin:
                response = intent_obj.create_response()
                response.async_set_speech(
                    "Only administrators can enable entities"
                )
                return response

        entity_id = intent_obj.slots.get("entity", {}).get("value")

        if not entity_id:
            response = intent_obj.create_response()
            response.async_set_speech("Please specify which entity to enable")
            return response
        
        entity_reg = er.async_get(self.hass)
        

        if not VALID_ENTITY_ID.match(entity_id):
            response = intent_obj.create_response()
            response.async_set_speech(f"Invalid entity ID: {entity_id}")
            return response

        entity_reg = er.async_get(self.hass)

        try:
            entity_reg.async_update_entity(entity_id, disabled_by=None)
            response = intent_obj.create_response()
            response.async_set_speech(f"Enabled {entity_id}")
            return response
        except Exception as err:
            _LOGGER.error("Error enabling entity: %s", err)
            _LOGGER.error("Error enabling entity %s: %s", entity_id, err)
            response = intent_obj.create_response()
            response.async_set_speech(f"Failed to enable {entity_id}")
            return response


class DisableEntityIntentHandler(intent.IntentHandler):
    """Handle disable entity intent."""
    
    intent_type = INTENT_DISABLE_ENTITY
    
    async def async_handle(self, intent_obj) -> intent.IntentResponse:
        """Handle the disable entity intent."""
        entity_id = intent_obj.slots.get("entity", {}).get("value")
        

    intent_type = INTENT_DISABLE_ENTITY

    async def async_handle(self, intent_obj) -> intent.IntentResponse:
        """Handle the disable entity intent."""
        # Check admin permission
        user = intent_obj.context.user_id
        if user:
            user_obj = await self.hass.auth.async_get_user(user)
            if user_obj and not user_obj.is_admin:
                response = intent_obj.create_response()
                response.async_set_speech(
                    "Only administrators can disable entities"
                )
                return response

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

        if not VALID_ENTITY_ID.match(entity_id):
            response = intent_obj.create_response()
            response.async_set_speech(f"Invalid entity ID: {entity_id}")
            return response

        entity_reg = er.async_get(self.hass)

        try:
            entity_reg.async_update_entity(
                entity_id,
                disabled_by=er.RegistryEntryDisabler.USER,
            )
            response = intent_obj.create_response()
            response.async_set_speech(f"Disabled {entity_id}")
            return response
        except Exception as err:
            _LOGGER.error("Error disabling entity: %s", err)
            _LOGGER.error("Error disabling entity %s: %s", entity_id, err)
            response = intent_obj.create_response()
            response.async_set_speech(f"Failed to disable {entity_id}")
            return response


async def async_setup_intents(hass: HomeAssistant) -> None:
    """Set up voice assistant intents."""
    intent.async_register(hass, EnableEntityIntentHandler())
    intent.async_register(hass, DisableEntityIntentHandler())
