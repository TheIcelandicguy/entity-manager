"""Basic tests for Entity Manager constants."""

from custom_components.entity_manager.const import DOMAIN, MAX_BULK_ENTITIES


def test_domain():
    assert DOMAIN == "entity_manager"


def test_max_bulk_entities():
    assert MAX_BULK_ENTITIES > 0
