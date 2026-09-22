"""Tests for the voice intents and for installing their sentences."""

from pathlib import Path

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er

from custom_components.entity_manager import SENTENCE_MARKER, _install_sentences
from custom_components.entity_manager.voice_assistant import (
    _EntityIdError,
    _folded_form,
    _resolve_entity_id,
    _spoken_form,
)


def _register(
    entity_reg: er.EntityRegistry, entity_id: str, name: str | None = None
) -> er.RegistryEntry:
    """Register an entity with an original name, disabled entities included."""
    domain, obj = entity_id.split(".", 1)
    return entity_reg.async_get_or_create(
        domain=domain,
        platform="test",
        unique_id=f"uid_{obj}",
        suggested_object_id=obj,
        original_name=name,
    )


# ---------------------------------------------------------------------------
# _spoken_form
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("Eldhús Ljós", "eldhús ljós"),
        ("gr_7_uppthvottavel", "gr 7 uppthvottavel"),
        ("  Living   Room  ", "living room"),
        ("switch.lamp", "switch lamp"),
    ],
)
def test_spoken_form_normalises(raw: str, expected: str) -> None:
    """Case, punctuation and runs of whitespace all collapse."""
    assert _spoken_form(raw) == expected


# ---------------------------------------------------------------------------
# _resolve_entity_id
# ---------------------------------------------------------------------------


async def test_resolve_accepts_a_literal_entity_id(hass: HomeAssistant) -> None:
    """A spoken entity ID is used as-is when it is registered."""
    entity_reg = er.async_get(hass)
    _register(entity_reg, "switch.lamp", "Lamp")
    assert _resolve_entity_id(hass, "switch.lamp") == "switch.lamp"


async def test_resolve_rejects_an_unknown_entity_id(hass: HomeAssistant) -> None:
    """An entity ID that is not registered says so rather than guessing."""
    with pytest.raises(_EntityIdError, match="no entity called switch.ghost"):
        _resolve_entity_id(hass, "switch.ghost")


async def test_resolve_finds_a_disabled_entity_by_name(hass: HomeAssistant) -> None:
    """The whole point: a disabled entity has no state but is in the registry."""
    entity_reg = er.async_get(hass)
    entry = _register(entity_reg, "sensor.rssi", "Eldhús Ljós Signal")
    entity_reg.async_update_entity(
        entry.entity_id, disabled_by=er.RegistryEntryDisabler.USER
    )
    assert _resolve_entity_id(hass, "eldhús ljós signal") == "sensor.rssi"


async def test_resolve_matches_the_object_id_and_partial_names(
    hass: HomeAssistant,
) -> None:
    """Underscores in an object ID read as spaces, and part of a name is enough."""
    entity_reg = er.async_get(hass)
    _register(entity_reg, "switch.gr_7_uppthvottavel", "Dishwasher Power")
    assert _resolve_entity_id(hass, "gr 7 uppthvottavel") == "switch.gr_7_uppthvottavel"
    assert _resolve_entity_id(hass, "dishwasher") == "switch.gr_7_uppthvottavel"


async def test_resolve_prefers_an_exact_name_over_partial_ones(
    hass: HomeAssistant,
) -> None:
    """An exact name wins over a partial one: Lamp, not Lamp Power."""
    entity_reg = er.async_get(hass)
    _register(entity_reg, "switch.lamp", "Lamp")
    _register(entity_reg, "sensor.lamp_power", "Lamp Power")
    assert _resolve_entity_id(hass, "lamp") == "switch.lamp"


async def test_resolve_reports_ambiguity_with_ids_to_choose_from(
    hass: HomeAssistant,
) -> None:
    """Several partial matches ask for the entity ID instead of picking one."""
    entity_reg = er.async_get(hass)
    _register(entity_reg, "sensor.lamp_power", "Lamp Power")
    _register(entity_reg, "sensor.lamp_energy", "Lamp Energy")

    with pytest.raises(_EntityIdError) as err:
        _resolve_entity_id(hass, "lamp")
    message = str(err.value)
    assert "2 entities match" in message
    assert "sensor.lamp_energy" in message
    assert "Please say the entity ID." in message


async def test_resolve_caps_how_many_ids_it_reads_back(hass: HomeAssistant) -> None:
    """A vague phrase does not read out dozens of entity IDs."""
    entity_reg = er.async_get(hass)
    for i in range(6):
        _register(entity_reg, f"sensor.lamp_{i}", f"Lamp {i}")

    with pytest.raises(_EntityIdError) as err:
        _resolve_entity_id(hass, "lamp")
    assert "and 3 more" in str(err.value)


async def test_resolve_needs_something_to_go_on(hass: HomeAssistant) -> None:
    """Whitespace alone is not a name."""
    with pytest.raises(_EntityIdError, match="which entity"):
        _resolve_entity_id(hass, "   ")


async def test_resolve_finds_nothing(hass: HomeAssistant) -> None:
    """An unknown name is reported rather than silently doing nothing."""
    with pytest.raises(_EntityIdError, match="could not find an entity called"):
        _resolve_entity_id(hass, "toaster")


# ---------------------------------------------------------------------------
# _install_sentences
# ---------------------------------------------------------------------------


