"""Unit tests for websocket_api.py core functions."""

from unittest.mock import MagicMock

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er

from custom_components.entity_manager.websocket_api import (
    _bulk_toggle,
    disable_entity,
    enable_entity,
    handle_bulk_disable,
    handle_bulk_enable,
    handle_disable_entity,
    handle_enable_entity,
    handle_get_disabled_entities,
    handle_remove_entity,
    handle_rename_entity,
    handle_update_entity_display_name,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _register(
    entity_reg: er.EntityRegistry,
    entity_id: str,
    *,
    disabled: bool = False,
) -> er.RegistryEntry:
    """Register a test entity in the entity registry, optionally disabled."""
    domain, obj = entity_id.split(".", 1)
    entry = entity_reg.async_get_or_create(
        domain=domain,
        platform="test",
        unique_id=f"uid_{obj}",
        suggested_object_id=obj,
    )
    if disabled:
        entity_reg.async_update_entity(
            entry.entity_id,
            disabled_by=er.RegistryEntryDisabler.USER,
        )
    return entity_reg.async_get(entity_id)


def _mock_conn() -> MagicMock:
    """Return a MagicMock connection that auto-passes require_admin checks."""
    return MagicMock()


# ---------------------------------------------------------------------------
# enable_entity / disable_entity  (pure-Python helpers, no WS layer)
# ---------------------------------------------------------------------------

async def test_enable_entity_success(hass: HomeAssistant) -> None:
    entity_reg = er.async_get(hass)
    _register(entity_reg, "sensor.enable_me", disabled=True)

    enable_entity(hass, "sensor.enable_me")

    entry = entity_reg.async_get("sensor.enable_me")
    assert entry is not None
    assert entry.disabled_by is None


async def test_enable_entity_not_found(hass: HomeAssistant) -> None:
    with pytest.raises(ValueError, match="not found"):
        enable_entity(hass, "sensor.nonexistent")


async def test_disable_entity_success(hass: HomeAssistant) -> None:
    entity_reg = er.async_get(hass)
    _register(entity_reg, "sensor.disable_me")

    disable_entity(hass, "sensor.disable_me")

    entry = entity_reg.async_get("sensor.disable_me")
    assert entry is not None
    assert entry.disabled_by == er.RegistryEntryDisabler.USER


async def test_disable_entity_not_found(hass: HomeAssistant) -> None:
    with pytest.raises(ValueError, match="not found"):
        disable_entity(hass, "sensor.nonexistent")


# ---------------------------------------------------------------------------
# _bulk_toggle
# ---------------------------------------------------------------------------

async def test_bulk_toggle_enable_all_success(hass: HomeAssistant) -> None:
    entity_reg = er.async_get(hass)
    _register(entity_reg, "sensor.bulk_a", disabled=True)
    _register(entity_reg, "sensor.bulk_b", disabled=True)

    result = _bulk_toggle(hass, ["sensor.bulk_a", "sensor.bulk_b"], "enable")

    assert set(result["success"]) == {"sensor.bulk_a", "sensor.bulk_b"}
    assert result["failed"] == []


async def test_bulk_toggle_enable_partial_failure(hass: HomeAssistant) -> None:
    entity_reg = er.async_get(hass)
    _register(entity_reg, "sensor.bulk_c", disabled=True)

    result = _bulk_toggle(hass, ["sensor.bulk_c", "sensor.bulk_missing"], "enable")

    assert "sensor.bulk_c" in result["success"]
    failed_ids = [f["entity_id"] for f in result["failed"]]
    assert "sensor.bulk_missing" in failed_ids


async def test_bulk_toggle_disable_all_success(hass: HomeAssistant) -> None:
    entity_reg = er.async_get(hass)
    _register(entity_reg, "sensor.bulk_d")
    _register(entity_reg, "sensor.bulk_e")

    result = _bulk_toggle(hass, ["sensor.bulk_d", "sensor.bulk_e"], "disable")

    assert set(result["success"]) == {"sensor.bulk_d", "sensor.bulk_e"}
    assert result["failed"] == []


# ---------------------------------------------------------------------------
# handle_enable_entity  (WebSocket handler)
# ---------------------------------------------------------------------------

async def test_ws_enable_success(hass: HomeAssistant) -> None:
    entity_reg = er.async_get(hass)
    _register(entity_reg, "sensor.ws_enable", disabled=True)
    conn = _mock_conn()
    msg = {"id": 1, "type": "entity_manager/enable_entity", "entity_id": "sensor.ws_enable"}

    handle_enable_entity(hass, conn, msg)
    await hass.async_block_till_done()

    conn.send_result.assert_called_once_with(1, {"success": True})
    conn.send_error.assert_not_called()


async def test_ws_enable_not_found(hass: HomeAssistant) -> None:
    conn = _mock_conn()
    msg = {"id": 2, "type": "entity_manager/enable_entity", "entity_id": "sensor.no_such"}

    handle_enable_entity(hass, conn, msg)
    await hass.async_block_till_done()

    conn.send_error.assert_called_once()
    call_id, error_code = conn.send_error.call_args[0][:2]
    assert call_id == 2
    assert error_code == "enable_failed"


# ---------------------------------------------------------------------------
# handle_disable_entity  (WebSocket handler)
# ---------------------------------------------------------------------------

async def test_ws_disable_success(hass: HomeAssistant) -> None:
    entity_reg = er.async_get(hass)
    _register(entity_reg, "sensor.ws_disable")
    conn = _mock_conn()
    msg = {"id": 3, "type": "entity_manager/disable_entity", "entity_id": "sensor.ws_disable"}

    handle_disable_entity(hass, conn, msg)
    await hass.async_block_till_done()

    conn.send_result.assert_called_once_with(3, {"success": True})
    conn.send_error.assert_not_called()


# ---------------------------------------------------------------------------
# handle_bulk_enable / handle_bulk_disable  (WebSocket handlers)
# ---------------------------------------------------------------------------

async def test_ws_bulk_enable_success(hass: HomeAssistant) -> None:
    entity_reg = er.async_get(hass)
    _register(entity_reg, "sensor.be_a", disabled=True)
    _register(entity_reg, "sensor.be_b", disabled=True)
    conn = _mock_conn()
    msg = {
        "id": 4,
        "type": "entity_manager/bulk_enable",
        "entity_ids": ["sensor.be_a", "sensor.be_b"],
    }

    handle_bulk_enable(hass, conn, msg)
    await hass.async_block_till_done()

    conn.send_result.assert_called_once()
    result = conn.send_result.call_args[0][1]
    assert set(result["success"]) == {"sensor.be_a", "sensor.be_b"}
    assert result["failed"] == []


async def test_ws_bulk_disable_partial(hass: HomeAssistant) -> None:
    entity_reg = er.async_get(hass)
    _register(entity_reg, "sensor.bd_a")
    conn = _mock_conn()
    msg = {
        "id": 5,
        "type": "entity_manager/bulk_disable",
        "entity_ids": ["sensor.bd_a", "sensor.bd_missing"],
    }

    handle_bulk_disable(hass, conn, msg)
    await hass.async_block_till_done()

    conn.send_result.assert_called_once()
    result = conn.send_result.call_args[0][1]
    assert "sensor.bd_a" in result["success"]
    failed_ids = [f["entity_id"] for f in result["failed"]]
    assert "sensor.bd_missing" in failed_ids


# ---------------------------------------------------------------------------
# handle_get_disabled_entities  (WebSocket handler)
# ---------------------------------------------------------------------------

async def test_ws_get_disabled_only(hass: HomeAssistant) -> None:
    entity_reg = er.async_get(hass)
    _register(entity_reg, "sensor.gd_disabled", disabled=True)
    _register(entity_reg, "sensor.gd_enabled")
    conn = _mock_conn()
    msg = {"id": 6, "type": "entity_manager/get_disabled_entities", "state": "disabled"}

    handle_get_disabled_entities(hass, conn, msg)
    await hass.async_block_till_done()

    conn.send_result.assert_called_once()
    integrations = conn.send_result.call_args[0][1]
    all_entity_ids = [
        e["entity_id"]
        for integ in integrations
        for device in integ["devices"].values()
        for e in device["entities"]
    ]
    assert "sensor.gd_disabled" in all_entity_ids
    assert "sensor.gd_enabled" not in all_entity_ids


async def test_ws_get_all(hass: HomeAssistant) -> None:
    entity_reg = er.async_get(hass)
    _register(entity_reg, "sensor.ga_disabled", disabled=True)
    _register(entity_reg, "sensor.ga_enabled")
    conn = _mock_conn()
    msg = {"id": 7, "type": "entity_manager/get_disabled_entities", "state": "all"}

    handle_get_disabled_entities(hass, conn, msg)
    await hass.async_block_till_done()

    conn.send_result.assert_called_once()
    integrations = conn.send_result.call_args[0][1]
    all_entity_ids = [
        e["entity_id"]
        for integ in integrations
        for device in integ["devices"].values()
        for e in device["entities"]
    ]
    assert "sensor.ga_disabled" in all_entity_ids
    assert "sensor.ga_enabled" in all_entity_ids


# ---------------------------------------------------------------------------
# handle_rename_entity  (WebSocket handler)
# ---------------------------------------------------------------------------

async def test_ws_rename_success(hass: HomeAssistant) -> None:
    entity_reg = er.async_get(hass)
    _register(entity_reg, "sensor.rename_old")
    conn = _mock_conn()
    msg = {
        "id": 8,
        "type": "entity_manager/rename_entity",
        "old_entity_id": "sensor.rename_old",
        "new_entity_id": "sensor.rename_new",
    }

    handle_rename_entity(hass, conn, msg)
    await hass.async_block_till_done()

    conn.send_result.assert_called_once()
    result = conn.send_result.call_args[0][1]
    assert result["success"] is True
    assert result["new_entity_id"] == "sensor.rename_new"
    conn.send_error.assert_not_called()


async def test_ws_rename_bad_format(hass: HomeAssistant) -> None:
    """new_entity_id with uppercase letters fails VALID_ENTITY_ID."""
    entity_reg = er.async_get(hass)
    _register(entity_reg, "sensor.rename_src")
    conn = _mock_conn()
    msg = {
        "id": 9,
        "type": "entity_manager/rename_entity",
        "old_entity_id": "sensor.rename_src",
        "new_entity_id": "sensor.Bad_Name",
    }

    handle_rename_entity(hass, conn, msg)
    await hass.async_block_till_done()

    conn.send_error.assert_called_once()
    assert conn.send_error.call_args[0][1] == "rename_failed"


async def test_ws_rename_domain_mismatch(hass: HomeAssistant) -> None:
    entity_reg = er.async_get(hass)
    _register(entity_reg, "sensor.rename_dm")
    conn = _mock_conn()
    msg = {
        "id": 10,
        "type": "entity_manager/rename_entity",
        "old_entity_id": "sensor.rename_dm",
        "new_entity_id": "light.rename_dm",
    }

    handle_rename_entity(hass, conn, msg)
    await hass.async_block_till_done()

    conn.send_error.assert_called_once()
    assert conn.send_error.call_args[0][1] == "rename_failed"


async def test_ws_rename_already_exists(hass: HomeAssistant) -> None:
    entity_reg = er.async_get(hass)
    _register(entity_reg, "sensor.rename_src2")
    _register(entity_reg, "sensor.rename_dst2")
    conn = _mock_conn()
    msg = {
        "id": 11,
        "type": "entity_manager/rename_entity",
        "old_entity_id": "sensor.rename_src2",
        "new_entity_id": "sensor.rename_dst2",
    }

    handle_rename_entity(hass, conn, msg)
    await hass.async_block_till_done()

    conn.send_error.assert_called_once()
    assert conn.send_error.call_args[0][1] == "rename_failed"


# ---------------------------------------------------------------------------
# handle_update_entity_display_name  (WebSocket handler)
# ---------------------------------------------------------------------------

async def test_ws_update_name_success(hass: HomeAssistant) -> None:
    entity_reg = er.async_get(hass)
    _register(entity_reg, "sensor.update_name")
    conn = _mock_conn()
    msg = {
        "id": 12,
        "type": "entity_manager/update_entity_display_name",
        "entity_id": "sensor.update_name",
        "name": "My Sensor",
    }

    handle_update_entity_display_name(hass, conn, msg)
    await hass.async_block_till_done()

    conn.send_result.assert_called_once_with(12, {"success": True})
    conn.send_error.assert_not_called()


async def test_ws_update_name_not_found(hass: HomeAssistant) -> None:
    conn = _mock_conn()
    msg = {
        "id": 13,
        "type": "entity_manager/update_entity_display_name",
        "entity_id": "sensor.no_such",
        "name": "Whatever",
    }

    handle_update_entity_display_name(hass, conn, msg)
    await hass.async_block_till_done()

    conn.send_error.assert_called_once()
    assert conn.send_error.call_args[0][1] == "not_found"


# ---------------------------------------------------------------------------
# handle_remove_entity  (WebSocket handler)
# ---------------------------------------------------------------------------

async def test_ws_remove_success(hass: HomeAssistant) -> None:
    entity_reg = er.async_get(hass)
    _register(entity_reg, "sensor.remove_me")
    conn = _mock_conn()
    msg = {
        "id": 14,
        "type": "entity_manager/remove_entity",
        "entity_id": "sensor.remove_me",
    }

    handle_remove_entity(hass, conn, msg)
    await hass.async_block_till_done()

    conn.send_result.assert_called_once()
    result = conn.send_result.call_args[0][1]
    assert result["success"] is True
    assert result["removed_config_entry"] is False
    conn.send_error.assert_not_called()


async def test_ws_remove_not_found(hass: HomeAssistant) -> None:
    conn = _mock_conn()
    msg = {
        "id": 15,
        "type": "entity_manager/remove_entity",
        "entity_id": "sensor.no_such_remove",
    }

    handle_remove_entity(hass, conn, msg)
    await hass.async_block_till_done()

    conn.send_error.assert_called_once()
    assert conn.send_error.call_args[0][1] == "not_found"
