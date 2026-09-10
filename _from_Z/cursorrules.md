# Entity Manager Panel - UI Consistency Rules

## Overview
All UI components in the Entity Manager panel must follow these design standards to maintain a cohesive, professional appearance across all dialogs, cards, buttons, and interactive elements.

---

## Color System

### Primary Colors
- **Primary Blue**: `#2196f3` (main accent, active states, primary actions)
- **Primary Blue Dark**: `#1976d2` (hover states, emphasis)
- **Primary Blue Darker**: `#1565c0` (borders, outlines)

### State Colors
- **Success/Enable Green**: `#4caf50` (enable actions, success states)
- **Danger/Disable Red**: `#f44336` (disable actions, warnings)
- **Warning Orange**: `#ff9800` (caution states, if needed)

### Theme-Adaptive Variables
Always use CSS variables for automatic light/dark theme adaptation:
```css
--em-primary: var(--primary-color)
--em-success: var(--success-color, #4caf50)
--em-danger: var(--error-color, #f44336)
--em-text-primary: var(--primary-text-color)
--em-text-secondary: var(--secondary-text-color)
--em-bg-primary: var(--card-background-color)
--em-bg-secondary: var(--secondary-background-color)
--em-border: var(--divider-color)
```

---

## Border Standards

### Border Widths
- **Standard borders**: `2px solid`
- **Accent borders (left highlight)**: `5px solid`

### Border Colors
- **Default**: `#1565c0` (dark blue)
- **Hover/Active**: `#2196f3` (bright blue)
- **Integration cards left border**: `5px solid var(--em-primary)`

### Border Radius
- **Small elements** (buttons, inputs): `8px` - `12px`
- **Cards/containers**: `12px` - `16px`
- **Large panels**: `16px`

---

## Shadow Standards

### Card Shadows
```css
/* Default card shadow */
box-shadow: 0 2px 6px rgba(33, 150, 243, 0.3), inset 0 0 0 1px rgba(33, 150, 243, 0.2);

/* Hover card shadow */
box-shadow: 0 4px 16px rgba(33, 150, 243, 0.4), inset 0 0 0 1px rgba(33, 150, 243, 0.3);

/* Integration card shadow (with blue tint) */
box-shadow: 0 2px 8px rgba(33, 150, 243, 0.15), inset 0 0 0 1px rgba(33, 150, 243, 0.1);
```

### Button Shadows
```css
/* Button default */
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

/* Button hover (primary) */
box-shadow: 0 6px 20px rgba(33, 150, 243, 0.4);
```

### Dialog Shadows
```css
/* Dialog overlay backdrop */
backdrop-filter: blur(4px);

/* Dialog box shadow */
box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
```

---

## Button Standards

### Primary Button (Main Actions)
```css
.btn-primary {
  background: linear-gradient(135deg, #2196f3, #1976d2) !important;
  color: white !important;
  border: 2px solid #1565c0 !important;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 18px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.btn-primary:hover {
  box-shadow: 0 6px 20px rgba(33, 150, 243, 0.4) !important;
}

.btn-primary:active {
  transform: scale(0.98);
}
```

### Secondary Button (Non-primary Actions)
```css
.btn-secondary {
  background: var(--card-background-color);
  color: var(--primary-text-color);
  border: 2px solid #1565c0;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 18px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: var(--secondary-background-color);
  border-color: #2196f3;
}
```

### Enable/Disable Action Buttons
```css
/* Enable button variant */
.btn-secondary.enable-integration {
  color: #4caf50 !important;
  border: 2px solid #4caf50 !important;
}

.btn-secondary.enable-integration:hover {
  background: #4caf50 !important;
  color: white !important;
}

/* Disable button variant */
.btn-secondary.disable-integration {
  color: #f44336 !important;
  border: 2px solid #f44336 !important;
}

.btn-secondary.disable-integration:hover {
  background: #f44336 !important;
  color: white !important;
}
```

### Icon Buttons (Small Actions)
```css
.icon-btn {
  padding: 8px 12px;
  border: 2px solid #e0e0e0;
  background: #f5f5f5 !important;
  border-radius: 8px;
  font-size: 1.25em;
  font-weight: 600;
  transition: all 0.2s ease;
}

/* Enable icon button */
.icon-btn.enable-entity {
  color: #4caf50 !important;
  border-color: #4caf50 !important;
}

.icon-btn.enable-entity:hover {
  background: #4caf50 !important;
  color: white !important;
}

/* Disable icon button */
.icon-btn.disable-entity {
  color: #f44336 !important;
  border-color: #f44336 !important;
}

.icon-btn.disable-entity:hover {
  background: #f44336 !important;
  color: white !important;
}
```

