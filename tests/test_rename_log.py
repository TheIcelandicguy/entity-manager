"""Tests for rename_log.py and the commands that read it."""

from pathlib import Path
from unittest.mock import MagicMock

from homeassistant.core import Event, HomeAssistant
from homeassistant.helpers import entity_registry as er

from custom_components.entity_manager.const import RENAME_LOG_MAX_ENTRIES
from custom_components.entity_manager.rename_log import (
    STORAGE_KEY,
    RenameLog,
    async_setup_rename_log,
    async_unload_rename_log,
    get_rename_log,
    rename_from_event,
)
from custom_components.entity_manager.websocket_api import (
    handle_get_broken_references,
    handle_get_rename_log,
    handle_rename_entity,
)


def _event(**data: object) -> Event:
    return Event(er.EVENT_ENTITY_REGISTRY_UPDATED, data)


def _rename_data(old: str, new: str) -> dict:
    return {
        "action": "update",
        "entity_id": new,
        "old_entity_id": old,
        "changes": {"entity_id": old},
    }


def _register(entity_reg: er.EntityRegistry, entity_id: str) -> None:
    domain, obj = entity_id.split(".", 1)
    entity_reg.async_get_or_create(
        domain=domain,
        platform="test",
        unique_id=f"uid_{obj}",
        suggested_object_id=obj,
    )


# ---------------------------------------------------------------------------
# rename_from_event
# ---------------------------------------------------------------------------


def test_rename_from_event_accepts_only_renames() -> None:
    assert rename_from_event(_event(**_rename_data("sensor.a", "sensor.b"))) == (
        "sensor.a",
        "sensor.b",
    )
    # An update that is not a rename carries no old_entity_id
    assert (
        rename_from_event(
            _event(action="update", entity_id="sensor.a", changes={"name": None})
        )
        is None
    )
    assert rename_from_event(_event(action="create", entity_id="sensor.a")) is None
    assert rename_from_event(_event(action="remove", entity_id="sensor.a")) is None
    assert (
        rename_from_event(
            _event(action="update", entity_id="sensor.a", old_entity_id="sensor.a")
        )
        is None
    )


# ---------------------------------------------------------------------------
# RenameLog
# ---------------------------------------------------------------------------


async def test_record_keeps_who_when_and_what(hass: HomeAssistant) -> None:
    log = RenameLog(hass)
    log.record("sensor.a", "sensor.b", "user-1")

    assert len(log.entries) == 1
    entry = log.entries[0]
    assert (entry["old"], entry["new"], entry["user_id"]) == (
        "sensor.a",
        "sensor.b",
        "user-1",
    )
    assert entry["ts"]


async def test_record_caps_the_log_at_the_newest_entries(hass: HomeAssistant) -> None:
    log = RenameLog(hass)
    for i in range(RENAME_LOG_MAX_ENTRIES + 5):
        log.record(f"sensor.old{i}", f"sensor.new{i}", None)

    assert len(log.entries) == RENAME_LOG_MAX_ENTRIES
    assert log.entries[0]["old"] == "sensor.old5"
    assert log.entries[-1]["old"] == f"sensor.old{RENAME_LOG_MAX_ENTRIES + 4}"


async def test_now_called_follows_a_chain_of_renames(hass: HomeAssistant) -> None:
    log = RenameLog(hass)
    log.record("sensor.a", "sensor.b", None)
    log.record("sensor.b", "sensor.c", None)

    assert log.now_called("sensor.a") == "sensor.c"
    assert log.now_called("sensor.b") == "sensor.c"
    assert log.now_called("sensor.c") is None
    assert log.now_called("sensor.never_renamed") is None


async def test_now_called_is_none_when_renamed_back(hass: HomeAssistant) -> None:
    log = RenameLog(hass)
    log.record("sensor.a", "sensor.b", None)
    log.record("sensor.b", "sensor.a", None)

    assert log.now_called("sensor.a") is None
    assert log.now_called("sensor.b") is None


async def test_load_drops_malformed_entries(
    hass: HomeAssistant, hass_storage: dict
) -> None:
    hass_storage[STORAGE_KEY] = {
        "version": 1,
        "key": STORAGE_KEY,
        "data": {
            "entries": [
                {
                    "ts": "2026-10-08T10:00:00+00:00",
                    "old": "sensor.a",
                    "new": "sensor.b",
                },
                {"old": "sensor.no_new"},
                "junk",
                {"ts": "x", "old": "", "new": "sensor.c"},
            ]
        },
    }
    log = RenameLog(hass)
    await log.async_load()

    assert [(e["old"], e["new"]) for e in log.entries] == [("sensor.a", "sensor.b")]


