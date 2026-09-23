"""Unit tests for websocket_api.py core functions."""

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.entity_manager.voice_assistant import async_setup_intents
from custom_components.entity_manager.websocket_api import (
    _bulk_toggle,
    _match_sentence,
    _replace_in_obj,
    _Rewriter,
    disable_entity,
    enable_entity,
    handle_bulk_disable,
    handle_bulk_enable,
    handle_disable_entity,
    handle_enable_entity,
    handle_export_states,
    handle_get_automations,
    handle_get_config_entry_health,
    handle_get_disabled_entities,
    handle_get_entity_details,
    handle_get_template_sensors,
    handle_get_voice_status,
    handle_import_entity_states,
    handle_reinstall_voice_sentences,
    handle_remove_entity,
    handle_rename_entity,
    handle_resolve_voice_target,
    handle_update_entity_display_name,
    handle_update_yaml_references,
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
    msg = {
        "id": 1,
        "type": "entity_manager/enable_entity",
        "entity_id": "sensor.ws_enable",
    }

    handle_enable_entity(hass, conn, msg)
    await hass.async_block_till_done(wait_background_tasks=True)

    conn.send_result.assert_called_once_with(1, {"success": True})
    conn.send_error.assert_not_called()


async def test_ws_enable_not_found(hass: HomeAssistant) -> None:
    conn = _mock_conn()
    msg = {
        "id": 2,
        "type": "entity_manager/enable_entity",
        "entity_id": "sensor.no_such",
    }

    handle_enable_entity(hass, conn, msg)
    await hass.async_block_till_done(wait_background_tasks=True)

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
    msg = {
        "id": 3,
        "type": "entity_manager/disable_entity",
        "entity_id": "sensor.ws_disable",
    }

    handle_disable_entity(hass, conn, msg)
    await hass.async_block_till_done(wait_background_tasks=True)

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
    await hass.async_block_till_done(wait_background_tasks=True)

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
    await hass.async_block_till_done(wait_background_tasks=True)

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
    await hass.async_block_till_done(wait_background_tasks=True)

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
    await hass.async_block_till_done(wait_background_tasks=True)

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
    await hass.async_block_till_done(wait_background_tasks=True)

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
    await hass.async_block_till_done(wait_background_tasks=True)

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
    await hass.async_block_till_done(wait_background_tasks=True)

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
    await hass.async_block_till_done(wait_background_tasks=True)

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
    await hass.async_block_till_done(wait_background_tasks=True)

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
    await hass.async_block_till_done(wait_background_tasks=True)

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
    await hass.async_block_till_done(wait_background_tasks=True)

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
    await hass.async_block_till_done(wait_background_tasks=True)

    conn.send_error.assert_called_once()
    assert conn.send_error.call_args[0][1] == "not_found"


# ---------------------------------------------------------------------------
# handle_get_automations
# ---------------------------------------------------------------------------


async def test_ws_get_automations_returns_all(hass: HomeAssistant) -> None:
    """All automation states are returned with required keys."""
    hass.states.async_set(
        "automation.lights_on",
        "on",
        {"friendly_name": "Lights On", "last_triggered": None},
    )
    hass.states.async_set(
        "automation.alarm_off",
        "off",
        {"friendly_name": "Alarm Off", "last_triggered": None},
    )
    conn = _mock_conn()
    msg = {"id": 20, "type": "entity_manager/get_automations"}

    handle_get_automations(hass, conn, msg)
    await hass.async_block_till_done(wait_background_tasks=True)

    conn.send_result.assert_called_once()
    results = conn.send_result.call_args[0][1]
    assert isinstance(results, list)
    entity_ids = [r["entity_id"] for r in results]
    assert "automation.lights_on" in entity_ids
    assert "automation.alarm_off" in entity_ids

    # Each entry must carry the expected keys
    for item in results:
        for key in ("entity_id", "name", "state", "last_triggered", "triggered_by"):
            assert key in item, f"Missing key '{key}' in automation result"


async def test_ws_get_automations_trigger_context_system(hass: HomeAssistant) -> None:
    """An automation with no context reports triggered_by='system'."""
    hass.states.async_set(
        "automation.context_test",
        "on",
        {"friendly_name": "Context Test"},
    )
    conn = _mock_conn()
    msg = {"id": 21, "type": "entity_manager/get_automations"}

    handle_get_automations(hass, conn, msg)
    await hass.async_block_till_done(wait_background_tasks=True)

    results = conn.send_result.call_args[0][1]
    target = next(r for r in results if r["entity_id"] == "automation.context_test")
    # A state set without a parent_id / user_id resolves to "system"
    assert target["triggered_by"] == "system"


async def test_ws_get_automations_empty(hass: HomeAssistant) -> None:
    """No automation states → returns empty list."""
    conn = _mock_conn()
    msg = {"id": 22, "type": "entity_manager/get_automations"}

    handle_get_automations(hass, conn, msg)
    await hass.async_block_till_done(wait_background_tasks=True)

    conn.send_result.assert_called_once()
    assert conn.send_result.call_args[0][1] == []


# ---------------------------------------------------------------------------
# handle_get_template_sensors
# ---------------------------------------------------------------------------


async def test_ws_get_template_sensors_from_states(hass: HomeAssistant) -> None:
    """template.* states not in the entity registry are still returned."""
    hass.states.async_set(
        "template.my_calc",
        "42",
        {"friendly_name": "My Calculation"},
    )
    conn = _mock_conn()
    msg = {"id": 23, "type": "entity_manager/get_template_sensors"}

    handle_get_template_sensors(hass, conn, msg)
    await hass.async_block_till_done(wait_background_tasks=True)

    conn.send_result.assert_called_once()
    results = conn.send_result.call_args[0][1]
    entity_ids = [r["entity_id"] for r in results]
    assert "template.my_calc" in entity_ids

    target = next(r for r in results if r["entity_id"] == "template.my_calc")
    for key in ("entity_id", "name", "state", "platform", "disabled", "triggered_by"):
        assert key in target, f"Missing key '{key}' in template sensor result"
    assert target["state"] == "42"
    assert target["platform"] == "template"


async def test_ws_get_template_sensors_empty(hass: HomeAssistant) -> None:
    """No template entities or states → returns empty list."""
    conn = _mock_conn()
    msg = {"id": 24, "type": "entity_manager/get_template_sensors"}

    handle_get_template_sensors(hass, conn, msg)
    await hass.async_block_till_done(wait_background_tasks=True)

    conn.send_result.assert_called_once()
    assert conn.send_result.call_args[0][1] == []


# ---------------------------------------------------------------------------
# handle_get_entity_details
# ---------------------------------------------------------------------------


async def test_ws_get_entity_details_success(hass: HomeAssistant) -> None:
    """Returns a well-formed result dict for a registered entity."""
    entity_reg = er.async_get(hass)
    _register(entity_reg, "sensor.detail_test")

    conn = _mock_conn()
    msg = {
        "id": 25,
        "type": "entity_manager/get_entity_details",
        "entity_id": "sensor.detail_test",
    }

    handle_get_entity_details(hass, conn, msg)
    await hass.async_block_till_done(wait_background_tasks=True)

    conn.send_result.assert_called_once()
    result = conn.send_result.call_args[0][1]

    # Top-level shape
    for key in ("entity", "device", "area", "config_entry", "labels"):
        assert key in result, f"Missing top-level key '{key}'"

    # Entity sub-dict shape
    entity_info = result["entity"]
    for key in ("entity_id", "platform", "domain", "unique_id", "disabled_by"):
        assert key in entity_info, f"Missing entity key '{key}'"

    assert entity_info["entity_id"] == "sensor.detail_test"
    assert entity_info["disabled_by"] is None


async def test_ws_get_entity_details_not_found(hass: HomeAssistant) -> None:
    conn = _mock_conn()
    msg = {
        "id": 26,
        "type": "entity_manager/get_entity_details",
        "entity_id": "sensor.no_such_detail",
    }

    handle_get_entity_details(hass, conn, msg)
    await hass.async_block_till_done(wait_background_tasks=True)

    conn.send_error.assert_called_once()
    assert conn.send_error.call_args[0][1] == "not_found"


# ---------------------------------------------------------------------------
# handle_get_config_entry_health
# ---------------------------------------------------------------------------


async def test_ws_get_config_entry_health_all_loaded(hass: HomeAssistant) -> None:
    """When all config entries are loaded the result list is empty."""
    conn = _mock_conn()
    msg = {"id": 27, "type": "entity_manager/get_config_entry_health"}

    handle_get_config_entry_health(hass, conn, msg)
    await hass.async_block_till_done(wait_background_tasks=True)

    conn.send_result.assert_called_once()
    result = conn.send_result.call_args[0][1]
    assert isinstance(result, list)
    # In the test harness every config entry is in the "loaded" state, so none
    # should appear in the unhealthy list.
    loaded_entries = [e for e in result if e.get("state") == "loaded"]
    assert loaded_entries == []


# ---------------------------------------------------------------------------
# handle_update_yaml_references
# ---------------------------------------------------------------------------


async def test_ws_update_yaml_dry_run(hass: HomeAssistant, tmp_path: Path) -> None:
    """dry_run=True scans files but does not write them."""
    # Point HA's config dir at our temp directory
    hass.config.config_dir = str(tmp_path)

    yaml_file = tmp_path / "automations.yaml"
    original = "- entity_id: sensor.old_id\n  state: 'on'\n"
    yaml_file.write_text(original, encoding="utf-8")

    conn = _mock_conn()
    msg = {
        "id": 28,
        "type": "entity_manager/update_yaml_references",
        "old_entity_id": "sensor.old_id",
        "new_entity_id": "sensor.new_id",
        "dry_run": True,
    }

    handle_update_yaml_references(hass, conn, msg)
    await hass.async_block_till_done(wait_background_tasks=True)

    conn.send_result.assert_called_once()
    result = conn.send_result.call_args[0][1]

    assert result["success"] is True
    assert result["dry_run"] is True
    assert result["total_replacements"] == 1
    assert len(result["files_updated"]) == 1

    # File must NOT have been modified
    assert yaml_file.read_text(encoding="utf-8") == original


async def test_ws_update_yaml_applies_replacements(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """dry_run=False writes the replacements to disk."""
    hass.config.config_dir = str(tmp_path)

    yaml_file = tmp_path / "scripts.yaml"
    yaml_file.write_text(
        "entity_id: sensor.alpha\nother: sensor.alpha\n", encoding="utf-8"
    )

    conn = _mock_conn()
    msg = {
        "id": 29,
        "type": "entity_manager/update_yaml_references",
        "old_entity_id": "sensor.alpha",
        "new_entity_id": "sensor.beta",
        "dry_run": False,
    }

    handle_update_yaml_references(hass, conn, msg)
    await hass.async_block_till_done(wait_background_tasks=True)

    result = conn.send_result.call_args[0][1]
    assert result["total_replacements"] == 2
    assert result["dry_run"] is False

    updated = yaml_file.read_text(encoding="utf-8")
    assert "sensor.beta" in updated
    assert "sensor.alpha" not in updated


def test_replace_in_obj_rewrites_values_and_keys() -> None:
    """Nested values and dict keys are rewritten; longer IDs are left alone."""
    rewriter = _Rewriter({"sensor.a": "sensor.b"})
    obj = {
        "sensor.a": {"entity": "sensor.a", "other": "binary_sensor.a"},
        "cards": [{"entities": ["sensor.a", "sensor.ab"]}, 3, None],
    }
    new, count = _replace_in_obj(obj, rewriter)
    assert count == 3
    assert new == {
        "sensor.b": {"entity": "sensor.b", "other": "binary_sensor.a"},
        "cards": [{"entities": ["sensor.b", "sensor.ab"]}, 3, None],
    }


async def test_ws_update_references_config_entry_options(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Config entry options are previewed on dry_run and rewritten otherwise."""
    hass.config.config_dir = str(tmp_path)
    entry = MockConfigEntry(
        domain="test_consumer",
        title="Consumer",
        data={"source": "sensor.old_id"},
        options={"watched": ["sensor.old_id", "sensor.keep"]},
    )
    entry.add_to_hass(hass)

    for msg_id, dry_run in ((31, True), (32, False)):
        conn = _mock_conn()
        handle_update_yaml_references(
            hass,
            conn,
            {
                "id": msg_id,
                "type": "entity_manager/update_yaml_references",
                "old_entity_id": "sensor.old_id",
                "new_entity_id": "sensor.new_id",
                "dry_run": dry_run,
            },
        )
        await hass.async_block_till_done(wait_background_tasks=True)
        result = conn.send_result.call_args[0][1]
        assert result["total_replacements"] == 2
        assert result["files_updated"][0]["kind"] == "config_entry"
        if dry_run:
            assert entry.data["source"] == "sensor.old_id"

    assert entry.data["source"] == "sensor.new_id"
    assert entry.options["watched"] == ["sensor.new_id", "sensor.keep"]
    assert list((tmp_path / ".storage" / "entity_manager_backups").iterdir())


async def test_ws_update_references_reports_manual(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Integration Stores and custom_components are reported, never rewritten."""
    hass.config.config_dir = str(tmp_path)
    storage = tmp_path / ".storage"
    storage.mkdir()
    store_text = '{"data": {"sensor.old_id": 1}}'
    (storage / "some_integration.data").write_text(store_text, encoding="utf-8")
    (storage / "core.restore_state").write_text(store_text, encoding="utf-8")
    comp = tmp_path / "custom_components" / "thing"
    comp.mkdir(parents=True)
    (comp / "const.py").write_text('WATCH = "sensor.old_id"\n', encoding="utf-8")

    conn = _mock_conn()
    handle_update_yaml_references(
        hass,
        conn,
        {
            "id": 33,
            "type": "entity_manager/update_yaml_references",
            "old_entity_id": "sensor.old_id",
            "new_entity_id": "sensor.new_id",
            "dry_run": False,
        },
    )
    await hass.async_block_till_done(wait_background_tasks=True)

    result = conn.send_result.call_args[0][1]
    manual = {
        m["file"].replace("\\", "/"): m["kind"] for m in result["manual_references"]
    }
    assert manual == {
        ".storage/some_integration.data": "storage",
        "custom_components/thing/const.py": "custom_component",
    }
    assert result["total_replacements"] == 0
    assert (storage / "some_integration.data").read_text(encoding="utf-8") == store_text


def test_rewriter_swaps_do_not_chain() -> None:
    """a→b together with b→a swaps the two instead of collapsing onto one."""
    rewriter = _Rewriter({"light.a": "light.b", "light.b": "light.a"})
    text, count = rewriter.sub("on: light.a\noff: light.b\nstates.light.a\n")
    assert count == 2
    assert text == "on: light.b\noff: light.a\nstates.light.a\n"


async def test_ws_update_references_bulk_renames(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A renames list rewrites every pair in one call."""
    hass.config.config_dir = str(tmp_path)
    yaml_file = tmp_path / "automations.yaml"
    yaml_file.write_text(
        "- entity_id: [sensor.one, sensor.two, sensor.three]\n", encoding="utf-8"
    )

    conn = _mock_conn()
    handle_update_yaml_references(
        hass,
        conn,
        {
            "id": 34,
            "type": "entity_manager/update_yaml_references",
            "renames": [
                {"old_entity_id": "sensor.one", "new_entity_id": "sensor.uno"},
                {"old_entity_id": "sensor.two", "new_entity_id": "sensor.dos"},
            ],
            "dry_run": False,
        },
    )
    await hass.async_block_till_done(wait_background_tasks=True)

    result = conn.send_result.call_args[0][1]
    assert result["total_replacements"] == 2
    assert yaml_file.read_text(encoding="utf-8") == (
        "- entity_id: [sensor.uno, sensor.dos, sensor.three]\n"
    )


async def test_ws_update_yaml_no_matches(hass: HomeAssistant, tmp_path: Path) -> None:
    """When the old entity ID does not appear the counts are zero."""
    hass.config.config_dir = str(tmp_path)
    (tmp_path / "config.yaml").write_text("domain: homeassistant\n", encoding="utf-8")

    conn = _mock_conn()
    msg = {
        "id": 30,
        "type": "entity_manager/update_yaml_references",
        "old_entity_id": "sensor.nonexistent",
        "new_entity_id": "sensor.new",
        "dry_run": False,
    }

    handle_update_yaml_references(hass, conn, msg)
    await hass.async_block_till_done(wait_background_tasks=True)

    result = conn.send_result.call_args[0][1]
    assert result["total_replacements"] == 0
    assert result["files_updated"] == []


async def test_ws_update_yaml_skips_snapshots(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """YAML under a snapshots directory is an old copy and is left alone."""
    hass.config.config_dir = str(tmp_path)
    live = tmp_path / "automations.yaml"
    live.write_text("entity_id: sensor.old_snap\n", encoding="utf-8")
    snap_dir = tmp_path / "amira" / "snapshots"
    snap_dir.mkdir(parents=True)
    snap = snap_dir / "automations.yaml"
    snap.write_text("entity_id: sensor.old_snap\n", encoding="utf-8")

    conn = _mock_conn()
    handle_update_yaml_references(
        hass,
        conn,
        {
            "id": 31,
            "type": "entity_manager/update_yaml_references",
            "old_entity_id": "sensor.old_snap",
            "new_entity_id": "sensor.new_snap",
            "dry_run": False,
        },
    )
    await hass.async_block_till_done(wait_background_tasks=True)

    result = conn.send_result.call_args[0][1]
    assert result["total_replacements"] == 1
    assert "sensor.new_snap" in live.read_text(encoding="utf-8")
    assert snap.read_text(encoding="utf-8") == "entity_id: sensor.old_snap\n"
    assert not (snap_dir / "automations.yaml.em-bak").exists()


# ---------------------------------------------------------------------------
# handle_export_states
# ---------------------------------------------------------------------------


async def test_ws_export_states_returns_list(hass: HomeAssistant) -> None:
    """Exported list includes registered entities with required keys."""
    entity_reg = er.async_get(hass)
    _register(entity_reg, "sensor.export_a")
    _register(entity_reg, "sensor.export_b", disabled=True)

    conn = _mock_conn()
    msg = {"id": 40, "type": "entity_manager/export_states"}

    handle_export_states(hass, conn, msg)
    await hass.async_block_till_done(wait_background_tasks=True)

    conn.send_result.assert_called_once()
    result = conn.send_result.call_args[0][1]
    assert isinstance(result, list)

    ids = [e["entity_id"] for e in result]
    assert "sensor.export_a" in ids
    assert "sensor.export_b" in ids

    for item in result:
        for key in ("entity_id", "platform", "is_disabled", "disabled_by"):
            assert key in item, f"Missing key '{key}' in export result"


async def test_ws_export_states_sorted(hass: HomeAssistant) -> None:
    """Export result is sorted by entity_id."""
    entity_reg = er.async_get(hass)
    _register(entity_reg, "sensor.zzz")
    _register(entity_reg, "sensor.aaa")

    conn = _mock_conn()
    msg = {"id": 41, "type": "entity_manager/export_states"}

    handle_export_states(hass, conn, msg)
    await hass.async_block_till_done(wait_background_tasks=True)

    result = conn.send_result.call_args[0][1]
    entity_ids = [e["entity_id"] for e in result]
    assert entity_ids == sorted(entity_ids)


async def test_ws_export_states_disabled_flag(hass: HomeAssistant) -> None:
    """is_disabled is True for disabled entities, False for enabled ones."""
    entity_reg = er.async_get(hass)
    _register(entity_reg, "sensor.exp_enabled")
    _register(entity_reg, "sensor.exp_disabled", disabled=True)

    conn = _mock_conn()
    msg = {"id": 42, "type": "entity_manager/export_states"}

    handle_export_states(hass, conn, msg)
    await hass.async_block_till_done(wait_background_tasks=True)

    result = conn.send_result.call_args[0][1]
    by_id = {e["entity_id"]: e for e in result}
    assert by_id["sensor.exp_enabled"]["is_disabled"] is False
    assert by_id["sensor.exp_disabled"]["is_disabled"] is True


# ---------------------------------------------------------------------------
# handle_import_entity_states
# ---------------------------------------------------------------------------


async def test_ws_import_enables_disabled_entity(hass: HomeAssistant) -> None:
    """Importing with is_disabled=False re-enables a currently-disabled entity."""
    entity_reg = er.async_get(hass)
    _register(entity_reg, "sensor.imp_enable_me", disabled=True)

    conn = _mock_conn()
    msg = {
        "id": 50,
        "type": "entity_manager/import_entity_states",
        "entities": [{"entity_id": "sensor.imp_enable_me", "is_disabled": False}],
    }

    handle_import_entity_states(hass, conn, msg)
    await hass.async_block_till_done(wait_background_tasks=True)

    conn.send_result.assert_called_once()
    result = conn.send_result.call_args[0][1]
    assert result["success"] == 1
    assert result["failed"] == 0

    entry = entity_reg.async_get("sensor.imp_enable_me")
    assert entry is not None
    assert entry.disabled_by is None


async def test_ws_import_disables_enabled_entity(hass: HomeAssistant) -> None:
    """Importing with is_disabled=True disables a currently-enabled entity."""
    entity_reg = er.async_get(hass)
    _register(entity_reg, "sensor.imp_disable_me")

    conn = _mock_conn()
    msg = {
        "id": 51,
        "type": "entity_manager/import_entity_states",
        "entities": [{"entity_id": "sensor.imp_disable_me", "is_disabled": True}],
    }

    handle_import_entity_states(hass, conn, msg)
    await hass.async_block_till_done(wait_background_tasks=True)

    conn.send_result.assert_called_once()
    result = conn.send_result.call_args[0][1]
    assert result["success"] == 1
    assert result["failed"] == 0

    entry = entity_reg.async_get("sensor.imp_disable_me")
    assert entry is not None
    assert entry.disabled_by == er.RegistryEntryDisabler.USER


async def test_ws_import_skips_already_correct_state(hass: HomeAssistant) -> None:
    """Entities already in the correct state count as success (no-op)."""
    entity_reg = er.async_get(hass)
    _register(entity_reg, "sensor.imp_already_enabled")  # already enabled

    conn = _mock_conn()
    msg = {
        "id": 52,
        "type": "entity_manager/import_entity_states",
        "entities": [{"entity_id": "sensor.imp_already_enabled", "is_disabled": False}],
    }

    handle_import_entity_states(hass, conn, msg)
    await hass.async_block_till_done(wait_background_tasks=True)

    result = conn.send_result.call_args[0][1]
    assert result["success"] == 1
    assert result["failed"] == 0


async def test_ws_import_not_found_entity_reported_as_failed(
    hass: HomeAssistant,
) -> None:
    """Entities not in the registry are reported in the failed list."""
    conn = _mock_conn()
    msg = {
        "id": 53,
        "type": "entity_manager/import_entity_states",
        "entities": [{"entity_id": "sensor.imp_nonexistent", "is_disabled": False}],
    }

    handle_import_entity_states(hass, conn, msg)
    await hass.async_block_till_done(wait_background_tasks=True)

    result = conn.send_result.call_args[0][1]
    assert result["success"] == 0
    assert result["failed"] == 1
    failed_ids = [f["entity_id"] for f in result["failed_entities"]]
    assert "sensor.imp_nonexistent" in failed_ids


async def test_ws_import_partial_success(hass: HomeAssistant) -> None:
    """Known entity succeeds; unknown entity fails; counts are accurate."""
    entity_reg = er.async_get(hass)
    _register(entity_reg, "sensor.imp_known")

    conn = _mock_conn()
    msg = {
        "id": 54,
        "type": "entity_manager/import_entity_states",
        "entities": [
            {"entity_id": "sensor.imp_known", "is_disabled": True},
            {"entity_id": "sensor.imp_unknown", "is_disabled": False},
        ],
    }

    handle_import_entity_states(hass, conn, msg)
    await hass.async_block_till_done(wait_background_tasks=True)

    result = conn.send_result.call_args[0][1]
    assert result["success"] == 1
    assert result["failed"] == 1


def _energy_prefs() -> dict:
    """Energy preferences shaped like HA's: two grid sources and a device."""
    return {
        "energy_sources": [
            {
                "type": "grid",
                "flow_from": [
                    {
                        "stat_energy_from": "sensor.old_id",
                        "stat_cost": "sensor.old_id_cost",
                        "entity_energy_price": None,
                    }
                ],
                "flow_to": [],
                "cost_adjustment_day": 0.0,
            },
            {
                "type": "solar",
                "stat_energy_from": "sensor.keep",
                "config_entry_solar_forecast": None,
            },
        ],
        "device_consumption": [
            {"stat_consumption": "sensor.old_id", "name": "Dishwasher"},
        ],
    }


def _patch_energy(manager):
    """Patch the energy manager the rewriter imports inside the function."""
    return patch(
        "homeassistant.components.energy.data.async_get_manager",
        AsyncMock(return_value=manager),
    )


async def test_ws_update_references_rewrites_energy_prefs(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Energy dashboard statistic IDs follow a rename, and a backup is written."""
    hass.config.config_dir = str(tmp_path)
    manager = MagicMock()
    manager.data = _energy_prefs()
    manager.async_update = AsyncMock()

    conn = _mock_conn()
    with _patch_energy(manager):
        handle_update_yaml_references(
            hass,
            conn,
            {
                "id": 34,
                "type": "entity_manager/update_yaml_references",
                "old_entity_id": "sensor.old_id",
                "new_entity_id": "sensor.new_id",
                "dry_run": False,
            },
        )
        await hass.async_block_till_done(wait_background_tasks=True)

    result = conn.send_result.call_args[0][1]
    energy = [f for f in result["files_updated"] if f["kind"] == "energy"]
    # sensor.old_id twice; sensor.old_id_cost and sensor.keep are different IDs
    assert energy == [
        {"file": "energy preferences", "replacements": 2, "kind": "energy"}
    ]

    update = manager.async_update.call_args[0][0]
    assert (
        update["energy_sources"][0]["flow_from"][0]["stat_energy_from"]
        == "sensor.new_id"
    )
    assert (
        update["energy_sources"][0]["flow_from"][0]["stat_cost"] == "sensor.old_id_cost"
    )
    assert update["energy_sources"][1]["stat_energy_from"] == "sensor.keep"
    assert update["device_consumption"][0]["stat_consumption"] == "sensor.new_id"
    assert set(update) <= {
        "energy_sources",
        "device_consumption",
        "device_consumption_water",
    }

    backups = list((tmp_path / ".storage" / "entity_manager_backups").iterdir())
    assert any(b.name.endswith(".energy.json") for b in backups)


async def test_ws_update_references_energy_dry_run(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A preview counts the energy references but writes nothing."""
    hass.config.config_dir = str(tmp_path)
    manager = MagicMock()
    manager.data = _energy_prefs()
    manager.async_update = AsyncMock()

    conn = _mock_conn()
    with _patch_energy(manager):
        handle_update_yaml_references(
            hass,
            conn,
            {
                "id": 35,
                "type": "entity_manager/update_yaml_references",
                "old_entity_id": "sensor.old_id",
                "new_entity_id": "sensor.new_id",
                "dry_run": True,
            },
        )
        await hass.async_block_till_done(wait_background_tasks=True)

    result = conn.send_result.call_args[0][1]
    assert [f for f in result["files_updated"] if f["kind"] == "energy"]
    manager.async_update.assert_not_called()
    assert not (tmp_path / ".storage" / "entity_manager_backups").exists()


async def test_ws_update_references_energy_untouched_and_unreported(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """Prefs without the old ID are left alone, and .storage/energy is not manual."""
    hass.config.config_dir = str(tmp_path)
    storage = tmp_path / ".storage"
    storage.mkdir()
    (storage / "energy").write_text(
        '{"data": {"x": "sensor.old_id"}}', encoding="utf-8"
    )
    manager = MagicMock()
    manager.data = {"energy_sources": [], "device_consumption": []}
    manager.async_update = AsyncMock()

    conn = _mock_conn()
    with _patch_energy(manager):
        handle_update_yaml_references(
            hass,
            conn,
            {
                "id": 36,
                "type": "entity_manager/update_yaml_references",
                "old_entity_id": "sensor.old_id",
                "new_entity_id": "sensor.new_id",
                "dry_run": False,
            },
        )
        await hass.async_block_till_done(wait_background_tasks=True)

    result = conn.send_result.call_args[0][1]
    assert not [f for f in result["files_updated"] if f["kind"] == "energy"]
    manager.async_update.assert_not_called()
    # The file is rewritten through the manager, so it must not be reported as manual
    assert not [m for m in result["manual_references"] if m["file"].endswith("energy")]


# ---------------------------------------------------------------------------
# Voice: resolve_voice_target / get_voice_status / reinstall_voice_sentences
# ---------------------------------------------------------------------------


def test_match_sentence_splits_off_the_wording_that_routes() -> None:
    """ "entity" is what sends a sentence to us; the rest is the name."""
    sentences = [
        {
            "intents": {
                "entity_manager_enable_entity": [
                    "enable entity {em_entity}",
                    "enable the entity {em_entity}",
                ],
                "entity_manager_disable_entity": ["disable entity {em_entity}"],
            }
        }
    ]

    assert _match_sentence("enable entity kitchen light", sentences) == (
        "entity_manager_enable_entity",
        "kitchen light",
    )
    # The longest opening wins, so "the" is not left on the front of the name.
    assert _match_sentence("Enable the entity kitchen light", sentences) == (
        "entity_manager_enable_entity",
        "kitchen light",
    )
    assert _match_sentence("disable entity kitchen light", sentences) == (
        "entity_manager_disable_entity",
        "kitchen light",
    )
    # No recognised wording: HA would never hand this to Entity Manager.
    assert _match_sentence("turn on the kitchen light", sentences) == (
        None,
        "turn on the kitchen light",
    )


async def test_ws_resolve_voice_target_answers_without_writing(
    hass: HomeAssistant,
) -> None:
    """The phrase tester reports what would happen and changes nothing."""
    entity_reg = er.async_get(hass)
    _register(entity_reg, "switch.lamp", disabled=True)
    entity_reg.async_update_entity("switch.lamp", name="Lamp")

    conn = _mock_conn()
    msg = {
        "id": 40,
        "type": "entity_manager/resolve_voice_target",
        "phrase": "enable entity lamp",
    }

    handle_resolve_voice_target(hass, conn, msg)
    await hass.async_block_till_done(wait_background_tasks=True)

    result = conn.send_result.call_args[0][1]
    assert result["intent"] == "entity_manager_enable_entity"
    assert result["spoken"] == "lamp"
    assert result["entity_id"] == "switch.lamp"
    assert result["error"] is None
    assert result["entity"]["disabled"] is True

    entry = entity_reg.async_get("switch.lamp")
    assert entry is not None
    assert entry.disabled_by is er.RegistryEntryDisabler.USER


async def test_ws_resolve_voice_target_flags_unroutable_wording(
    hass: HomeAssistant,
) -> None:
    """A name that resolves is no use if HA never routes the sentence here."""
    entity_reg = er.async_get(hass)
    _register(entity_reg, "switch.lamp")
    entity_reg.async_update_entity("switch.lamp", name="Lamp")

    conn = _mock_conn()
    # A bare name with no Entity Manager wording around it: the entity is found,
    # but Home Assistant would handle the sentence itself and never send it here.
    msg = {
        "id": 41,
        "type": "entity_manager/resolve_voice_target",
        "phrase": "lamp",
    }

    handle_resolve_voice_target(hass, conn, msg)
    await hass.async_block_till_done(wait_background_tasks=True)

    result = conn.send_result.call_args[0][1]
    assert result["intent"] is None
    assert result["spoken"] == "lamp"
    assert result["entity_id"] == "switch.lamp"


async def test_ws_resolve_voice_target_explains_a_miss(hass: HomeAssistant) -> None:
    """A refusal carries the reason and what came closest."""
    entity_reg = er.async_get(hass)
    _register(entity_reg, "light.eldhus_loftljos")
    entity_reg.async_update_entity("light.eldhus_loftljos", name="Eldhús Loftljós")

    conn = _mock_conn()
    msg = {
        "id": 42,
        "type": "entity_manager/resolve_voice_target",
        "phrase": "enable entity eldhus gólfljós",
    }

    handle_resolve_voice_target(hass, conn, msg)
    await hass.async_block_till_done(wait_background_tasks=True)

    result = conn.send_result.call_args[0][1]
    assert result["entity_id"] is None
    assert "could not find" in result["error"]
    assert result["near_misses"][0]["entity_id"] == "light.eldhus_loftljos"


async def test_ws_get_voice_status_reports_the_intents_and_file(
    hass: HomeAssistant,
) -> None:
    """The health card answers "is voice actually wired up here?"."""
    await async_setup_intents(hass)

    conn = _mock_conn()
    msg = {"id": 43, "type": "entity_manager/get_voice_status"}

    handle_get_voice_status(hass, conn, msg)
    await hass.async_block_till_done(wait_background_tasks=True)

    result = conn.send_result.call_args[0][1]
    assert [i["registered"] for i in result["intents"]] == [True, True]
    (sentences,) = result["sentences"]
    assert sentences["language"] == "en"
    # Nothing has been installed into the test config dir.
    assert sentences["installed"] is False
    assert "entity_manager_enable_entity" in sentences["intents"]


async def test_ws_reinstall_voice_sentences_writes_and_reloads(
    hass: HomeAssistant,
) -> None:
    """The reinstall button puts the file back where HA reads it."""
    conn = _mock_conn()
    msg = {
        "id": 44,
        "type": "entity_manager/reinstall_voice_sentences",
        "force": False,
    }

    handle_reinstall_voice_sentences(hass, conn, msg)
    await hass.async_block_till_done(wait_background_tasks=True)

    result = conn.send_result.call_args[0][1]
    assert result["changed"] == ["en"]
    (sentences,) = result["sentences"]
    assert sentences["installed"] is True
    assert sentences["up_to_date"] is True
    assert Path(sentences["path"]).exists()