def _source(tmp_path: Path, text: str) -> Path:
    """A shipped sentences dir holding en/entity_manager.yaml."""
    source_dir = tmp_path / "component" / "sentences" / "en"
    source_dir.mkdir(parents=True)
    (source_dir / "entity_manager.yaml").write_text(text, encoding="utf-8")
    return tmp_path / "component" / "sentences"


SHIPPED = f"{SENTENCE_MARKER}\nlanguage: en\n"


def test_install_copies_into_custom_sentences(tmp_path: Path) -> None:
    """HA reads only <config>/custom_sentences/<lang>/, so the file lands there."""
    source_dir = _source(tmp_path, SHIPPED)
    config_dir = tmp_path / "config"

    assert _install_sentences(source_dir, config_dir) == ["en"]
    target = config_dir / "custom_sentences" / "en" / "entity_manager.yaml"
    assert target.read_text(encoding="utf-8") == SHIPPED


def test_install_is_a_no_op_when_already_current(tmp_path: Path) -> None:
    """An unchanged file reports nothing, so the agent is not reloaded."""
    source_dir = _source(tmp_path, SHIPPED)
    config_dir = tmp_path / "config"
    _install_sentences(source_dir, config_dir)

    assert _install_sentences(source_dir, config_dir) == []


def test_install_refreshes_its_own_copy_on_upgrade(tmp_path: Path) -> None:
    """A copy still carrying the marker is ours to update."""
    source_dir = _source(tmp_path, SHIPPED + "# new sentence\n")
    config_dir = tmp_path / "config"
    target = config_dir / "custom_sentences" / "en" / "entity_manager.yaml"
    target.parent.mkdir(parents=True)
    target.write_text(SHIPPED, encoding="utf-8")

    assert _install_sentences(source_dir, config_dir) == ["en"]
    assert "# new sentence" in target.read_text(encoding="utf-8")


def test_install_never_overwrites_an_edited_copy(tmp_path: Path) -> None:
    """Drop the marker line and the file is the user's, not ours."""
    source_dir = _source(tmp_path, SHIPPED)
    config_dir = tmp_path / "config"
    target = config_dir / "custom_sentences" / "en" / "entity_manager.yaml"
    target.parent.mkdir(parents=True)
    mine = "language: en\n# my own wording\n"
    target.write_text(mine, encoding="utf-8")

    assert _install_sentences(source_dir, config_dir) == []
    assert target.read_text(encoding="utf-8") == mine


# ---------------------------------------------------------------------------
# Icelandic names
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("Eldhús Ljós", "eldhus ljos"),
        ("Baðherbergi Hiti", "badherbergi hiti"),
        ("Þvottahús", "thvottahus"),
        ("Bílskúr Hurð", "bilskur hurd"),
        ("Tafla B Gr.13 Uppþvottavél", "tafla b gr 13 uppthvottavel"),
        ("Öryggi Úti", "oryggi uti"),
    ],
)
def test_folded_form_transliterates_icelandic(raw: str, expected: str) -> None:
    """Accents go, and þ/ð/æ become the letters the entity IDs already use."""
    assert _folded_form(raw) == expected


async def test_resolve_finds_an_icelandic_name_without_accents(
    hass: HomeAssistant,
) -> None:
    """An English STT drops the accents; typing them is a nuisance either way."""
    entity_reg = er.async_get(hass)
    _register(entity_reg, "light.eldhus_ljos", "Eldhús Ljós")
    assert _resolve_entity_id(hass, "eldhus ljos") == "light.eldhus_ljos"
    assert _resolve_entity_id(hass, "Eldhús Ljós") == "light.eldhus_ljos"


async def test_resolve_transliterates_thorn_and_eth(hass: HomeAssistant) -> None:
    """Uppþvottavél is reachable as uppthvottavel, the way its ID is spelled."""
    entity_reg = er.async_get(hass)
    _register(entity_reg, "switch.tafla_b_gr_13", "Tafla B Gr.13 Uppþvottavél")
    assert _resolve_entity_id(hass, "uppthvottavel") == "switch.tafla_b_gr_13"
    _register(entity_reg, "binary_sensor.bad", "Baðherbergi Raki")
    assert _resolve_entity_id(hass, "badherbergi raki") == "binary_sensor.bad"


async def test_resolve_matches_an_alias(hass: HomeAssistant) -> None:
    """Aliases are HA's own answer to a name a voice assistant cannot hear."""
    entity_reg = er.async_get(hass)
    entry = _register(entity_reg, "switch.tafla_b_gr_13", "Tafla B Gr.13 Uppþvottavél")
    entity_reg.async_update_entity(entry.entity_id, aliases={"dishwasher"})
    assert _resolve_entity_id(hass, "dishwasher") == "switch.tafla_b_gr_13"


async def test_accentless_query_still_prefers_an_exact_match(
    hass: HomeAssistant,
) -> None:
    """Folding must not turn an exact name into an ambiguous partial one."""
    entity_reg = er.async_get(hass)
    _register(entity_reg, "light.stofa", "Stofa")
    _register(entity_reg, "sensor.stofa_hiti", "Stofa Hiti")
    assert _resolve_entity_id(hass, "stofa") == "light.stofa"
