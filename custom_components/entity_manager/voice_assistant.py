"""Voice assistant intents for Entity Manager.

The sentences use a wildcard slot rather than HA's built-in ``{name}`` list:
that list is built from *exposed* entities, and a disabled entity has no state,
so it can never appear there — which is exactly the case these intents exist
for. What the user said is therefore free text, resolved against the entity
registry here.
"""

import logging
import re
import unicodedata

from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import intent

from .const import VALID_ENTITY_ID

_LOGGER = logging.getLogger(__name__)

INTENT_ENABLE_ENTITY = "entity_manager_enable_entity"
INTENT_DISABLE_ENTITY = "entity_manager_disable_entity"

# The wildcard list in sentences/en/entity_manager.yaml. "entity" is the name
# the pre-3.5 sentences used; accepted so an old custom copy keeps working.
_SLOT_NAMES = ("em_entity", "entity")

# How many candidates to read back when what was said matches several entities
_MAX_AMBIGUOUS = 3


class _EntityIdError(Exception):
    """What the user said could not be resolved to exactly one entity."""


def _spoken_form(text: str) -> str:
    """Normalise for comparison: lowercase, no punctuation, single spaces."""
    return re.sub(r"[\s_.-]+", " ", text.casefold()).strip()


# Icelandic letters with no accent to strip; the transliteration entity IDs
# already use (Uppþvottavél → uppthvottavel).
_TRANSLITERATE = str.maketrans({"þ": "th", "ð": "d", "æ": "ae", "ø": "o", "ß": "ss"})


def _folded_form(text: str) -> str:
    """The spoken form with accents removed, so eldhus finds Eldhús.

    An English speech-to-text engine drops Icelandic accents, and typing them
    is a nuisance, so every name is also compared in this form.
    """
    folded = _spoken_form(text).translate(_TRANSLITERATE)
    decomposed = unicodedata.normalize("NFKD", folded)
    return "".join(ch for ch in decomposed if not unicodedata.combining(ch))


def _resolve_entity_id(hass: HomeAssistant, spoken: str) -> str:
    """Resolve what the user said to one entity ID, disabled entities included.

    Accepts a literal entity ID, a display name, or part of one. Raises
    _EntityIdError with speakable text when there is no match or several.
    """
    entity_reg = er.async_get(hass)
    said = spoken.strip()

    if VALID_ENTITY_ID.match(said):
        if entity_reg.async_get(said) is None:
            raise _EntityIdError(f"There is no entity called {said}")
        return said

    target = _spoken_form(said)
    if not target:
        raise _EntityIdError("Please say which entity you mean")
    targets = {target, _folded_form(said)}

    exact: list[str] = []
    partial: list[str] = []
    for entry in entity_reg.entities.values():
        # isinstance, not truthiness: HA 2026.9 puts a ComputedNameType sentinel
        # in `name` for entities whose name is derived from their device.
        names = [
            name
            for name in (
                entry.name,
                entry.original_name,
                entry.entity_id.split(".")[1],
                *(entry.aliases or ()),  # HA's own answer to an awkward name
            )
            if isinstance(name, str) and name
        ]
        forms = {_spoken_form(name) for name in names}
        forms |= {_folded_form(name) for name in names}
        if targets & forms:
            exact.append(entry.entity_id)
        elif any(t in form for t in targets for form in forms):
            partial.append(entry.entity_id)

    matches = exact or partial
    if not matches:
        raise _EntityIdError(f"I could not find an entity called {said}")
    if len(matches) > 1:
        listed = ", ".join(sorted(matches)[:_MAX_AMBIGUOUS])
        more = (
            f", and {len(matches) - _MAX_AMBIGUOUS} more"
            if len(matches) > _MAX_AMBIGUOUS
            else ""
        )
        raise _EntityIdError(
            f"{len(matches)} entities match {said}: {listed}{more}. "
            "Please say the entity ID."
        )
    return matches[0]


class _EntityManagerIntentHandler(intent.IntentHandler):
    """Shared admin gate and entity resolution for the two intents."""

    verb = ""  # "enable" / "disable"

    async def _async_apply(self, hass: HomeAssistant, entity_id: str) -> None:
        """Write the registry change. Implemented by each subclass."""
        raise NotImplementedError

    async def async_handle(self, intent_obj) -> intent.IntentResponse:
        """Resolve the entity, check the user is an admin, then apply."""
        response = intent_obj.create_response()
        # An IntentHandler has no self.hass; hass comes with the intent.
        hass: HomeAssistant = intent_obj.hass

        # Admin gate mirroring @websocket_api.require_admin. Unlike the
        # services, a voice request with no user context is refused: it is a
        # person speaking, not HA starting up.
        user_id = intent_obj.context.user_id
        user = await hass.auth.async_get_user(user_id) if user_id else None
        if not user or not user.is_admin:
            response.async_set_speech(
                f"Only administrators can {self.verb} entities",
            )
            return response

        spoken = ""
        for slot in _SLOT_NAMES:
            value = intent_obj.slots.get(slot, {}).get("value")
            if value:
                spoken = str(value)
                break

        if not spoken:
            response.async_set_speech(f"Please specify which entity to {self.verb}")
            return response

        try:
            entity_id = _resolve_entity_id(hass, spoken)
        except _EntityIdError as err:
            response.async_set_speech(str(err))
            return response

        try:
            await self._async_apply(hass, entity_id)
        except Exception as err:  # noqa: BLE001
            _LOGGER.error("Error running %s on %s: %s", self.verb, entity_id, err)
            response.async_set_speech(f"Failed to {self.verb} {entity_id}")
            return response

        response.async_set_speech(f"{self.verb.capitalize()}d {entity_id}")
        return response


class EnableEntityIntentHandler(_EntityManagerIntentHandler):
    """Handle enable entity intent."""

    intent_type = INTENT_ENABLE_ENTITY
    verb = "enable"

    async def _async_apply(self, hass: HomeAssistant, entity_id: str) -> None:
        """Clear disabled_by on the entity."""
        er.async_get(hass).async_update_entity(entity_id, disabled_by=None)


class DisableEntityIntentHandler(_EntityManagerIntentHandler):
    """Handle disable entity intent."""

    intent_type = INTENT_DISABLE_ENTITY
    verb = "disable"

    async def _async_apply(self, hass: HomeAssistant, entity_id: str) -> None:
        """Disable the entity as a user action."""
        er.async_get(hass).async_update_entity(
            entity_id, disabled_by=er.RegistryEntryDisabler.USER
        )


async def async_setup_intents(hass: HomeAssistant) -> None:
    """Set up voice assistant intents."""
    intent.async_register(hass, EnableEntityIntentHandler())
    intent.async_register(hass, DisableEntityIntentHandler())
