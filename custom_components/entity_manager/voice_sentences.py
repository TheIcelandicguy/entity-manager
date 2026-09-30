"""Installing and inspecting the voice sentence files.

HA's conversation agent only reads custom sentences from
``<config>/custom_sentences/<lang>/``, and offers integrations no way to
register their own, so the shipped file has to be copied there on setup.

This lives in its own module rather than in ``__init__``: the Voice section of
the panel reports on the same files, and ``websocket_api`` cannot import
``__init__`` without a cycle.
"""

import logging
from pathlib import Path
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.util.yaml import parse_yaml

_LOGGER = logging.getLogger(__name__)

# First line of the shipped sentence files. A copy that still carries it is
# ours to refresh; a copy without it has been edited and is left alone.
SENTENCE_MARKER = "# Managed by Entity Manager."


def _target_path(config_dir: Path, language: str, name: str) -> Path:
    """Where HA reads a sentence file for one language."""
    return config_dir / "custom_sentences" / language / name


def _install_sentences(
    source_dir: Path, config_dir: Path, force: bool = False
) -> list[str]:
    """Copy sentence files into <config>/custom_sentences/<lang>/.

    Returns the languages whose files changed. ``force`` overwrites a copy the
    user has edited, which only the panel's reinstall button asks for.
    """
    changed: list[str] = []
    for source in sorted(source_dir.glob("*/*.yaml")):
        language = source.parent.name
        target = _target_path(config_dir, language, source.name)
        shipped = source.read_text(encoding="utf-8")
        if target.exists():
            current = target.read_text(encoding="utf-8")
            if current == shipped:
                continue
            if not force and not current.lstrip().startswith(SENTENCE_MARKER):
                _LOGGER.debug(
                    "Leaving edited sentence file alone: %s",
                    target,
                )
                continue
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(shipped, encoding="utf-8")
        changed.append(language)
    return changed


def _parse_intents(text: str) -> dict[str, list[str]]:
    """Return {intent name: [sentence, ...]} from a sentence file's text.

    A file the user has broken parses to nothing rather than raising: the panel
    shows that as "no phrases", which is the truth of what HA would match.
    """
    try:
        data = parse_yaml(text)
    except HomeAssistantError as err:
        _LOGGER.debug("Could not parse sentence file: %s", err)
        return {}
    if not isinstance(data, dict):
        return {}

    intents: dict[str, list[str]] = {}
    for name, body in (data.get("intents") or {}).items():
        sentences: list[str] = []
        for block in (body or {}).get("data") or []:
            sentences.extend(
                s for s in (block or {}).get("sentences") or [] if isinstance(s, str)
            )
        intents[str(name)] = sentences
    return intents


def sentence_status(source_dir: Path, config_dir: Path) -> list[dict[str, Any]]:
    """Report, per language, what HA is actually reading.

    ``phrases`` come from the installed copy when there is one, not from the
    shipped file: an edited copy is what the conversation agent matches on.
    """
    report: list[dict[str, Any]] = []
    for source in sorted(source_dir.glob("*/*.yaml")):
        language = source.parent.name
        target = _target_path(config_dir, language, source.name)
        shipped = source.read_text(encoding="utf-8")

        installed = target.exists()
        current = target.read_text(encoding="utf-8") if installed else ""
        up_to_date = installed and current == shipped
        user_edited = (
            installed
            and not up_to_date
            and not current.lstrip().startswith(SENTENCE_MARKER)
        )

        report.append(
            {
                "language": language,
                "path": str(target),
                "installed": installed,
                "up_to_date": up_to_date,
                # Differs from the shipped file but still carries the marker:
                # an upgrade will refresh it on the next restart.
                "user_edited": user_edited,
                "intents": _parse_intents(current if installed else shipped),
            }
        )
    return report


def _source_dir() -> Path:
    """The sentences shipped inside the component."""
    return Path(__file__).parent / "sentences"


async def async_install_sentences(
    hass: HomeAssistant, force: bool = False
) -> list[str]:
    """Install the voice sentences and reload the agent if they changed."""
    source_dir = _source_dir()
    if not source_dir.is_dir():
        return []
    try:
        changed = await hass.async_add_executor_job(
            _install_sentences, source_dir, Path(hass.config.config_dir), force
        )
    except OSError as err:
        _LOGGER.warning("Could not install voice sentences: %s", err)
        return []
    if not changed:
        return []
    _LOGGER.info("Installed Entity Manager voice sentences for: %s", ", ".join(changed))
    # Without a reload the agent keeps the intents it cached at startup.
    await async_reload_conversation(hass)
    return changed


async def async_reload_conversation(hass: HomeAssistant) -> bool:
    """Reload the conversation agent so it re-reads the sentence files."""
    if not hass.services.has_service("conversation", "reload"):
        return False
    try:
        await hass.services.async_call("conversation", "reload", blocking=True)
    except Exception as err:  # noqa: BLE001
        _LOGGER.warning("Sentences installed but conversation reload failed: %s", err)
        return False
    return True


async def async_sentence_status(hass: HomeAssistant) -> list[dict[str, Any]]:
    """Read the sentence files off disk without blocking the event loop."""
    source_dir = _source_dir()
    if not source_dir.is_dir():
        return []
    return await hass.async_add_executor_job(
        sentence_status, source_dir, Path(hass.config.config_dir)
    )