async def test_load_with_no_file_starts_empty(hass: HomeAssistant) -> None:
    log = RenameLog(hass)
    await log.async_load()
    assert log.entries == []


# ---------------------------------------------------------------------------
# listening for renames
# ---------------------------------------------------------------------------


async def test_a_rename_from_outside_entity_manager_has_no_user(
    hass: HomeAssistant,
) -> None:
    """HA's registry events carry no user, so nothing can name one."""
    log = await async_setup_rename_log(hass)

    hass.bus.async_fire(
        er.EVENT_ENTITY_REGISTRY_UPDATED, _rename_data("light.old", "light.new")
    )
    hass.bus.async_fire(
        er.EVENT_ENTITY_REGISTRY_UPDATED,
        {"action": "update", "entity_id": "light.new", "changes": {"name": None}},
    )
    await hass.async_block_till_done()

    assert [(e["old"], e["new"], e["user_id"]) for e in log.entries] == [
        ("light.old", "light.new", None)
    ]


async def test_expect_names_the_user_for_that_one_rename(hass: HomeAssistant) -> None:
    log = await async_setup_rename_log(hass)
    log.expect("light.old", "light.new", "user-1")

    hass.bus.async_fire(
        er.EVENT_ENTITY_REGISTRY_UPDATED, _rename_data("light.old", "light.new")
    )
    # the expectation is used up: the same rename again has no user
    hass.bus.async_fire(
        er.EVENT_ENTITY_REGISTRY_UPDATED, _rename_data("light.old", "light.new")
    )
    await hass.async_block_till_done()

    assert [e["user_id"] for e in log.entries] == ["user-1", None]


async def test_forget_drops_an_expectation(hass: HomeAssistant) -> None:
    log = await async_setup_rename_log(hass)
    log.expect("light.old", "light.new", "user-1")
    log.forget("light.old", "light.new")

    hass.bus.async_fire(
        er.EVENT_ENTITY_REGISTRY_UPDATED, _rename_data("light.old", "light.new")
    )
    await hass.async_block_till_done()

    assert log.entries[0]["user_id"] is None


async def test_rename_entity_command_records_the_admin(hass: HomeAssistant) -> None:
    log = await async_setup_rename_log(hass)
    entity_reg = er.async_get(hass)
    _register(entity_reg, "light.before")
    conn = MagicMock()
    conn.user.id = "admin-1"

    handle_rename_entity(
        hass,
        conn,
        {
            "id": 9,
            "type": "entity_manager/rename_entity",
            "old_entity_id": "light.before",
            "new_entity_id": "light.after",
        },
    )
    await hass.async_block_till_done(wait_background_tasks=True)

    assert [(e["old"], e["new"], e["user_id"]) for e in log.entries] == [
        ("light.before", "light.after", "admin-1")
    ]


async def test_a_failed_rename_leaves_no_expectation(hass: HomeAssistant) -> None:
    log = await async_setup_rename_log(hass)
    entity_reg = er.async_get(hass)
    _register(entity_reg, "light.before")
    _register(entity_reg, "light.taken")
    conn = MagicMock()
    conn.user.id = "admin-1"

    handle_rename_entity(
        hass,
        conn,
        {
            "id": 10,
            "type": "entity_manager/rename_entity",
            "old_entity_id": "light.before",
            "new_entity_id": "light.taken",
        },
    )
    await hass.async_block_till_done(wait_background_tasks=True)

    assert conn.send_error.called
    assert log.entries == []
    assert log._expected == {}  # noqa: SLF001


async def test_setup_twice_returns_the_same_log(hass: HomeAssistant) -> None:
    first = await async_setup_rename_log(hass)
    second = await async_setup_rename_log(hass)

    assert first is second
    assert get_rename_log(hass) is first


async def test_unload_flushes_to_storage_and_stops_listening(
    hass: HomeAssistant, hass_storage: dict
) -> None:
    log = await async_setup_rename_log(hass)
    hass.bus.async_fire(
        er.EVENT_ENTITY_REGISTRY_UPDATED, _rename_data("light.old", "light.new")
    )
    await hass.async_block_till_done()

    await async_unload_rename_log(hass)

    saved = hass_storage[STORAGE_KEY]["data"]["entries"]
    assert [(e["old"], e["new"]) for e in saved] == [("light.old", "light.new")]
    assert get_rename_log(hass) is None

    hass.bus.async_fire(
        er.EVENT_ENTITY_REGISTRY_UPDATED, _rename_data("light.x", "light.y")
    )
    await hass.async_block_till_done()
    assert len(log.entries) == 1


