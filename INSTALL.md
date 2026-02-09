# Installation Guide

## Prerequisites

- Home Assistant 2024.1.0 or newer
- HACS installed (recommended) OR manual installation capability
- Admin access to your Home Assistant instance

## Method 1: HACS Installation (Recommended)

### Step 1: Add Custom Repository

1. Open Home Assistant
2. Go to **HACS** → **Integrations**
3. Click the **three dots** (⋮) in the top right corner
4. Select **Custom repositories**
5. Add the following:
   - **Repository**: `https://github.com/TheIcelandicguy/entity-manager`
   - **Category**: `Integration`
6. Click **Add**

### Step 2: Install the Integration

1. In HACS, search for "Entity Manager"
2. Click on the integration
3. Click **Download**
4. Click **Download** again to confirm
5. Wait for the download to complete

### Step 3: Restart Home Assistant

1. Go to **Settings** → **System**
2. Click **Restart** (top right)
3. Wait for Home Assistant to restart (usually 1-2 minutes)

### Step 4: Add the Integration

1. Go to **Settings** → **Devices & Services**
2. Click **+ Add Integration** (bottom right)
3. Search for "Entity Manager"
4. Click on it to add
5. Click **Submit** on the setup dialog

### Step 5: Access the Panel

Look for "Entity Manager" in your sidebar! 🎉

## Method 2: Manual Installation

### Step 1: Download Files

Download the latest release from GitHub or clone the repository:

```bash
git clone https://github.com/yourusername/entity-manager.git
```

### Step 2: Copy Files

Copy the `custom_components/entity_manager` folder to your Home Assistant installation:

```
<config_dir>/
├── custom_components/
│   └── entity_manager/
│       ├── __init__.py
│       ├── config_flow.py
│       ├── manifest.json
│       ├── strings.json
│       ├── websocket_api.py
│       ├── frontend/
│       │   └── entity-manager-panel.js
│       └── translations/
│           └── en.json
```

Common `<config_dir>` locations:
- **Home Assistant OS**: `/config`
- **Docker**: `/config` (volume mount)
- **Core**: `~/.homeassistant`

### Step 3: Restart Home Assistant

Restart Home Assistant to load the integration.

### Step 4: Add the Integration

Follow steps 4-5 from the HACS method above.

## Verification

After installation, verify everything is working:

1. Check for "Entity Manager" in your sidebar
2. Click on it to open the panel
3. You should see statistics about your disabled entities
4. Try searching for entities
5. Try expanding an integration group

## Troubleshooting

### Integration Not Showing Up

**Problem**: Can't find Entity Manager in Settings → Integrations

**Solutions**:
1. Clear your browser cache (Ctrl+Shift+R or Cmd+Shift+R)
2. Check Home Assistant logs for errors:
   - Go to **Settings** → **System** → **Logs**
   - Search for "entity_manager"
3. Verify files are in the correct location
4. Restart Home Assistant again

### Panel Not Appearing in Sidebar

**Problem**: Integration added but no sidebar menu

**Solutions**:
1. Refresh your browser (F5)
2. Clear browser cache completely
3. Check if you're logged in as an admin user
4. Look for JavaScript errors in browser console (F12)

### WebSocket Errors

**Problem**: "Failed to load disabled entities" error

**Solutions**:
1. Check Home Assistant logs
2. Verify WebSocket API is properly registered
3. Restart Home Assistant
4. Re-add the integration

### Permission Issues

**Problem**: Can't enable/disable entities

**Solutions**:
1. Verify you're logged in as an admin
2. Check entity registry permissions
3. Review Home Assistant logs for errors

## Updating

### Via HACS

1. Go to HACS → Integrations
2. Find "Entity Manager"
3. Click **Update** if available
4. Restart Home Assistant

### Manual Update

1. Download the latest version
2. Replace the files in `custom_components/entity_manager`
3. Restart Home Assistant

## Uninstallation

1. Remove the integration:
   - Go to **Settings** → **Devices & Services**
   - Find "Entity Manager"
   - Click the three dots → **Delete**
2. (Optional) Remove files:
   - Delete `custom_components/entity_manager` folder
3. Restart Home Assistant

## Getting Help

If you encounter issues:

1. Check the [GitHub Issues](https://github.com/yourusername/entity-manager/issues)
2. Review Home Assistant logs
3. Open a new issue with:
   - Home Assistant version
   - Integration version
   - Error logs
   - Steps to reproduce

## Next Steps

- Read the [README](README.md) for usage instructions
- Explore the features
- Provide feedback!
