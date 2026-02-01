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

This integration can be added through the Home Assistant UI:

1. Go to **Settings** → **Devices & Services**
2. Click **+ Add Integration**
3. Search for "Entity Manager"
4. Click to add it

No additional configuration is required.

## Features

- **Sidebar Panel**: Manage entities directly from a dedicated sidebar panel in Home Assistant
- **Services**: Enable/disable entities programmatically through automations and scripts
- **Voice Assistant Support**: Control entities through voice commands (requires additional setup)
- **WebSocket API**: Real-time entity management through WebSocket commands
- **Bulk Operations**: Enable or disable multiple entities at once

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

## Voice Assistant Integration

Entity Manager provides services that can be used with voice assistants like Alexa and Google Home through automations.

### Setup Voice Commands

Create automations to respond to voice commands:

```yaml
automation:
  - alias: "Voice - Disable Entity"
    trigger:
      - platform: conversation
        command: "disable entity *"
    action:
      - service: entity_manager.disable_entity
        data:
          entity_id: "{{ trigger.sentence | replace('disable entity ', '') }}"
  
  - alias: "Voice - Enable Entity"
    trigger:
      - platform: conversation
        command: "enable entity *"
    action:
      - service: entity_manager.enable_entity
        data:
          entity_id: "{{ trigger.sentence | replace('enable entity ', '') }}"
```

### Using with Alexa/Google Home

1. Set up Home Assistant Cloud or Nabu Casa
2. Expose the automation to your voice assistant
3. Say: "Alexa, turn on voice disable entity" or "Hey Google, activate voice enable entity"

Alternatively, create routines in your Alexa or Google Home app that call the Entity Manager services directly.

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

