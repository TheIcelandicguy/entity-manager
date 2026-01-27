"""Config flow for Entity Manager integration."""
import logging
from typing import Any

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback, HomeAssistant
from homeassistant.helpers import cv

_LOGGER = logging.getLogger(__name__)

DOMAIN = "entity_manager"


def get_available_integrations(hass: HomeAssistant) -> dict[str, str]:
    """Get list of available integrations."""
    integrations = {}
    
    # Get all loaded integrations from config_entries
    for entry in hass.config_entries.async_entries():
        domain = entry.domain
        if domain not in integrations:
            integrations[domain] = entry.title or domain.replace("_", " ").title()
    
    return dict(sorted(integrations.items()))


class EntityManagerConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Entity Manager."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None):
        """Handle the initial step."""
        if user_input is not None:
            # Check if already configured
            await self.async_set_unique_id(DOMAIN)
            self._abort_if_unique_id_configured()
            
            # Get selected integrations
            selected_integrations = user_input.get("integrations", [])
            
            return self.async_create_entry(
                title="Entity Manager",
                data={
                    "managed_integrations": selected_integrations,
                },
            )

        # Get available integrations
        available_integrations = get_available_integrations(self.hass)
        
        if not available_integrations:
            return self.async_abort(reason="no_integrations_found")
        
        # Create schema with integration selector
        data_schema = vol.Schema(
            {
                vol.Optional(
                    "integrations",
                    default=[],
                ): cv.multi_select(available_integrations),
            }
        )

        return self.async_show_form(
            step_id="user",
            data_schema=data_schema,
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        """Get the options flow for this handler."""
        return EntityManagerOptionsFlow(config_entry)


class EntityManagerOptionsFlow(config_entries.OptionsFlow):
    """Handle options flow for Entity Manager."""

    def __init__(self, config_entry):
        """Initialize options flow."""
        self.config_entry = config_entry

    async def async_step_init(self, user_input: dict[str, Any] | None = None):
        """Manage the options."""
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        # Get available integrations
        available_integrations = get_available_integrations(self.hass)
        current_integrations = self.config_entry.data.get("managed_integrations", [])

        data_schema = vol.Schema(
            {
                vol.Optional(
                    "integrations",
                    default=current_integrations,
                ): cv.multi_select(available_integrations),
            }
        )

        return self.async_show_form(
            step_id="init",
            data_schema=data_schema,
        )
