"""Basic tests for Entity Manager constants."""

import pytest

from custom_components.entity_manager.const import DOMAIN, MAX_BULK_ENTITIES, VALID_ENTITY_ID


def test_domain():
    assert DOMAIN == "entity_manager"


def test_max_bulk_entities():
    assert MAX_BULK_ENTITIES == 500


@pytest.mark.parametrize("entity_id", [
    "sensor.temperature",
    "light.living_room",
    "binary_sensor.door",
    "switch.fan_1",
    "sensor.a1",
])
def test_valid_entity_id_accepts_valid(entity_id):
    assert VALID_ENTITY_ID.match(entity_id), f"Expected {entity_id!r} to be valid"


@pytest.mark.parametrize("entity_id", [
    "Sensor.temperature",       # uppercase domain
    "sensor.Temperature",       # uppercase object_id
    "sensor.",                  # missing object_id
    ".temperature",             # missing domain
    "sensor",                   # no dot
    "sensor.foo.bar",           # double dot
    "1sensor.foo",              # domain starts with digit
    "sensor.foo bar",           # space in object_id
    "",                         # empty string
])
def test_valid_entity_id_rejects_invalid(entity_id):
    assert not VALID_ENTITY_ID.match(entity_id), f"Expected {entity_id!r} to be invalid"