---

## Dialog/Popup Standards

### Overlay
```css
.confirm-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease;
}
```

### Dialog Box
```css
.confirm-dialog-box {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 90%;
  animation: slideUp 0.3s ease;
  overflow: hidden;
}

[data-theme="dark"] .confirm-dialog-box {
  background: #2c2c2c;
  color: #fff;
}
```

### Dialog Header
```css
.confirm-dialog-header {
  padding: 24px 24px 16px 24px;
  border-bottom: 2px solid #e0e0e0;
}

[data-theme="dark"] .confirm-dialog-header {
  border-bottom-color: #444;
}

.confirm-dialog-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #333;
}

[data-theme="dark"] .confirm-dialog-header h2 {
  color: #fff;
}
```

### Dialog Content
```css
.confirm-dialog-content {
  padding: 24px;
}

.confirm-dialog-content p {
  margin: 0;
  font-size: 16px;
  line-height: 1.5;
  color: #666;
}

[data-theme="dark"] .confirm-dialog-content p {
  color: #ccc;
}
```

### Dialog Actions (Button Layout)
```css
.confirm-dialog-actions {
  padding: 16px 24px 24px 24px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.confirm-dialog-actions .btn {
  min-width: 80px;
}
```

### Dialog Button Variants
```css
/* Cancel/No button */
.confirm-no {
  background: #e0e0e0 !important;
  color: #333 !important;
}

.confirm-no:hover {
  background: #d0d0d0 !important;
}

[data-theme="dark"] .confirm-no {
  background: #444 !important;
  color: #fff !important;
}

[data-theme="dark"] .confirm-no:hover {
  background: #555 !important;
}

/* Confirm/Yes button */
.confirm-yes {
  background: #2196f3 !important;
  color: #fff !important;
}

.confirm-yes:hover {
  background: #1976d2 !important;
}
```

---

## Input Field Standards

### Text Input (Rename, Search, etc.)
```css
.rename-input {
  width: 100%;
  padding: 12px;
  border: 2px solid #2196f3;
  border-radius: 8px;
  font-size: 16px;
  font-family: monospace;
  background: #f5f5f5;
  color: #333;
  transition: all 0.2s ease;
}

.rename-input:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.2);
}

[data-theme="dark"] .rename-input {
  background: #333;
  color: #fff;
  border-color: #2196f3;
}
```

### Search Box
```css
.search-box {
  flex: 1;
  min-width: 280px;
  padding: 12px 16px;
  border: 2px solid #1565c0;
  border-radius: 12px;
  font-size: 18px;
  background: var(--card-background-color);
  color: var(--primary-text-color);
  transition: all 0.3s ease;
}

.search-box:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
}
```

---

## Card Standards

### Stat Cards
```css
.stat-card {
  background: var(--card-background-color);
  padding: 24px;
  border-radius: 16px;
  border: 2px solid var(--em-primary);
  box-shadow: 0 2px 8px rgba(33, 150, 243, 0.15), inset 0 0 0 1px rgba(33, 150, 243, 0.1);
  transition: all 0.3s ease;
}

.stat-card:hover {
  border-color: var(--primary-color);
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3), inset 0 0 0 1px rgba(33, 150, 243, 0.2);
  transform: translateY(-2px);
}
```

### Integration Cards
```css
.integration-group {
  background: var(--em-bg-primary);
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
  border: 2px solid var(--em-primary);
  border-left: 5px solid var(--em-primary);
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(33, 150, 243, 0.3), inset 0 0 0 1px rgba(33, 150, 243, 0.2);
}

.integration-group:hover {
  box-shadow: 0 4px 16px rgba(33, 150, 243, 0.4), inset 0 0 0 1px rgba(33, 150, 243, 0.3);
  border-color: var(--em-primary);
  border-left-color: var(--em-primary);
  filter: brightness(1.1);
}
```

### Device Cards
```css
.device-item {
  border: 2px solid #2196f3 !important;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease;
  flex: 0 1 auto;
  min-width: 300px;
  background: var(--card-background-color);
}

.device-item:hover {
  border-left-color: #1976d2 !important;
}
```

---

