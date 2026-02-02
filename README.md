# Entity Manager for Home Assistant

A powerful Home Assistant integration for managing entities across all your integrations. View, enable, disable, and rename entities with a beautiful modern interface.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2024.1+-blue)
[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)

## ✨ Features

### 📊 **Entity Management**
- View all entities organized by integration and device
- Enable/disable individual entities or entire integrations
- Bulk operations with confirmation dialogs
- Real-time entity state display

### ✏️ **Entity Renaming**
- Rename entities with a simple click
- Automatic propagation across automations, scripts, and helpers
- Validation to prevent conflicts
- Domain preservation (e.g., `sensor.` prefix stays intact)

### 🔍 **Advanced Filtering**
- **Domain Filter**: Filter by entity domain (sensor, light, switch, binary_sensor, etc.)
- **Text Search**: Search across entity IDs, names, and integrations
- **State Filter**: Show All, Enabled, or Disabled entities

### 🎨 **Modern UI**
- Automatic light/dark theme switching
- Integration logos from Home Assistant brands
- Colored borders and glow effects for better visibility
- Smooth animations and transitions
- Responsive design

### 🎤 **Voice Assistant Support**
- Control entities through voice commands
- Works with Alexa and Google Home through automations

### ⚠️ **Safety Features**
- Confirmation dialogs for bulk operations
- Clear warnings about automation impacts
- Visual feedback for all actions

## 📦 Installation

### HACS Installation (Recommended)

#### Adding as a Custom Repository

1. Open HACS in your Home Assistant instance
2. Click on **Integrations**
3. Click the **three dots** (⋮) in the top right corner
4. Select **Custom repositories**
5. In the **Repository** field, enter: `https://github.com/TheIcelandicguy/entity-manager`
6. In the **Category** dropdown, select **Integration**
7. Click **Add**
8. Close the custom repositories dialog
9. Search for **Entity Manager** in HACS
10. Click **Download**
11. Restart Home Assistant

### Manual Installation

1. Download the latest release from the [releases page](https://github.com/TheIcelandicguy/entity-manager/releases) or clone this repository
2. Copy the `custom_components/entity_manager` folder to your Home Assistant `config/custom_components` directory
3. Restart Home Assistant
4. The integration will be automatically loaded

## ⚙️ Configuration

This integration can be added through the Home Assistant UI:

1. Go to **Settings** → **Devices & Services**
2. Click **+ Add Integration**
3. Search for **Entity Manager**
4. Click to add it

No additional configuration is required.

## 🚀 Usage

### Accessing Entity Manager
1. After installation, look for **Entity Manager** in the Home Assistant sidebar
2. Or navigate to **Settings** → **Devices & Services** and find Entity Manager

### Managing Entities

#### **View Entities**
- Click an integration card to expand and see all devices and entities
- Entity cards show: ID, name, state, and action buttons

#### **Enable/Disable Entities**
- Click ✓ (checkmark) to enable an entity
- Click ✕ (x) to disable an entity
- Use "Enable All" or "Disable All" for entire integrations

#### **Rename Entities**
1. Click the ✎ (pencil) button next to an entity
2. Edit the entity name (domain prefix is preserved)
3. Click "Rename" to confirm
4. The change propagates automatically across your entire Home Assistant

#### **Filter & Search**
- Use the domain dropdown to filter by entity type
- Use the search box to find specific entities
- Toggle between All/Enabled/Disabled views

## 🔧 Services

The Entity Manager integration provides services for managing entities programmatically:

### `entity_manager.enable_entity`

Enable a disabled entity.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `entity_id` | Yes | The entity ID to enable |

```yaml
service: entity_manager.enable_entity
data:
  entity_id: sensor.my_sensor
```

### `entity_manager.disable_entity`

Disable an entity.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `entity_id` | Yes | The entity ID to disable |

```yaml
service: entity_manager.disable_entity
data:
  entity_id: sensor.my_sensor
```

## 🎤 Voice Assistant Integration

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

## 📋 Example Automation

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

## 🎯 Use Cases

- **Cleaning up after integrations**: Disable unused entities from integrations that create many entities
- **Organizing large systems**: Manage hundreds of entities efficiently
- **Renaming entities**: Fix naming conventions across your setup
- **Troubleshooting**: Quickly identify and manage problematic entities
- **System optimization**: Disable unnecessary entities to improve performance

## 📋 Requirements

- Home Assistant 2024.1 or later
- Modern web browser with ES6 support

## 📝 Notes

- Entities must exist in the entity registry to be managed
- Disabled entities will not be available in the UI or automations until re-enabled
- Changes take effect immediately but may require a page refresh to see in the UI

## ⚠️ Disclaimer

This integration modifies your Home Assistant entity registry. While it includes safety features and confirmation dialogs, always backup your configuration before making bulk changes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👤 Author

**TheIcelandicguy**
- GitHub: [@TheIcelandicguy](https://github.com/TheIcelandicguy)

## 🙏 Support

For issues, questions, or contributions, please visit the [GitHub repository](https://github.com/TheIcelandicguy/entity-manager).

---

**If you find this integration helpful, please consider giving it a ⭐ on GitHub!**