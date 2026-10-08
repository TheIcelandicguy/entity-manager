"""A server-side ledger of entity renames.

Home Assistant fires ``entity_registry_updated`` with ``old_entity_id`` for
every rename, whoever makes it (this panel, HA's own UI, an integration), so
the ledger listens for that rather than hooking each rename route. It is kept
in ``.storage/entity_manager_renames`` so every browser sees the same history,
which the panel's own undo stack (per-browser localStorage) cannot offer.
"""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.core import Event, HomeAssistant, callback  # type: ignore
from homeassistant.helpers import entity_registry as er  # type: ignore
from homeassistant.helpers.storage import Store  # type: ignore
from homeassistant.util import dt as dt_util  # type: ignore

from .const import DOMAIN, RENAME_LOG_MAX_ENTRIES

_LOGGER = logging.getLogger(__name__)

STORAGE_KEY = "entity_manager_renames"
STORAGE_VERSION = 1
# A bulk rename fires one event per entity; wait for it to settle before writing.
SAVE_DELAY_SECONDS = 10
# Longest chain of renames followed when asking what an ID is called now.
_MAX_HOPS = 50


@callback
def rename_from_event(event: Event[Any]) -> tuple[str, str] | None:
    """``(old, new)`` if this registry event is a rename, else None."""
    data = event.data
    if data.get("action") != "update":
        return None
    old, new = data.get("old_entity_id"), data.get("entity_id")
    if not old or not new or old == new:
        return None
    return old, new


class RenameLog:
    """The newest ``RENAME_LOG_MAX_ENTRIES`` renames, oldest first."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass
        self._store: Store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self.entries: list[dict[str, Any]] = []
        self._unsub: Any = None

    async def async_load(self) -> None:
        data = await self._store.async_load()
        raw = data.get("entries") if isinstance(data, dict) else None
        self.entries = [
            e
            for e in (raw if isinstance(raw, list) else [])
            if isinstance(e, dict) and e.get("old") and e.get("new")
        ][-RENAME_LOG_MAX_ENTRIES:]

    def _data_to_save(self) -> dict[str, Any]:
        return {"entries": self.entries}

    def async_start(self) -> None:
        """Start recording renames."""
        if self._unsub is None:
            self._unsub = self._hass.bus.async_listen(
                er.EVENT_ENTITY_REGISTRY_UPDATED, self._handle
            )

    async def async_stop(self) -> None:
        """Stop recording and write what is still waiting."""
        if self._unsub is not None:
            self._unsub()
            self._unsub = None
        await self._store.async_save(self._data_to_save())

    @callback
    def _handle(self, event: Event[Any]) -> None:
        pair = rename_from_event(event)
        if pair is None:
            return
        self.record(pair[0], pair[1], event.context.user_id)

    @callback
    def record(self, old: str, new: str, user_id: str | None) -> None:
        """Append one rename and schedule a save."""
        self.entries.append(
            {
                "ts": dt_util.utcnow().isoformat(),
                "old": old,
                "new": new,
                "user_id": user_id,
            }
        )
        if len(self.entries) > RENAME_LOG_MAX_ENTRIES:
            del self.entries[: len(self.entries) - RENAME_LOG_MAX_ENTRIES]
        self._store.async_delay_save(self._data_to_save, SAVE_DELAY_SECONDS)

    def now_called(self, entity_id: str) -> str | None:
        """What ``entity_id`` was renamed to, following later renames.

        None when the log has no rename away from it, or the trail loops (an
        entity renamed and then renamed back has no "new" name).
        """
        latest: dict[str, str] = {}
        for entry in self.entries:
            latest[entry["old"]] = entry["new"]
        current = entity_id
        seen = {current}
        for _ in range(_MAX_HOPS):
            nxt = latest.get(current)
            if nxt is None:
                return None if current == entity_id else current
            if nxt in seen:
                return None
            seen.add(nxt)
            current = nxt
        return current


def get_rename_log(hass: HomeAssistant) -> RenameLog | None:
    """The running ledger, or None when the integration is not set up."""
    log = hass.data.get(DOMAIN, {}).get("rename_log")
    return log if isinstance(log, RenameLog) else None


async def async_setup_rename_log(hass: HomeAssistant) -> RenameLog:
    """Load the ledger and start recording; safe to call twice."""
    domain_data = hass.data.setdefault(DOMAIN, {})
    existing = domain_data.get("rename_log")
    if isinstance(existing, RenameLog):
        return existing
    log = RenameLog(hass)
    await log.async_load()
    log.async_start()
    domain_data["rename_log"] = log
    return log


async def async_unload_rename_log(hass: HomeAssistant) -> None:
    """Stop recording and flush the ledger."""
    log = hass.data.get(DOMAIN, {}).pop("rename_log", None)
    if isinstance(log, RenameLog):
        await log.async_stop()
