# entity-manager
Home Assistant integration for managing disabled and enabled entities

## Installation

### Manual Installation

1. Copy the `custom_components/entity_manager` folder to your Home Assistant `custom_components` directory.
2. Restart Home Assistant.
3. The integration will be automatically loaded.

### HACS Installation (Future)

This integration can be added to HACS for easier installation and updates.

## Configuration

This integration is automatically set up and requires no configuration. Simply add it to your `configuration.yaml`:

```yaml
entity_manager:
```

Then restart Home Assistant.

## Services

The Entity Manager integration provides two services for managing entities:

### `entity_manager.enable_entity`

Enable a disabled entity.

**Service Data:**
- `entity_id` (required): The entity ID to enable.

**Example:**
```yaml
service: entity_manager.enable_entity
data:
  entity_id: sensor.my_sensor
```

### `entity_manager.disable_entity`

Disable an entity.

**Service Data:**
- `entity_id` (required): The entity ID to disable.

**Example:**
```yaml
service: entity_manager.disable_entity
data:
  entity_id: sensor.my_sensor
```

## Use Cases

- Programmatically enable/disable entities based on conditions
- Bulk entity management through automations
- Dynamic entity control in scripts
- Integration with other Home Assistant automations

## Example Automation

```yaml
automation:
  - alias: "Disable sensor when away"
    trigger:
      - platform: state
        entity_id: input_boolean.away_mode
        to: 'on'
    action:
      - service: entity_manager.disable_entity
        data:
          entity_id: sensor.energy_monitor
```

## Notes

- Entities must exist in the entity registry to be managed
- Disabled entities will not be available in the UI or automations until re-enabled
- Changes take effect immediately but may require a page refresh to see in the UI

## Support

For issues, questions, or contributions, please visit the [GitHub repository](https://github.com/TheIcelandicguy/entity-manager).