async def test_a_real_registry_rename_is_logged(hass: HomeAssistant) -> None:
    log = await async_setup_rename_log(hass)
    entity_reg = er.async_get(hass)
    _register(entity_reg, "light.before")

    entity_reg.async_update_entity("light.before", new_entity_id="light.after")
    await hass.async_block_till_done()

    assert [(e["old"], e["new"]) for e in log.entries] == [
        ("light.before", "light.after")
    ]


# ---------------------------------------------------------------------------
# get_rename_log
# ---------------------------------------------------------------------------


async def test_ws_get_rename_log_without_a_log_is_empty(hass: HomeAssistant) -> None:
    conn = MagicMock()
    handle_get_rename_log(
        hass, conn, {"id": 1, "type": "entity_manager/get_rename_log", "limit": 100}
    )
    await hass.async_block_till_done(wait_background_tasks=True)

    assert conn.send_result.call_args[0][1] == {"entries": [], "total": 0}


async def test_ws_get_rename_log_newest_first_with_undo_flags(
    hass: HomeAssistant,
) -> None:
    log = await async_setup_rename_log(hass)
    user = await hass.auth.async_create_user("Davíð")
    entity_reg = er.async_get(hass)
    _register(entity_reg, "light.moved_ok")  # new exists, old is free
    _register(entity_reg, "light.moved_but_old_taken")
    _register(entity_reg, "light.old_taken")  # the old ID was reused
    log.record("light.moved_ok_was", "light.moved_ok", user.id)
    log.record("light.gone_was", "light.gone", None)  # new no longer exists
    log.record("light.old_taken", "light.moved_but_old_taken", None)

    conn = MagicMock()
    handle_get_rename_log(
        hass, conn, {"id": 2, "type": "entity_manager/get_rename_log", "limit": 100}
    )
    await hass.async_block_till_done(wait_background_tasks=True)

    result = conn.send_result.call_args[0][1]
    assert result["total"] == 3
    newest, middle, oldest = result["entries"]

    assert newest["new"] == "light.moved_but_old_taken"
    assert newest["exists"] is True
    assert newest["can_undo"] is False  # old ID is taken again

    assert middle["new"] == "light.gone"
    assert middle["exists"] is False
    assert middle["can_undo"] is False
    assert middle["user"] is None

    assert oldest["new"] == "light.moved_ok"
    assert oldest["exists"] is True
    assert oldest["can_undo"] is True
    assert oldest["user"] == "Davíð"
    assert oldest["user_id"] == user.id


async def test_ws_get_rename_log_honours_the_limit(hass: HomeAssistant) -> None:
    log = await async_setup_rename_log(hass)
    for i in range(5):
        log.record(f"sensor.old{i}", f"sensor.new{i}", None)

    conn = MagicMock()
    handle_get_rename_log(
        hass, conn, {"id": 3, "type": "entity_manager/get_rename_log", "limit": 2}
    )
    await hass.async_block_till_done(wait_background_tasks=True)

    result = conn.send_result.call_args[0][1]
    assert result["total"] == 5
    assert [e["old"] for e in result["entries"]] == ["sensor.old4", "sensor.old3"]


# ---------------------------------------------------------------------------
# Broken References: "now called"
# ---------------------------------------------------------------------------


async def test_broken_reference_says_where_a_renamed_entity_went(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    hass.config.config_dir = str(tmp_path)
    log = await async_setup_rename_log(hass)
    entity_reg = er.async_get(hass)
    _register(entity_reg, "light.after")
    (tmp_path / "automations.yaml").write_text(
        "- entity_id: light.before\n", encoding="utf-8"
    )
    log.record("light.before", "light.after", None)

    conn = MagicMock()
    handle_get_broken_references(
        hass, conn, {"id": 4, "type": "entity_manager/get_broken_references"}
    )
    await hass.async_block_till_done(wait_background_tasks=True)

    entities = conn.send_result.call_args[0][1]["sources"][0]["entities"]
    assert entities == [
        {"entity_id": "light.before", "reason": None, "now_called": "light.after"}
    ]


async def test_broken_reference_has_no_now_called_when_the_target_is_gone(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    hass.config.config_dir = str(tmp_path)
    log = await async_setup_rename_log(hass)
    entity_reg = er.async_get(hass)
    _register(entity_reg, "light.real")  # makes "light" a known domain
    (tmp_path / "automations.yaml").write_text(
        "- entity_id: light.before\n", encoding="utf-8"
    )
    log.record("light.before", "light.deleted_since", None)

    conn = MagicMock()
    handle_get_broken_references(
        hass, conn, {"id": 5, "type": "entity_manager/get_broken_references"}
    )
    await hass.async_block_till_done(wait_background_tasks=True)

    entities = conn.send_result.call_args[0][1]["sources"][0]["entities"]
    assert entities == [{"entity_id": "light.before", "reason": None}]
