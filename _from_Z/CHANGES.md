# Entity Manager UI Changes

## Version 2.0.6 - UI Overhaul, Theme Consistency & Firmware Update Manager

### Overview
Complete redesign of the Entity Manager UI with consistent color theming, improved mobile responsiveness, better light/dark mode support, and a new firmware update management feature with stable/beta filtering.

---

## Major Changes

### 1. Firmware Update Manager (NEW)
**New dedicated tab for managing firmware updates:**
- **Updates Tab**: New 4th filter button to view all available updates
- **Update Filter**: Dropdown to filter between:
  - All Updates
  - Stable Only (excludes beta/rc/dev versions)
  - Beta Only (shows only beta/rc/dev versions)
- **Bulk Update**: Select multiple updates and install them all at once
- **Individual Updates**: Each update has its own update button
- **Release Notes**: Direct links to release notes when available
- **Version Display**: Shows current version and latest available version
- **Visual Indicators**:
  - Orange highlight for available updates
  - Blue accent for beta versions
  - Green checkmark for up-to-date items
- **Update Status**: Clear display showing current vs. latest version
- **Smart Detection**: Automatically identifies stable vs. beta based on version naming patterns

### 2. Consistent Color Theme
**All UI elements now follow a unified color scheme:**
- **Primary Color**: Blue (`#2196f3`) for all borders
- **Success Color**: Green (`#4caf50`) for enabled states
- **Danger Color**: Red (`#f44336`) for disabled states
- **Warning Color**: Orange (`#ff9800`) for update indicators
- **Borders**: All borders are 2px solid blue in both light and dark modes

### 3. Light/Dark Mode Support
**Light Mode:**
- Text: Black (`#000000`)
- Secondary Text: Gray (`#666666`)
- Background: White (`#ffffff`)
- Secondary Background: Light Gray (`#f5f5f5`)

**Dark Mode:**
- Text: White (`#ffffff`)
- Secondary Text: Light Gray (`#cccccc`)
- Background: Dark Gray (`#1e1e1e`)
- Secondary Background: Darker Gray (`#2d2d2d`)

**Theme Detection:**
- Multiple detection methods for Home Assistant themes
- System preference support via `prefers-color-scheme`
- Automatic theme switching with MutationObserver

### 3. Mobile Responsive Design
**Complete mobile optimization:**
- Reduced padding and spacing for mobile screens
- Full-width buttons and filters
- Stacked toolbar elements
- Grid layout for entity items preventing overflow
- Better text wrapping and word breaks
- Touch-friendly button sizes

**Breakpoints:**
- `@media (max-width: 768px)` - Tablets and mobile
- `@media (max-width: 480px)` - Small phones

### 4. Entity Status Badges
**Changed from state display to status display:**
- Shows "Enabled" with green background for enabled entities
- Shows "Disabled" with red background for disabled entities
- Replaced the "unknown" state display with clear status indicators

### 5. Button Styling
**All buttons updated with consistent styling:**
- Blue borders throughout
- Enable buttons: Green borders and text
- Disable buttons: Red borders and text
- Rename buttons: Blue borders and text
- Proper hover states with background fills
- White text on colored backgrounds when active

### 6. Search Box & Input Fields
**Unified input styling:**
- Blue borders (2px solid)
- Proper background colors for light/dark modes
- Placeholder text uses secondary text color
- Focus states with blue highlight
- Consistent styling for search box and rename input

### 7. Entity Items
**Desktop:**
- Blue borders around each entity
- Proper background colors
- Clear hover states

**Mobile:**
- Grid layout (checkbox, info, actions)
- Blue borders visible on dark backgrounds
- Proper text wrapping
- Actions aligned at bottom right

### 8. Integration & Device Cards
**Consistent card styling:**
- Blue borders for all cards
- Proper backgrounds for light/dark modes
- Enable All / Disable All buttons with color-coded borders
- Better spacing and alignment on mobile

---

## Technical Changes

### CSS Variables Added
```css
--em-primary: #2196f3;
--em-success: #4caf50;
--em-danger: #f44336;
--em-warning: #ff9800;
--em-text-primary: (black/white based on theme)
--em-text-secondary: (gray based on theme)
--em-bg-primary: (white/dark based on theme)
--em-bg-secondary: (light-gray/darker-gray based on theme)
--em-border: #2196f3;
```

### JavaScript Updates
**Enhanced `updateTheme()` method:**
- Checks `data-theme` attribute
- Checks computed background colors
- Checks text colors
- Falls back to system preference
- Sets `data-theme` attribute on component

**New Update Manager Functions:**
- `loadUpdates()` - Fetches all update entities from Home Assistant
- `renderUpdates()` - Displays filtered update list with version info
- `renderUpdateItem()` - Creates HTML for individual update items
- `attachUpdateListeners()` - Handles checkbox and button events
- `performUpdate()` - Executes single update via update.install service
- `confirmBulkUpdate()` - Shows confirmation dialog for bulk updates
- `performBulkUpdate()` - Executes multiple updates in parallel
- `updateSelectedUpdateCount()` - Updates selected count badge

**Update Filter Logic:**
- Stable filter: Excludes versions containing "beta", "rc", or "dev"
- Beta filter: Includes only versions containing "beta", "rc", or "dev"
- Search integration: Filters updates by title/entity ID

### Files Modified
1. `frontend/entity-manager-panel.js` - Complete UI overhaul + update manager
2. `manifest.json` - Version updated to 2.0.6
3. `CHANGES.md` - This documentation file

---

## User Experience Improvements

### Before
- Inconsistent colors across light/dark modes
- Hardcoded colors not adapting to themes
- Mobile layout had overflow issues
- "Unknown" state labels were confusing
- Borders not visible in some modes
- No firmware update management

### After
- Unified blue borders throughout
- Clear green/red color coding for states
- Perfect mobile responsiveness
- Clear "Enabled/Disabled" status badges
- Consistent theme support
- No content overflow on mobile
- Professional, polished appearance
- **Centralized firmware update management**
- **Stable/beta version filtering**
- **Bulk update capabilities**
- **Release notes integration**

---

## Browser Compatibility
- Works in all modern browsers
- Requires CSS Grid support for mobile layout
- CSS Custom Properties (CSS Variables) required
- Tested with Chrome, Firefox, Safari, Edge

---

## Maintenance Notes
- All colors centralized in CSS variables
- Easy to change color scheme by updating variables
- Mobile styles inherit from desktop where possible
- Theme detection is automatic and reactive
- Version increments required for cache busting

---

## Future Considerations
- Could add color customization options
- Could support additional theme presets
- Could add animation preferences
- Could add compact mode toggle
