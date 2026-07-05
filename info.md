# Entity Manager

Manage your Home Assistant entities from a single, powerful panel. View, enable, disable, rename, and bulk-manage entities across every integration and device — without digging through individual device pages.

## Key Features

✨ **Organized by Integration & Device** — tree view: Integration → Device → Entity, with Categories / Hardware / Areas & Labels summary boxes on every row and a ⋯ actions menu
🔍 **Powerful Search & Filtering** — fuzzy search, domain filter, state filter, label filter, device-type filter, filter presets
⚡ **Bulk Operations** — enable/disable up to 500 entities at once; bulk rename with regex and live preview
📋 **Entity Detail Dialog** — pinned hero (inline rename, colour-coded state pill, Toggle/Press) over five tabs: Overview, Attributes, Registry, Related, History
🔩 **Device Types** — assign a type to unknown devices, or create your own types with custom colors
🎯 **Opt-in Accent Colors** — color just the integrations that matter; everything else stays neutral
🔔 **Notification Center** — persistent bell dropdown tracking device offline, state anomaly, entity enabled/disabled, and new entity events
🔧 **Health & Cleanup** — identify unavailable entities, orphaned/stale entities, ghost devices, and never-triggered automations/scripts
🔄 **Firmware Update Manager** — sequential bulk updates with live progress ring and optional auto-backup
🏷️ **Labels & Areas** — full HA label and area/floor assignment; label suggestions with one-click bulk apply
✎ **Rename & Propagate** — rename entities with automatic YAML reference updates across your entire HA config (with pre-write backups)
📊 **Stat Wall** — live data stats plus a navigation strip: Auto/Scripts/Helpers, Templates, Health & Cleanup, HACS Store, Card Types, Suggestions, Browsers
🎨 **Theme System** — Refined light/dark design with built-in Light, Dark, High Contrast, and OLED Black themes + custom theme editor
↺ **Undo / Redo** — up to 50 steps with combined history timeline dialog
📱 **Responsive** — optimized for desktop, tablet, and mobile

## Quick Start

1. Install via HACS (add `https://github.com/TheIcelandicguy/entity-manager` as a custom repository)
2. Add the integration: Settings → Devices & Services → Add Integration → "Entity Manager"
3. Click **Entity Manager** in your sidebar

**Note**: Requires admin privileges — all operations modify the HA entity/device registry.
