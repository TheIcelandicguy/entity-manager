# Quick Start Guide

Get up and running with Entity Manager in under 5 minutes!

## 1. Installation (Choose One)

### Option A: HACS (Easiest)
```
HACS → Integrations → ⋮ → Custom repositories
Add: https://github.com/yourusername/entity-manager
Category: Integration
Download → Restart HA
```

### Option B: Manual
```bash
# Copy custom_components/entity_manager to your HA config
# Restart Home Assistant
```

## 2. Setup

```
Settings → Devices & Services → Add Integration
Search: "Entity Manager" → Submit
```

## 3. Access

Click **"Entity Manager"** in your sidebar!

## 4. First Steps

### View Your Disabled Entities
- You'll see stats at the top showing totals
- Integrations are listed below with entity counts

### Enable Diagnostic Entities (Shelly Example)
1. Click to expand the "shelly" integration
2. Click a device name to see its disabled entities
3. Check boxes next to entities you want to enable
4. Click "Enable Selected" or use "Enable All" button

### Search for Specific Entities
- Type in the search box: "power", "voltage", "diagnostic"
- Results update instantly

### Bulk Operations
- Check multiple entities across different devices
- Use "Enable Selected" to enable them all at once
- Or click "Enable All" on a device/integration header

## 5. Common Tasks

### Enable All Diagnostic Sensors for One Device
```
1. Search for device name
2. Click "Enable All" on device header
3. Done! ✅
```

### Enable Specific Entity Types
```
1. Search "diagnostic"
2. Select entities you want
3. Click "Enable Selected"
```

### Clean Up After Integration Update
```
1. Find the integration
2. Review newly disabled entities
3. Enable what you need
```

## Tips & Tricks

💡 **Remember**: Entities disabled by integration default show "disabled by: integration"

💡 **Pro Tip**: Use search to find entities by type (sensor, binary_sensor, etc.)

💡 **Time Saver**: "Enable All" works at both integration and device level

💡 **Stay Organized**: Only enable diagnostic entities you actually monitor

## Troubleshooting

**Can't find the integration?**
- Clear browser cache (Ctrl+Shift+R)
- Check Settings → System → Logs for errors

**Panel not showing?**
- Refresh browser
- Verify you're logged in as admin

**Can't enable entities?**
- Check you have admin privileges
- Review HA logs for errors

## What's Next?

- Explore all your integrations
- Clean up your entity list
- Share feedback on GitHub!

---

**Need Help?** Check [README.md](README.md) for full documentation or [INSTALL.md](INSTALL.md) for detailed installation steps.