## Filter/Toggle Standards

### Filter Toggle Buttons
```css
.filter-toggle {
  padding: 10px 16px;
  border: 2px solid #1565c0;
  background: transparent;
  border-radius: 10px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  color: var(--secondary-text-color);
  transition: all 0.3s ease;
}

.filter-toggle:hover {
  color: var(--primary-text-color);
  border-color: #2196f3;
}

.filter-toggle.active {
  background: #2196f3 !important;
  color: white !important;
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.15) !important;
  border-color: #2196f3 !important;
}
```

### Dropdown Menu
```css
.domain-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: #fff !important;
  border: 2px solid #1565c0 !important;
  border-radius: 10px;
  box-shadow: 0 6px 20px rgba(33, 150, 243, 0.5);
  max-height: 240px;
  overflow-y: auto;
  z-index: 1000 !important;
  color: #333;
}

[data-theme="dark"] .domain-menu {
  background: #1e1e1e !important;
  color: #fff;
  border-color: #2196f3 !important;
}

.domain-option {
  padding: 10px 12px;
  cursor: pointer;
  color: #333;
}

.domain-option:hover {
  background: #f0f0f0;
}

.domain-option.active {
  background: rgba(33, 150, 243, 0.15);
}

[data-theme="dark"] .domain-option {
  color: #fff;
}

[data-theme="dark"] .domain-option:hover {
  background: rgba(33, 150, 243, 0.2);
}
```

---

## Animation Standards

### Fade In (Overlay)
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

### Slide Up (Dialog)
```css
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Slide In Down (Header)
```css
@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Transition Timing
- **Fast interactions**: `0.2s ease`
- **Standard interactions**: `0.3s ease`
- **Smooth animations**: `0.4s ease`

---

## Typography Standards

### Font Sizes
- **Main headers**: `24px` - `32px`
- **Section headers**: `20px` - `22px`
- **Body text**: `16px` - `18px`
- **Small text**: `14px` - `15px`
- **Tiny labels**: `10px` - `11px`

### Font Weights
- **Bold headers**: `600` - `700`
- **Medium text**: `500` - `600`
- **Normal text**: `400`

### Font Family
```css
font-family: var(--paper-font-body1_-_font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
```

### Monospace (Entity IDs)
```css
font-family: monospace;
```

---

## Badge/Pill Standards

```css
.entity-badge {
  font-size: 10px;
  padding: 4px 8px;
  border-radius: 6px;
  background: #2196f3 !important;
  color: white !important;
  margin-left: 8px;
  font-weight: 600;
}
```

---

## Critical Rules

1. **Always use `!important` for blue colors** to ensure consistency: `#2196f3 !important`
2. **All dialogs must have**:
   - Backdrop blur: `backdrop-filter: blur(4px)`
   - Overlay z-index: `10000`
   - Rounded corners: `16px`
   - Proper light/dark theme support with `[data-theme="dark"]` selectors

3. **All buttons must have**:
   - `2px solid` borders
   - `0.3s ease` transitions
   - Active state: `transform: scale(0.98)`
   - Consistent padding: `10px 20px` (large) or `8px 12px` (small)

4. **All cards must have**:
   - Blue-tinted shadows: `rgba(33, 150, 243, X)`
   - `2px` borders with blue colors
   - Hover state with increased shadow and slight transform
   - Integration cards get `5px` left border

5. **Color-coded action buttons**:
   - Green (`#4caf50`) for enable/success actions
   - Red (`#f44336`) for disable/danger actions
   - Blue (`#2196f3`) for primary actions

6. **Theme adaptation**:
   - Use `var(--card-background-color)` for backgrounds
   - Use `var(--primary-text-color)` for text
   - Provide explicit `[data-theme="dark"]` overrides for fixed colors

---

## Implementation Checklist

When creating any new UI component, ensure:
- [ ] Borders are `2px solid #1565c0` (or `#2196f3` for active)
- [ ] Border radius matches component size (8-16px)
- [ ] Shadows use blue-tinted rgba values
- [ ] Transitions are `0.2s` - `0.3s ease`
- [ ] Buttons have proper color-coded variants (green/red/blue)
- [ ] Dialogs have backdrop blur and proper z-index
- [ ] Light/dark theme support with proper selectors
- [ ] Typography uses standard font sizes and weights
- [ ] Hover states are defined with appropriate feedback
- [ ] Active states use `transform: scale(0.98)` for buttons
