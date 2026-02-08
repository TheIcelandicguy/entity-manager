# Entity Manager for Home Assistant

A powerful Home Assistant integration for managing entities across all your integrations. View, enable, disable, rename entities, and manage firmware updates with a beautiful modern interface.

![Version](https://img.shields.io/badge/version-2.6.0-blue)
![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2024.1+-blue)
![Downloads](https://img.shields.io/github/downloads/TheIcelandicguy/entity-manager/total?color=brightgreen)
[![HACS](https://img.shields.io/badge/HACS-Custom-orange)](https://github.com/hacs/integration)

## ✨ Features

### 📊 **Entity Management**
- View all entities organized by integration and device
- Enable/disable individual entities or entire integrations
- Bulk operations with confirmation dialogs
- Real-time entity state display
- Alphabetically sorted integrations for easy navigation

### ✏️ **Entity Renaming**
- Rename entities with a simple click
- Automatic propagation across automations, scripts, and helpers
- Validation to prevent conflicts
- Domain preservation (e.g., `sensor.` prefix stays intact)

### 🔄 **Firmware Update Manager**
- View all available updates in one place
- Filter updates by type: All, Stable Only, or Beta Only
- Filter by category: All Types, Devices, or Integrations
- Hide up-to-date items checkbox
- **Select All** checkbox for bulk update selection
- View release notes before updating
- Bulk update multiple items at once
- Automatic hide up-to-date when filtering

### 🔍 **Advanced Filtering**
- **Domain Filter**: Filter by entity domain (sensor, light, switch, binary_sensor, etc.)
- **Text Search**: Search across entity IDs, names, and integrations
- **State Filter**: Show All, Enabled, or Disabled entities with live counts
- **Color-Coded Buttons**: 
  - Green for Enabled filter
  - Red for Disabled filter
  - Amber for Updates filter
  - Bold counts on all filter buttons

### 📈 **Statistics Dashboard**
- Integration count
- Device count
- Total entities count
- Automation count
- Script count
- Helper count

### 🎨 **Modern UI**
- Automatic light/dark theme switching
- Integration logos from Home Assistant brands
- Colored borders and glow effects for better visibility
- Smooth animations and transitions
- Responsive design for mobile and desktop
- Devices grouped by integration in popup dialogs

### ⚠️ **Safety Features**
- Confirmation dialogs for bulk operations
- Clear warnings about automation impacts
- Visual feedback for all actions

## 📦 Installation

### HACS (Recommended)
1. Open HACS in Home Assistant
2. Go to "Integrations"
3. Click the three dots in the top right
4. Select "Custom repositories"
5. Add `https://github.com/TheIcelandicguy/entity-manager` as an Integration
6. Click "Install"
7. Restart Home Assistant

### Manual Installation
1. Download the `entity_manager` folder from this repository
2. Copy it to your Home Assistant `custom_components` directory
3. Restart Home Assistant

## 🚀 Usage

### Accessing Entity Manager
1. After installation, look for "Entity Manager" in the Home Assistant sidebar
2. Or navigate to Configuration → Integrations and find Entity Manager

### Managing Entities

#### **View Entities**
- Click an integration card to expand and see all entities
- Entities show: ID, friendly name, device, state badge, and action buttons
- Integrations are sorted alphabetically

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
- Toggle between All/Enabled/Disabled/Updates views
- Filter buttons show live counts of entities

### Managing Updates

#### **View Updates**
1. Click the "Updates" filter button
2. See all available firmware/software updates
3. Updates with available versions are highlighted

#### **Filter Updates**
- **All Updates**: Show everything
- **Stable Only**: Hide beta/RC/dev versions
- **Beta Only**: Show only beta/RC/dev versions
- **All Types / Devices / Integrations**: Filter by update category
- **Hide Up-to-Date**: Toggle to show only items with pending updates

#### **Bulk Update**
1. Use the "Select All" checkbox to select all available updates
2. Or manually check individual items
3. Click "Update Selected (N)" to update all selected items

## 🎯 Use Cases

### Perfect for:
- **Cleaning up after integrations**: Disable unused entities from integrations that create many entities
- **Organizing large systems**: Manage hundreds of entities efficiently
- **Renaming entities**: Fix naming conventions across your setup
- **Troubleshooting**: Quickly identify and manage problematic entities
- **System optimization**: Disable unnecessary entities to improve performance
- **Firmware management**: Keep all your devices and integrations up to date

## 🔧 Technical Details

### Requirements
- Home Assistant 2024.1 or later
- Modern web browser with ES6 support

### Components
- **Frontend**: Custom web component with vanilla JavaScript
- **Backend**: Python WebSocket API integration
- **Entity Registry**: Direct integration with Home Assistant's entity registry

### API Endpoints
- `entity_manager/get_disabled_entities`: Fetch entities with filtering
- `entity_manager/enable_entity`: Enable a single entity
- `entity_manager/disable_entity`: Disable a single entity
- `entity_manager/bulk_enable`: Enable multiple entities
- `entity_manager/bulk_disable`: Disable multiple entities
- `entity_manager/rename_entity`: Rename an entity

## 📸 Screenshots

### Light Theme
![Entity Manager Light Mode](screenshots/light-mode.png)

### Dark Theme
![Entity Manager Dark Mode](screenshots/dark-mode.png)

### Update Manager
![Update Manager](screenshots/update-manager.png)

### Rename Dialog
![Rename Entity](screenshots/rename-dialog.png)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👤 Author

**TheIcelandicguy**
- GitHub: [@TheIcelandicguy](https://github.com/TheIcelandicguy)

## 🙏 Acknowledgments

- Home Assistant community for inspiration and support
- Material Design Icons for the icon set
- All contributors and users of Entity Manager

## 📋 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed list of changes.

## ⚠️ Disclaimer

This integration modifies your Home Assistant entity registry. While it includes safety features and confirmation dialogs, always backup your configuration before making bulk changes.

---

**If you find this integration helpful, please consider giving it a ⭐ on GitHub!**
