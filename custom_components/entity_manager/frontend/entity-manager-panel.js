// Entity Manager Panel - Updated UI v2.0
// Loads external CSS for cleaner code organization

// Determine base URL for loading external resources
const _emScripts = document.querySelectorAll('script[src*="entity-manager-panel"]');
const _emBaseUrl = _emScripts.length > 0 
  ? _emScripts[_emScripts.length - 1].src.replace(/\/[^/]+$/, '/')
  : '/api/entity_manager/frontend/';

// HA label color palette — name sent to HA, hex used for display only
const HA_LABEL_COLORS = [
  ['red', '#f44336'], ['pink', '#e91e63'], ['purple', '#9c27b0'],
  ['deep-purple', '#673ab7'], ['indigo', '#3f51b5'], ['blue', '#2196f3'],
  ['light-blue', '#03a9f4'], ['cyan', '#00bcd4'], ['teal', '#009688'],
  ['green', '#4caf50'], ['light-green', '#8bc34a'], ['lime', '#cddc39'],
  ['yellow', '#ffeb3b'], ['amber', '#ffc107'], ['orange', '#ff9800'],
  ['deep-orange', '#ff5722'], ['brown', '#795548'], ['grey', '#9e9e9e'],
  ['blue-grey', '#607d8b'],
];

// Predefined themes (inlined for reliable loading)
const PREDEFINED_THEMES = {
  'Light': {
    mode: 'light',
    variables: {
      '--em-primary': '#2196f3',
      '--em-primary-dark': '#1565c0',
      '--em-primary-light': '#64b5f6',
      '--em-success': '#4caf50',
      '--em-success-dark': '#388e3c',
      '--em-danger': '#f44336',
      '--em-danger-dark': '#d32f2f',
      '--em-warning': '#ff9800',
      '--em-warning-dark': '#f57c00',
      '--em-text-primary': '#212121',
      '--em-text-secondary': '#757575',
      '--em-text-disabled': '#9e9e9e',
      '--em-bg-primary': '#ffffff',
      '--em-bg-secondary': '#f5f5f5',
      '--em-bg-hover': 'rgba(0,0,0,0.04)',
      '--em-border': '#e0e0e0',
      '--em-border-light': '#eeeeee'
    }
  },
  'Dark': {
    mode: 'dark',
    variables: {
      '--em-primary': '#42a5f5',
      '--em-primary-dark': '#1e88e5',
      '--em-primary-light': '#90caf9',
      '--em-success': '#66bb6a',
      '--em-success-dark': '#43a047',
      '--em-danger': '#ef5350',
      '--em-danger-dark': '#e53935',
      '--em-warning': '#ffa726',
      '--em-warning-dark': '#fb8c00',
      '--em-text-primary': '#e0e0e0',
      '--em-text-secondary': '#9e9e9e',
      '--em-text-disabled': '#616161',
      '--em-bg-primary': '#1e1e1e',
      '--em-bg-secondary': '#121212',
      '--em-bg-hover': 'rgba(255,255,255,0.08)',
      '--em-border': '#333333',
      '--em-border-light': '#2c2c2c'
    }
  },
  'High Contrast': {
    mode: 'dark',
    variables: {
      '--em-primary': '#00e5ff',
      '--em-primary-dark': '#00b8d4',
      '--em-primary-light': '#84ffff',
      '--em-success': '#00ff00',
      '--em-success-dark': '#00cc00',
      '--em-danger': '#ff0000',
      '--em-danger-dark': '#cc0000',
      '--em-warning': '#ffff00',
      '--em-warning-dark': '#ffcc00',
      '--em-text-primary': '#ffffff',
      '--em-text-secondary': '#cccccc',
      '--em-text-disabled': '#888888',
      '--em-bg-primary': '#000000',
      '--em-bg-secondary': '#0a0a0a',
      '--em-bg-hover': 'rgba(255,255,255,0.15)',
      '--em-border': '#ffffff',
      '--em-border-light': '#666666'
    }
  },
  'OLED Black': {
    mode: 'dark',
    variables: {
      '--em-primary': '#bb86fc',
      '--em-primary-dark': '#9c64fb',
      '--em-primary-light': '#d4b8fd',
      '--em-success': '#03dac6',
      '--em-success-dark': '#00a896',
      '--em-danger': '#cf6679',
      '--em-danger-dark': '#b00020',
      '--em-warning': '#ffb74d',
      '--em-warning-dark': '#ffa000',
      '--em-text-primary': '#ffffff',
      '--em-text-secondary': '#b0b0b0',
      '--em-text-disabled': '#606060',
      '--em-bg-primary': '#000000',
      '--em-bg-secondary': '#000000',
      '--em-bg-hover': 'rgba(255,255,255,0.1)',
      '--em-border': '#1f1f1f',
      '--em-border-light': '#121212'
    }
  }
};

// Load external CSS
if (!document.querySelector('link[href*="entity-manager-panel.css"]')) {
  const cssLink = document.createElement('link');
  cssLink.rel = 'stylesheet';
  cssLink.href = _emBaseUrl + 'entity-manager-panel.css?v=' + Date.now();
  cssLink.onerror = () => console.error('[Entity Manager] Failed to load CSS from:', cssLink.href);
  document.head.appendChild(cssLink);
}

class EntityManagerPanel extends HTMLElement {
  constructor() {
    super();
    this._hass = null;
    this.data = [];
    this.deviceInfo = {};
    this.expandedIntegrations = new Set();
    this.expandedDevices = new Set();
    this.selectedEntities = new Set();
    this.selectedUpdates = new Set();
    this.searchTerm = '';
    this.viewState = 'all';
    this.selectedDomain = 'all';
    this.selectedIntegrationFilter = null; // Filter to show only one integration
    this.integrationViewFilter = {};       // Per-integration entity state filter: 'enabled' | 'disabled' | undefined
    this.showAllSidebarIntegrations = false; // Show all integrations in sidebar
    this.updateFilter = 'all'; // all, available, stable, beta
    this.selectedUpdateType = 'all'; // all, device, integration
    this.hideUpToDate = false; // Hide up-to-date items
    this.backupBeforeUpdate = localStorage.getItem('em-backup-before-update') === 'true';
    this.haAutoBackup = null; // null = unavailable/unknown, {core,addon} = loaded from hassio
    this.domainOptions = [];
    this.isLoading = false;
    this.updateEntities = [];
    this.automationCount = 0;
    this.scriptCount = 0;
    this.helperCount = 0;
    this.updateCount = 0;
    this.hacsCount = 0;
    this.hacsItems = null;
    this.templateCount = 0;
    this.lovelaceCardCount = 0;
    
    // Theme customization state
    this.activeTheme = 'default'; // 'default' follows HA, or saved theme name
    this.customThemes = this._loadSavedThemes();
    
    // Favorites state
    this.favorites = this._loadFavorites();
    this._showOnlyFavorites = false;
    
    // Activity log state
    this.activityLog = this._loadActivityLog();
    
    // Sidebar state
    this.sidebarCollapsed = localStorage.getItem('em-sidebar-collapsed') === 'true';
    // Which sidebar sections are open — stored as array of IDs; default all closed
    const _ssSaved = localStorage.getItem('em-sidebar-sections');
    this.sidebarOpenSections = new Set(_ssSaved ? JSON.parse(_ssSaved) : []);
    
    // Comparison state
    this.comparisonEntities = [];
    
    // Undo/Redo state
    this.undoStack = [];
    this.redoStack = [];
    this.maxUndoSteps = 50;
    
    // Saved filter presets
    this.filterPresets = this._loadFilterPresets();
    
    // Custom columns
    this.visibleColumns = this._loadVisibleColumns();
    
    // Custom tags
    this.entityTags = this._loadEntityTags();
    
    // Entity aliases
    this.entityAliases = this._loadEntityAliases();
    
    // Smart groups state
    this.smartGroupsEnabled = localStorage.getItem('em-smart-groups') === 'true';
    this.smartGroupMode = localStorage.getItem('em-smart-group-mode') || 'integration'; // integration, room, type, device-name
    this.deviceNameFilter = localStorage.getItem('em-device-name-filter') || ''; // active keyword for device-name mode
    this.savedDeviceFilters = JSON.parse(localStorage.getItem('em-saved-device-filters') || '[]'); // [{label, pattern}]
    
    // Lazy loading state
    this.visibleEntityCounts = {}; // Track visible entities per integration
    this.initialLoadCount = 20; // Initial entities to show
    this.loadMoreCount = 20; // Entities to load on "Load More"
    
    // Drag and drop state
    this.dragDropEnabled = true;
    this.draggedEntity = null;
    this.dragOverEntity = null;
    this.entityOrder = this._loadEntityOrder(); // Custom ordering
    
    // Labels filter state
    this.selectedLabelFilter = null;
    this.labelsCache = null; // Cache for HA labels
    this.labeledEntitiesCache = null; // Cache for entities with labels
    this.showAllSidebarLabels = false;
    
    // Listen for theme changes
    this._themeObserver = new MutationObserver(() => {
      this.updateTheme();
    });
  }

  _loadFromStorage(key, defaultValue) {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  _saveToStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch { /* quota exceeded or private mode */ }
  }

  _escapeHtml(str) {
    if (str == null) return '';
    const s = String(str);
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  _escapeAttr(str) {
    if (str == null) return '';
    const s = String(str);
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  _sanitizeUrl(url) {
    if (!url) return '';
    const s = String(url).trim();
    if (s.startsWith('data:image/')) return s;
    if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/')) return s;
    return '';
  }

  // Shared dialog helpers ─────────────────────────────────────────────────────

  /** "Nd ago" / "Nh ago" / "Nm ago" string, or fallback when isoStr is falsy */
  _fmtAgo(isoStr, fallback = 'Never') {
    if (!isoStr) return fallback;
    const ms = Date.now() - new Date(isoStr).getTime();
    if (isNaN(ms)) return fallback;
    return this._formatTimeDiff(ms) + ' ago';
  }

  /** Collapsible group section (collapsed by default) used in entity-list dialogs */
  _collGroup(label, bodyHtml) {
    return `
      <div class="entity-list-group">
        <div class="entity-list-group-title em-collapsible" style="cursor:pointer;user-select:none;display:flex;align-items:center;gap:6px">
          <span class="em-collapse-arrow" style="display:inline-block;transition:transform 0.2s;opacity:0.65;flex-shrink:0;transform:rotate(-90deg)">▼</span>
          ${label}
        </div>
        <div class="em-group-body" style="display:none">${bodyHtml}</div>
      </div>
    `;
  }

  /** Coloured "triggered by" badge used in automation / template dialogs */
  _triggerBadge(item) {
    if (item.triggered_by === 'human') {
      const who = item.triggered_by_name ? ` (${this._escapeHtml(item.triggered_by_name)})` : '';
      return `<span style="color:#4caf50">Human${who}</span>`;
    }
    if (item.triggered_by === 'automation') return `<span style="color:#2196f3">Automation / Script</span>`;
    return `<span style="opacity:0.6">HA / System</span>`;
  }

  /** Standard managed-item row with Edit / Rename / Remove buttons */
  _renderManagedItem(opts) {
    const eid = this._escapeAttr(opts.entity_id);
    const displayName = this._escapeHtml(opts.name);
    return `
      <div class="entity-list-item" style="padding:10px 12px">
        <div class="entity-list-row" style="flex-wrap:wrap;align-items:center;gap:6px">
          <span class="entity-list-name" style="font-weight:600;flex:1;min-width:120px">${displayName}${opts.stateBadgeHtml || ''}</span>
          <span class="entity-list-id-inline" style="font-size:0.82em;opacity:0.7;flex:1;min-width:120px">${this._escapeHtml(opts.entity_id)}</span>
          <div style="display:flex;gap:5px;flex-shrink:0;flex-wrap:wrap">
            <button class="entity-list-toggle ${opts.state === 'on' ? 'on' : 'off'} btn btn-secondary"
              data-entity-id="${eid}" data-entity-type="${this._escapeAttr(opts.entityType)}"
              style="padding:2px 10px;font-size:0.8em">${opts.state === 'on' ? 'On' : 'Off'}</button>
            <button class="entity-list-action-btn edit-btn btn btn-secondary"
              data-entity-id="${eid}" data-entity-type="${this._escapeAttr(opts.entityType)}"
              style="padding:2px 10px;font-size:0.8em" title="Open in HA editor">Edit</button>
            <button class="em-entity-rename btn btn-secondary"
              data-entity-id="${eid}" data-current-name="${this._escapeAttr(opts.name)}"
              style="padding:2px 10px;font-size:0.8em">Rename</button>
            <button class="em-entity-remove btn"
              data-entity-id="${eid}" data-entity-type="${this._escapeAttr(opts.entityType)}"
              style="padding:2px 10px;font-size:0.8em;background:#f44336;color:#fff;border:none;border-radius:4px;cursor:pointer">Remove</button>
          </div>
        </div>
        ${opts.infoHtml ? `
        <details style="margin-top:6px">
          <summary style="cursor:pointer;font-size:0.82em;opacity:0.6;user-select:none;list-style:none;display:inline-flex;align-items:center;gap:4px">
            <span class="em-details-arrow" style="display:inline-block;font-size:0.85em;transition:transform 0.15s">▶</span> Details
          </summary>
          <div style="font-size:0.88em;margin-top:5px;padding-left:14px;display:flex;gap:16px;flex-wrap:wrap;opacity:0.9">${opts.infoHtml}</div>
        </details>` : ''}
      </div>
    `;
  }

  _contrastColor(cssColor) {
    if (!cssColor) return '#ffffff';
    try {
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.fillStyle = '#000000';
      ctx.fillStyle = cssColor;
      const hex = ctx.fillStyle.replace('#', '');
      if (hex.length !== 6) return '#ffffff';
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#212121' : '#ffffff';
    } catch {
      return '#ffffff';
    }
  }

  // Map an HA label color name (e.g. "blue-grey") to a hex value for CSS.
  // Falls through for plain hex values or unknown names.
  _labelColorCss(color) {
    if (!color) return 'var(--em-primary)';
    const entry = HA_LABEL_COLORS.find(([name]) => name === color);
    return entry ? entry[1] : color;
  }

  // ── Label target selector helpers ──────────────────────────────
  _labelTargetSelectorHtml(id = 'em-label-target', defaultTarget = 'both', hasDevice = true) {
    const opts = [
      { val: 'entity', label: 'Entity', title: 'Entity registry — shown in Settings → Entities' },
      ...(hasDevice ? [
        { val: 'device', label: 'Device', title: 'Device registry — shown in Settings → Devices' },
        { val: 'both',   label: 'Both',   title: 'Apply to both entity and device registries' },
      ] : []),
    ];
    return `<div style="margin-bottom:12px">
      <label style="font-size:12px;color:var(--em-text-secondary);display:block;margin-bottom:5px">Apply label to</label>
      <div id="${id}" style="display:flex;gap:5px">
        ${opts.map(o => `<button class="em-target-btn${o.val === defaultTarget ? ' active' : ''}" data-target="${o.val}" title="${o.title}"
          style="flex:1;padding:5px 8px;border-radius:6px;border:1px solid var(--em-border);cursor:pointer;font-size:12px;
                 background:${o.val === defaultTarget ? 'var(--em-primary)' : 'var(--em-bg-hover)'};
                 color:${o.val === defaultTarget ? 'white' : 'var(--em-text-primary)'};
                 font-weight:${o.val === defaultTarget ? '600' : '400'}">${o.label}</button>`).join('')}
      </div>
    </div>`;
  }

  _attachTargetSelector(overlayEl, id) {
    overlayEl.querySelector(`#${id}`)?.addEventListener('click', (e) => {
      const btn = e.target.closest('.em-target-btn');
      if (!btn) return;
      const parent = btn.closest(`#${id}`);
      parent.querySelectorAll('.em-target-btn').forEach(b => {
        const active = b === btn;
        b.classList.toggle('active', active);
        b.style.background = active ? 'var(--em-primary)' : 'var(--em-bg-hover)';
        b.style.color      = active ? 'white' : 'var(--em-text-primary)';
        b.style.fontWeight = active ? '600' : '400';
      });
    });
  }

  _getTargetValue(overlayEl, id) {
    return overlayEl.querySelector(`#${id} .em-target-btn.active`)?.dataset.target || 'both';
  }

  _fuzzyMatch(text, pattern) {
    // Fuzzy matching: check if pattern characters appear in order in text
    if (!text || !pattern) return !pattern;
    text = String(text).toLowerCase();
    let patternIdx = 0;
    for (let i = 0; i < text.length && patternIdx < pattern.length; i++) {
      if (text[i] === pattern[patternIdx]) {
        patternIdx++;
      }
    }
    return patternIdx === pattern.length;
  }

  _isColorDark(color) {
    // Parse hex or rgb color and check luminance
    let r, g, b;
    const hex = color.match(/^#([0-9a-f]{3,8})$/i);
    if (hex) {
      let h = hex[1];
      if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
      r = parseInt(h.substring(0, 2), 16);
      g = parseInt(h.substring(2, 4), 16);
      b = parseInt(h.substring(4, 6), 16);
    } else {
      const rgb = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      if (rgb) {
        r = parseInt(rgb[1]); g = parseInt(rgb[2]); b = parseInt(rgb[3]);
      } else {
        return false;
      }
    }
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  }

  connectedCallback() {
    // Observe theme changes on document
    this._themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'class']
    });
    this.updateTheme();
  }

  disconnectedCallback() {
    if (this._themeObserver) this._themeObserver.disconnect();
    if (this._themeOutsideHandler) document.removeEventListener('click', this._themeOutsideHandler);
    if (this._domainOutsideHandler) document.removeEventListener('click', this._domainOutsideHandler);
  }

  // Re-render sidebar in place and re-attach listeners + labels.
  _reRenderSidebar() {
    const layout = this.querySelector('.em-layout');
    if (!layout) return;
    const oldSidebar = layout.querySelector('.em-sidebar');
    if (!oldSidebar) return;
    oldSidebar.outerHTML = this._renderSidebar();
    this._attachSidebarListeners();
    this._loadAndDisplayLabels();
  }

  updateTheme() {
    // If a predefined theme is active, apply it
    if (this.activeTheme !== 'default' && PREDEFINED_THEMES[this.activeTheme]) {
      this._applyCustomTheme(PREDEFINED_THEMES[this.activeTheme]);
      return;
    }
    
    // If a custom theme is active, apply it instead of following HA
    if (this.activeTheme !== 'default' && this.customThemes[this.activeTheme]) {
      this._applyCustomTheme(this.customThemes[this.activeTheme]);
      return;
    }
    
    // Detect dark mode from Home Assistant theme
    const haTheme = document.documentElement.getAttribute('data-theme');
    const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-background-color')?.trim() || '';
    const isDark =
      haTheme === 'dark' ||
      (bgColor && this._isColorDark(bgColor)) ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    this.setAttribute('data-theme', isDark ? 'dark' : 'light');
    
    // Clear any custom theme overrides
    this._clearCustomThemeOverrides();
  }
  
  _applyCustomTheme(theme) {
    // Set base theme mode
    this.setAttribute('data-theme', theme.mode || 'light');
    
    // Apply custom CSS variable overrides
    if (theme.variables) {
      Object.entries(theme.variables).forEach(([key, value]) => {
        this.style.setProperty(key, value);
      });
    }
    
    // Apply background image if set
    if (theme.backgroundImage) {
      const safeUrl = this._sanitizeUrl(theme.backgroundImage);
      if (!safeUrl) return;
      this.style.setProperty('--em-bg-image', `url("${safeUrl.replace(/"/g, '')}")`);
      this.style.setProperty('--em-bg-overlay', (theme.backgroundOverlay || 'rgba(0,0,0,0.7)').replace(/[;{}]/g, ''));
      this.classList.add('has-bg-image');
    } else {
      this.style.removeProperty('--em-bg-image');
      this.style.removeProperty('--em-bg-overlay');
      this.classList.remove('has-bg-image');
    }
  }
  
  _clearCustomThemeOverrides() {
    // Remove any custom CSS variables set on this element
    const customVars = [
      '--em-primary', '--em-primary-dark', '--em-primary-light',
      '--em-success', '--em-success-dark', '--em-danger', '--em-danger-dark',
      '--em-warning', '--em-warning-dark', '--em-text-primary', '--em-text-secondary',
      '--em-text-disabled', '--em-bg-primary', '--em-bg-secondary', '--em-bg-hover',
      '--em-border', '--em-border-light', '--em-shadow', '--em-shadow-hover',
      '--em-bg-image', '--em-bg-overlay'
    ];
    customVars.forEach(v => this.style.removeProperty(v));
    this.classList.remove('has-bg-image');
  }
  
  _exportThemes() {
    const exportData = {
      version: 1,
      themes: this.customThemes,
      activeTheme: this.activeTheme
    };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'entity-manager-themes.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  
  _importThemes() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (!data.themes || typeof data.themes !== 'object') {
          this._showToast('Invalid theme file format', 'error');
          return;
        }
        
        // Merge imported themes with existing (imported themes override)
        const importCount = Object.keys(data.themes).length;
        Object.entries(data.themes).forEach(([name, theme]) => {
          // Skip reserved names
          if (name !== 'default' && !PREDEFINED_THEMES[name]) {
            // Sanitize theme data
            const sanitized = { mode: theme.mode === 'dark' ? 'dark' : 'light' };
            if (theme.variables && typeof theme.variables === 'object') {
              sanitized.variables = {};
              Object.entries(theme.variables).forEach(([key, value]) => {
                if (typeof key === 'string' && key.startsWith('--em-') && typeof value === 'string' && !value.includes('expression') && !value.includes('javascript:')) {
                  sanitized.variables[key] = value;
                }
              });
            }
            if (theme.backgroundImage) {
              const safeUrl = this._sanitizeUrl(theme.backgroundImage);
              if (safeUrl) sanitized.backgroundImage = safeUrl;
            }
            if (theme.backgroundOverlay && typeof theme.backgroundOverlay === 'string') {
              sanitized.backgroundOverlay = theme.backgroundOverlay.replace(/[;{}]/g, '');
            }
            this.customThemes[name] = sanitized;
          }
        });
        
        this._saveThemesToStorage();
        this._updateThemeDropdownList();
        this._showToast(`Imported ${importCount} theme(s) successfully!`, 'success');
      } catch (err) {
        this._showToast('Failed to import themes: ' + err.message, 'error');
      }
    };
    input.click();
  }
  
  _handleLocalImageUpload() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
          resolve(null);
          return;
        }
        
        // Convert to base64 for storage
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      };
      input.click();
    });
  }
  
  _loadSavedThemes() {
    return this._loadFromStorage('em-custom-themes', {});
  }
  
  _saveThemesToStorage() {
    try {
      localStorage.setItem('em-custom-themes', JSON.stringify(this.customThemes));
      localStorage.setItem('em-active-theme', this.activeTheme);
    } catch (e) {
      console.warn('Could not save themes:', e);
    }
  }
  
  _loadActiveTheme() {
    try {
      const saved = localStorage.getItem('em-active-theme');
      if (saved && (saved === 'default' || PREDEFINED_THEMES[saved] || this.customThemes[saved])) {
        this.activeTheme = saved;
      }
    } catch {
      this.activeTheme = 'default';
    }
  }
  
  _getCurrentThemeVariables() {
    // Capture current computed CSS variables as a theme
    const computedStyle = getComputedStyle(this);
    const variables = {};
    const varNames = [
      '--em-primary', '--em-primary-dark', '--em-primary-light',
      '--em-success', '--em-success-dark', '--em-danger', '--em-danger-dark',
      '--em-warning', '--em-warning-dark', '--em-text-primary', '--em-text-secondary',
      '--em-text-disabled', '--em-bg-primary', '--em-bg-secondary', '--em-bg-hover',
      '--em-border', '--em-border-light'
    ];
    
    varNames.forEach(name => {
      const value = computedStyle.getPropertyValue(name).trim();
      if (value) {
        variables[name] = value;
      }
    });
    
    return {
      mode: this.getAttribute('data-theme') || 'light',
      variables
    };
  }
  
  _saveCurrentTheme() {
    this._showPromptDialog(
      'Save Theme',
      'Enter a name for this theme:',
      `Theme ${Object.keys(this.customThemes).length + 1}`,
      (name) => {
        if (name === 'default' || PREDEFINED_THEMES[name]) {
          this._showToast(`"${name}" is a reserved theme name.`, 'error');
          return;
        }
        const theme = this._getCurrentThemeVariables();
        this.customThemes[name] = theme;
        this._saveThemesToStorage();
        this._updateThemeDropdownList();
        this._setActiveTheme(name);
      }
    );
  }
  
  _deleteCustomTheme(name) {
    this.showConfirmDialog('Delete Theme', `Delete theme "${name}"?`, () => {
      delete this.customThemes[name];
      this._saveThemesToStorage();
      if (this.activeTheme === name) {
        this._setActiveTheme('default');
      }
      this._updateThemeDropdownList();
    });
  }
  
  _setActiveTheme(name) {
    this.activeTheme = name;
    this._saveThemesToStorage();
    this.updateTheme();
    this._updateThemeDropdownUI();
  }
  
  _updateThemeDropdownUI() {
    // Update dropdown button label
    const label = this.querySelector('#theme-btn-label');
    if (label) {
      label.textContent = this.activeTheme === 'default' ? 'Theme' : this.activeTheme;
    }
    
    // Update active states in dropdown
    const items = this.querySelectorAll('.theme-dropdown-item[data-theme]');
    items.forEach(item => {
      item.classList.toggle('active', item.dataset.theme === this.activeTheme);
    });
  }
  
  _updateThemeDropdownList() {
    const list = this.querySelector('#saved-themes-list');
    if (!list) return;
    
    let html = '';
    
    // Add predefined themes section
    html += '<div style="padding: 4px 16px; color: var(--em-text-secondary); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Predefined</div>';
    Object.keys(PREDEFINED_THEMES).forEach(name => {
      const safeName = this._escapeHtml(name);
      const safeAttrName = this._escapeAttr(name);
      html += `
        <div class="theme-dropdown-item ${this.activeTheme === name ? 'active' : ''}" data-theme="${safeAttrName}">
          <svg viewBox="0 0 24 24"><path d="M12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4Z" fill="currentColor"/></svg>
          <span style="flex:1">${safeName}</span>
        </div>
      `;
    });

    // Add custom themes section
    const customThemeNames = Object.keys(this.customThemes);
    html += '<div class="theme-dropdown-divider"></div>';
    html += '<div style="padding: 4px 16px; color: var(--em-text-secondary); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Custom</div>';

    if (customThemeNames.length === 0) {
      html += '<div class="theme-dropdown-item" style="color: var(--em-text-secondary); font-style: italic; font-size: 12px;">No saved themes</div>';
    } else {
      customThemeNames.forEach(name => {
        const safeName = this._escapeHtml(name);
        const safeAttrName = this._escapeAttr(name);
        html += `
          <div class="theme-dropdown-item ${this.activeTheme === name ? 'active' : ''}" data-theme="${safeAttrName}">
            <svg viewBox="0 0 24 24"><path d="M12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4Z" fill="currentColor"/></svg>
            <span style="flex:1">${safeName}</span>
            <span class="edit-theme-btn" data-edit="${safeAttrName}" style="color: inherit; font-size: 14px; padding: 2px 4px; opacity: 0.7;" title="Edit theme">✎</span>
            <span class="delete-theme-btn" data-delete="${safeAttrName}" style="color: var(--em-danger); font-size: 16px;" title="Delete theme">&times;</span>
          </div>
        `;
      });
    }
    
    list.innerHTML = html;
  }
  
  _openThemeEditor(editThemeName = null) {
    const overlay = this.querySelector('#theme-editor-overlay');
    if (overlay) {
      this._editingThemeName = editThemeName;
      const theme = editThemeName ? this.customThemes[editThemeName] : null;
      
      // Update header and button text
      const headerTitle = overlay.querySelector('.theme-editor-header h3');
      const saveBtn = overlay.querySelector('#theme-editor-save');
      if (headerTitle) headerTitle.textContent = editThemeName ? 'Edit Theme' : 'Create Custom Theme';
      if (saveBtn) saveBtn.textContent = editThemeName ? 'Save Changes' : 'Create Theme';
      
      // Set name
      const nameInput = this.querySelector('#theme-editor-name');
      if (nameInput) nameInput.value = editThemeName || `My Theme ${Object.keys(this.customThemes).length + 1}`;
      
      // Set mode
      const lightMode = this.querySelector('#theme-mode-light');
      const darkMode = this.querySelector('#theme-mode-dark');
      if (theme?.mode === 'dark') {
        if (darkMode) darkMode.checked = true;
      } else {
        if (lightMode) lightMode.checked = true;
      }
      
      // Set colors or reset to defaults
      if (theme?.variables) {
        this._loadThemeColorsToEditor(theme.variables);
      } else {
        this._resetThemeEditorColors();
      }
      this._updateThemeEditorPreview();
      
      // Handle background image
      const bgNone = this.querySelector('input[name="bg-type"][value="none"]');
      const bgUrl = this.querySelector('input[name="bg-type"][value="url"]');
      const bgLocal = this.querySelector('input[name="bg-type"][value="local"]');
      const bgUrlInput = this.querySelector('#bg-url-input');
      const bgLocalInput = this.querySelector('#bg-local-input');
      const bgOverlayRow = this.querySelector('#bg-overlay-row');
      const bgUrlField = this.querySelector('#te-bg-url');
      const bgPreview = this.querySelector('#te-bg-local-preview');
      
      if (theme?.backgroundImage) {
        if (theme.backgroundImage.startsWith('data:')) {
          // Local image (base64)
          if (bgLocal) bgLocal.checked = true;
          if (bgUrlInput) bgUrlInput.style.display = 'none';
          if (bgLocalInput) bgLocalInput.style.display = 'block';
          this._tempLocalBgImage = theme.backgroundImage;
          if (bgPreview) {
            bgPreview.innerHTML = '';
            const img = document.createElement('img');
            img.src = this._sanitizeUrl(theme.backgroundImage);
            img.alt = 'Background preview';
            bgPreview.appendChild(img);
            bgPreview.classList.add('has-image');
          }
        } else {
          // Web URL
          if (bgUrl) bgUrl.checked = true;
          if (bgUrlInput) bgUrlInput.style.display = 'block';
          if (bgLocalInput) bgLocalInput.style.display = 'none';
          if (bgUrlField) bgUrlField.value = theme.backgroundImage;
        }
        if (bgOverlayRow) bgOverlayRow.style.display = 'flex';
        
        // Parse overlay
        if (theme.backgroundOverlay) {
          const match = theme.backgroundOverlay.match(/rgba?\((\d+),(\d+),(\d+),?([\d.]+)?\)/);
          if (match) {
            const r = parseInt(match[1]).toString(16).padStart(2, '0');
            const g = parseInt(match[2]).toString(16).padStart(2, '0');
            const b = parseInt(match[3]).toString(16).padStart(2, '0');
            const overlayColor = this.querySelector('#te-bg-overlay');
            const overlayOpacity = this.querySelector('#te-bg-overlay-opacity');
            const overlayValue = this.querySelector('#te-bg-overlay-value');
            if (overlayColor) overlayColor.value = `#${r}${g}${b}`;
            const opacity = Math.round((parseFloat(match[4]) || 0.7) * 100);
            if (overlayOpacity) overlayOpacity.value = opacity;
            if (overlayValue) overlayValue.textContent = `${opacity}%`;
          }
        }
      } else {
        if (bgNone) bgNone.checked = true;
        if (bgUrlInput) bgUrlInput.style.display = 'none';
        if (bgLocalInput) bgLocalInput.style.display = 'none';
        if (bgOverlayRow) bgOverlayRow.style.display = 'none';
        if (bgUrlField) bgUrlField.value = '';
        if (bgPreview) {
          bgPreview.innerHTML = '';
          bgPreview.classList.remove('has-image');
        }
        const overlayColor = this.querySelector('#te-bg-overlay');
        const overlayOpacity = this.querySelector('#te-bg-overlay-opacity');
        const overlayValue = this.querySelector('#te-bg-overlay-value');
        if (overlayColor) overlayColor.value = '#000000';
        if (overlayOpacity) overlayOpacity.value = 70;
        if (overlayValue) overlayValue.textContent = '70%';
        this._tempLocalBgImage = null;
      }
      
      overlay.classList.add('active');
    }
  }
  
  _loadThemeColorsToEditor(variables) {
    const mapping = {
      '--em-primary': 'te-primary',
      '--em-primary-dark': 'te-primary-dark',
      '--em-primary-light': 'te-primary-light',
      '--em-success': 'te-success',
      '--em-danger': 'te-danger',
      '--em-warning': 'te-warning',
      '--em-bg-primary': 'te-bg-primary',
      '--em-bg-secondary': 'te-bg-secondary',
      '--em-text-primary': 'te-text-primary',
      '--em-border': 'te-border'
    };
    
    Object.entries(mapping).forEach(([varName, inputId]) => {
      const value = variables[varName];
      if (value && value.startsWith('#')) {
        const input = this.querySelector(`#${inputId}`);
        if (input) {
          input.value = value;
          const hex = this.querySelector(`.color-hex[data-for="${inputId}"]`);
          if (hex) hex.textContent = value;
        }
      }
    });
  }
  
  _closeThemeEditor() {
    const overlay = this.querySelector('#theme-editor-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
    // Clear editing state
    this._editingThemeName = null;
    this._tempLocalBgImage = null;
  }
  
  _resetThemeEditorColors() {
    const defaults = {
      'te-primary': '#2196f3',
      'te-primary-dark': '#1565c0',
      'te-primary-light': '#64b5f6',
      'te-success': '#4caf50',
      'te-danger': '#f44336',
      'te-warning': '#ff9800',
      'te-bg-primary': '#ffffff',
      'te-bg-secondary': '#f5f5f5',
      'te-text-primary': '#212121',
      'te-border': '#e0e0e0'
    };
    
    Object.entries(defaults).forEach(([id, value]) => {
      const input = this.querySelector(`#${id}`);
      if (input) {
        input.value = value;
        const hex = this.querySelector(`.color-hex[data-for="${id}"]`);
        if (hex) hex.textContent = value;
      }
    });
  }
  
  _updateThemeEditorPreview() {
    const preview = this.querySelector('#theme-preview');
    if (!preview) return;
    
    const isDark = this.querySelector('#theme-mode-dark')?.checked;
    const primary = this.querySelector('#te-primary')?.value || '#2196f3';
    const success = this.querySelector('#te-success')?.value || '#4caf50';
    const danger = this.querySelector('#te-danger')?.value || '#f44336';
    const warning = this.querySelector('#te-warning')?.value || '#ff9800';
    const bgPrimary = this.querySelector('#te-bg-primary')?.value || '#ffffff';
    const textPrimary = this.querySelector('#te-text-primary')?.value || '#212121';
    
    preview.style.background = bgPrimary;
    preview.style.color = textPrimary;
    
    const chips = {
      'preview-chip-primary': primary,
      'preview-chip-success': success,
      'preview-chip-danger': danger,
      'preview-chip-warning': warning
    };
    
    Object.entries(chips).forEach(([id, color]) => {
      const chip = this.querySelector(`#${id}`);
      if (chip) {
        chip.style.background = color;
        chip.style.color = this._contrastColor(color);
      }
    });
  }
  
  
  _darkenColor(hex, percent) {
    const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - Math.round(255 * percent));
    const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - Math.round(255 * percent));
    const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - Math.round(255 * percent));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  _lightenColor(hex, percent) {
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + Math.round(255 * percent));
    const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + Math.round(255 * percent));
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + Math.round(255 * percent));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  _createThemeFromEditor() {
    const name = this.querySelector('#theme-editor-name')?.value?.trim();
    if (!name) {
      this._showToast('Please enter a theme name', 'error');
      return;
    }

    if (name === 'default' || PREDEFINED_THEMES[name]) {
      this._showToast(`"${name}" is a reserved theme name.`, 'error');
      return;
    }

    // Check if name conflicts with another theme (when editing)
    const isEditing = !!this._editingThemeName;
    if (isEditing && name !== this._editingThemeName && this.customThemes[name]) {
      this._showToast(`A theme named "${name}" already exists.`, 'error');
      return;
    }
    
    const isDark = this.querySelector('#theme-mode-dark')?.checked;
    const primary = this.querySelector('#te-primary')?.value || '#2196f3';
    const success = this.querySelector('#te-success')?.value || '#4caf50';
    const danger = this.querySelector('#te-danger')?.value || '#f44336';
    const warning = this.querySelector('#te-warning')?.value || '#ff9800';
    const bgPrimary = this.querySelector('#te-bg-primary')?.value || '#ffffff';
    const bgSecondary = this.querySelector('#te-bg-secondary')?.value || '#f5f5f5';
    const textPrimary = this.querySelector('#te-text-primary')?.value || '#212121';
    const border = this.querySelector('#te-border')?.value || '#e0e0e0';
    
    const theme = {
      mode: isDark ? 'dark' : 'light',
      variables: {
        '--em-primary': primary,
        '--em-primary-dark': this.querySelector('#te-primary-dark')?.value || this._darkenColor(primary, 0.15),
        '--em-primary-light': this.querySelector('#te-primary-light')?.value || this._lightenColor(primary, 0.2),
        '--em-success': success,
        '--em-success-dark': this._darkenColor(success, 0.15),
        '--em-danger': danger,
        '--em-danger-dark': this._darkenColor(danger, 0.15),
        '--em-warning': warning,
        '--em-warning-dark': this._darkenColor(warning, 0.15),
        '--em-text-primary': textPrimary,
        '--em-text-secondary': this._lightenColor(textPrimary, 0.3),
        '--em-text-disabled': this._lightenColor(textPrimary, 0.5),
        '--em-bg-primary': bgPrimary,
        '--em-bg-secondary': bgSecondary,
        '--em-bg-hover': isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
        '--em-border': border,
        '--em-border-light': this._lightenColor(border, 0.05)
      }
    };
    
    // Handle background image
    const bgType = this.querySelector('input[name="bg-type"]:checked')?.value;
    if (bgType === 'url') {
      const url = this.querySelector('#te-bg-url')?.value?.trim();
      if (url) {
        theme.backgroundImage = url;
      }
    } else if (bgType === 'local' && this._tempLocalBgImage) {
      theme.backgroundImage = this._tempLocalBgImage;
    }
    
    // Handle background overlay
    if (theme.backgroundImage) {
      const overlayColor = this.querySelector('#te-bg-overlay')?.value || '#000000';
      const overlayOpacity = (this.querySelector('#te-bg-overlay-opacity')?.value || 70) / 100;
      // Convert hex to rgba
      const r = parseInt(overlayColor.slice(1, 3), 16);
      const g = parseInt(overlayColor.slice(3, 5), 16);
      const b = parseInt(overlayColor.slice(5, 7), 16);
      theme.backgroundOverlay = `rgba(${r},${g},${b},${overlayOpacity})`;
    }
    
    // If editing and name changed, delete the old theme
    if (isEditing && name !== this._editingThemeName) {
      delete this.customThemes[this._editingThemeName];
      // If the deleted theme was active, we'll switch to the new one
      if (this.activeTheme === this._editingThemeName) {
        this.activeTheme = name;
      }
    }
    
    this.customThemes[name] = theme;
    this._saveThemesToStorage();
    this._updateThemeDropdownList();
    this._setActiveTheme(name);
    this._closeThemeEditor();
    
    // Clear temp data
    this._tempLocalBgImage = null;
    this._editingThemeName = null;
  }
  
  _setupThemeEditor() {
    const overlay = this.querySelector('#theme-editor-overlay');
    if (!overlay) return;
    
    // Close button
    const closeBtn = this.querySelector('#theme-editor-close');
    const cancelBtn = this.querySelector('#theme-editor-cancel');
    const saveBtn = this.querySelector('#theme-editor-save');
    
    if (closeBtn) closeBtn.addEventListener('click', () => this._closeThemeEditor());
    if (cancelBtn) cancelBtn.addEventListener('click', () => this._closeThemeEditor());
    if (saveBtn) saveBtn.addEventListener('click', () => this._createThemeFromEditor());
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this._closeThemeEditor();
    });
    
    // Color input changes
    const colorInputs = overlay.querySelectorAll('input[type="color"]');
    colorInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const hex = overlay.querySelector(`.color-hex[data-for="${e.target.id}"]`);
        if (hex) hex.textContent = e.target.value;
        this._updateThemeEditorPreview();
      });
    });
    
    // Mode change
    const modeInputs = overlay.querySelectorAll('input[name="theme-mode"]');
    modeInputs.forEach(input => {
      input.addEventListener('change', () => {
        const isDark = this.querySelector('#theme-mode-dark')?.checked;
        // Update default colors based on mode
        if (isDark) {
          const bgInput = this.querySelector('#te-bg-primary');
          const bgSecInput = this.querySelector('#te-bg-secondary');
          const textInput = this.querySelector('#te-text-primary');
          const borderInput = this.querySelector('#te-border');
          if (bgInput && bgInput.value === '#ffffff') bgInput.value = '#1e1e1e';
          if (bgSecInput && bgSecInput.value === '#f5f5f5') bgSecInput.value = '#2d2d2d';
          if (textInput && textInput.value === '#212121') textInput.value = '#e0e0e0';
          if (borderInput && borderInput.value === '#e0e0e0') borderInput.value = '#424242';
        } else {
          const bgInput = this.querySelector('#te-bg-primary');
          const bgSecInput = this.querySelector('#te-bg-secondary');
          const textInput = this.querySelector('#te-text-primary');
          const borderInput = this.querySelector('#te-border');
          if (bgInput && bgInput.value === '#1e1e1e') bgInput.value = '#ffffff';
          if (bgSecInput && bgSecInput.value === '#2d2d2d') bgSecInput.value = '#f5f5f5';
          if (textInput && textInput.value === '#e0e0e0') textInput.value = '#212121';
          if (borderInput && borderInput.value === '#424242') borderInput.value = '#e0e0e0';
        }
        // Update hex displays
        colorInputs.forEach(ci => {
          const hex = overlay.querySelector(`.color-hex[data-for="${ci.id}"]`);
          if (hex) hex.textContent = ci.value;
        });
        this._updateThemeEditorPreview();
      });
    });
    
    // Background type selection
    const bgTypeInputs = overlay.querySelectorAll('input[name="bg-type"]');
    const bgUrlInput = overlay.querySelector('#bg-url-input');
    const bgLocalInput = overlay.querySelector('#bg-local-input');
    const bgOverlayRow = overlay.querySelector('#bg-overlay-row');
    
    bgTypeInputs.forEach(input => {
      input.addEventListener('change', () => {
        const type = overlay.querySelector('input[name="bg-type"]:checked')?.value;
        bgUrlInput.style.display = type === 'url' ? 'block' : 'none';
        bgLocalInput.style.display = type === 'local' ? 'block' : 'none';
        bgOverlayRow.style.display = type !== 'none' ? 'flex' : 'none';
      });
    });
    
    // Local file upload button
    const localBtn = overlay.querySelector('#te-bg-local-btn');
    const localPreview = overlay.querySelector('#te-bg-local-preview');
    if (localBtn) {
      localBtn.addEventListener('click', async () => {
        const imageData = await this._handleLocalImageUpload();
        if (imageData) {
          this._tempLocalBgImage = imageData;
          localPreview.innerHTML = '';
          const img = document.createElement('img');
          img.src = this._sanitizeUrl(imageData);
          img.alt = 'Background preview';
          localPreview.appendChild(img);
          localPreview.classList.add('has-image');
        }
      });
    }
    
    // Overlay opacity slider
    const overlayOpacity = overlay.querySelector('#te-bg-overlay-opacity');
    const overlayValue = overlay.querySelector('#te-bg-overlay-value');
    if (overlayOpacity && overlayValue) {
      overlayOpacity.addEventListener('input', () => {
        overlayValue.textContent = `${overlayOpacity.value}%`;
      });
    }
  }

  // ===== TOAST NOTIFICATION SYSTEM =====
  
  _showToast(message, type = 'info', duration = 10000) {
    // Remove existing toast if any
    const existing = document.querySelector('.em-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `em-toast em-toast-${type}`;
    
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    
    toast.innerHTML = `
      <span class="em-toast-icon">${icons[type] || icons.info}</span>
      <span class="em-toast-message">${this._escapeHtml(message)}</span>
      <button class="em-toast-close">&times;</button>
    `;
    
    document.body.appendChild(toast);
    
    // Trigger animation
    requestAnimationFrame(() => toast.classList.add('em-toast-show'));
    
    const closeBtn = toast.querySelector('.em-toast-close');
    closeBtn.addEventListener('click', () => {
      toast.classList.remove('em-toast-show');
      setTimeout(() => toast.remove(), 300);
    });
    
    if (duration > 0) {
      setTimeout(() => {
        if (toast.parentNode) {
          toast.classList.remove('em-toast-show');
          setTimeout(() => toast.remove(), 300);
        }
      }, duration);
    }
  }
  
  _selectAllVisible() {
    const checkboxes = this.querySelectorAll('.entity-checkbox:not(:checked)');
    checkboxes.forEach(cb => {
      cb.checked = true;
      this.selectedEntities.add(cb.dataset.entityId);
    });
    this.querySelectorAll('.integration-select-checkbox').forEach(cb => {
      cb.checked = true;
      cb.indeterminate = false;
    });
    this._updateSelectionUI();
    this._showToast(`Selected ${checkboxes.length} entities`, 'success');
  }
  
  _deselectAll() {
    this.selectedEntities.clear();
    this.querySelectorAll('.entity-checkbox:checked').forEach(cb => cb.checked = false);
    this.querySelectorAll('.integration-select-checkbox').forEach(cb => {
      cb.checked = false;
      cb.indeterminate = false;
    });
    this._updateSelectionUI();
    this._showToast('Selection cleared', 'info');
  }

  _updateIntegrationCheckboxState(integrationId) {
    if (!integrationId) return;
    const integrationCb = this.content && this.content.querySelector(`.integration-select-checkbox[data-integration="${integrationId}"]`);
    if (!integrationCb) return;
    const entityCbs = Array.from(this.content.querySelectorAll(`.entity-checkbox[data-integration="${integrationId}"]`));
    if (entityCbs.length === 0) return;
    const checkedCount = entityCbs.filter(cb => cb.checked).length;
    if (checkedCount === 0) {
      integrationCb.checked = false;
      integrationCb.indeterminate = false;
    } else if (checkedCount === entityCbs.length) {
      integrationCb.checked = true;
      integrationCb.indeterminate = false;
    } else {
      integrationCb.checked = false;
      integrationCb.indeterminate = true;
    }
  }

  _closeAllDropdowns() {
    this.querySelectorAll('.theme-dropdown-menu.active, .domain-menu.open').forEach(el => {
      el.classList.remove('active', 'open');
    });
    // Close any overlay dialogs
    const overlay = document.querySelector('.confirm-dialog-overlay, .theme-editor-overlay.active');
    if (overlay) {
      overlay.remove();
    }
  }
  
  _updateSelectionUI() {
    const count = this.selectedEntities.size;
    const selectionBar = this.querySelector('#selection-bar');
    if (selectionBar) {
      selectionBar.style.display = count > 0 ? 'flex' : 'none';
      const countSpan = selectionBar.querySelector('.selection-count');
      if (countSpan) countSpan.textContent = count;
    }
  }
  
  // ===== BULK RENAME =====
  
  _openBulkRenameDialog() {
    const selectedCount = this.selectedEntities.size;

    // Shared helper: execute a renameMap array
    const executeRenames = async (renameMap, closeDialog) => {
      if (renameMap.length === 0) {
        this._showToast('No changes to apply.', 'info');
        return;
      }
      closeDialog();
      this._showToast(`Renaming ${renameMap.length} entities...`, 'info', 0);
      const renameByDomain = {};
      for (const item of renameMap) {
        const d = item.old.split('.')[0];
        if (!renameByDomain[d]) renameByDomain[d] = [];
        renameByDomain[d].push(item);
      }
      let successCount = 0, errorCount = 0;
      for (const [, items] of Object.entries(renameByDomain)) {
        const results = await Promise.allSettled(
          items.map(item => this.renameEntity(item.old, item.new))
        );
        successCount += results.filter(r => r.status === 'fulfilled').length;
        errorCount += results.filter(r => r.status === 'rejected').length;
      }
      document.querySelector('.em-toast')?.remove();
      if (errorCount === 0) {
        this._showToast(`Successfully renamed ${successCount} entities`, 'success');
      } else {
        this._showToast(`Renamed ${successCount}, failed ${errorCount}`, 'warning');
      }
      await this.loadData();
    };

    if (selectedCount > 0) {
      // ── Per-entity rename mode ──────────────────────────────────────
      const selectedArray = Array.from(this.selectedEntities);

      const rowsHtml = selectedArray.map(entityId => {
        const dotIdx = entityId.indexOf('.');
        const domain   = entityId.slice(0, dotIdx);
        const objectId = entityId.slice(dotIdx + 1);
        return `
          <div class="bulk-rename-entity-row"
               data-old-entity="${this._escapeAttr(entityId)}"
               style="display:flex;align-items:center;gap:6px;padding:6px 0;border-bottom:1px solid var(--em-border);">
            <span style="font-family:monospace;font-size:0.82em;opacity:0.5;flex-shrink:0;">${this._escapeHtml(domain)}.</span>
            <span style="font-family:monospace;font-size:0.82em;background:var(--em-bg-secondary);padding:2px 6px;border-radius:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;flex-shrink:0;"
                  title="${this._escapeAttr(entityId)}">${this._escapeHtml(objectId)}</span>
            <span style="opacity:0.4;flex-shrink:0;">→</span>
            <span style="font-family:monospace;font-size:0.82em;opacity:0.5;flex-shrink:0;">${this._escapeHtml(domain)}.</span>
            <input type="text" class="bulk-new-name rename-input"
                   value="${this._escapeAttr(objectId)}"
                   placeholder="new_name"
                   style="flex:1;min-width:80px;font-family:monospace;font-size:0.85em;">
          </div>
        `;
      }).join('');

      const { overlay, closeDialog } = this.createDialog({
        title: `Bulk Rename — ${selectedCount} Entities`,
        color: 'var(--em-primary)',
        contentHtml: `
          <div class="bulk-rename-content">
            <details style="margin-bottom:12px;">
              <summary style="cursor:pointer;font-size:12px;color:var(--em-text-secondary);user-select:none;list-style:none;display:inline-flex;align-items:center;gap:4px;">
                <span class="em-details-arrow" style="display:inline-block;font-size:0.85em;transition:transform 0.15s;">▶</span> Auto-fill with pattern
              </summary>
              <div style="margin-top:10px;padding:10px;background:var(--em-bg-secondary);border-radius:6px;">
                <div class="bulk-rename-row">
                  <label>Find:</label>
                  <input type="text" id="bulk-find" class="rename-input" placeholder="e.g., living_room_">
                </div>
                <div class="bulk-rename-row">
                  <label>Replace:</label>
                  <input type="text" id="bulk-replace" class="rename-input" placeholder="e.g., lounge_">
                </div>
                <div style="display:flex;align-items:center;gap:10px;margin-top:8px;flex-wrap:wrap;">
                  <label><input type="checkbox" id="bulk-regex"> Use regex</label>
                  <label><input type="checkbox" id="bulk-case"> Case sensitive</label>
                  <button class="btn btn-secondary" id="bulk-apply-pattern" style="margin-left:auto;padding:3px 12px;font-size:0.85em;">Apply to all</button>
                </div>
              </div>
            </details>

            <div id="bulk-rename-rows" style="max-height:320px;overflow-y:auto;padding-right:4px;">
              ${rowsHtml}
            </div>

            <p id="bulk-rename-summary" style="margin-top:10px;font-size:0.85em;color:var(--em-text-secondary);">
              Edit the new names directly, or use "Auto-fill with pattern" above.
            </p>
          </div>
        `,
        actionsHtml: `
          <button class="btn btn-secondary confirm-no">Cancel</button>
          <button class="btn btn-primary confirm-yes">Rename</button>
        `
      });

      const updateSummary = () => {
        let changeCount = 0;
        overlay.querySelectorAll('.bulk-rename-entity-row').forEach(row => {
          const old = row.dataset.oldEntity;
          const objectId = old.slice(old.indexOf('.') + 1);
          const newVal = row.querySelector('.bulk-new-name').value.trim();
          if (newVal && newVal !== objectId) changeCount++;
        });
        const summary = overlay.querySelector('#bulk-rename-summary');
        if (summary) {
          summary.textContent = changeCount > 0
            ? `${changeCount} of ${selectedCount} entities will be renamed.`
            : 'Edit the new names directly, or use "Auto-fill with pattern" above.';
        }
      };

      overlay.querySelector('#bulk-apply-pattern').addEventListener('click', () => {
        const find = overlay.querySelector('#bulk-find').value;
        const replace = overlay.querySelector('#bulk-replace').value || '';
        const useRegex = overlay.querySelector('#bulk-regex').checked;
        const caseSensitive = overlay.querySelector('#bulk-case').checked;
        if (!find) { this._showToast('Enter a find pattern first.', 'info'); return; }
        let pattern;
        try {
          pattern = useRegex
            ? new RegExp(find, caseSensitive ? 'g' : 'gi')
            : new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'g' : 'gi');
        } catch (e) {
          this._showToast(`Invalid regex: ${e.message}`, 'danger');
          return;
        }
        overlay.querySelectorAll('.bulk-rename-entity-row').forEach(row => {
          const old = row.dataset.oldEntity;
          const objectId = old.slice(old.indexOf('.') + 1);
          row.querySelector('.bulk-new-name').value = objectId.replace(pattern, replace);
        });
        updateSummary();
      });

      overlay.querySelectorAll('.bulk-new-name').forEach(input => {
        input.addEventListener('input', updateSummary);
      });

      overlay.querySelector('.confirm-yes').addEventListener('click', async () => {
        const renameMap = [];
        overlay.querySelectorAll('.bulk-rename-entity-row').forEach(row => {
          const old = row.dataset.oldEntity;
          const domain   = old.slice(0, old.indexOf('.'));
          const objectId = old.slice(old.indexOf('.') + 1);
          const newVal = row.querySelector('.bulk-new-name').value.trim();
          if (newVal && newVal !== objectId) {
            renameMap.push({ old, new: `${domain}.${newVal}` });
          }
        });
        await executeRenames(renameMap, closeDialog);
      });

      overlay.querySelector('.confirm-no').addEventListener('click', closeDialog);

    } else {
      // ── Pattern / find-replace mode (no selection) ──────────────────
      const { overlay, closeDialog } = this.createDialog({
        title: 'Bulk Rename Entities',
        color: 'var(--em-primary)',
        contentHtml: `
          <div class="bulk-rename-content">
            <p style="margin-bottom: 8px; color: var(--em-text-secondary);">
              Rename all visible entities using find/replace patterns.
            </p>
            <div class="bulk-rename-row">
              <label>Find pattern:</label>
              <input type="text" id="bulk-find" class="rename-input" placeholder="e.g., living_room_temperature">
            </div>
            <div class="bulk-rename-row">
              <label>Replace with:</label>
              <input type="text" id="bulk-replace" class="rename-input" placeholder="e.g., lounge_temperature">
            </div>
            <div class="bulk-rename-options">
              <label><input type="checkbox" id="bulk-regex"> Use regex</label>
              <span class="regex-help-btn" id="regex-help-btn" title="Regex help" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;background:var(--em-text-secondary);color:var(--em-bg-primary);font-size:11px;font-weight:bold;cursor:pointer;margin-left:4px;flex-shrink:0;">?</span>
              <label style="margin-left:12px;"><input type="checkbox" id="bulk-case"> Case sensitive</label>
            </div>
            <div id="regex-help-box" style="display:none;margin-top:8px;padding:10px 12px;background:var(--em-bg-secondary);border:1px solid var(--em-border);border-radius:6px;font-size:12px;line-height:1.6;">
              <strong>Regex find/replace</strong> — matches the <em>object_id</em> part only (after the dot).<br><br>
              <strong>Common patterns:</strong><br>
              <code>^shelly_</code> — starts with "shelly_"<br>
              <code>_\d+$</code> — ends with numbers<br>
              <code>(old|legacy)</code> — matches either word<br>
              <code>_v\d+</code> — "_v" followed by digits<br><br>
              <strong>Capture groups in Replace:</strong><br>
              Find: <code>^(sensor)_old_(.+)</code> → Replace: <code>$1_new_$2</code><br>
              <code>sensor_old_power</code> → <code>sensor_new_power</code>
            </div>
            <div id="bulk-preview" class="bulk-preview"></div>
          </div>
        `,
        actionsHtml: `
          <button class="btn btn-secondary" id="bulk-preview-btn">Preview</button>
          <button class="btn btn-secondary confirm-no">Cancel</button>
          <button class="btn btn-primary confirm-yes" disabled>Rename</button>
        `
      });

      const findInput = overlay.querySelector('#bulk-find');
      const replaceInput = overlay.querySelector('#bulk-replace');
      const previewBtn = overlay.querySelector('#bulk-preview-btn');
      const renameBtn = overlay.querySelector('.confirm-yes');
      const previewDiv = overlay.querySelector('#bulk-preview');

      overlay.querySelector('#regex-help-btn').addEventListener('click', () => {
        const box = overlay.querySelector('#regex-help-box');
        box.style.display = box.style.display === 'none' ? 'block' : 'none';
      });

      let renameMap = [];

      const updatePreview = () => {
        const find = findInput.value;
        const replace = replaceInput.value;
        const useRegex = overlay.querySelector('#bulk-regex').checked;
        const caseSensitive = overlay.querySelector('#bulk-case').checked;

        if (!find) {
          previewDiv.innerHTML = '<p style="color: var(--em-text-secondary);">Enter a find pattern to preview changes.</p>';
          renameBtn.disabled = true;
          return;
        }

        const entities = Array.from(this.querySelectorAll('.entity-checkbox')).map(cb => cb.dataset.entityId);
        renameMap = [];

        try {
          const pattern = useRegex
            ? new RegExp(find, caseSensitive ? 'g' : 'gi')
            : new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'g' : 'gi');

          entities.forEach(entityId => {
            const [domain, name] = entityId.split('.');
            if (pattern.test(name)) {
              const newName = name.replace(pattern, replace);
              if (newName !== name) renameMap.push({ old: entityId, new: `${domain}.${newName}` });
            }
          });

          if (renameMap.length === 0) {
            previewDiv.innerHTML = '<p style="color: var(--em-warning);">No matches found.</p>';
            renameBtn.disabled = true;
          } else {
            previewDiv.innerHTML = `
              <p style="margin-bottom: 8px;"><strong>${renameMap.length}</strong> entities will be renamed:</p>
              <div class="preview-list" style="max-height: 200px; overflow-y: auto;">
                ${renameMap.slice(0, 20).map(item => `
                  <div class="preview-item">
                    <span class="old-name">${this._escapeHtml(item.old)}</span>
                    <span class="arrow">→</span>
                    <span class="new-name">${this._escapeHtml(item.new)}</span>
                  </div>
                `).join('')}
                ${renameMap.length > 20 ? `<p>... and ${renameMap.length - 20} more</p>` : ''}
              </div>
            `;
            renameBtn.disabled = false;
          }
        } catch (e) {
          previewDiv.innerHTML = `<p style="color: var(--em-danger);">Invalid regex: ${this._escapeHtml(e.message)}</p>`;
          renameBtn.disabled = true;
        }
      };

      previewBtn.addEventListener('click', updatePreview);
      findInput.addEventListener('input', () => { renameBtn.disabled = true; });
      replaceInput.addEventListener('input', () => { renameBtn.disabled = true; });

      renameBtn.addEventListener('click', async () => {
        await executeRenames(renameMap, closeDialog);
      });

      overlay.querySelector('.confirm-no').addEventListener('click', closeDialog);
    }
  }
  
  // ===== CONTEXT MENU =====
  
  _buildContextMenuHTML(hasMultipleSelected, isDisabled, isFavorite) {
    if (hasMultipleSelected) {
      return `
        <div class="em-context-header" style="padding:8px 12px;color:var(--em-text-secondary);font-size:11px;border-bottom:1px solid var(--em-border);">
          ${this.selectedEntities.size} entities selected
        </div>
        <div class="em-context-item" data-action="bulk-rename"><span class="icon">✎</span> Bulk Rename Selected</div>
        <div class="em-context-item" data-action="bulk-enable"><span class="icon">✓</span> Enable All Selected</div>
        <div class="em-context-item" data-action="bulk-disable"><span class="icon">✕</span> Disable All Selected</div>
        <div class="em-context-divider"></div>
        <div class="em-context-item" data-action="bulk-labels"><span class="icon">🔖</span> Add Labels to Selected</div>
        <div class="em-context-item" data-action="bulk-favorite"><span class="icon">★</span> Add All to Favorites</div>
        <div class="em-context-item" data-action="bulk-compare"><span class="icon">⇔</span> Compare Selected</div>
        <div class="em-context-divider"></div>
        <div class="em-context-item" data-action="clear-selection"><span class="icon">✗</span> Clear Selection</div>
      `;
    }
    return `
      <div class="em-context-item" data-action="rename"><span class="icon">✎</span> Rename</div>
      <div class="em-context-item" data-action="${isDisabled ? 'enable' : 'disable'}">
        <span class="icon">${isDisabled ? '✓' : '✕'}</span> ${isDisabled ? 'Enable' : 'Disable'}
      </div>
      <div class="em-context-divider"></div>
      <div class="em-context-item" data-action="favorite">
        <span class="icon">${isFavorite ? '★' : '☆'}</span> ${isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
      </div>
      <div class="em-context-item" data-action="tags"><span class="icon">🏷️</span> Manage Tags</div>
      <div class="em-context-item" data-action="labels"><span class="icon">🔖</span> Manage Labels</div>
      <div class="em-context-item" data-action="alias"><span class="icon">📝</span> Set Alias</div>
      <div class="em-context-item" data-action="compare"><span class="icon">⇔</span> Add to Comparison</div>
      <div class="em-context-divider"></div>
      <div class="em-context-item" data-action="stats"><span class="icon">📊</span> Statistics</div>
      <div class="em-context-item" data-action="history"><span class="icon">📈</span> State History</div>
      <div class="em-context-item" data-action="dependencies"><span class="icon">🔗</span> Dependencies</div>
      <div class="em-context-item" data-action="impact"><span class="icon">⚠️</span> Automation Impact</div>
      <div class="em-context-divider"></div>
      <div class="em-context-item" data-action="copy-id"><span class="icon">📋</span> Copy Entity ID</div>
      <div class="em-context-item" data-action="open-ha"><span class="icon">↗</span> Open in HA</div>
    `;
  }

  async _handleContextMenuAction(action, entityId) {
    switch (action) {
      case 'rename':        this.showRenameDialog(entityId); break;
      case 'enable':        await this.enableEntity(entityId); break;
      case 'disable':       await this.disableEntity(entityId); break;
      case 'favorite':      this._toggleFavorite(entityId); break;
      case 'tags':          this._showTagEditor(entityId); break;
      case 'labels':        this._showLabelEditor(entityId); break;
      case 'alias':         this._showAliasEditor(entityId); break;
      case 'compare':       this._addToComparison(entityId); break;
      case 'stats':         this._showEntityStatistics(entityId); break;
      case 'history':       this._showStateHistory(entityId); break;
      case 'dependencies':  this._showEntityDependencies(entityId); break;
      case 'impact':        this._analyzeAutomationImpact(entityId); break;
      case 'copy-id':
        navigator.clipboard.writeText(entityId);
        this._showToast('Entity ID copied to clipboard', 'success');
        break;
      case 'open-ha':
        history.pushState(null, '', `/config/entities/entity/${entityId}`);
        window.dispatchEvent(new CustomEvent('location-changed'));
        break;
      case 'bulk-rename':   this._openBulkRenameDialog(); break;
      case 'bulk-enable':   await this._bulkEnableSelected(); break;
      case 'bulk-disable':  await this._disableSelectedEntities(); break;
      case 'bulk-labels':   this._showBulkLabelEditor(); break;
      case 'bulk-favorite':
        for (const id of this.selectedEntities) {
          if (!this.favorites.has(id)) this._toggleFavorite(id);
        }
        this._showToast(`Added ${this.selectedEntities.size} entities to favorites`, 'success');
        break;
      case 'bulk-compare':
        for (const id of this.selectedEntities) this._addToComparison(id);
        break;
      case 'clear-selection':
        this.selectedEntities.clear();
        this.updateSelectedCount();
        this.updateView();
        this._showToast('Selection cleared', 'info');
        break;
    }
  }

  async _showEntityDetailsDialog(entityId) {
    // Show a loading dialog immediately
    const { overlay, closeDialog } = this.createDialog({
      title: entityId,
      color: 'var(--em-primary)',
      contentHtml: `<div id="em-edd-body" style="padding:40px;text-align:center;color:var(--em-text-secondary)">Loading entity details…</div>`,
      actionsHtml: `<button id="em-edd-close" style="padding:8px 20px;border:2px solid var(--em-border);background:transparent;color:var(--em-text-primary);border-radius:8px;cursor:pointer">Close</button>`,
      extraClass: 'em-entity-detail',
    });
    overlay.querySelector('#em-edd-close')?.addEventListener('click', closeDialog);

    // Fetch registry details + history in parallel
    let details, history;
    try {
      [details, history] = await Promise.all([
        this._hass.callWS({ type: 'entity_manager/get_entity_details', entity_id: entityId }),
        this._hass.callWS({
          type: 'history/history_during_period',
          entity_ids: [entityId],
          start_time: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
          end_time: new Date().toISOString(),
          minimal_response: true,
          no_attributes: true,
          significant_changes_only: false,
        }).catch(() => null),
      ]);
    } catch (err) {
      overlay.querySelector('#em-edd-body').innerHTML =
        `<div style="padding:20px;color:var(--em-danger)">Failed to load details: ${this._escapeHtml(String(err))}</div>`;
      return;
    }

    const e = details.entity;
    const d = details.device;
    const area = details.area;
    const ce = details.config_entry;
    const entityLabels = details.labels || [];
    const deviceLabels = details.device_labels || [];
    const state = this._hass?.states[entityId];
    const isDisabled = !!e.disabled_by;

    // ── Helpers ────────────────────────────────────────────────────
    const row = (label, value, extra = '') => value != null && value !== ''
      ? `<div style="display:flex;gap:8px;padding:5px 0;border-bottom:1px solid var(--em-border-light);align-items:flex-start">
           <span style="min-width:160px;color:var(--em-text-secondary);font-size:12px;flex-shrink:0">${label}</span>
           <span style="font-size:13px;word-break:break-all;color:var(--em-text-primary)">${value}${extra}</span>
         </div>`
      : '';

    const stateColor = (s) => {
      if (!s) return 'var(--em-text-secondary)';
      if (s === 'on' || s === 'home' || s === 'open') return '#4caf50';
      if (s === 'off' || s === 'not_home' || s === 'closed') return 'var(--em-text-secondary)';
      if (s === 'unavailable' || s === 'unknown') return '#ff9800';
      return 'var(--em-text-primary)';
    };

    // ── Section: Overview ──────────────────────────────────────────
    const domain = entityId.split('.')[0];
    const overviewHtml = `<div style="padding:8px 0">
      ${row('Entity ID', `<code style="font-family:monospace;background:var(--em-bg-hover);padding:2px 6px;border-radius:4px">${this._escapeHtml(e.entity_id)}</code>`)}
      ${row('Friendly name', this._escapeHtml(state?.attributes?.friendly_name || e.original_name || e.name || '—'))}
      ${row('Domain', `<span style="text-transform:uppercase;font-size:11px;background:var(--em-bg-hover);padding:2px 8px;border-radius:4px">${this._escapeHtml(domain)}</span>`)}
      ${row('Platform', this._escapeHtml(e.platform || '—'))}
      ${row('Unique ID', `<code style="font-family:monospace;font-size:11px;opacity:0.7">${this._escapeHtml(e.unique_id || '—')}</code>`)}
      ${e.aliases?.length ? row('Aliases', e.aliases.map(a => `<span style="background:var(--em-bg-hover);padding:2px 8px;border-radius:12px;margin-right:4px;font-size:12px">${this._escapeHtml(a)}</span>`).join('')) : ''}
    </div>`;

    // ── Section: Current State ─────────────────────────────────────
    const attrs = state?.attributes || {};
    const attrRows = Object.entries(attrs)
      .filter(([k]) => k !== 'friendly_name')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => {
        const displayVal = typeof v === 'object' ? JSON.stringify(v) : String(v);
        return row(k, this._escapeHtml(displayVal));
      }).join('');

    const stateHtml = state ? `<div style="padding:8px 0">
      <div style="margin-bottom:12px">
        <span style="font-size:28px;font-weight:700;color:${stateColor(state.state)}">${this._escapeHtml(state.state)}</span>
        ${attrs.unit_of_measurement ? `<span style="font-size:16px;color:var(--em-text-secondary);margin-left:4px">${this._escapeHtml(attrs.unit_of_measurement)}</span>` : ''}
      </div>
      ${row('Last changed', this._fmtAgo(state.last_changed))}
      ${row('Last updated', this._fmtAgo(state.last_updated))}
      ${attrRows || '<div style="color:var(--em-text-secondary);font-size:12px;padding:8px 0">No attributes</div>'}
    </div>` : `<div style="padding:16px 0;color:var(--em-text-secondary)">No state available (entity may be disabled)</div>`;

    // ── Section: Registry ──────────────────────────────────────────
    const registryHtml = `<div style="padding:8px 0">
      ${row('Status', isDisabled
        ? `<span style="color:#f44336;font-weight:600">Disabled</span> <span style="color:var(--em-text-secondary);font-size:12px">(by ${this._escapeHtml(e.disabled_by)})</span>`
        : `<span style="color:#4caf50;font-weight:600">Enabled</span>`)}
      ${e.hidden_by ? row('Hidden by', this._escapeHtml(e.hidden_by)) : ''}
      ${row('Entity category', this._escapeHtml(e.entity_category || '—'))}
      ${row('Device class', this._escapeHtml(e.device_class || e.original_device_class || '—'))}
      ${row('Unit of measurement', this._escapeHtml(e.unit_of_measurement || '—'))}
      ${row('Icon', this._escapeHtml(e.icon || e.original_icon || '—'))}
      ${e.supported_features ? row('Supported features', `<code style="font-size:11px">${e.supported_features}</code>`) : ''}
      ${Object.keys(e.capabilities || {}).length ? row('Capabilities', Object.entries(e.capabilities).map(([k, v]) =>
        `<span style="font-size:11px"><strong>${this._escapeHtml(k)}</strong>: ${this._escapeHtml(v)}</span>`).join('<br>')) : ''}
    </div>`;

    // ── Section: Device ────────────────────────────────────────────
    const deviceHtml = d ? `<div style="padding:8px 0">
      ${row('Name', this._escapeHtml(d.name_by_user || d.name || '—'))}
      ${row('Manufacturer', this._escapeHtml(d.manufacturer || '—'))}
      ${row('Model', this._escapeHtml(d.model || '—'))}
      ${d.model_id ? row('Model ID', this._escapeHtml(d.model_id)) : ''}
      ${d.sw_version ? row('SW version', this._escapeHtml(d.sw_version)) : ''}
      ${d.hw_version ? row('HW version', this._escapeHtml(d.hw_version)) : ''}
      ${d.serial_number ? row('Serial number', `<code style="font-size:11px">${this._escapeHtml(d.serial_number)}</code>`) : ''}
      ${d.configuration_url ? row('Config URL', `<a href="${this._escapeAttr(d.configuration_url)}" target="_blank" style="color:var(--em-primary)">${this._escapeHtml(d.configuration_url)}</a>`) : ''}
      ${d.connections?.length ? row('Connections', d.connections.map(([t, v]) =>
        `<span style="font-size:11px"><strong>${this._escapeHtml(t)}</strong>: <code>${this._escapeHtml(v)}</code></span>`).join('<br>')) : ''}
      ${d.identifiers?.length ? row('Identifiers', d.identifiers.map(([t, v]) =>
        `<span style="font-size:11px"><strong>${this._escapeHtml(t)}</strong>: <code>${this._escapeHtml(v)}</code></span>`).join('<br>')) : ''}
    </div>` : '';

    // ── Section: Integration ───────────────────────────────────────
    const integrationHtml = ce ? `<div style="padding:8px 0">
      ${row('Title', this._escapeHtml(ce.title || '—'))}
      ${row('Domain', this._escapeHtml(ce.domain || '—'))}
      ${row('Source', this._escapeHtml(ce.source || '—'))}
      ${row('Version', ce.version != null ? String(ce.version) : '—')}
      ${row('State', this._escapeHtml(ce.state || '—'))}
      ${ce.disabled_by ? row('Disabled by', this._escapeHtml(ce.disabled_by)) : ''}
    </div>` : '';

    // ── Section: Area ──────────────────────────────────────────────
    const areaHtml = area ? `<div style="padding:8px 0">
      ${row('Name', this._escapeHtml(area.name))}
      ${area.aliases?.length ? row('Aliases', area.aliases.map(a =>
        `<span style="background:var(--em-bg-hover);padding:2px 8px;border-radius:12px;margin-right:4px;font-size:12px">${this._escapeHtml(a)}</span>`).join('')) : ''}
    </div>` : '';

    // ── Section: Labels ────────────────────────────────────────────
    const labelChipHtml = (labelObjs) => labelObjs.length
      ? labelObjs.map(l => `<span style="background:${this._escapeAttr(this._labelColorCss(l.color))};color:white;padding:4px 10px;border-radius:12px;font-size:12px;font-weight:600">${this._escapeHtml(l.name)}</span>`).join('')
      : `<span style="color:var(--em-text-secondary);font-size:13px">None</span>`;
    const manageBtnStyle = 'padding:5px 12px;border-radius:6px;border:1px solid var(--em-border);background:var(--em-bg-hover);color:var(--em-text-primary);cursor:pointer;font-size:12px';
    const labelSubHead = (text) => `<div style="font-size:11px;color:var(--em-text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px">${text}</div>`;

    const labelsHtml = `<div style="padding:8px 0;display:flex;flex-direction:column;gap:12px">
      <div>
        ${labelSubHead('Entity Labels <span style="opacity:0.5;font-weight:400">— shown in Settings → Entities</span>')}
        <div id="em-edd-entity-label-chips" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:7px">${labelChipHtml(entityLabels)}</div>
        <button id="em-edd-manage-entity-labels" style="${manageBtnStyle}">🔖 ${entityLabels.length ? 'Edit' : 'Add'}</button>
      </div>
      ${d ? `<div>
        ${labelSubHead('Device Labels <span style="opacity:0.5;font-weight:400">— shown in Settings → Devices</span>')}
        <div id="em-edd-device-label-chips" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:7px">${labelChipHtml(deviceLabels)}</div>
        <button id="em-edd-manage-device-labels" style="${manageBtnStyle}">🔖 ${deviceLabels.length ? 'Edit' : 'Add'}</button>
      </div>` : ''}
    </div>`;

    // ── Section: History ───────────────────────────────────────────
    const histItems = history ? Object.values(history)[0] : null;
    const histHtml = histItems?.length ? (() => {
      const sorted = [...histItems].reverse().slice(0, 30);
      return `<div style="padding:8px 0">
        ${sorted.map(h => `
          <div style="display:flex;gap:12px;padding:4px 0;border-bottom:1px solid var(--em-border-light);align-items:center">
            <span style="font-size:11px;color:var(--em-text-secondary);min-width:90px;flex-shrink:0">${this._escapeHtml(this._fmtAgo(h.last_changed || h.lu || ''))}</span>
            <span style="font-size:13px;font-weight:600;color:${stateColor(h.s || h.state)}">${this._escapeHtml(h.s || h.state || '—')}</span>
          </div>`).join('')}
      </div>`;
    })() : `<div style="padding:16px 0;color:var(--em-text-secondary)">No history available</div>`;

    // ── Assemble sections ──────────────────────────────────────────
    // Open overview + state by default; rest collapsed
    const openGroup = (label, bodyHtml) => `
      <div class="entity-list-group">
        <div class="entity-list-group-title em-collapsible" style="cursor:pointer;user-select:none;display:flex;align-items:center;gap:6px">
          <span class="em-collapse-arrow" style="display:inline-block;transition:transform 0.2s;opacity:0.65;flex-shrink:0">▼</span>
          ${label}
        </div>
        <div class="em-group-body">${bodyHtml}</div>
      </div>`;

    let sectionsHtml = openGroup('Overview', overviewHtml);
    sectionsHtml += openGroup('Current State', stateHtml);
    sectionsHtml += this._collGroup('Registry', registryHtml);
    if (d)   sectionsHtml += this._collGroup('Device', deviceHtml);
    if (ce)  sectionsHtml += this._collGroup('Integration', integrationHtml);
    if (area) sectionsHtml += this._collGroup(`Area: ${this._escapeHtml(area.name)}`, areaHtml);
    const totalLabelCount = entityLabels.length + deviceLabels.length;
    sectionsHtml += this._collGroup(`Labels${totalLabelCount ? ` (${totalLabelCount})` : ''}`, labelsHtml);
    sectionsHtml += this._collGroup('State History (last 30 days)', histHtml);

    const friendlyTitle = state?.attributes?.friendly_name || e.original_name || entityId;

    // Update dialog content
    overlay.querySelector('#em-edd-body').innerHTML = `
      <div style="padding:4px 8px 0">
        <div style="font-size:11px;color:var(--em-text-secondary);margin-bottom:12px;font-family:monospace">${this._escapeHtml(entityId)}</div>
        ${sectionsHtml}
      </div>`;
    overlay.querySelector('.confirm-dialog-header h2').textContent = friendlyTitle;

    // Actions row
    const btnBase = 'padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;border:2px solid';
    overlay.querySelector('.confirm-dialog-actions').innerHTML = `
      <button id="em-edd-rename" style="${btnBase} var(--em-border);background:transparent;color:var(--em-text-primary)">✎ Rename</button>
      <button id="em-edd-toggle" style="${btnBase} ${isDisabled ? '#4caf50;background:#4caf50;color:white' : '#f44336;background:#f44336;color:white'}">
        ${isDisabled ? '✓ Enable' : '✕ Disable'}
      </button>
      <button id="em-edd-close" style="${btnBase} var(--em-border);background:transparent;color:var(--em-text-primary)">Close</button>`;

    // Attach listeners
    overlay.querySelector('#em-edd-close')?.addEventListener('click', closeDialog);
    overlay.querySelector('#em-edd-rename')?.addEventListener('click', () => {
      closeDialog();
      this.showRenameDialog(entityId);
    });
    overlay.querySelector('#em-edd-toggle')?.addEventListener('click', async () => {
      if (isDisabled) await this.enableEntity(entityId);
      else await this.disableEntity(entityId);
      closeDialog();
    });

    // Manage entity labels
    overlay.querySelector('#em-edd-manage-entity-labels')?.addEventListener('click', () => {
      this._showLabelEditor(entityId, 'entity').then(async () => {
        const updatedIds = await this._getEntityLabels(entityId);
        const allLabels = await this._loadHALabels();
        const chipsEl = overlay.querySelector('#em-edd-entity-label-chips');
        const btn = overlay.querySelector('#em-edd-manage-entity-labels');
        if (chipsEl) chipsEl.innerHTML = labelChipHtml(updatedIds.map(id => allLabels.find(l => l.label_id === id)).filter(Boolean));
        if (btn) btn.textContent = `🔖 ${updatedIds.length ? 'Edit' : 'Add'}`;
      });
    });

    // Manage device labels
    overlay.querySelector('#em-edd-manage-device-labels')?.addEventListener('click', () => {
      this._showLabelEditor(entityId, 'device').then(async () => {
        const deviceId = e.device_id;
        if (!deviceId) return;
        const updatedIds = await this._getDeviceLabels(deviceId);
        const allLabels = await this._loadHALabels();
        const chipsEl = overlay.querySelector('#em-edd-device-label-chips');
        const btn = overlay.querySelector('#em-edd-manage-device-labels');
        if (chipsEl) chipsEl.innerHTML = labelChipHtml(updatedIds.map(id => allLabels.find(l => l.label_id === id)).filter(Boolean));
        if (btn) btn.textContent = `🔖 ${updatedIds.length ? 'Edit' : 'Add'}`;
      });
    });

    // Collapsible toggle listeners
    overlay.querySelectorAll('.em-collapsible').forEach(header => {
      header.addEventListener('click', () => {
        const body = header.nextElementSibling;
        const arrow = header.querySelector('.em-collapse-arrow');
        const collapsed = body.style.display === 'none';
        body.style.display = collapsed ? '' : 'none';
        if (arrow) arrow.style.transform = collapsed ? '' : 'rotate(-90deg)';
      });
    });
  }

  _showContextMenu(e, entityId) {
    e.preventDefault();
    document.querySelector('.em-context-menu')?.remove();

    const entity = this._findEntityById(entityId);
    const isFavorite = this.favorites.has(entityId);
    const isDisabled = entity?.is_disabled;
    const hasMultipleSelected = this.selectedEntities.size > 1;

    if (hasMultipleSelected && !this.selectedEntities.has(entityId)) {
      this.selectedEntities.add(entityId);
    }

    const menu = document.createElement('div');
    menu.className = 'em-context-menu';
    menu.innerHTML = this._buildContextMenuHTML(hasMultipleSelected, isDisabled, isFavorite);

    // Position and clamp to viewport
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    document.body.appendChild(menu);
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth)  menu.style.left = `${e.clientX - rect.width}px`;
    if (rect.left < 0)                   menu.style.left = '0px';
    if (rect.bottom > window.innerHeight) menu.style.top = `${e.clientY - rect.height}px`;
    if (rect.top < 0)                    menu.style.top = '0px';

    menu.addEventListener('click', async (evt) => {
      const action = evt.target.closest('.em-context-item')?.dataset.action;
      menu.remove();
      if (action) await this._handleContextMenuAction(action, entityId);
    });

    const closeMenu = (evt) => {
      if (!menu.contains(evt.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 10);
  }
  
  _findEntityById(entityId) {
    if (!this.data) return null;
    for (const integration of this.data) {
      for (const device of Object.values(integration.devices)) {
        const entity = device.entities.find(e => e.entity_id === entityId);
        if (entity) return entity;
      }
    }
    return null;
  }
  
  // ===== FAVORITES =====
  
  _loadFavorites() {
    return new Set(this._loadFromStorage('em-favorites', []));
  }
  
  _saveFavorites() {
    this._saveToStorage('em-favorites', [...this.favorites]);
  }
  
  _toggleFavorite(entityId) {
    if (this.favorites.has(entityId)) {
      this.favorites.delete(entityId);
      this._showToast('Removed from favorites', 'info');
    } else {
      this.favorites.add(entityId);
      this._showToast('Added to favorites', 'success');
    }
    this._saveFavorites();
    this._updateFavoritesUI();
  }
  
  _updateFavoritesUI() {
    // Update star icons on entities
    this.querySelectorAll('.entity-item').forEach(item => {
      const entityId = item.querySelector('.entity-checkbox')?.dataset.entityId;
      if (entityId) {
        const starBtn = item.querySelector('.favorite-btn');
        if (starBtn) {
          starBtn.textContent = this.favorites.has(entityId) ? '★' : '☆';
          starBtn.classList.toggle('is-favorite', this.favorites.has(entityId));
        }
      }
    });
    
    // Update sidebar favorites count
    const favCount = this.querySelector('#favorites-count');
    if (favCount) favCount.textContent = this.favorites.size;
  }
  
  // ===== HELP GUIDE =====
  
  _showHelpGuide() {
    const { overlay, closeDialog } = this.createDialog({
      title: 'Entity Manager Help Guide',
      color: 'var(--em-primary)',
      contentHtml: `
        <div class="help-guide-content" style="max-height: 500px; overflow-y: auto; line-height: 1.6;">
          <style>
            .help-section { margin-bottom: 20px; }
            .help-section h3 { color: var(--em-primary); margin: 0 0 8px 0; font-size: 16px; display: flex; align-items: center; gap: 8px; }
            .help-section p { margin: 0 0 8px 0; color: var(--em-text-secondary); font-size: 14px; }
            .help-section ul { margin: 0; padding-left: 20px; color: var(--em-text-secondary); font-size: 14px; }
            .help-section li { margin-bottom: 4px; }
            .help-divider { border: none; border-top: 1px solid var(--em-border); margin: 16px 0; }
          </style>
          
          <div class="help-section">
            <h3>🔍 Search & Filter</h3>
            <p>Quickly find entities using the search bar and filters:</p>
            <ul>
              <li><strong>Search:</strong> Filter by entity ID, name, or device name</li>
              <li><strong>Domain Filter:</strong> Show only specific entity types (lights, sensors, etc.)</li>
              <li><strong>Status Filter:</strong> View all, enabled, or disabled entities</li>
              <li><strong>Integration Filter:</strong> Click an integration in the sidebar to filter</li>
              <li><strong>Label Filter:</strong> Filter entities by their Home Assistant labels</li>
            </ul>
          </div>
          
          <hr class="help-divider">
          
          <div class="help-section">
            <h3>✓ Enable/Disable Entities</h3>
            <p>Control which entities are active in Home Assistant:</p>
            <ul>
              <li><strong>Single Entity:</strong> Use the toggle switch in each row</li>
              <li><strong>Bulk Operations:</strong> Select multiple entities with checkboxes, then use the floating action bar</li>
              <li><strong>Right-Click Menu:</strong> Right-click any entity for quick actions</li>
            </ul>
          </div>
          
          <hr class="help-divider">
          
          <div class="help-section">
            <h3>✎ Rename Entities</h3>
            <p>Change entity IDs across your entire Home Assistant setup:</p>
            <ul>
              <li>Click the <strong>rename icon</strong> (✎) next to any entity</li>
              <li>Only lowercase letters, numbers, and underscores allowed</li>
              <li>References in automations and scripts update automatically</li>
              <li>Use <strong>Bulk Rename</strong> to rename multiple entities with patterns</li>
            </ul>
          </div>
          
          <hr class="help-divider">
          
          <div class="help-section">
            <h3>★ Favorites</h3>
            <p>Mark frequently accessed entities for quick access:</p>
            <ul>
              <li>Click the <strong>star icon</strong> (★) to favorite an entity</li>
              <li>Click "Favorites" in the sidebar to show only favorites</li>
              <li>Favorites persist across browser sessions</li>
            </ul>
          </div>
          
          <hr class="help-divider">
          
          <div class="help-section">
            <h3>🏷️ Tags & Aliases</h3>
            <p>Organize entities with custom tags and searchable aliases:</p>
            <ul>
              <li><strong>Tags:</strong> Right-click an entity → "Manage Tags" to add custom tags</li>
              <li><strong>Aliases:</strong> Add alternative names for easier searching</li>
              <li>Filter by tags using the search bar (type <code>#tagname</code>)</li>
            </ul>
          </div>
          
          <hr class="help-divider">
          
          <div class="help-section">
            <h3>🏷️ Labels</h3>
            <p>Work with Home Assistant's built-in entity labels:</p>
            <ul>
              <li>View and filter by labels in the sidebar</li>
              <li>Right-click entities to manage their labels</li>
              <li>Create new labels directly from the context menu</li>
            </ul>
          </div>
          
          <hr class="help-divider">
          
          <div class="help-section">
            <h3>⇔ Entity Comparison</h3>
            <p>Compare multiple entities side by side:</p>
            <ul>
              <li>Right-click an entity → "Add to Comparison"</li>
              <li>Add up to 4 entities for comparison</li>
              <li>Click "Comparison" in the sidebar to view</li>
            </ul>
          </div>
          
          <hr class="help-divider">
          
          <div class="help-section">
            <h3>📂 Smart Groups</h3>
            <p>Automatically organize entities:</p>
            <ul>
              <li><strong>By Integration:</strong> Group by the source integration</li>
              <li><strong>By Room:</strong> Group by area/room assignment</li>
              <li><strong>By Type:</strong> Group by entity domain (light, sensor, etc.)</li>
            </ul>
          </div>
          
          <hr class="help-divider">
          
          <div class="help-section">
            <h3>↩ Undo/Redo</h3>
            <p>Reverse accidental changes:</p>
            <ul>
              <li>Use sidebar buttons or <strong>Ctrl+Z / Ctrl+Y</strong></li>
              <li>Supports up to 50 undo steps</li>
              <li>Works for enable, disable, and rename operations</li>
            </ul>
          </div>
          
          <hr class="help-divider">
          
          <div class="help-section">
            <h3>📤 Export/Import</h3>
            <p>Backup and restore your entity configurations:</p>
            <ul>
              <li><strong>Export:</strong> Save current entity states to a JSON file</li>
              <li><strong>Import:</strong> Restore previously exported configurations</li>
              <li>Useful for backing up before major changes</li>
            </ul>
          </div>
          
          <hr class="help-divider">
          
          <div class="help-section">
            <h3>🔗 Automation Impact</h3>
            <p>See how entities are used in automations:</p>
            <ul>
              <li>View the "Automations" column to see usage count</li>
              <li>Click the count to see which automations reference the entity</li>
              <li>Helps identify safe entities to disable</li>
            </ul>
          </div>
          
          <hr class="help-divider">
          
          <div class="help-section">
            <h3>🎨 Themes</h3>
            <p>Customize the appearance:</p>
            <ul>
              <li>Click the theme button in the header</li>
              <li>Choose from Light, Dark, High Contrast, or OLED Black</li>
              <li>Create and save custom themes with your own colors</li>
            </ul>
          </div>
          
          <hr class="help-divider">
          
          <div class="help-section">
            <h3>⚙️ Columns</h3>
            <p>Show or hide table columns:</p>
            <ul>
              <li>Click "Columns" in the sidebar</li>
              <li>Toggle visibility of each column</li>
              <li>Your preferences are saved automatically</li>
            </ul>
          </div>
        </div>
      `,
      actionsHtml: `
        <button class="btn btn-primary">Close</button>
      `
    });
    
    overlay.querySelector('.btn-primary').addEventListener('click', closeDialog);
  }
  
  // ===== ACTIVITY LOG =====
  
  _loadActivityLog() {
    return this._loadFromStorage('em-activity-log', []);
  }
  
  _saveActivityLog() {
    // Keep only last 100 entries
    if (this.activityLog.length > 100) {
      this.activityLog = this.activityLog.slice(-100);
    }
    this._saveToStorage('em-activity-log', this.activityLog);
  }
  
  _logActivity(action, details) {
    this.activityLog.push({
      action,
      details,
      timestamp: new Date().toISOString()
    });
    this._saveActivityLog();
  }
  
  _showActivityLog() {
    const { overlay, closeDialog } = this.createDialog({
      title: 'Activity Log',
      color: 'var(--em-primary)',
      contentHtml: `
        <div class="activity-log-content" style="max-height: 400px; overflow-y: auto;">
          ${this.activityLog.length === 0 ? '<p style="color: var(--em-text-secondary);">No recent activity.</p>' : ''}
          ${this.activityLog.slice().reverse().map(entry => {
            const time = new Date(entry.timestamp);
            const timeStr = time.toLocaleString();
            let icon, text;
            
            switch (entry.action) {
              case 'enable':
                icon = '✓';
                text = `Enabled <strong>${entry.details.entity}</strong>`;
                break;
              case 'disable':
                icon = '✕';
                text = `Disabled <strong>${entry.details.entity}</strong>`;
                break;
              case 'rename':
                icon = '✎';
                text = `Renamed <strong>${entry.details.from}</strong> → <strong>${entry.details.to}</strong>`;
                break;
              default:
                icon = '•';
                text = entry.action;
            }
            
            return `
              <div class="activity-item">
                <span class="activity-icon">${icon}</span>
                <span class="activity-text">${text}</span>
                <span class="activity-time">${timeStr}</span>
              </div>
            `;
          }).join('')}
        </div>
      `,
      actionsHtml: `
        <button class="btn btn-secondary" id="clear-log-btn">Clear Log</button>
        <button class="btn btn-primary">Close</button>
      `
    });
    
    overlay.querySelector('.btn-primary').addEventListener('click', closeDialog);
    overlay.querySelector('#clear-log-btn').addEventListener('click', () => {
      this.activityLog = [];
      this._saveActivityLog();
      closeDialog();
      this._showToast('Activity log cleared', 'info');
    });
  }
  
  // ===== UNDO/REDO SYSTEM =====
  
  _pushUndoAction(action) {
    this.undoStack.push(action);
    if (this.undoStack.length > this.maxUndoSteps) {
      this.undoStack.shift();
    }
    this.redoStack = []; // Clear redo when new action
    this._updateUndoRedoUI();
  }
  
  async _executeAction(action, isUndo) {
    const verb = isUndo ? 'Undid' : 'Redid';
    switch (action.type) {
      case 'enable':
        await (isUndo ? this.disableEntity : this.enableEntity).call(this, action.entityId, true);
        this._showToast(`${verb} enable: ${action.entityId}`, 'info');
        break;
      case 'disable':
        await (isUndo ? this.enableEntity : this.disableEntity).call(this, action.entityId, true);
        this._showToast(`${verb} disable: ${action.entityId}`, 'info');
        break;
      case 'rename':
        await this.renameEntity(isUndo ? action.newId : action.oldId, isUndo ? action.oldId : action.newId, true);
        this._showToast(`${verb} rename`, 'info');
        break;
      case 'bulk-enable':
        for (const id of action.entityIds) await (isUndo ? this.disableEntity : this.enableEntity).call(this, id, true);
        this._showToast(`${verb} bulk enable (${action.entityIds.length})`, 'info');
        break;
      case 'bulk-disable':
        for (const id of action.entityIds) await (isUndo ? this.enableEntity : this.disableEntity).call(this, id, true);
        this._showToast(`${verb} bulk disable (${action.entityIds.length})`, 'info');
        break;
    }
  }

  async _undo() {
    if (this.undoStack.length === 0) { this._showToast('Nothing to undo', 'info'); return; }
    const action = this.undoStack.pop();
    this.redoStack.push(action);
    await this._executeAction(action, true);
    this._updateUndoRedoUI();
    await this.loadData();
  }

  async _redo() {
    if (this.redoStack.length === 0) { this._showToast('Nothing to redo', 'info'); return; }
    const action = this.redoStack.pop();
    this.undoStack.push(action);
    await this._executeAction(action, false);
    this._updateUndoRedoUI();
    await this.loadData();
  }
  
  _updateUndoRedoUI() {
    const undoBtn = this.querySelector('#undo-btn');
    const redoBtn = this.querySelector('#redo-btn');
    if (undoBtn) {
      undoBtn.disabled = this.undoStack.length === 0;
      undoBtn.title = this.undoStack.length > 0 ? `Undo (${this.undoStack.length})` : 'Nothing to undo';
    }
    if (redoBtn) {
      redoBtn.disabled = this.redoStack.length === 0;
      redoBtn.title = this.redoStack.length > 0 ? `Redo (${this.redoStack.length})` : 'Nothing to redo';
    }
  }
  
  // ===== FILTER PRESETS =====
  
  _loadFilterPresets() {
    return this._loadFromStorage('em-filter-presets', []);
  }

  _saveFilterPresets() {
    this._saveToStorage('em-filter-presets', this.filterPresets);
  }
  
  _saveCurrentFilterPreset(presetName) {
    const savePreset = (name) => {
      const preset = {
        id: Date.now(),
        name,
        filters: {
          viewState: this.viewState,
          selectedDomain: this.selectedDomain,
          searchTerm: this.searchTerm,
          smartGroupMode: this.smartGroupMode
        },
        // Keep flat properties for backwards compatibility
        viewState: this.viewState,
        selectedDomain: this.selectedDomain,
        searchTerm: this.searchTerm,
        smartGroupMode: this.smartGroupMode
      };

      this.filterPresets.push(preset);
      this._saveFilterPresets();
      this._showToast(`Preset "${name}" saved`, 'success');
      this._updateFilterPresetsUI();
    };

    if (presetName) {
      savePreset(presetName);
    } else {
      this._showPromptDialog('Save Filter Preset', 'Enter preset name:', '', savePreset);
    }
  }
  
  _applyFilterPreset(presetId) {
    const preset = this.filterPresets.find(p => p.id === presetId);
    if (!preset) return;
    
    this.viewState = preset.viewState || 'all';
    this.selectedDomain = preset.selectedDomain || 'all';
    this.searchTerm = preset.searchTerm || '';
    if (preset.smartGroupMode) this.smartGroupMode = preset.smartGroupMode;
    
    // Update UI
    const searchInput = this.content?.querySelector('#search-input');
    if (searchInput) searchInput.value = this.searchTerm;
    this.setActiveFilter();
    this.updateView();
    
    this._showToast(`Applied preset: ${preset.name}`, 'success');
  }
  
  _deleteFilterPreset(presetId) {
    this.filterPresets = this.filterPresets.filter(p => p.id !== presetId);
    this._saveFilterPresets();
    this._updateFilterPresetsUI();
    this._showToast('Preset deleted', 'info');
  }
  
  _updateFilterPresetsUI() {
    const container = this.querySelector('#filter-presets-list');
    if (!container) return;
    
    container.innerHTML = this.filterPresets.map(preset => `
      <div class="filter-preset-item" data-preset-id="${preset.id}">
        <span class="preset-name">${preset.name}</span>
        <button class="preset-delete" data-delete="${preset.id}">&times;</button>
      </div>
    `).join('');
  }
  
  // ===== CUSTOM COLUMNS =====
  
  _loadVisibleColumns() {
    return this._loadFromStorage('em-visible-columns',
      ['checkbox', 'favorite', 'name', 'id', 'device', 'state', 'status', 'actions']);
  }
  
  _saveVisibleColumns() {
    this._saveToStorage('em-visible-columns', this.visibleColumns);
  }
  
  _showColumnSettings() {
    const allColumns = [
      { id: 'checkbox', name: 'Selection', required: true },
      { id: 'favorite', name: 'Favorite' },
      { id: 'name', name: 'Name' },
      { id: 'id', name: 'Entity ID' },
      { id: 'device', name: 'Device' },
      { id: 'state', name: 'Current State' },
      { id: 'lastChanged', name: 'Last Changed' },
      { id: 'status', name: 'Enable/Disable Status' },
      { id: 'tags', name: 'Tags' },
      { id: 'alias', name: 'Alias' },
      { id: 'actions', name: 'Actions', required: true }
    ];
    
    const { overlay, closeDialog } = this.createDialog({
      title: 'Configure Columns',
      color: 'var(--em-primary)',
      contentHtml: `
        <div class="column-settings">
          <p style="color: var(--em-text-secondary); margin-bottom: 12px;">Select columns to display:</p>
          ${allColumns.map(col => `
            <label class="column-toggle">
              <input type="checkbox" data-col="${col.id}" 
                ${this.visibleColumns.includes(col.id) ? 'checked' : ''} 
                ${col.required ? 'disabled' : ''}>
              ${col.name} ${col.required ? '(required)' : ''}
            </label>
          `).join('')}
        </div>
      `,
      actionsHtml: `
        <button class="btn btn-secondary cancel-btn">Cancel</button>
        <button class="btn btn-primary save-btn">Save</button>
      `
    });
    
    overlay.querySelector('.cancel-btn').addEventListener('click', closeDialog);
    overlay.querySelector('.save-btn').addEventListener('click', () => {
      this.visibleColumns = [];
      overlay.querySelectorAll('input[data-col]:checked').forEach(cb => {
        this.visibleColumns.push(cb.dataset.col);
      });
      this._saveVisibleColumns();
      closeDialog();
      this.updateView();
      this._showToast('Columns updated', 'success');
    });
  }
  
  // ===== CUSTOM TAGS =====
  
  _loadEntityTags() {
    return this._loadFromStorage('em-entity-tags', {});
  }

  _saveEntityTags() {
    this._saveToStorage('em-entity-tags', this.entityTags);
  }
  
  _addTagToEntity(entityId, tag) {
    if (!this.entityTags[entityId]) {
      this.entityTags[entityId] = [];
    }
    if (!this.entityTags[entityId].includes(tag)) {
      this.entityTags[entityId].push(tag);
      this._saveEntityTags();
    }
  }
  
  _removeTagFromEntity(entityId, tag) {
    if (this.entityTags[entityId]) {
      this.entityTags[entityId] = this.entityTags[entityId].filter(t => t !== tag);
      this._saveEntityTags();
    }
  }
  
  _getAllTags() {
    const tags = new Set();
    Object.values(this.entityTags).forEach(entityTagList => {
      entityTagList.forEach(t => tags.add(t));
    });
    return [...tags].sort();
  }
  
  _showTagEditor(entityId) {
    const currentTags = this.entityTags[entityId] || [];
    const allTags = this._getAllTags();
    
    const { overlay, closeDialog } = this.createDialog({
      title: 'Manage Tags',
      color: 'var(--em-primary)',
      contentHtml: `
        <div class="tag-editor">
          <div class="current-tags">
            ${currentTags.map(t => `<span class="tag-chip">${t} <button data-remove="${t}">&times;</button></span>`).join('')}
            ${currentTags.length === 0 ? '<span style="color: var(--em-text-secondary);">No tags</span>' : ''}
          </div>
          <div class="tag-input-row">
            <input type="text" id="new-tag-input" placeholder="New tag..." list="existing-tags">
            <datalist id="existing-tags">
              ${allTags.map(t => `<option value="${t}">`).join('')}
            </datalist>
            <button class="btn btn-primary" id="add-tag-btn">Add</button>
          </div>
        </div>
      `,
      actionsHtml: `<button class="btn btn-primary">Done</button>`
    });
    
    const refreshTags = () => {
      const container = overlay.querySelector('.current-tags');
      const tags = this.entityTags[entityId] || [];
      container.innerHTML = tags.map(t => `<span class="tag-chip">${this._escapeHtml(t)} <button data-remove="${this._escapeAttr(t)}">&times;</button></span>`).join('') ||
        '<span style="color: var(--em-text-secondary);">No tags</span>';
    };
    
    overlay.querySelector('#add-tag-btn').addEventListener('click', () => {
      const input = overlay.querySelector('#new-tag-input');
      const tag = input.value.trim();
      if (tag) {
        this._addTagToEntity(entityId, tag);
        input.value = '';
        refreshTags();
      }
    });
    
    overlay.querySelector('.current-tags').addEventListener('click', (e) => {
      const removeBtn = e.target.closest('[data-remove]');
      if (removeBtn) {
        this._removeTagFromEntity(entityId, removeBtn.dataset.remove);
        refreshTags();
      }
    });
    
    overlay.querySelector('.btn-primary:last-child').addEventListener('click', closeDialog);
  }
  
  // ===== ENTITY LABELS (Home Assistant Labels) =====
  
  async _loadHALabels() {
    try {
      const result = await this._hass.callWS({ type: 'config/label_registry/list' });
      this.labelsCache = result || [];
      return this.labelsCache;
    } catch (e) {
      console.error('Error loading labels:', e);
      return [];
    }
  }
  
  async _loadLabeledEntities() {
    try {
      const entityRegistry = await this._hass.callWS({ type: 'config/entity_registry/list' });
      const labels = this.labelsCache || await this._loadHALabels();
      
      // Group entities by label
      const labeledEntities = {};
      
      for (const entity of entityRegistry) {
        const entityLabels = entity.labels
          ? (Array.isArray(entity.labels) ? entity.labels : Array.from(entity.labels))
          : [];
        if (entityLabels.length > 0) {
          for (const labelId of entityLabels) {
            if (!labeledEntities[labelId]) {
              const labelInfo = labels.find(l => l.label_id === labelId);
              labeledEntities[labelId] = {
                label_id: labelId,
                name: labelInfo?.name || labelId,
                color: labelInfo?.color || 'blue',
                entities: [],
                byIntegration: {}
              };
            }
            
            // Get integration (domain prefix)
            const domain = entity.entity_id.split('.')[0];
            labeledEntities[labelId].entities.push(entity.entity_id);
            
            if (!labeledEntities[labelId].byIntegration[domain]) {
              labeledEntities[labelId].byIntegration[domain] = [];
            }
            labeledEntities[labelId].byIntegration[domain].push(entity.entity_id);
          }
        }
      }
      
      this.labeledEntitiesCache = labeledEntities;
      return labeledEntities;
    } catch (e) {
      console.error('Error loading labeled entities:', e);
      return {};
    }
  }
  
  async _loadAndDisplayLabels() {
    const labelsList = this.querySelector('#labels-list');
    if (!labelsList) return;

    // If cache is already populated, render immediately — no loading flash
    if (this.labeledEntitiesCache) {
      this._renderLabelsList(labelsList, this.labeledEntitiesCache);
      return;
    }

    // First load — show spinner while fetching
    labelsList.innerHTML = '<div class="sidebar-item" style="opacity: 0.5;"><span class="icon">⏳</span><span class="label">Loading...</span></div>';

    try {
      const labeledEntities = await this._loadLabeledEntities();
      this._renderLabelsList(labelsList, labeledEntities);
    } catch (e) {
      console.error('Error displaying labels:', e);
      labelsList.innerHTML = '<div class="sidebar-item" style="color: var(--em-error);"><span class="icon">⚠️</span><span class="label">Error loading labels</span></div>';
    }
  }

  _renderLabelsList(labelsList, labeledEntities) {
    const labels = Object.values(labeledEntities).sort((a, b) => b.entities.length - a.entities.length);

    if (labels.length === 0) {
      labelsList.innerHTML = '<div class="sidebar-item" style="opacity: 0.7;"><span class="icon">📝</span><span class="label">No labeled entities</span></div>';
      return;
    }

    const displayLabels = this.showAllSidebarLabels ? labels : labels.slice(0, 8);

    let html = displayLabels.map(label => `
      <div class="sidebar-item ${this.selectedLabelFilter === label.label_id ? 'active' : ''}" data-label-id="${this._escapeAttr(label.label_id)}">
        <span class="icon" style="color: ${this._escapeAttr(this._labelColorCss(label.color))};">●</span>
        <span class="label">${this._escapeHtml(label.name)}</span>
        <span class="count">${label.entities.length}</span>
        <button data-edit-label="${this._escapeAttr(label.label_id)}"
          style="background:none;border:none;cursor:pointer;color:var(--em-text-secondary);padding:0 2px;font-size:13px;line-height:1;opacity:0.7;flex-shrink:0"
          title="Edit label">✎</button>
      </div>
    `).join('');

    if (!this.showAllSidebarLabels && labels.length > 8) {
      html += `<div class="sidebar-item more" data-action="show-all-labels">+${labels.length - 8} more...</div>`;
    }

    if (this.showAllSidebarLabels && labels.length > 8) {
      html += `<div class="sidebar-item" data-action="collapse-labels"><span class="icon">▲</span><span class="label">Show less</span></div>`;
    }

    // Add refresh option
    html += `<div class="sidebar-item" data-action="load-labels" style="opacity: 0.7;"><span class="icon">🔄</span><span class="label">Refresh</span></div>`;

    labelsList.innerHTML = html;
  }
  
  async _filterByLabel(labelId) {
    // Store the selected label filter
    this.selectedLabelFilter = labelId;
    this._showOnlyFavorites = false;
    this.selectedIntegrationFilter = null;
    
    // Load labeled entities if not cached
    if (!this.labeledEntitiesCache) {
      await this._loadLabeledEntities();
    }
    
    const labelData = this.labeledEntitiesCache[labelId];
    if (labelData) {
      this._showToast(`Filtering by label: ${labelData.name}`, 'info');
    }
    
    // Update the view
    this.updateView();
    
    // Re-render sidebar to update active states
    this._reRenderSidebar();
  }

  async _getEntityLabels(entityId) {
    try {
      // Use /get (not /list) — list omits labels in some HA versions
      const entry = await this._hass.callWS({
        type: 'config/entity_registry/get',
        entity_id: entityId,
      });
      // Normalise: HA may return a Set-like or plain array
      const raw = entry?.labels;
      if (!raw) return [];
      return Array.isArray(raw) ? raw : Array.from(raw);
    } catch (e) {
      console.error('Error getting entity labels:', e);
      return [];
    }
  }
  
  async _getDeviceLabels(deviceId) {
    try {
      const entry = await this._hass.callWS({
        type: 'config/device_registry/get',
        device_id: deviceId,
      });
      const raw = entry?.labels;
      if (!raw) return [];
      return Array.isArray(raw) ? raw : Array.from(raw);
    } catch (e) {
      console.error('Error getting device labels:', e);
      return [];
    }
  }

  async _getEntityDeviceId(entityId) {
    try {
      const entry = await this._hass.callWS({
        type: 'config/entity_registry/get',
        entity_id: entityId,
      });
      return entry?.device_id || null;
    } catch { return null; }
  }

  async _addLabelToEntity(entityId, labelId, target = 'both') {
    try {
      if (target === 'entity' || target === 'both') {
        const currentLabels = await this._getEntityLabels(entityId);
        if (!currentLabels.includes(labelId)) {
          await this._hass.callWS({
            type: 'config/entity_registry/update',
            entity_id: entityId,
            labels: [...currentLabels, labelId],
          });
        }
      }
      if (target === 'device' || target === 'both') {
        const deviceId = await this._getEntityDeviceId(entityId);
        if (deviceId) {
          const devLabels = await this._getDeviceLabels(deviceId);
          if (!devLabels.includes(labelId)) {
            await this._hass.callWS({
              type: 'config/device_registry/update',
              device_id: deviceId,
              labels: [...devLabels, labelId],
            });
          }
        }
      }
    } catch (e) {
      console.error('Error adding label:', e);
      throw e;
    }
  }

  async _removeLabelFromEntity(entityId, labelId, target = 'both') {
    try {
      if (target === 'entity' || target === 'both') {
        const currentLabels = await this._getEntityLabels(entityId);
        await this._hass.callWS({
          type: 'config/entity_registry/update',
          entity_id: entityId,
          labels: currentLabels.filter(l => l !== labelId),
        });
      }
      if (target === 'device' || target === 'both') {
        const deviceId = await this._getEntityDeviceId(entityId);
        if (deviceId) {
          const devLabels = await this._getDeviceLabels(deviceId);
          if (devLabels.includes(labelId)) {
            await this._hass.callWS({
              type: 'config/device_registry/update',
              device_id: deviceId,
              labels: devLabels.filter(l => l !== labelId),
            });
          }
        }
      }
    } catch (e) {
      console.error('Error removing label:', e);
      throw e;
    }
  }
  
  async _createLabel(name, color = null, icon = null, description = null) {
    try {
      const result = await this._hass.callWS({
        type: 'config/label_registry/create',
        name: name,
        color: color,
        icon: icon,
        description: description
      });
      return result;
    } catch (e) {
      console.error('Error creating label:', e);
      throw e;
    }
  }
  
  async _showLabelEditDialog(label, selectedEntityIds = []) {
    const currentColor = label.color || 'blue';
    const swatchHtml = HA_LABEL_COLORS.map(([name, hex]) =>
      `<button class="em-label-swatch${name === currentColor ? ' selected' : ''}" data-color="${name}" style="background:${hex}" title="${name}"></button>`
    ).join('');

    const haSelection = selectedEntityIds.length > 0;
    const selectionHtml = haSelection ? `
      <div style="padding:10px 12px;background:var(--em-bg-secondary);border-radius:8px;border:1px solid var(--em-border)">
        <div style="font-size:12px;color:var(--em-text-secondary);margin-bottom:8px">
          ${selectedEntityIds.length} ${selectedEntityIds.length === 1 ? 'entity' : 'entities'} selected
        </div>
        ${this._labelTargetSelectorHtml('em-edit-label-target', 'both', true)}
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary" id="em-label-add-selected" style="flex:1">+ Add to selected</button>
          <button class="btn btn-secondary" id="em-label-remove-selected" style="flex:1">− Remove from selected</button>
        </div>
      </div>
      <hr style="border:none;border-top:1px solid var(--em-border);margin:4px 0">
    ` : '';

    const { overlay, closeDialog } = this.createDialog({
      title: `Edit Label: ${label.name}`,
      color: 'var(--em-primary)',
      contentHtml: `
        <div style="display:flex;flex-direction:column;gap:12px;padding:4px 0">
          ${selectionHtml}
          <div>
            <label style="font-size:12px;color:var(--em-text-secondary);display:block;margin-bottom:4px">Label name</label>
            <input id="em-label-edit-name" type="text" value="${this._escapeAttr(label.name)}"
              style="width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--em-border);border-radius:6px;background:var(--em-bg-primary);color:var(--em-text-primary);font-size:14px">
          </div>
          <div>
            <label style="font-size:12px;color:var(--em-text-secondary);display:block;margin-bottom:6px">Color</label>
            <div class="em-label-color-picker" id="em-label-edit-color" data-value="${this._escapeAttr(currentColor)}">
              ${swatchHtml}
            </div>
          </div>
        </div>
      `,
      actionsHtml: `
        <button class="btn btn-danger" id="em-label-delete-btn" style="margin-right:auto">Delete</button>
        <button class="btn btn-secondary confirm-no">Cancel</button>
        <button class="btn btn-primary" id="em-label-save-btn">Save</button>
      `
    });

    // Bulk add/remove for selected entities
    if (haSelection) {
      this._attachTargetSelector(overlay, 'em-edit-label-target');

      overlay.querySelector('#em-label-add-selected').addEventListener('click', async () => {
        const target = this._getTargetValue(overlay, 'em-edit-label-target');
        this._showToast(`Adding "${label.name}" to ${selectedEntityIds.length} entities…`, 'info', 0);
        let ok = 0, fail = 0;
        for (const entityId of selectedEntityIds) {
          try { await this._addLabelToEntity(entityId, label.label_id, target); ok++; }
          catch { fail++; }
        }
        this.labeledEntitiesCache = null;
        closeDialog();
        this._loadAndDisplayLabels();
        this._showToast(fail ? `Added to ${ok}, failed ${fail}` : `Added "${label.name}" to ${ok} entities`, fail ? 'warning' : 'success');
      });

      overlay.querySelector('#em-label-remove-selected').addEventListener('click', async () => {
        const target = this._getTargetValue(overlay, 'em-edit-label-target');
        this._showToast(`Removing "${label.name}" from ${selectedEntityIds.length} entities…`, 'info', 0);
        let ok = 0, fail = 0;
        for (const entityId of selectedEntityIds) {
          try { await this._removeLabelFromEntity(entityId, label.label_id, target); ok++; }
          catch { fail++; }
        }
        this.labeledEntitiesCache = null;
        closeDialog();
        this._loadAndDisplayLabels();
        this._showToast(fail ? `Removed from ${ok}, failed ${fail}` : `Removed "${label.name}" from ${ok} entities`, fail ? 'warning' : 'success');
      });
    }

    // Swatch picker
    overlay.querySelector('#em-label-edit-color').addEventListener('click', (e) => {
      const swatch = e.target.closest('.em-label-swatch');
      if (!swatch) return;
      const picker = swatch.closest('.em-label-color-picker');
      picker.querySelectorAll('.em-label-swatch').forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
      picker.dataset.value = swatch.dataset.color;
    });

    // Save
    overlay.querySelector('#em-label-save-btn').addEventListener('click', async () => {
      const name = overlay.querySelector('#em-label-edit-name').value.trim();
      const color = overlay.querySelector('#em-label-edit-color').dataset.value || 'blue';
      if (!name) { this._showToast('Label name cannot be empty', 'warning'); return; }
      try {
        await this._hass.callWS({ type: 'config/label_registry/update', label_id: label.label_id, name, color });
        this._showToast(`Label "${name}" updated`, 'success');
        this.labelsCache = null;
        this.labeledEntitiesCache = null;
        closeDialog();
        this._loadAndDisplayLabels();
      } catch (e) {
        this._showToast('Error updating label', 'error');
      }
    });

    // Delete
    overlay.querySelector('#em-label-delete-btn').addEventListener('click', async () => {
      if (!confirm(`Delete label "${label.name}"? This will remove it from all entities.`)) return;
      try {
        await this._hass.callWS({ type: 'config/label_registry/delete', label_id: label.label_id });
        this._showToast(`Label "${label.name}" deleted`, 'success');
        this.labelsCache = null;
        this.labeledEntitiesCache = null;
        closeDialog();
        this._loadAndDisplayLabels();
      } catch (e) {
        this._showToast('Error deleting label', 'error');
      }
    });

    overlay.querySelector('.confirm-no').addEventListener('click', closeDialog);
  }

  async _showLabelEditor(entityId, defaultTarget = 'both') {
    const [allLabels, deviceId] = await Promise.all([
      this._loadHALabels(),
      this._getEntityDeviceId(entityId),
    ]);

    // If entity has no device, clamp target to 'entity'
    if (!deviceId && defaultTarget !== 'entity') defaultTarget = 'entity';

    // Fetch initial labels for the chosen target
    const getLabelsForTarget = async (target) => {
      if (target === 'device' && deviceId) return await this._getDeviceLabels(deviceId);
      if (target === 'both' && deviceId) {
        const [el, dl] = await Promise.all([this._getEntityLabels(entityId), this._getDeviceLabels(deviceId)]);
        return [...new Set([...el, ...dl])];
      }
      return await this._getEntityLabels(entityId);
    };

    const initialLabels = await getLabelsForTarget(defaultTarget);

    const sectionTitleFor = (t) =>
      t === 'device' ? 'Device Labels' : t === 'entity' ? 'Entity Labels' : 'Current Labels';

    const renderChips = (labelIds) => labelIds.length === 0
      ? '<span style="color:var(--em-text-secondary);font-size:13px">No labels assigned</span>'
      : labelIds.map(labelId => {
          const label = allLabels.find(l => l.label_id === labelId);
          const chipColor = this._labelColorCss(label?.color);
          const textColor = this._contrastColor(chipColor);
          return `<span class="label-chip" style="background:${this._escapeAttr(chipColor)};color:${textColor};padding:4px 8px;border-radius:12px;margin:2px;display:inline-block;font-size:12px">
            ${this._escapeHtml(label?.name || labelId)}
            <button data-remove="${this._escapeAttr(labelId)}" style="background:none;border:none;color:${textColor};cursor:pointer;margin-left:4px">&times;</button>
          </span>`;
        }).join('');

    const renderAvailable = (currentIds) => allLabels.length === 0
      ? '<p style="color:var(--em-text-secondary)">No labels defined yet.</p>'
      : allLabels.map(label => `
          <div class="label-option" data-label-id="${this._escapeAttr(label.label_id)}"
            style="padding:8px;cursor:pointer;border-radius:4px;margin:4px 0;display:flex;align-items:center;gap:8px;${currentIds.includes(label.label_id) ? 'opacity:0.5' : ''}">
            <span style="width:16px;height:16px;border-radius:50%;background:${this._escapeAttr(this._labelColorCss(label.color))};display:inline-block;flex-shrink:0"></span>
            <span>${this._escapeHtml(label.name)}</span>
            ${currentIds.includes(label.label_id)
              ? '<span style="margin-left:auto;color:var(--em-success)">✓</span>'
              : '<span style="margin-left:auto;color:var(--em-text-secondary)">+ Add</span>'}
          </div>`).join('');

    const { overlay, closeDialog } = this.createDialog({
      title: 'Manage Labels',
      color: 'var(--em-primary)',
      contentHtml: `
        <div class="label-editor">
          <p style="color:var(--em-text-secondary);margin-bottom:10px;font-size:12px;font-family:monospace">${this._escapeHtml(entityId)}</p>
          ${this._labelTargetSelectorHtml('em-label-target', defaultTarget, !!deviceId)}
          <div class="current-labels" style="margin-bottom:14px">
            <div id="em-label-section-title" style="font-size:12px;color:var(--em-text-secondary);margin-bottom:5px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">
              ${sectionTitleFor(defaultTarget)}
            </div>
            <div id="entity-labels" style="min-height:28px">${renderChips(initialLabels)}</div>
          </div>
          <div class="available-labels">
            <div style="font-size:12px;color:var(--em-text-secondary);margin-bottom:5px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Available Labels</div>
            <div id="available-labels" style="max-height:150px;overflow-y:auto">${renderAvailable(initialLabels)}</div>
          </div>
          <div class="create-label" style="margin-top:14px;padding-top:14px;border-top:1px solid var(--em-border)">
            <strong>Create New Label:</strong>
            <div style="display:flex;gap:8px;margin-top:8px">
              <input type="text" id="new-label-name" placeholder="Label name"
                style="flex:1;padding:8px;border:1px solid var(--em-border);border-radius:4px;background:var(--em-surface);color:var(--em-text)">
            </div>
            <div class="em-label-color-picker" id="new-label-color" data-value="blue" style="margin-top:8px">
              ${HA_LABEL_COLORS.map(([name, hex]) => `<button class="em-label-swatch${name === 'blue' ? ' selected' : ''}" data-color="${name}" style="background:${hex}" title="${name}"></button>`).join('')}
            </div>
            <div style="display:flex;justify-content:flex-end;margin-top:8px">
              <button class="btn btn-primary" id="create-label-btn">Create</button>
            </div>
          </div>
        </div>`,
      actionsHtml: `<button class="btn btn-primary">Done</button>`
    });

    const refreshLabels = async () => {
      this.labeledEntitiesCache = null;
      const target = this._getTargetValue(overlay, 'em-label-target');
      const updated = await getLabelsForTarget(target);
      overlay.querySelector('#em-label-section-title').textContent = sectionTitleFor(target);
      overlay.querySelector('#entity-labels').innerHTML = renderChips(updated);
      overlay.querySelector('#available-labels').innerHTML = renderAvailable(updated);
    };

    // Target selector — re-render when changed
    this._attachTargetSelector(overlay, 'em-label-target');
    overlay.querySelector('#em-label-target')?.addEventListener('click', () => requestAnimationFrame(refreshLabels));

    // Add label
    overlay.querySelector('#available-labels').addEventListener('click', async (e) => {
      const option = e.target.closest('.label-option');
      if (!option) return;
      const labelId = option.dataset.labelId;
      const target = this._getTargetValue(overlay, 'em-label-target');
      const current = await getLabelsForTarget(target);
      if (!current.includes(labelId)) {
        try {
          await this._addLabelToEntity(entityId, labelId, target);
          this._showToast('Label added', 'success');
          await refreshLabels();
        } catch { this._showToast('Error adding label', 'error'); }
      }
    });

    // Remove label chip
    overlay.querySelector('#entity-labels').addEventListener('click', async (e) => {
      const removeBtn = e.target.closest('[data-remove]');
      if (!removeBtn) return;
      const target = this._getTargetValue(overlay, 'em-label-target');
      try {
        await this._removeLabelFromEntity(entityId, removeBtn.dataset.remove, target);
        this._showToast('Label removed', 'success');
        await refreshLabels();
      } catch { this._showToast('Error removing label', 'error'); }
    });

    // Swatch picker
    overlay.querySelector('#new-label-color').addEventListener('click', (e) => {
      const swatch = e.target.closest('.em-label-swatch');
      if (!swatch) return;
      const picker = swatch.closest('.em-label-color-picker');
      picker.querySelectorAll('.em-label-swatch').forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
      picker.dataset.value = swatch.dataset.color;
    });

    // Create label
    overlay.querySelector('#create-label-btn').addEventListener('click', async () => {
      const nameInput = overlay.querySelector('#new-label-name');
      const colorPicker = overlay.querySelector('#new-label-color');
      const name = nameInput.value.trim();
      const color = colorPicker.dataset.value || 'blue';
      if (!name) { this._showToast('Please enter a label name', 'warning'); return; }
      try {
        const newLabel = await this._createLabel(name, color);
        allLabels.push(newLabel);
        nameInput.value = '';
        this._showToast(`Label "${name}" created`, 'success');
        await refreshLabels();
      } catch { this._showToast('Error creating label', 'error'); }
    });

    overlay.querySelector('.confirm-dialog-actions .btn-primary').addEventListener('click', () => {
      closeDialog();
      this._loadAndDisplayLabels();
    });
  }

  async _showBulkLabelEditor() {
    const allLabels = await this._loadHALabels();
    const entityCount = this.selectedEntities.size;
    
    const { overlay, closeDialog } = this.createDialog({
      title: 'Add Labels to Selected Entities',
      color: 'var(--em-primary)',
      contentHtml: `
        <div class="bulk-label-editor">
          <p style="color: var(--em-text-secondary); margin-bottom: 8px;">Add labels to ${entityCount} selected ${entityCount === 1 ? 'entity' : 'entities'}</p>
          ${this._labelTargetSelectorHtml('em-bulk-label-target', 'both', true)}
          <details style="margin-bottom: 16px;">
            <summary style="cursor: pointer; font-size: 12px; color: var(--em-text-secondary); user-select: none;">Show selected entities</summary>
            <div style="margin-top: 8px; max-height: 120px; overflow-y: auto; background: var(--em-bg-secondary); border-radius: 6px; padding: 8px;">
              ${Array.from(this.selectedEntities).map(id => `
                <div style="font-size: 12px; padding: 2px 4px; font-family: monospace; color: var(--em-text-primary);">${this._escapeHtml(id)}</div>
              `).join('')}
            </div>
          </details>
          <div class="label-selection" id="label-selection" style="max-height: 200px; overflow-y: auto;">
            ${allLabels.length === 0 ? '<p style="color: var(--em-text-secondary);">No labels defined yet.</p>' :
              allLabels.map(label => `
                <label class="label-checkbox" style="display: flex; align-items: center; gap: 8px; padding: 8px; cursor: pointer; border-radius: 4px; margin: 4px 0;">
                  <input type="checkbox" data-label-id="${label.label_id}">
                  <span style="width: 16px; height: 16px; border-radius: 50%; background: ${this._labelColorCss(label.color)}; display: inline-block;"></span>
                  <span>${label.name}</span>
                </label>
              `).join('')}
          </div>
          <div class="create-label" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--em-border);">
            <strong>Create New Label:</strong>
            <div style="display: flex; gap: 8px; margin-top: 8px; align-items: center;">
              <input type="text" id="new-label-name" placeholder="Label name" style="flex: 1; padding: 8px; border: 1px solid var(--em-border); border-radius: 4px; background: var(--em-surface); color: var(--em-text);">
            </div>
            <div class="em-label-color-picker" id="new-label-color" data-value="blue" style="margin-top:8px">
              ${HA_LABEL_COLORS.map(([name, hex]) => `<button class="em-label-swatch${name === 'blue' ? ' selected' : ''}" data-color="${name}" style="background:${hex}" title="${name}"></button>`).join('')}
            </div>
            <div style="display:flex;justify-content:flex-end;margin-top:8px">
              <button class="btn btn-secondary" id="create-label-btn">Create</button>
            </div>
          </div>
        </div>
      `,
      actionsHtml: `
        <button class="btn btn-secondary confirm-no">Cancel</button>
        <button class="btn btn-primary" id="apply-labels-btn">Apply Labels</button>
      `
    });
    
    // Target selector
    this._attachTargetSelector(overlay, 'em-bulk-label-target');

    // Swatch picker click handler (bulk dialog)
    overlay.querySelector('#new-label-color').addEventListener('click', (e) => {
      const swatch = e.target.closest('.em-label-swatch');
      if (!swatch) return;
      const picker = swatch.closest('.em-label-color-picker');
      picker.querySelectorAll('.em-label-swatch').forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
      picker.dataset.value = swatch.dataset.color;
    });

    // Handle creating new label in bulk editor
    overlay.querySelector('#create-label-btn').addEventListener('click', async () => {
      const nameInput = overlay.querySelector('#new-label-name');
      const colorPicker = overlay.querySelector('#new-label-color');
      const name = nameInput.value.trim();
      const color = colorPicker.dataset.value || 'blue';

      if (!name) {
        this._showToast('Please enter a label name', 'warning');
        return;
      }

      try {
        const newLabel = await this._createLabel(name, color);
        allLabels.push(newLabel);
        nameInput.value = '';
        this._showToast(`Label "${name}" created`, 'success');
        
        // Refresh label selection list
        const selectionContainer = overlay.querySelector('#label-selection');
        selectionContainer.innerHTML = allLabels.map(label => `
          <label class="label-checkbox" style="display: flex; align-items: center; gap: 8px; padding: 8px; cursor: pointer; border-radius: 4px; margin: 4px 0;">
            <input type="checkbox" data-label-id="${this._escapeAttr(label.label_id)}">
            <span style="width: 16px; height: 16px; border-radius: 50%; background: ${this._escapeAttr(this._labelColorCss(label.color))}; display: inline-block;"></span>
            <span>${this._escapeHtml(label.name)}</span>
          </label>
        `).join('');
      } catch (e) {
        this._showToast('Error creating label', 'error');
      }
    });
    
    overlay.querySelector('#apply-labels-btn').addEventListener('click', async () => {
      const selectedLabels = Array.from(overlay.querySelectorAll('input[type="checkbox"]:checked'))
        .map(cb => cb.dataset.labelId);
      const target = this._getTargetValue(overlay, 'em-bulk-label-target');

      if (selectedLabels.length === 0) {
        this._showToast('Select at least one label', 'warning');
        return;
      }

      closeDialog();
      this._showToast(`Adding labels to ${entityCount} entities...`, 'info', 0);

      let successCount = 0;
      for (const entityId of this.selectedEntities) {
        try {
          if (target === 'entity' || target === 'both') {
            const currentLabels = await this._getEntityLabels(entityId);
            const newLabels = [...new Set([...currentLabels, ...selectedLabels])];
            await this._hass.callWS({ type: 'config/entity_registry/update', entity_id: entityId, labels: newLabels });
          }
          if (target === 'device' || target === 'both') {
            const deviceId = await this._getEntityDeviceId(entityId);
            if (deviceId) {
              const devLabels = await this._getDeviceLabels(deviceId);
              const newDevLabels = [...new Set([...devLabels, ...selectedLabels])];
              await this._hass.callWS({ type: 'config/device_registry/update', device_id: deviceId, labels: newDevLabels });
            }
          }
          successCount++;
        } catch (e) {
          console.error('Error adding labels to', entityId, e);
        }
      }

      document.querySelector('.em-toast')?.remove();
      this._showToast(`Added labels to ${successCount} entities`, 'success');
    });
    
    overlay.querySelector('.confirm-no').addEventListener('click', closeDialog);
  }
  
  // ===== ENTITY ALIASES =====
  
  _loadEntityAliases() {
    return this._loadFromStorage('em-entity-aliases', {});
  }

  _saveEntityAliases() {
    this._saveToStorage('em-entity-aliases', this.entityAliases);
  }
  
  _setEntityAlias(entityId, alias) {
    if (alias) {
      this.entityAliases[entityId] = alias;
    } else {
      delete this.entityAliases[entityId];
    }
    this._saveEntityAliases();
  }
  
  _showAliasEditor(entityId) {
    const currentAlias = this.entityAliases[entityId] || '';
    
    const { overlay, closeDialog } = this.createDialog({
      title: 'Set Entity Alias',
      color: 'var(--em-primary)',
      contentHtml: `
        <div class="alias-editor">
          <p style="color: var(--em-text-secondary); margin-bottom: 8px;">Entity: ${entityId}</p>
          <input type="text" id="alias-input" class="rename-input" 
            value="${currentAlias}" placeholder="Enter a friendly alias...">
          <p style="color: var(--em-text-secondary); font-size: 12px; margin-top: 8px;">
            Leave empty to use default name
          </p>
        </div>
      `,
      actionsHtml: `
        <button class="btn btn-secondary cancel-btn">Cancel</button>
        <button class="btn btn-primary save-btn">Save</button>
      `
    });
    
    overlay.querySelector('.cancel-btn').addEventListener('click', closeDialog);
    overlay.querySelector('.save-btn').addEventListener('click', () => {
      const alias = overlay.querySelector('#alias-input').value.trim();
      this._setEntityAlias(entityId, alias);
      closeDialog();
      this.updateView();
      this._showToast(alias ? 'Alias set' : 'Alias removed', 'success');
    });
  }
  
  // ===== DRAG AND DROP =====
  
  _loadEntityOrder() {
    return this._loadFromStorage('em-entity-order', {});
  }

  _saveEntityOrder() {
    this._saveToStorage('em-entity-order', this.entityOrder);
  }
  
  _initDragDrop(entityItem) {
    if (!this.dragDropEnabled) return;
    
    entityItem.setAttribute('draggable', 'true');
    
    entityItem.addEventListener('dragstart', (e) => {
      this.draggedEntity = entityItem.dataset.entityId;
      entityItem.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', this.draggedEntity);
    });
    
    entityItem.addEventListener('dragend', () => {
      entityItem.classList.remove('dragging');
      this.draggedEntity = null;
      this.dragOverEntity = null;
      
      // Remove all drag-over classes
      this.content.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
      });
    });
    
    entityItem.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!this.draggedEntity || this.draggedEntity === entityItem.dataset.entityId) return;
      
      e.dataTransfer.dropEffect = 'move';
      
      const rect = entityItem.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      
      // Remove previous drag-over states
      this.content.querySelectorAll('.drag-over').forEach(el => {
        if (el !== entityItem) {
          el.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
        }
      });
      
      entityItem.classList.add('drag-over');
      if (e.clientY < midY) {
        entityItem.classList.add('drag-over-top');
        entityItem.classList.remove('drag-over-bottom');
      } else {
        entityItem.classList.add('drag-over-bottom');
        entityItem.classList.remove('drag-over-top');
      }
    });
    
    entityItem.addEventListener('dragleave', () => {
      entityItem.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
    });
    
    entityItem.addEventListener('drop', (e) => {
      e.preventDefault();
      entityItem.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
      
      if (!this.draggedEntity || this.draggedEntity === entityItem.dataset.entityId) return;
      
      const targetId = entityItem.dataset.entityId;
      const integrationEl = entityItem.closest('.entity-list');
      const integrationId = integrationEl?.dataset.integration;
      
      if (!integrationId) return;
      
      // Get current order or create new one
      if (!this.entityOrder[integrationId]) {
        this.entityOrder[integrationId] = [];
      }
      
      // Determine position
      const rect = entityItem.getBoundingClientRect();
      const insertBefore = e.clientY < rect.top + rect.height / 2;
      
      // Update order
      const order = this.entityOrder[integrationId];
      const draggedIdx = order.indexOf(this.draggedEntity);
      const targetIdx = order.indexOf(targetId);
      
      // Remove dragged from current position if exists
      if (draggedIdx > -1) {
        order.splice(draggedIdx, 1);
      }
      
      // Find new target index (may have shifted)
      let newTargetIdx = order.indexOf(targetId);
      if (newTargetIdx === -1) {
        // Target not in order yet, add it
        order.push(targetId);
        newTargetIdx = order.length - 1;
      }
      
      // Insert at correct position
      const insertIdx = insertBefore ? newTargetIdx : newTargetIdx + 1;
      order.splice(insertIdx, 0, this.draggedEntity);
      
      this._saveEntityOrder();
      this._showToast('Entity order updated', 'success');
      this.updateView();
    });
  }
  
  _attachDragDropListeners() {
    if (!this.dragDropEnabled) return;
    
    this.content.querySelectorAll('.entity-item').forEach(item => {
      this._initDragDrop(item);
    });
  }
  
  // ===== ENTITY STATE PREVIEW =====
  
  _showStatePreview(entityId, targetElement) {
    // Remove existing preview
    this._hideStatePreview();
    
    const state = this._hass?.states?.[entityId];
    if (!state) return;
    
    const preview = document.createElement('div');
    preview.className = 'entity-state-preview';
    preview.innerHTML = `
      <div class="preview-header">
        <span class="preview-state-icon">${this._getStateIcon(state)}</span>
        <span class="preview-state-value">${this._escapeHtml(state.state)}</span>
      </div>
      <div class="preview-body">
        <div class="preview-row">
          <span class="preview-label">Entity ID:</span>
          <span class="preview-value">${this._escapeHtml(entityId)}</span>
        </div>
        <div class="preview-row">
          <span class="preview-label">Name:</span>
          <span class="preview-value">${this._escapeHtml(state.attributes.friendly_name || 'N/A')}</span>
        </div>
        <div class="preview-row">
          <span class="preview-label">Last Changed:</span>
          <span class="preview-value">${this._formatTimeDiff(Date.now() - new Date(state.last_changed).getTime())}</span>
        </div>
        ${state.attributes.device_class ? `
          <div class="preview-row">
            <span class="preview-label">Device Class:</span>
            <span class="preview-value">${this._escapeHtml(state.attributes.device_class)}</span>
          </div>
        ` : ''}
        ${state.attributes.unit_of_measurement ? `
          <div class="preview-row">
            <span class="preview-label">Unit:</span>
            <span class="preview-value">${this._escapeHtml(state.attributes.unit_of_measurement)}</span>
          </div>
        ` : ''}
      </div>
    `;
    
    document.body.appendChild(preview);
    
    // Position the preview
    const rect = targetElement.getBoundingClientRect();
    preview.style.left = `${rect.right + 10}px`;
    preview.style.top = `${rect.top}px`;
    
    // Adjust if off screen
    const previewRect = preview.getBoundingClientRect();
    if (previewRect.right > window.innerWidth) {
      preview.style.left = `${rect.left - previewRect.width - 10}px`;
    }
    if (previewRect.bottom > window.innerHeight) {
      preview.style.top = `${window.innerHeight - previewRect.height - 10}px`;
    }
    
    this._statePreviewElement = preview;
  }
  
  _hideStatePreview() {
    if (this._statePreviewElement) {
      this._statePreviewElement.remove();
      this._statePreviewElement = null;
    }
  }
  
  _getStateIcon(state) {
    const domain = state.entity_id.split('.')[0];
    const stateValue = state.state;
    
    const icons = {
      'light': stateValue === 'on' ? '💡' : '⚫',
      'switch': stateValue === 'on' ? '🔘' : '⭕',
      'sensor': '📊',
      'binary_sensor': stateValue === 'on' ? '🟢' : '🔴',
      'climate': '🌡️',
      'cover': stateValue === 'open' ? '🪟' : '🚪',
      'lock': stateValue === 'locked' ? '🔒' : '🔓',
      'camera': '📷',
      'media_player': '🎵',
      'vacuum': '🧹',
      'fan': '🌀',
      'automation': stateValue === 'on' ? '⚡' : '💤',
      'script': '📜',
      'scene': '🎬',
      'input_boolean': stateValue === 'on' ? '✅' : '❌',
      'input_number': '🔢',
      'input_text': '📝',
      'input_select': '📋',
      'person': '👤',
      'device_tracker': stateValue === 'home' ? '🏠' : '📍',
      'weather': '🌤️',
      'sun': '☀️',
      'update': state.attributes.in_progress ? '⏳' : (stateValue === 'on' ? '🆕' : '✓')
    };
    
    return icons[domain] || '📦';
  }
  
  _attachStatePreviewListeners() {
    let previewTimeout = null;
    
    this.content.querySelectorAll('.entity-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        const entityId = item.dataset.entityId;
        if (!entityId) return;
        
        previewTimeout = setTimeout(() => {
          this._showStatePreview(entityId, item);
        }, 500); // Delay before showing preview
      });
      
      item.addEventListener('mouseleave', () => {
        if (previewTimeout) {
          clearTimeout(previewTimeout);
          previewTimeout = null;
        }
        this._hideStatePreview();
      });
    });
  }
  
  // ===== SMART GROUPS =====
  
  _toggleSmartGroups() {
    this.smartGroupsEnabled = !this.smartGroupsEnabled;
    localStorage.setItem('em-smart-groups', this.smartGroupsEnabled);
    this.updateView();
    this._showToast(this.smartGroupsEnabled ? 'Smart groups enabled' : 'Smart groups disabled', 'info');
  }
  
  _setSmartGroupMode(mode) {
    this.smartGroupMode = mode;
    localStorage.setItem('em-smart-group-mode', mode);
    this.updateView();
  }
  
  _getSmartGroups() {
    if (!this.smartGroupsEnabled) return null;
    
    const groups = {};
    
    (this.data || []).forEach(integration => {
      Object.entries(integration.devices).forEach(([deviceId, device]) => {
        device.entities.forEach(entity => {
          let groupKey;
          
          switch (this.smartGroupMode) {
            case 'room':
              // Group by area/room if available
              const deviceInfo = this.deviceInfo[deviceId];
              groupKey = deviceInfo?.area_id || 'Unassigned';
              break;
            case 'type':
              // Group by entity domain
              groupKey = entity.entity_id.split('.')[0];
              break;
            case 'device-name': {
              // Filter by device name keyword, then group by device name
              const devName = (this.getDeviceName(deviceId) || '').toLowerCase();
              const keyword = (this.deviceNameFilter || '').toLowerCase().trim();
              if (keyword && !this._fuzzyMatch(devName, keyword)) return; // skip non-matching
              groupKey = this.getDeviceName(deviceId) || 'Unknown Device';
              break;
            }
            default: // integration
              groupKey = integration.integration;
          }
          
          if (!groups[groupKey]) {
            groups[groupKey] = [];
          }
          groups[groupKey].push({
            ...entity,
            integration: integration.integration,
            deviceId,
            deviceName: this.getDeviceName(deviceId)
          });
        });
      });
    });
    
    return groups;
  }
  
  // ===== AUTOMATION IMPACT ANALYSIS =====
  
  async _analyzeAutomationImpact(entityId) {
    this._showToast('Analyzing automations...', 'info', 2000);
    
    try {
      // Get all automations
      const automations = Object.entries(this._hass.states)
        .filter(([id]) => id.startsWith('automation.'))
        .map(([id, state]) => ({ id, ...state }));
      
      // Get all scripts
      const scripts = Object.entries(this._hass.states)
        .filter(([id]) => id.startsWith('script.'))
        .map(([id, state]) => ({ id, ...state }));
      
      // Get automation configs (if available via API)
      const impactedAutomations = [];
      const impactedScripts = [];
      
      // Simple text search in automation/script names and entity IDs
      for (const auto of automations) {
        if (auto.attributes?.friendly_name?.toLowerCase().includes(entityId.split('.')[1]) ||
            auto.id.includes(entityId.split('.')[1])) {
          impactedAutomations.push(auto);
        }
      }
      
      for (const script of scripts) {
        if (script.attributes?.friendly_name?.toLowerCase().includes(entityId.split('.')[1]) ||
            script.id.includes(entityId.split('.')[1])) {
          impactedScripts.push(script);
        }
      }
      
      const { overlay, closeDialog } = this.createDialog({
        title: 'Automation Impact Analysis',
        color: 'var(--em-warning)',
        contentHtml: `
          <div class="impact-analysis">
            <p style="margin-bottom: 12px;"><strong>Entity:</strong> ${entityId}</p>
            
            <div class="impact-section">
              <h4>Potentially Affected Automations (${impactedAutomations.length})</h4>
              ${impactedAutomations.length === 0 ? '<p style="color: var(--em-text-secondary);">None found</p>' : ''}
              ${impactedAutomations.map(a => `
                <div class="impact-item">
                  <span class="impact-name">${a.attributes?.friendly_name || a.id}</span>
                  <span class="impact-state ${a.state}">${a.state}</span>
                </div>
              `).join('')}
            </div>
            
            <div class="impact-section">
              <h4>Potentially Affected Scripts (${impactedScripts.length})</h4>
              ${impactedScripts.length === 0 ? '<p style="color: var(--em-text-secondary);">None found</p>' : ''}
              ${impactedScripts.map(s => `
                <div class="impact-item">
                  <span class="impact-name">${s.attributes?.friendly_name || s.id}</span>
                </div>
              `).join('')}
            </div>
            
            <p style="margin-top: 16px; color: var(--em-text-secondary); font-size: 12px;">
              Note: This is a basic analysis. Check your automation YAML for complete impact.
            </p>
          </div>
        `,
        actionsHtml: `<button class="btn btn-primary">Close</button>`
      });
      
      overlay.querySelector('.btn-primary').addEventListener('click', closeDialog);
    } catch (e) {
      this._showToast('Error analyzing impact', 'error');
      console.error('Impact analysis error:', e);
    }
  }
  
  // ===== ENTITY DEPENDENCIES =====
  
  _showEntityDependencies(entityId) {
    const entity = this._findEntityById(entityId);
    const state = this._hass.states[entityId];
    
    // Find related entities
    const domain = entityId.split('.')[0];
    const name = entityId.split('.')[1];
    
    const relatedEntities = Object.keys(this._hass.states).filter(id => {
      if (id === entityId) return false;
      // Same device
      const device = this._getDeviceForEntity(entityId);
      const otherDevice = this._getDeviceForEntity(id);
      return device && otherDevice && device === otherDevice;
    });
    
    const { overlay, closeDialog } = this.createDialog({
      title: 'Entity Dependencies',
      color: 'var(--em-primary)',
      contentHtml: `
        <div class="dependencies-view">
          <div class="dep-section">
            <h4>Entity Details</h4>
            <p><strong>ID:</strong> ${entityId}</p>
            <p><strong>Domain:</strong> ${domain}</p>
            <p><strong>State:</strong> ${state?.state || 'unknown'}</p>
          </div>
          
          <div class="dep-section">
            <h4>Same Device Entities (${relatedEntities.length})</h4>
            <div class="dep-list">
              ${relatedEntities.slice(0, 20).map(id => `
                <div class="dep-item">
                  <span>${id}</span>
                  <span class="dep-state">${this._hass.states[id]?.state || 'N/A'}</span>
                </div>
              `).join('')}
              ${relatedEntities.length > 20 ? `<p>...and ${relatedEntities.length - 20} more</p>` : ''}
              ${relatedEntities.length === 0 ? '<p style="color: var(--em-text-secondary);">No related entities</p>' : ''}
            </div>
          </div>
        </div>
      `,
      actionsHtml: `<button class="btn btn-primary">Close</button>`
    });
    
    overlay.querySelector('.btn-primary').addEventListener('click', closeDialog);
  }
  
  _getDeviceForEntity(entityId) {
    for (const integration of (this.data || [])) {
      for (const [deviceId, device] of Object.entries(integration.devices)) {
        if (device.entities.some(e => e.entity_id === entityId)) {
          return deviceId;
        }
      }
    }
    return null;
  }
  
  // ===== EXPORT ENTITY CONFIG =====
  
  _exportEntityConfig() {
    const config = {
      version: 1,
      exportDate: new Date().toISOString(),
      entities: [],
      favorites: [...this.favorites],
      tags: this.entityTags,
      aliases: this.entityAliases
    };
    
    // Collect all entity states
    (this.data || []).forEach(integration => {
      Object.values(integration.devices).forEach(device => {
        device.entities.forEach(entity => {
          config.entities.push({
            entity_id: entity.entity_id,
            is_disabled: entity.is_disabled,
            original_name: entity.original_name
          });
        });
      });
    });
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entity-manager-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    this._showToast(`Exported ${config.entities.length} entities`, 'success');
  }
  
  _importEntityConfig() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const config = JSON.parse(text);
        
        if (config.version !== 1) {
          this._showToast('Unsupported config version', 'error');
          return;
        }
        
        // Import favorites
        if (config.favorites) {
          config.favorites.forEach(f => this.favorites.add(f));
          this._saveFavorites();
        }
        
        // Import tags
        if (config.tags) {
          Object.assign(this.entityTags, config.tags);
          this._saveEntityTags();
        }
        
        // Import aliases
        if (config.aliases) {
          Object.assign(this.entityAliases, config.aliases);
          this._saveEntityAliases();
        }
        
        this._showToast('Config imported successfully', 'success');
        this.updateView();
      } catch (e) {
        this._showToast('Error importing config', 'error');
        console.error('Import error:', e);
      }
    };
    
    input.click();
  }
  
  // ===== ENTITY STATISTICS =====
  
  _showEntityStatistics(entityId) {
    const state = this._hass.states[entityId];
    const entity = this._findEntityById(entityId);
    
    const lastChanged = state?.last_changed ? new Date(state.last_changed) : null;
    const lastUpdated = state?.last_updated ? new Date(state.last_updated) : null;
    const now = new Date();
    
    const timeSinceChange = lastChanged ? this._formatTimeDiff(now - lastChanged) : 'Unknown';
    const timeSinceUpdate = lastUpdated ? this._formatTimeDiff(now - lastUpdated) : 'Unknown';
    
    const attributes = state?.attributes || {};
    
    const { overlay, closeDialog } = this.createDialog({
      title: 'Entity Statistics',
      color: 'var(--em-primary)',
      contentHtml: `
        <div class="entity-stats-view">
          <div class="stat-row">
            <span class="stat-label">Entity ID</span>
            <span class="stat-value">${entityId}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Current State</span>
            <span class="stat-value">${state?.state || 'unknown'}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Last Changed</span>
            <span class="stat-value">${timeSinceChange} ago</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Last Updated</span>
            <span class="stat-value">${timeSinceUpdate} ago</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Status</span>
            <span class="stat-value">${entity?.is_disabled ? 'Disabled' : 'Enabled'}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Attributes</span>
            <span class="stat-value">${Object.keys(attributes).length}</span>
          </div>
          
          <h4 style="margin-top: 16px;">Attributes</h4>
          <div class="attributes-list">
            ${Object.entries(attributes).slice(0, 15).map(([key, val]) => `
              <div class="attr-row">
                <span class="attr-key">${key}</span>
                <span class="attr-val">${typeof val === 'object' ? JSON.stringify(val) : val}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `,
      actionsHtml: `<button class="btn btn-primary">Close</button>`
    });
    
    overlay.querySelector('.btn-primary').addEventListener('click', closeDialog);
  }
  
  _formatTimeDiff(ms) {
    if (ms == null || isNaN(ms)) return '?';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }
  
  // ===== STATE HISTORY =====
  
  async _showStateHistory(entityId) {
    this._showToast('Loading history...', 'info', 2000);
    
    try {
      // Get history for last 24 hours
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
      
      const response = await this._hass.callApi(
        'GET',
        `history/period/${startTime.toISOString()}?filter_entity_id=${entityId}&end_time=${endTime.toISOString()}`
      );
      
      const history = response?.[0] || [];
      
      const { overlay, closeDialog } = this.createDialog({
        title: 'State History (24h)',
        color: 'var(--em-primary)',
        contentHtml: `
          <div class="state-history-view">
            <p style="margin-bottom: 12px;"><strong>Entity:</strong> ${entityId}</p>
            <div class="history-list" style="max-height: 400px; overflow-y: auto;">
              ${history.length === 0 ? '<p style="color: var(--em-text-secondary);">No history available</p>' : ''}
              ${history.slice().reverse().slice(0, 50).map(entry => `
                <div class="history-item">
                  <span class="history-state">${entry.state}</span>
                  <span class="history-time">${new Date(entry.last_changed).toLocaleString()}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `,
        actionsHtml: `<button class="btn btn-primary">Close</button>`
      });
      
      overlay.querySelector('.btn-primary').addEventListener('click', closeDialog);
    } catch (e) {
      this._showToast('Error loading history', 'error');
      console.error('History error:', e);
    }
  }
  
  // ===== BATCH PREVIEW =====
  
  _showBatchPreview(action, entityIds) {
    const entities = entityIds.map(id => ({
      id,
      name: this._findEntityById(id)?.original_name || id,
      state: this._hass.states[id]?.state || 'unknown',
      isDisabled: this._findEntityById(id)?.is_disabled
    }));
    
    const { overlay, closeDialog } = this.createDialog({
      title: `Preview: ${action === 'enable' ? 'Enable' : 'Disable'} ${entities.length} Entities`,
      color: action === 'enable' ? 'var(--em-success)' : 'var(--em-danger)',
      contentHtml: `
        <div class="batch-preview">
          <p style="margin-bottom: 12px;">The following entities will be ${action}d:</p>
          <div class="batch-list" style="max-height: 300px; overflow-y: auto;">
            ${entities.map(e => `
              <div class="batch-item">
                <span class="batch-name">${e.name || e.id}</span>
                <span class="batch-id">${e.id}</span>
                <span class="batch-state">${e.state}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `,
      actionsHtml: `
        <button class="btn btn-secondary cancel-btn">Cancel</button>
        <button class="btn ${action === 'enable' ? 'btn-success' : 'btn-danger'} confirm-btn">
          ${action === 'enable' ? 'Enable' : 'Disable'} All
        </button>
      `
    });
    
    return new Promise(resolve => {
      overlay.querySelector('.cancel-btn').addEventListener('click', () => {
        closeDialog();
        resolve(false);
      });
      overlay.querySelector('.confirm-btn').addEventListener('click', () => {
        closeDialog();
        resolve(true);
      });
    });
  }

  // ===== SIDEBAR =====
  
  _toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    localStorage.setItem('em-sidebar-collapsed', this.sidebarCollapsed);
    
    const sidebar = this.querySelector('.em-sidebar');
    const mainContent = this.querySelector('#main-content');
    
    if (sidebar) {
      sidebar.classList.toggle('collapsed', this.sidebarCollapsed);
    }
    if (mainContent) {
      mainContent.classList.toggle('sidebar-collapsed', this.sidebarCollapsed);
    }
  }
  
  _renderSidebar() {
    // Group integrations for quick nav (handle case when data not loaded yet)
    const integrationList = (this.data || []).map(int => ({
      name: int.integration,
      count: Object.values(int.devices).reduce((sum, d) => sum + d.entities.length, 0)
    })).sort((a, b) => b.count - a.count);
    
    return `
      <div class="em-sidebar ${this.sidebarCollapsed ? 'collapsed' : ''}">
        <div class="sidebar-header">
          <span class="sidebar-title">Navigation</span>
          <button class="sidebar-toggle" id="sidebar-toggle-btn">◀</button>
        </div>
        
        <div class="sidebar-section ${this.sidebarOpenSections.has('actions') ? '' : 'section-collapsed'}">
          <div class="sidebar-section-title" data-section-id="actions">Actions</div>
          <div class="sidebar-item" data-action="undo" id="undo-btn" ${this.undoStack.length === 0 ? 'style="opacity:0.5"' : ''}>
            <span class="icon">↩</span>
            <span class="label">Undo</span>
            <span class="count">${this.undoStack.length}</span>
          </div>
          <div class="sidebar-item" data-action="redo" id="redo-btn" ${this.redoStack.length === 0 ? 'style="opacity:0.5"' : ''}>
            <span class="icon">↪</span>
            <span class="label">Redo</span>
            <span class="count">${this.redoStack.length}</span>
          </div>
          <div class="sidebar-item" data-action="export">
            <span class="icon">📤</span>
            <span class="label">Export Config</span>
          </div>
          <div class="sidebar-item" data-action="import">
            <span class="icon">📥</span>
            <span class="label">Import Config</span>
          </div>
          <div class="sidebar-item" data-action="enable-selected" style="${this.selectedEntities.size === 0 ? 'opacity:0.4;pointer-events:none' : ''}">
            <span class="icon">✓</span>
            <span class="label">Enable Selected</span>
            <span class="count" id="sidebar-selected-count">${this.selectedEntities.size || ''}</span>
          </div>
          <div class="sidebar-item" data-action="disable-selected" style="${this.selectedEntities.size === 0 ? 'opacity:0.4;pointer-events:none' : ''}">
            <span class="icon">✕</span>
            <span class="label">Disable Selected</span>
          </div>
          <div class="sidebar-item" data-action="deselect-all" style="${this.selectedEntities.size === 0 ? 'opacity:0.4;pointer-events:none' : ''}">
            <span class="icon">☐</span>
            <span class="label">Deselect All</span>
          </div>
          <div class="sidebar-item" data-action="refresh">
            <span class="icon">↺</span>
            <span class="label">Refresh</span>
          </div>
        </div>
        
        <div class="sidebar-section ${this.sidebarOpenSections.has('filters') ? '' : 'section-collapsed'}">
          <div class="sidebar-section-title" data-section-id="filters">Quick Filters</div>
          <div class="sidebar-item" data-filter="favorites">
            <span class="icon">★</span>
            <span class="label">Favorites</span>
            <span class="count" id="favorites-count">${this.favorites.size}</span>
          </div>
          <div class="sidebar-item" data-action="activity-log">
            <span class="icon">📋</span>
            <span class="label">Activity Log</span>
          </div>
          <div class="sidebar-item" data-action="comparison">
            <span class="icon">⇔</span>
            <span class="label">Comparison</span>
            <span class="count" id="comparison-count">${this.comparisonEntities.length}</span>
          </div>
          <div class="sidebar-item" data-action="columns">
            <span class="icon">⚙️</span>
            <span class="label">Columns</span>
          </div>
        </div>
        
        <div class="sidebar-section ${this.sidebarOpenSections.has('domains') ? '' : 'section-collapsed'}">
          <div class="sidebar-section-title" data-section-id="domains">Domains</div>
          <div class="sidebar-item ${this.selectedDomain === 'all' ? 'active' : ''}" data-domain="all">
            <span class="icon">🌐</span>
            <span class="label">All domains</span>
          </div>
          <div id="sidebar-domain-list"></div>
        </div>

        <div class="sidebar-section ${this.sidebarOpenSections.has('labels') ? '' : 'section-collapsed'}" id="labels-section">
          <div class="sidebar-section-title" data-section-id="labels">Labels</div>
          ${this.selectedLabelFilter ? `
            <div class="sidebar-item active" data-action="clear-label-filter">
              <span class="icon">✕</span>
              <span class="label">Show All</span>
            </div>
          ` : ''}
          <div id="labels-list">
            <div class="sidebar-item" style="opacity: 0.5;">
              <span class="icon">⏳</span>
              <span class="label">Loading labels...</span>
            </div>
          </div>
        </div>
        
        <div class="sidebar-section ${this.sidebarOpenSections.has('smart-groups') ? '' : 'section-collapsed'}">
          <div class="sidebar-section-title" data-section-id="smart-groups">Smart Groups</div>
          <div class="sidebar-item ${!this.smartGroupsEnabled ? '' : 'active'}" data-action="toggle-smart-groups">
            <span class="icon">${this.smartGroupsEnabled ? '✓' : '○'}</span>
            <span class="label">${this.smartGroupsEnabled ? 'Enabled' : 'Disabled'}</span>
          </div>
          ${this.smartGroupsEnabled ? `
            <div class="sidebar-item ${this.smartGroupMode === 'integration' ? 'active' : ''}" data-group-mode="integration">
              <span class="icon">🔌</span>
              <span class="label">By Integration</span>
            </div>
            <div class="sidebar-item ${this.smartGroupMode === 'room' ? 'active' : ''}" data-group-mode="room">
              <span class="icon">🏠</span>
              <span class="label">By Room</span>
            </div>
            <div class="sidebar-item ${this.smartGroupMode === 'type' ? 'active' : ''}" data-group-mode="type">
              <span class="icon">📂</span>
              <span class="label">By Type</span>
            </div>
            <div class="sidebar-item ${this.smartGroupMode === 'device-name' ? 'active' : ''}" data-group-mode="device-name">
              <span class="icon">🔍</span>
              <span class="label">By Device Name</span>
            </div>
            ${this.smartGroupMode === 'device-name' ? `
              <div style="padding:6px 8px 4px">
                <div style="display:flex;gap:4px">
                  <input id="em-device-name-filter-input" type="text" placeholder="e.g. Shelly"
                    value="${this._escapeAttr(this.deviceNameFilter)}"
                    style="flex:1;min-width:0;padding:6px 8px;border-radius:6px;border:1px solid var(--em-border);
                           background:var(--em-bg-primary);color:var(--em-text-primary);font-size:12px">
                  <button id="em-device-filter-save" title="Save as quick filter"
                    style="padding:6px 8px;border-radius:6px;border:1px solid var(--em-border);
                           background:var(--em-bg-hover);color:var(--em-text-primary);cursor:pointer;font-size:13px">＋</button>
                </div>
                ${this.savedDeviceFilters.length > 0 ? `
                  <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">
                    ${this.savedDeviceFilters.map((f, i) => `
                      <span class="em-device-filter-chip ${this.deviceNameFilter === f.pattern ? 'active' : ''}"
                        data-filter-pattern="${this._escapeAttr(f.pattern)}"
                        style="display:inline-flex;align-items:center;gap:3px;padding:3px 8px;border-radius:12px;
                               font-size:11px;cursor:pointer;border:1px solid var(--em-border);
                               background:${this.deviceNameFilter === f.pattern ? 'var(--em-primary)' : 'var(--em-bg-hover)'};
                               color:${this.deviceNameFilter === f.pattern ? 'white' : 'var(--em-text-primary)'}">
                        ${this._escapeHtml(f.label)}
                        <button data-filter-remove="${i}"
                          style="background:none;border:none;cursor:pointer;color:inherit;padding:0;font-size:11px;line-height:1;opacity:0.7">✕</button>
                      </span>`).join('')}
                  </div>` : ''}
              </div>` : ''}
          ` : ''}
        </div>
        
        <div class="sidebar-section ${this.sidebarOpenSections.has('integrations') ? '' : 'section-collapsed'}">
          <div class="sidebar-section-title" data-section-id="integrations">Integrations</div>
          ${this.selectedIntegrationFilter ? `
            <div class="sidebar-item active" data-action="clear-integration-filter">
              <span class="icon">✕</span>
              <span class="label">Show All Integrations</span>
            </div>
          ` : ''}
          ${integrationList.length === 0 ? `
            <div class="sidebar-item" style="opacity: 0.5;">
              <span class="icon">⏳</span>
              <span class="label">Loading...</span>
            </div>
          ` : ''}
          ${(this.showAllSidebarIntegrations ? integrationList : integrationList.slice(0, 10)).map(int => `
            <div class="sidebar-item ${this.selectedIntegrationFilter === int.name ? 'active' : ''}" data-integration="${int.name}">
              <img class="sidebar-icon" src="https://brands.home-assistant.io/${int.name}/icon.png" 
                   onerror="this.style.display='none'" alt="">
              <span class="label">${int.name}</span>
              <span class="count">${int.count}</span>
            </div>
          `).join('')}
          ${!this.showAllSidebarIntegrations && integrationList.length > 10 ? `<div class="sidebar-item more" data-action="show-all-integrations">+${integrationList.length - 10} more...</div>` : ''}
          ${this.showAllSidebarIntegrations && integrationList.length > 10 ? `<div class="sidebar-item" data-action="collapse-integrations"><span class="icon">▲</span><span class="label">Show less</span></div>` : ''}
        </div>
        
        <div class="sidebar-section ${this.sidebarOpenSections.has('help') ? '' : 'section-collapsed'}">
          <div class="sidebar-section-title" data-section-id="help">Help</div>
          <div class="sidebar-item" data-action="help-guide">
            <span class="icon">❓</span>
            <span class="label">Help Guide</span>
          </div>

        </div>
      </div>
    `;
  }
  
  // ===== ENTITY COMPARISON =====
  
  _addToComparison(entityId) {
    if (this.comparisonEntities.includes(entityId)) {
      this._showToast('Entity already in comparison', 'warning');
      return;
    }
    
    if (this.comparisonEntities.length >= 4) {
      this._showToast('Maximum 4 entities for comparison', 'warning');
      return;
    }
    
    this.comparisonEntities.push(entityId);
    this._showToast('Added to comparison', 'success');
    
    // Update count in sidebar
    const countEl = this.querySelector('#comparison-count');
    if (countEl) countEl.textContent = this.comparisonEntities.length;
  }
  
  _showEntityComparison() {
    if (this.comparisonEntities.length < 2) {
      this._showToast('Add at least 2 entities to compare', 'warning');
      return;
    }
    
    const entities = this.comparisonEntities.map(id => {
      const entity = this._findEntityById(id);
      const state = this._hass.states[id];
      return { id, entity, state };
    });
    
    const attributes = new Set();
    entities.forEach(e => {
      if (e.state?.attributes) {
        Object.keys(e.state.attributes).forEach(a => attributes.add(a));
      }
    });
    
    const { overlay, closeDialog } = this.createDialog({
      title: 'Entity Comparison',
      color: 'var(--em-primary)',
      contentHtml: `
        <div class="comparison-container">
          <table class="comparison-table">
            <thead>
              <tr>
                <th>Property</th>
                ${entities.map(e => `<th>${e.id.split('.')[1]}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>State</strong></td>
                ${entities.map(e => `<td>${e.state?.state || 'N/A'}</td>`).join('')}
              </tr>
              <tr>
                <td><strong>Enabled</strong></td>
                ${entities.map(e => `<td>${e.entity?.is_disabled ? '❌ No' : '✅ Yes'}</td>`).join('')}
              </tr>
              <tr>
                <td><strong>Domain</strong></td>
                ${entities.map(e => `<td>${e.id.split('.')[0]}</td>`).join('')}
              </tr>
              ${[...attributes].slice(0, 20).map(attr => `
                <tr>
                  <td>${attr}</td>
                  ${entities.map(e => `<td>${JSON.stringify(e.state?.attributes?.[attr]) || '-'}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `,
      actionsHtml: `
        <button class="btn btn-secondary" id="clear-comparison-btn">Clear</button>
        <button class="btn btn-primary">Close</button>
      `
    });
    
    overlay.querySelector('.btn-primary').addEventListener('click', closeDialog);
    overlay.querySelector('#clear-comparison-btn').addEventListener('click', () => {
      this.comparisonEntities = [];
      const countEl = this.querySelector('#comparison-count');
      if (countEl) countEl.textContent = '0';
      closeDialog();
      this._showToast('Comparison cleared', 'info');
    });
  }
  
  // ===== DISABLE SELECTED ENTITIES =====
  
  async _disableSelectedEntities() {
    if (this.selectedEntities.size === 0) return;
    
    const count = this.selectedEntities.size;
    
    this.showConfirmDialog(
      'Disable Selected Entities',
      `Are you sure you want to disable ${count} selected entities?`,
      async () => {
        this._showToast(`Disabling ${count} entities...`, 'info', 0);
        
        // Group entities by integration (domain prefix)
        const entitiesByIntegration = {};
        for (const entityId of this.selectedEntities) {
          const domain = entityId.split('.')[0];
          if (!entitiesByIntegration[domain]) {
            entitiesByIntegration[domain] = [];
          }
          entitiesByIntegration[domain].push(entityId);
        }
        
        let successCount = 0;
        
        // Process integrations one at a time, but devices/entities within each in parallel
        for (const [domain, entities] of Object.entries(entitiesByIntegration)) {
          const results = await Promise.allSettled(
            entities.map(entityId => this.disableEntity(entityId))
          );
          successCount += results.filter(r => r.status === 'fulfilled').length;
        }
        
        document.querySelector('.em-toast')?.remove();
        this._showToast(`Disabled ${successCount} entities`, 'success');
        
        this.selectedEntities.clear();
        await this.loadData();
      }
    );
  }

  async _bulkEnableSelected() {
    if (this.selectedEntities.size === 0) return;
    
    const count = this.selectedEntities.size;
    
    this.showConfirmDialog(
      'Enable Selected Entities',
      `Are you sure you want to enable ${count} selected entities?`,
      async () => {
        this._showToast(`Enabling ${count} entities...`, 'info', 0);
        
        // Group entities by integration (domain prefix)
        const entitiesByIntegration = {};
        for (const entityId of this.selectedEntities) {
          const domain = entityId.split('.')[0];
          if (!entitiesByIntegration[domain]) {
            entitiesByIntegration[domain] = [];
          }
          entitiesByIntegration[domain].push(entityId);
        }
        
        let successCount = 0;
        
        // Process integrations one at a time, but devices/entities within each in parallel
        for (const [domain, entities] of Object.entries(entitiesByIntegration)) {
          const results = await Promise.allSettled(
            entities.map(entityId => this.enableEntity(entityId))
          );
          successCount += results.filter(r => r.status === 'fulfilled').length;
        }
        
        document.querySelector('.em-toast')?.remove();
        this._showToast(`Enabled ${successCount} entities`, 'success');
        
        this.selectedEntities.clear();
        await this.loadData();
      }
    );
  }

  set hass(hass) {
    this._hass = hass;

    // ── Watch pending update installs: detect completion / percentage ──
    if (this._pendingUpdateWatches?.size > 0) {
      for (const entityId of [...this._pendingUpdateWatches]) {
        const st = hass.states?.[entityId];
        if (!st) continue;
        if (st.state === 'off') {
          // Entity reports no update available → installation complete
          this._pendingUpdateWatches.delete(entityId);
          this._setUpdateRowState(entityId, 'done');
          setTimeout(() => this.loadUpdates(), 2000);
        } else if (st.attributes.in_progress === true) {
          const pct = st.attributes.update_percentage;
          if (pct != null && typeof pct === 'number') {
            this._updateRowProgress(entityId, Math.round(pct));
          }
        }
      }
    }

    if (!this.content && hass) {
      try {
        this.render();
        this.loadData();
      } catch (e) {
        console.error('Entity Manager render error:', e);
        const errDiv = document.createElement('div');
        errDiv.style.cssText = 'padding: 20px; color: red;';
        errDiv.textContent = 'Error loading Entity Manager: ' + e.message;
        this.innerHTML = '';
        this.appendChild(errDiv);
      }
    }
  }

  get hass() {
    return this._hass;
  }

  _fireEvent(type, detail = {}) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  async loadData() {
    this.setLoading(true);
    try {
      // 'updates' is a frontend-only view — map it to 'all' for the backend
      const backendState = ['all', 'disabled', 'enabled'].includes(this.viewState)
        ? this.viewState : 'all';
      const result = await this._hass.callWS({
        type: 'entity_manager/get_disabled_entities',
        state: backendState,
      });
      
      this.data = Array.isArray(result) ? result.map(integration => {
        const devicesObj = {};
        Object.entries(integration.devices).forEach(([deviceId, device]) => {
          devicesObj[deviceId] = {
            name: device.name || deviceId,
            entities: Array.isArray(device.entities) ? device.entities : [],
          };
        });
        
        return {
          integration: integration.integration,
          devices: devicesObj,
        };
      }) : [];

      this.domainOptions = this.extractDomains(this.data);
      this.updateDomainOptions();
      
      this.loadDeviceInfo();
    } catch (error) {
      console.error('Entity Manager Error:', error);
      this.showErrorDialog(`Error loading entities: ${error.message}`);
    } finally {
      this.setLoading(false);
    }
  }

  async loadDeviceInfo() {
    try {
      const result = await this._hass.callWS({
        type: 'config/device_registry/list',
      });
      
      this.deviceInfo = result.reduce((acc, device) => {
        acc[device.id] = device;
        return acc;
      }, {});
      
      this.loadCounts();
    } catch (error) {
      console.error('Entity Manager - Error loading device info:', error);
      this.loadCounts();
    }
  }

  async loadCounts() {
    try {
      // Get all states to count automations, scripts, helpers, and other entities
      const states = await this._hass.callWS({ type: 'get_states' });
      
      this.automationCount = states.filter(s => s.entity_id.startsWith('automation.')).length;
      this.scriptCount = states.filter(s => s.entity_id.startsWith('script.')).length;
      this.helperCount = states.filter(s => s.entity_id.startsWith('input_')).length +
                         states.filter(s => s.entity_id.startsWith('variable.')).length;
      // Count pending updates (update.* entities with state 'on' = update available)
      this.updateCount = states.filter(s => s.entity_id.startsWith('update.') && s.state === 'on').length;
      // Count entities stuck in unavailable
      this.unavailableCount = states.filter(s => s.state === 'unavailable').length;
      // Count entities not updated in 30+ days (excluding meta-states)
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      this.healthCount = states.filter(s => {
        if (s.state === 'unavailable' || s.state === 'unknown') return false;
        if (!s.last_updated) return false;
        return new Date(s.last_updated).getTime() < thirtyDaysAgo;
      }).length;
      // Count orphaned entities (no device) from entity registry data
      this.orphanedCount = 0;
      if (this.data) {
        this.data.forEach(integration => {
          const noDevice = integration.devices['no_device'];
          if (noDevice) this.orphanedCount += noDevice.entities.length;
        });
      }
      // Count templates via backend (covers YAML platform=template + template.* domain)
      try {
        const templateSensors = await this._hass.callWS({ type: 'entity_manager/get_template_sensors' });
        this.templateSensors = templateSensors;
        this.templateCount = templateSensors.length;
      } catch (e) {
        this.templateSensors = null;
        this.templateCount = states.filter(s => s.entity_id.startsWith('template.')).length;
      }
      // Count HACS store items via backend scan
      try {
        const hacsItems = await this._hass.callWS({ type: 'entity_manager/list_hacs_items' });
        this.hacsItems = hacsItems;
        this.hacsCount = (hacsItems?.store || []).length;
      } catch (e) {
        this.hacsItems = null;
        this.hacsCount = 0;
      }
      // Count Lovelace dashboard cards (recursive, cache configs for dialog reuse)
      const _llCountCards = (cards) => {
        let n = 0;
        for (const c of (cards || [])) {
          if (!c || typeof c !== 'object') continue;
          n++;
          if (c.cards) n += _llCountCards(c.cards);
          if (c.card) n += _llCountCards([c.card]);
          if (c.elements) n += _llCountCards(c.elements);
        }
        return n;
      };
      try {
        const dashboards = await this._hass.callWS({ type: 'lovelace/dashboards/list' });
        this.lovelaceDashboardList = dashboards || [];
        let cardCount = 0;
        for (const dashboard of this.lovelaceDashboardList) {
          try {
            const config = await this._hass.callWS({ type: 'lovelace/config', url_path: dashboard.url_path || null });
            dashboard._config = config;
            (config?.views || []).forEach(view => {
              cardCount += _llCountCards(view.cards || []);
              (view.sections || []).forEach(s => { if (s) cardCount += _llCountCards(s.cards || []); });
            });
          } catch (e) { /* skip */ }
        }
        this.lovelaceCardCount = cardCount;
      } catch (e) {
        this.lovelaceDashboardList = [];
        try {
          const config = await this._hass.callWS({ type: 'lovelace/config' });
          this.lovelaceCardCount = _llCountCards(config?.views?.flatMap(v => v.cards || []) || []);
        } catch (e2) {
          this.lovelaceCardCount = 0;
        }
      }
      
      this.updateView();
      
      // Refresh sidebar to show integrations
      this._reRenderSidebar();
    } catch (error) {
      console.error('Entity Manager - Error loading counts:', error);
      this.updateView();
    }
  }

  getDeviceName(deviceId) {
    return (this.deviceInfo[deviceId]?.name_by_user || this.deviceInfo[deviceId]?.name) || deviceId;
  }

  extractDomains(data) {
    const domains = new Set();
    data.forEach(integration => {
      Object.values(integration.devices).forEach(device => {
        device.entities.forEach(entity => {
          if (entity.entity_id && entity.entity_id.includes('.')) {
            domains.add(entity.entity_id.split('.')[0]);
          }
        });
      });
    });
    return Array.from(domains).sort();
  }

  updateDomainOptions() {
    const list = this.querySelector('#sidebar-domain-list');
    if (!list) return;

    const current = this.domainOptions.includes(this.selectedDomain) ? this.selectedDomain : 'all';
    this.selectedDomain = current;

    // Update "All domains" active state
    const allItem = this.querySelector('.em-sidebar [data-domain="all"]');
    if (allItem) allItem.classList.toggle('active', current === 'all');

    list.innerHTML = this.domainOptions.map(domain => `
      <div class="sidebar-item ${domain === current ? 'active' : ''}" data-domain="${domain}">
        <span class="label">${domain}</span>
      </div>`).join('');
  }

  setLoading(isLoading) {
    this.isLoading = isLoading;
    const refreshItem = this.querySelector('.em-sidebar [data-action="refresh"]');
    if (refreshItem) refreshItem.style.opacity = isLoading ? '0.4' : '';
  }

  render() {
    // Clear any existing content
    this.innerHTML = '';

    // Load CSS into the component by fetching and injecting as style element
    fetch(_emBaseUrl + 'entity-manager-panel.css?v=' + Date.now())
      .then(r => r.text())
      .then(css => {
        const styleEl = document.createElement('style');
        styleEl.textContent = css;
        this.insertBefore(styleEl, this.firstChild);
      })
      .catch(e => console.error('[Entity Manager] Failed to load CSS:', e));

    // Create app header
    const header = document.createElement('div');
    header.className = 'app-header';
    header.innerHTML = `
      <button class="menu-btn" id="menu-btn" aria-label="Menu">
        <svg viewBox="0 0 24 24"><path d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z" fill="currentColor"/></svg>
      </button>
      <button class="mobile-sidebar-btn" id="mobile-sidebar-btn" aria-label="Toggle Navigation">
        <svg viewBox="0 0 24 24"><path d="M19,2L14,6.5V17.5L19,13V2M6.5,5C4.55,5 2.45,5.4 1,6.5V21.16C1,21.41 1.25,21.66 1.5,21.66C1.6,21.66 1.65,21.59 1.75,21.59C3.1,20.94 5.05,20.5 6.5,20.5C8.45,20.5 10.55,20.9 12,22C13.35,21.15 15.8,20.5 17.5,20.5C19.15,20.5 20.85,20.81 22.25,21.56C22.35,21.61 22.4,21.59 22.5,21.59C22.75,21.59 23,21.34 23,21.09V6.5C22.4,6.05 21.75,5.75 21,5.5V19C19.9,18.65 18.7,18.5 17.5,18.5C15.8,18.5 13.35,19.15 12,20V6.5C10.55,5.4 8.45,5 6.5,5Z" fill="currentColor"/></svg>
      </button>
      <span class="app-header-title">Entity Manager</span>
      <div class="header-right">
        <div class="theme-dropdown-container">
          <button class="theme-dropdown-btn" id="theme-dropdown-btn">
            <svg viewBox="0 0 24 24"><path d="M12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,15.31L23.31,12L20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31Z" fill="currentColor"/></svg>
            <span id="theme-btn-label">Theme</span>
          </button>
          <div class="theme-dropdown-menu" id="theme-dropdown-menu">
            <div class="theme-dropdown-item ${this.activeTheme === 'default' ? 'active' : ''}" data-theme="default">
              <svg viewBox="0 0 24 24"><path d="M12,18V6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,15.31L23.31,12L20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31Z" fill="currentColor"/></svg>
              Default (Follow HA)
            </div>
            <div class="theme-dropdown-divider"></div>
            <div id="saved-themes-list"></div>
            <div class="theme-dropdown-divider"></div>
            <div class="theme-dropdown-item save-btn" id="save-theme-btn">
              <svg viewBox="0 0 24 24"><path d="M17 3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V7L17 3M19 19H5V5H16.17L19 7.83V19M12 12C10.34 12 9 13.34 9 15S10.34 18 12 18 15 16.66 15 15 13.66 12 12 12M6 6H15V10H6V6Z" fill="currentColor"/></svg>
              Save Current Theme
            </div>
            <div class="theme-dropdown-item" id="create-theme-btn" style="color: var(--em-primary); font-weight: 500;">
              <svg viewBox="0 0 24 24"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="currentColor"/></svg>
              Create New Theme
            </div>
            <div class="theme-dropdown-divider"></div>
            <div class="theme-dropdown-item" id="import-themes-btn">
              <svg viewBox="0 0 24 24"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M13.5,16V19H10.5V16H8L12,12L16,16H13.5M13,9V3.5L18.5,9H13Z" fill="currentColor"/></svg>
              Import Themes
            </div>
            <div class="theme-dropdown-item" id="export-themes-btn">
              <svg viewBox="0 0 24 24"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M13.5,13V16H10.5V13H8L12,9L16,13H13.5M13,9V3.5L18.5,9H13Z" fill="currentColor"/></svg>
              Export Themes
            </div>
          </div>
        </div>
      </div>
    `;
    this.appendChild(header);
    
    // Create theme editor overlay
    const themeEditor = document.createElement('div');
    themeEditor.className = 'theme-editor-overlay';
    themeEditor.id = 'theme-editor-overlay';
    themeEditor.innerHTML = `
      <div class="theme-editor">
        <div class="theme-editor-header">
          <h3>Create Custom Theme</h3>
          <button class="theme-editor-close" id="theme-editor-close">&times;</button>
        </div>
        <div class="theme-editor-content">
          <input type="text" class="theme-editor-name" id="theme-editor-name" placeholder="Theme Name" value="My Custom Theme">
          
          <div class="theme-editor-section">
            <div class="theme-editor-section-title">Base Mode</div>
            <div class="theme-editor-mode">
              <input type="radio" name="theme-mode" id="theme-mode-light" value="light" checked>
              <label for="theme-mode-light">☀️ Light</label>
              <input type="radio" name="theme-mode" id="theme-mode-dark" value="dark">
              <label for="theme-mode-dark">🌙 Dark</label>
            </div>
          </div>
          
          <div class="theme-editor-section">
            <div class="theme-editor-section-title">Primary Colors</div>
            <div class="theme-editor-row">
              <label>Primary</label>
              <input type="color" id="te-primary" value="#2196f3">
              <span class="color-hex" data-for="te-primary">#2196f3</span>
            </div>
            <div class="theme-editor-row">
              <label>Primary Dark</label>
              <input type="color" id="te-primary-dark" value="#1565c0">
              <span class="color-hex" data-for="te-primary-dark">#1565c0</span>
            </div>
            <div class="theme-editor-row">
              <label>Primary Light</label>
              <input type="color" id="te-primary-light" value="#64b5f6">
              <span class="color-hex" data-for="te-primary-light">#64b5f6</span>
            </div>
          </div>
          
          <div class="theme-editor-section">
            <div class="theme-editor-section-title">Status Colors</div>
            <div class="theme-editor-row">
              <label>Success</label>
              <input type="color" id="te-success" value="#4caf50">
              <span class="color-hex" data-for="te-success">#4caf50</span>
            </div>
            <div class="theme-editor-row">
              <label>Danger</label>
              <input type="color" id="te-danger" value="#f44336">
              <span class="color-hex" data-for="te-danger">#f44336</span>
            </div>
            <div class="theme-editor-row">
              <label>Warning</label>
              <input type="color" id="te-warning" value="#ff9800">
              <span class="color-hex" data-for="te-warning">#ff9800</span>
            </div>
          </div>
          
          <div class="theme-editor-section">
            <div class="theme-editor-section-title">Background & Text</div>
            <div class="theme-editor-row">
              <label>Background</label>
              <input type="color" id="te-bg-primary" value="#ffffff">
              <span class="color-hex" data-for="te-bg-primary">#ffffff</span>
            </div>
            <div class="theme-editor-row">
              <label>Secondary BG</label>
              <input type="color" id="te-bg-secondary" value="#f5f5f5">
              <span class="color-hex" data-for="te-bg-secondary">#f5f5f5</span>
            </div>
            <div class="theme-editor-row">
              <label>Text</label>
              <input type="color" id="te-text-primary" value="#212121">
              <span class="color-hex" data-for="te-text-primary">#212121</span>
            </div>
            <div class="theme-editor-row">
              <label>Border</label>
              <input type="color" id="te-border" value="#e0e0e0">
              <span class="color-hex" data-for="te-border">#e0e0e0</span>
            </div>
          </div>
          
          <div class="theme-editor-section">
            <div class="theme-editor-section-title">Background Image (Optional)</div>
            <div class="theme-editor-bg-type">
              <label class="theme-editor-radio">
                <input type="radio" name="bg-type" value="none" checked>
                <span>None</span>
              </label>
              <label class="theme-editor-radio">
                <input type="radio" name="bg-type" value="url">
                <span>Web URL</span>
              </label>
              <label class="theme-editor-radio">
                <input type="radio" name="bg-type" value="local">
                <span>Local File</span>
              </label>
            </div>
            <div id="bg-url-input" class="theme-editor-bg-input" style="display: none;">
              <input type="text" id="te-bg-url" placeholder="https://example.com/image.jpg" class="theme-editor-name">
            </div>
            <div id="bg-local-input" class="theme-editor-bg-input" style="display: none;">
              <button class="theme-editor-btn" id="te-bg-local-btn" style="width: 100%;">
                <svg viewBox="0 0 24 24" style="width:18px;height:18px;margin-right:8px;vertical-align:middle;"><path d="M9,16V10H5L12,3L19,10H15V16H9M5,20V18H19V20H5Z" fill="currentColor"/></svg>
                Choose Image File
              </button>
              <div id="te-bg-local-preview" class="theme-editor-bg-preview"></div>
            </div>
            <div class="theme-editor-row" id="bg-overlay-row" style="display: none; margin-top: 12px;">
              <label>Overlay</label>
              <input type="color" id="te-bg-overlay" value="#000000">
              <input type="range" id="te-bg-overlay-opacity" min="0" max="100" value="70" style="flex: 1;">
              <span id="te-bg-overlay-value">70%</span>
            </div>
          </div>
          
          <div class="theme-editor-preview" id="theme-preview">
            <div class="theme-editor-preview-title">Preview</div>
            <div class="theme-editor-preview-chips">
              <span class="theme-preview-chip" id="preview-chip-primary">Primary</span>
              <span class="theme-preview-chip" id="preview-chip-success">Success</span>
              <span class="theme-preview-chip" id="preview-chip-danger">Danger</span>
              <span class="theme-preview-chip" id="preview-chip-warning">Warning</span>
            </div>
          </div>
        </div>
        <div class="theme-editor-actions">
          <button class="theme-editor-btn cancel" id="theme-editor-cancel">Cancel</button>
          <button class="theme-editor-btn save" id="theme-editor-save">Create Theme</button>
        </div>
      </div>
    `;
    this.appendChild(themeEditor);

    // Create layout container with sidebar
    const layout = document.createElement('div');
    layout.className = 'em-layout';
    layout.innerHTML = this._renderSidebar();
    this.appendChild(layout);

    // Create main content area
    this.content = document.createElement('div');
    this.content.id = 'main-content';
    this.content.className = this.sidebarCollapsed ? 'sidebar-collapsed' : '';
    layout.appendChild(this.content);

    // Fill content with HTML
    this.content.innerHTML = `
      <div class="header">
        <h1>Entity Manager</h1>
        <p>Manage entities by integration and device</p>
      </div>
      
      <div class="stats" id="stats"></div>
      
      <div class="toolbar">
        <div class="filter-group">
          <button class="filter-toggle" data-filter="all">All</button>
          <button class="filter-toggle" data-filter="enabled">Enabled</button>
          <button class="filter-toggle" data-filter="disabled">Disabled</button>
          <button class="filter-toggle" data-filter="updates">Updates</button>
        </div>
        <div class="domain-dropdown" id="update-filter-dropdown" style="display: none;">
          <button class="domain-button" id="update-filter-button" aria-label="Filter updates" type="button">
            <span id="update-filter-label">All Updates</span>
            <span aria-hidden="true">▾</span>
          </button>
          <div class="domain-menu" id="update-filter-menu" role="listbox" aria-label="Update filter options">
            <div class="domain-option active" data-update-filter="all">All Updates</div>
            <div class="domain-option" data-update-filter="stable">Stable Only</div>
            <div class="domain-option" data-update-filter="beta">Beta Only</div>
          </div>
        </div>
        <div class="domain-dropdown" id="update-type-dropdown" style="display: none;">
          <button class="domain-button" id="update-type-button" aria-label="Filter by type" type="button">
            <span id="update-type-label">All Types</span>
            <span aria-hidden="true">▾</span>
          </button>
          <div class="domain-menu" id="update-type-menu" role="listbox" aria-label="Update type options">
            <div class="domain-option active" data-update-type="all">All Types</div>
            <div class="domain-option" data-update-type="device">Devices</div>
            <div class="domain-option" data-update-type="integration">Integrations</div>
          </div>
        </div>
        <label class="hide-uptodate-label" id="hide-uptodate-label" style="display: none;">
          <input type="checkbox" id="hide-uptodate-checkbox" />
          <span>Hide Up-to-Date</span>
        </label>
      </div>

      <div class="toolbar-search">
        <input
          type="text"
          class="search-box"
          placeholder="Search entities, devices, or integrations..."
          id="search-input"
        />
      </div>

      <div id="content"></div>
    `;

    // Attach event listeners
    this.attachEventListeners();
  }

  attachEventListeners() {
    // Handle menu button (it's outside content div)
    const menuBtn = this.querySelector('#menu-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', () => {
        this._fireEvent('hass-toggle-menu');
      });
    }
    
    // Handle mobile sidebar toggle button
    const mobileSidebarBtn = this.querySelector('#mobile-sidebar-btn');
    if (mobileSidebarBtn) {
      mobileSidebarBtn.addEventListener('click', () => {
        this._toggleSidebar();
      });
    }
    
    // Handle theme dropdown
    const themeDropdownBtn = this.querySelector('#theme-dropdown-btn');
    const themeDropdownMenu = this.querySelector('#theme-dropdown-menu');
    if (themeDropdownBtn && themeDropdownMenu) {
      // Load saved theme and update UI
      this._loadActiveTheme();
      this._updateThemeDropdownList();
      this._updateThemeDropdownUI();
      this.updateTheme();
      
      themeDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        themeDropdownMenu.classList.toggle('active');
      });
      
      themeDropdownMenu.addEventListener('click', (e) => {
        // Handle delete button
        const deleteBtn = e.target.closest('.delete-theme-btn');
        if (deleteBtn) {
          e.stopPropagation();
          this._deleteCustomTheme(deleteBtn.dataset.delete);
          return;
        }
        
        // Handle edit button
        const editBtn = e.target.closest('.edit-theme-btn');
        if (editBtn) {
          e.stopPropagation();
          themeDropdownMenu.classList.remove('active');
          this._openThemeEditor(editBtn.dataset.edit);
          return;
        }
        
        // Handle save button
        if (e.target.closest('#save-theme-btn')) {
          this._saveCurrentTheme();
          themeDropdownMenu.classList.remove('active');
          return;
        }
        
        // Handle create theme button
        if (e.target.closest('#create-theme-btn')) {
          themeDropdownMenu.classList.remove('active');
          this._openThemeEditor();
          return;
        }
        
        // Handle import themes button
        if (e.target.closest('#import-themes-btn')) {
          themeDropdownMenu.classList.remove('active');
          this._importThemes();
          return;
        }
        
        // Handle export themes button
        if (e.target.closest('#export-themes-btn')) {
          themeDropdownMenu.classList.remove('active');
          this._exportThemes();
          return;
        }
        
        // Handle theme selection
        const item = e.target.closest('.theme-dropdown-item[data-theme]');
        if (item && item.dataset.theme) {
          this._setActiveTheme(item.dataset.theme);
          themeDropdownMenu.classList.remove('active');
        }
      });
      
      // Theme editor event handlers
      this._setupThemeEditor();
      
      // Close dropdown when clicking outside
      if (!this._themeOutsideHandler) {
        this._themeOutsideHandler = (event) => {
          if (!themeDropdownMenu.classList.contains('active')) return;
          if (!themeDropdownMenu.contains(event.target) && !themeDropdownBtn.contains(event.target)) {
            themeDropdownMenu.classList.remove('active');
          }
        };
        document.addEventListener('click', this._themeOutsideHandler);
      }
    }

    // Handle search
    const searchInput = this.content.querySelector('#search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const value = e.target.value.toLowerCase();
        clearTimeout(this._searchDebounceTimer);
        this._searchDebounceTimer = setTimeout(() => {
          this.searchTerm = value;
          this.updateView();
        }, 200);
      });
    }

    // Handle filter buttons
    this.content.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.viewState = btn.dataset.filter;
        this.selectedIntegrationFilter = null; // Clear integration filter when switching view
        this._showOnlyFavorites = false; // Clear favorites filter
        this.setActiveFilter();
        
        // Update sidebar to clear active integration
        this._reRenderSidebar();

        // Show/hide update filter dropdown and buttons
        const updateFilterDropdown = this.content.querySelector('#update-filter-dropdown');

        if (this.viewState === 'updates') {
          updateFilterDropdown.style.display = 'block';
          const updateTypeDropdown = this.content.querySelector('#update-type-dropdown');
          if (updateTypeDropdown) updateTypeDropdown.style.display = 'block';
          const hideLabel = this.content.querySelector('#hide-uptodate-label');
          if (hideLabel) hideLabel.style.display = 'flex';
          this.loadUpdates();
        } else {
          updateFilterDropdown.style.display = 'none';
          const updateTypeDropdown = this.content.querySelector('#update-type-dropdown');
          if (updateTypeDropdown) updateTypeDropdown.style.display = 'none';
          const hideLabel = this.content.querySelector('#hide-uptodate-label');
          if (hideLabel) hideLabel.style.display = 'none';
          this.loadData();
        }
      });
    });

    // Handle update filter
    const updateFilterButton = this.content.querySelector('#update-filter-button');
    const updateFilterMenu = this.content.querySelector('#update-filter-menu');
    if (updateFilterButton && updateFilterMenu) {
      updateFilterButton.addEventListener('click', (e) => {
        e.stopPropagation();
        updateFilterMenu.classList.toggle('open');
      });

      updateFilterMenu.addEventListener('click', (e) => {
        const option = e.target.closest('.domain-option');
        if (!option) return;
        this.updateFilter = option.dataset.updateFilter;
        const label = this.content.querySelector('#update-filter-label');
        label.textContent = option.textContent;
        
        // Update active state
        updateFilterMenu.querySelectorAll('.domain-option').forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        
        // Auto-enable hide up-to-date when a filter is selected
        if (this.updateFilter !== 'all') {
          this.hideUpToDate = true;
          const hideCheckbox = this.content.querySelector('#hide-uptodate-checkbox');
          if (hideCheckbox) hideCheckbox.checked = true;
        }
        
        updateFilterMenu.classList.remove('open');
        this.renderUpdates();
      });
    }
    
    // Handle hide up-to-date checkbox
    const hideCheckbox = this.content.querySelector('#hide-uptodate-checkbox');
    if (hideCheckbox) {
      hideCheckbox.addEventListener('change', (e) => {
        this.hideUpToDate = e.target.checked;
        this.renderUpdates();
      });
    }
    
    // Handle update type filter
    const updateTypeButton = this.content.querySelector('#update-type-button');
    const updateTypeMenu = this.content.querySelector('#update-type-menu');
    if (updateTypeButton && updateTypeMenu) {
      updateTypeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        updateTypeMenu.classList.toggle('open');
      });

      updateTypeMenu.addEventListener('click', (e) => {
        const option = e.target.closest('.domain-option');
        if (!option) return;
        this.selectedUpdateType = option.dataset.updateType;
        const label = this.content.querySelector('#update-type-label');
        label.textContent = option.textContent;
        
        // Update active state
        updateTypeMenu.querySelectorAll('.domain-option').forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        
        updateTypeMenu.classList.remove('open');
        this.renderUpdates();
      });
    }
    
    // Handle sidebar toggle
    const sidebarToggle = this.querySelector('#sidebar-toggle-btn');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', () => this._toggleSidebar());
    }
    
    // Setup sidebar click handlers
    this._attachSidebarListeners();

    this.setActiveFilter();
  }
  
  _attachSidebarListeners() {
    // Handle sidebar toggle button
    const sidebarToggle = this.querySelector('#sidebar-toggle-btn');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', () => this._toggleSidebar());
    }

    // Handle collapsible section titles
    this.querySelector('.em-sidebar')?.querySelectorAll('.sidebar-section-title[data-section-id]').forEach(title => {
      title.addEventListener('click', () => {
        const id = title.dataset.sectionId;
        const section = title.closest('.sidebar-section');
        const isCollapsed = section.classList.contains('section-collapsed');
        section.classList.toggle('section-collapsed', !isCollapsed);
        if (isCollapsed) {
          this.sidebarOpenSections.add(id);
        } else {
          this.sidebarOpenSections.delete(id);
        }
        localStorage.setItem('em-sidebar-sections', JSON.stringify([...this.sidebarOpenSections]));
      });
    });
    
    // Handle click outside sidebar on mobile to close it
    const mainContent = this.querySelector('#main-content');
    if (mainContent) {
      mainContent.addEventListener('click', (e) => {
        // Only on mobile (check if sidebar is in fixed/overlay mode)
        const sidebar = this.querySelector('.em-sidebar');
        if (sidebar && !this.sidebarCollapsed && window.innerWidth <= 768) {
          this._toggleSidebar();
        }
      });
    }
    
    // Handle sidebar items
    this.querySelector('.em-sidebar')?.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.preset-delete');
      if (deleteBtn) {
        e.stopPropagation();
        this._deleteFilterPreset(parseInt(deleteBtn.dataset.delete));
        return;
      }
      // Label edit button
      const editLabelBtn = e.target.closest('[data-edit-label]');
      if (editLabelBtn) {
        e.stopPropagation();
        const labelId = editLabelBtn.dataset.editLabel;
        const label = (this.labeledEntitiesCache || {})[labelId] || (this.labelsCache || []).find(l => l.label_id === labelId);
        if (label) this._showLabelEditDialog(label, Array.from(this.selectedEntities));
        return;
      }
      // Device name filter chip remove button
      const filterRemoveBtn = e.target.closest('[data-filter-remove]');
      if (filterRemoveBtn) {
        e.stopPropagation();
        const idx = parseInt(filterRemoveBtn.dataset.filterRemove);
        const removedPattern = (this.savedDeviceFilters[idx] || {}).pattern;
        this.savedDeviceFilters.splice(idx, 1);
        localStorage.setItem('em-saved-device-filters', JSON.stringify(this.savedDeviceFilters));
        // If the removed filter was active, clear it
        if (this.deviceNameFilter === removedPattern) {
          this.deviceNameFilter = '';
          localStorage.setItem('em-device-name-filter', '');
        }
        this._reRenderSidebar();
        this.updateView();
        return;
      }
      // Device name filter chip click (activate saved filter)
      const filterChip = e.target.closest('.em-device-filter-chip');
      if (filterChip) {
        e.stopPropagation();
        const pattern = filterChip.dataset.filterPattern;
        // Toggle: clicking active chip clears filter
        if (this.deviceNameFilter === pattern) {
          this.deviceNameFilter = '';
        } else {
          this.deviceNameFilter = pattern;
        }
        localStorage.setItem('em-device-name-filter', this.deviceNameFilter);
        this._reRenderSidebar();
        this.updateView();
        return;
      }
      const item = e.target.closest('.sidebar-item');
      if (item) this._handleSidebarItemAction(item);
    });

    // Device name filter: live input filtering
    const deviceFilterInput = this.querySelector('#em-device-name-filter-input');
    if (deviceFilterInput) {
      deviceFilterInput.addEventListener('input', (e) => {
        this.deviceNameFilter = e.target.value;
        localStorage.setItem('em-device-name-filter', this.deviceNameFilter);
        this.updateView();
        // Update chip active states without full re-render
        this.querySelector('.em-sidebar')?.querySelectorAll('.em-device-filter-chip').forEach(chip => {
          const isActive = chip.dataset.filterPattern === this.deviceNameFilter;
          chip.classList.toggle('active', isActive);
          chip.style.background = isActive ? 'var(--em-primary)' : 'var(--em-bg-hover)';
          chip.style.color = isActive ? 'white' : 'var(--em-text-primary)';
        });
      });
    }

    // Device name filter: save button (＋)
    const deviceFilterSave = this.querySelector('#em-device-filter-save');
    if (deviceFilterSave) {
      deviceFilterSave.addEventListener('click', () => {
        const keyword = this.deviceNameFilter.trim();
        if (!keyword) return;
        // Don't save duplicates
        if (this.savedDeviceFilters.some(f => f.pattern === keyword)) {
          this._showToast(`"${keyword}" is already saved`, 'info');
          return;
        }
        this.savedDeviceFilters.push({ label: keyword, pattern: keyword });
        localStorage.setItem('em-saved-device-filters', JSON.stringify(this.savedDeviceFilters));
        this._reRenderSidebar();
        this._showToast(`Saved filter: "${keyword}"`, 'success');
      });
    }
  }

  _handleSidebarItemAction(item) {
    const action = item.dataset.action;
    const integration = item.dataset.integration;
    const filter = item.dataset.filter;
    const presetId = item.dataset.presetId;
    const groupMode = item.dataset.groupMode;

    if (action === 'activity-log') {
      this._showActivityLog();
    } else if (action === 'comparison') {
      this._showEntityComparison();
    } else if (action === 'columns') {
      this._showColumnSettings();
    } else if (action === 'clear-integration-filter') {
      this.selectedIntegrationFilter = null;
      this.updateView();
      this._reRenderSidebar();
      this._showToast('Showing all integrations', 'info');
    } else if (action === 'show-all-integrations') {
      this.showAllSidebarIntegrations = true;
      this._reRenderSidebar();
    } else if (action === 'collapse-integrations') {
      this.showAllSidebarIntegrations = false;
      this._reRenderSidebar();
    } else if (action === 'undo') {
      this._undo();
    } else if (action === 'redo') {
      this._redo();
    } else if (action === 'export') {
      this._exportEntityConfig();
    } else if (action === 'import') {
      this._importEntityConfig();
    } else if (action === 'toggle-smart-groups') {
      this._toggleSmartGroups();
      this._reRenderSidebar();
    } else if (action === 'save-preset') {
      this._saveCurrentFilterPreset();
    } else if (groupMode) {
      this._setSmartGroupMode(groupMode);
      this.querySelector('.em-sidebar').querySelectorAll('[data-group-mode]').forEach(el => {
        el.classList.toggle('active', el.dataset.groupMode === groupMode);
      });
    } else if (presetId) {
      this._applyFilterPreset(parseInt(presetId));
    } else if (filter === 'favorites') {
      this.searchTerm = '';
      const searchInput = this.content.querySelector('#search-input');
      if (searchInput) searchInput.value = '';
      this._showOnlyFavorites = true;
      this.updateView();
      this._showToast('Showing favorites only', 'info');
    } else if (action === 'load-labels') {
      this.labeledEntitiesCache = null;
      this.labelsCache = null;
      this._loadAndDisplayLabels();
    } else if (action === 'clear-label-filter') {
      this.selectedLabelFilter = null;
      this.updateView();
      this._reRenderSidebar();
      this._showToast('Showing all entities', 'info');
    } else if (action === 'show-all-labels') {
      this.showAllSidebarLabels = true;
      this._loadAndDisplayLabels();
    } else if (action === 'collapse-labels') {
      this.showAllSidebarLabels = false;
      this._loadAndDisplayLabels();
    } else if (action === 'help-guide') {
      this._showHelpGuide();
    } else if (action === 'enable-selected') {
      this.bulkEnable();
    } else if (action === 'disable-selected') {
      this.bulkDisable();
    } else if (action === 'deselect-all') {
      this.selectedEntities.clear();
      this.updateSelectedCount();
      this.updateView();
      this._showToast('Selection cleared', 'info');
    } else if (action === 'refresh') {
      if (this.viewState === 'updates') {
        this.loadUpdates();
      } else {
        this.loadData();
      }
    } else if (item.dataset.domain !== undefined) {
      this.selectedDomain = item.dataset.domain;
      this._showOnlyFavorites = false;
      this.updateView();
      this.updateDomainOptions();
    } else if (item.dataset.labelId) {
      this._filterByLabel(item.dataset.labelId);
    } else if (integration) {
      this._showOnlyFavorites = false;
      this.viewState = 'all';
      this.selectedDomain = 'all';
      this.searchTerm = '';
      this.selectedIntegrationFilter = integration;
      const searchInput = this.content.querySelector('#search-input');
      if (searchInput) searchInput.value = '';
      this.expandedIntegrations.add(integration);
      this.updateView();
      this._reRenderSidebar();
      this._showToast(`Showing ${integration} entities`, 'info');
    }
  }

  setActiveFilter() {
    const buttons = this.content.querySelectorAll('[data-filter]');
    buttons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === this.viewState);
    });
  }

  updateView() {
    const statsEl = this.content.querySelector('#stats');
    const contentEl = this.content.querySelector('#content');

    this.updateDomainOptions();

    let filteredData = this.data;
    const hasDomainFilter = this.selectedDomain && this.selectedDomain !== 'all';
    const hasSearch = Boolean(this.searchTerm);
    const showOnlyFavorites = this._showOnlyFavorites;
    const hasIntegrationFilter = Boolean(this.selectedIntegrationFilter);
    const hasLabelFilter = Boolean(this.selectedLabelFilter);
    
    // Get entities for selected label
    let labeledEntityIds = null;
    if (hasLabelFilter && this.labeledEntitiesCache && this.labeledEntitiesCache[this.selectedLabelFilter]) {
      labeledEntityIds = new Set(this.labeledEntitiesCache[this.selectedLabelFilter].entities);
    }
    
    // Filter by selected integration first
    if (hasIntegrationFilter) {
      filteredData = filteredData.filter(int => int.integration === this.selectedIntegrationFilter);
    }
    
    // Apply domain, search, favorites, and label filters
    if (hasDomainFilter || hasSearch || showOnlyFavorites || hasLabelFilter) {
      filteredData = filteredData.map(integration => {
        const filteredDevices = {};
        Object.entries(integration.devices).forEach(([deviceId, device]) => {
          // Filter entities by domain, search, favorites, and label
          const filteredEntities = device.entities.filter(entity => {
            // Label filter
            if (hasLabelFilter && labeledEntityIds && !labeledEntityIds.has(entity.entity_id)) return false;
            
            // Favorites filter
            if (showOnlyFavorites && !this.favorites.has(entity.entity_id)) return false;
            
            const matchesDomain = !hasDomainFilter || entity.entity_id.startsWith(`${this.selectedDomain}.`);
            if (!matchesDomain) return false;

            if (!hasSearch) return true;

            const entityId = entity.entity_id.toLowerCase();
            const originalName = entity.original_name ? entity.original_name.toLowerCase() : '';
            const integrationName = integration.integration.toLowerCase();
            const deviceName = this.getDeviceName(deviceId).toLowerCase();

            // Use fuzzy matching for search
            const termLower = this.searchTerm.toLowerCase();
            return (
              this._fuzzyMatch(entityId, termLower) ||
              this._fuzzyMatch(originalName, termLower) ||
              this._fuzzyMatch(integrationName, termLower) ||
              this._fuzzyMatch(deviceName, termLower)
            );
          });

          if (filteredEntities.length > 0) {
            filteredDevices[deviceId] = {
              ...device,
              entities: filteredEntities
            };
          }
        });

        return {
          ...integration,
          devices: filteredDevices
        };
      }).filter(integration => Object.keys(integration.devices).length > 0);
    }

    // Calculate stats with enabled/disabled breakdown
    const totalIntegrations = filteredData.length;
    const totalDevices = filteredData.reduce((sum, int) => sum + Object.keys(int.devices).length, 0);
    
    let totalEntities = 0;
    let disabledEntities = 0;
    let enabledEntities = 0;
    
    filteredData.forEach(integration => {
      Object.values(integration.devices).forEach(device => {
        device.entities.forEach(entity => {
          totalEntities++;
          if (entity.is_disabled) {
            disabledEntities++;
          } else {
            enabledEntities++;
          }
        });
      });
    });

    // Render stats
    statsEl.innerHTML = `
      <div class="stat-card clickable-stat" data-stat-type="integration" title="Click to view integrations">
        <div class="stat-label">Integrations</div>
        <div class="stat-value">${totalIntegrations}</div>
      </div>
      <div class="stat-card clickable-stat" data-stat-type="device" title="Click to view devices">
        <div class="stat-label">Devices</div>
        <div class="stat-value">${totalDevices}</div>
      </div>
      <div class="stat-card clickable-stat" data-stat-type="entities" title="Click to view all entities">
        <div class="stat-label">Total Entities</div>
        <div class="stat-value">${totalEntities}</div>
      </div>
      <div class="stat-card clickable-stat" data-stat-type="automation" title="Click to view automations">
        <div class="stat-label">Automations</div>
        <div class="stat-value" style="color: #2196f3 !important;">${this.automationCount}</div>
      </div>
      <div class="stat-card clickable-stat" data-stat-type="script" title="Click to view scripts">
        <div class="stat-label">Scripts</div>
        <div class="stat-value" style="color: #2196f3 !important;">${this.scriptCount}</div>
      </div>
      <div class="stat-card clickable-stat" data-stat-type="helper" title="Click to view helpers">
        <div class="stat-label">Helpers</div>
        <div class="stat-value" style="color: #2196f3 !important;">${this.helperCount}</div>
      </div>
      <div class="stat-card clickable-stat" data-stat-type="template" title="Click to view templates">
        <div class="stat-label">Templates</div>
        <div class="stat-value" style="color: #ff9800 !important;">${this.templateCount}</div>
      </div>
      <div class="stat-card clickable-stat" data-stat-type="unavailable" title="Click to view unavailable entities">
        <div class="stat-label">Unavailable</div>
        <div class="stat-value" style="color: ${this.unavailableCount > 0 ? '#f44336' : '#4caf50'} !important;">${this.unavailableCount || 0}</div>
      </div>
      <div class="stat-card clickable-stat" data-stat-type="orphaned" title="Click to view entities with no device">
        <div class="stat-label">Orphaned</div>
        <div class="stat-value" style="color: ${this.orphanedCount > 0 ? '#ff9800' : '#4caf50'} !important;">${this.orphanedCount || 0}</div>
      </div>
      <div class="stat-card clickable-stat" data-stat-type="health" title="Click to view entities not updated in 30+ days">
        <div class="stat-label">Stale (30d)</div>
        <div class="stat-value" style="color: ${this.healthCount > 0 ? '#ff9800' : '#4caf50'} !important;">${this.healthCount || 0}</div>
      </div>
      <div class="stat-card clickable-stat" data-stat-type="hacs" title="Click to view HACS store">
        <div class="stat-label">HACS Store</div>
        <div class="stat-value" style="color: #4caf50 !important;">${this.hacsCount}</div>
      </div>
      <div class="stat-card clickable-stat" data-stat-type="lovelace" title="Click to view Lovelace cards">
        <div class="stat-label">Lovelace Cards</div>
        <div class="stat-value" style="color: #9c27b0 !important;">${this.lovelaceCardCount}</div>
      </div>
      ${(() => {
        const bm = (this.data || []).find(i => i.integration === 'browser_mod');
        if (!bm) return '';
        const browserEntries = Object.entries(bm.devices).filter(([k]) => k !== 'no_device');
        const browserCount = browserEntries.length;
        const staleThreshold = Date.now() - 7 * 24 * 60 * 60 * 1000;
        let hasStale = false;
        let activeCount = 0;
        browserEntries.forEach(([, device]) => {
          const lastActive = device.entities.reduce((max, e) => {
            const t = this._hass?.states[e.entity_id]?.last_changed;
            return t ? Math.max(max, new Date(t).getTime()) : max;
          }, 0);
          if (lastActive && lastActive < staleThreshold) hasStale = true;
          const activeEnt = device.entities.find(e => e.entity_id.startsWith('binary_sensor.') && e.entity_id.endsWith('_active'));
          if (activeEnt && this._hass?.states[activeEnt.entity_id]?.state === 'on') activeCount++;
        });
        const activeLabel = activeCount > 0 ? `<div style="font-size:0.72em;color:#4caf50;margin-top:2px">● ${activeCount} active</div>` : '';
        return `
          <div class="stat-card clickable-stat" data-stat-type="browsers" title="Click to manage browser_mod browsers">
            <div class="stat-label">Browsers${hasStale ? ' ⚠' : ''}</div>
            <div class="stat-value" style="color: #2196f3 !important;">${browserCount}</div>
            ${activeLabel}
          </div>`;
      })()}
    `;

    // Attach click listeners to clickable stat cards
    statsEl.querySelectorAll('.clickable-stat[data-stat-type]').forEach(card => {
      card.addEventListener('click', () => {
        if (card.dataset.statType === 'browsers') {
          this._showBrowserModDialog();
        } else if (card.dataset.statType === 'entities') {
          this._showAllEntitiesDialog();
        } else {
          this.showEntityListDialog(card.dataset.statType);
        }
      });
    });

    const allBtn = this.content.querySelector('[data-filter="all"]');
    const enabledBtn = this.content.querySelector('[data-filter="enabled"]');
    const disabledBtn = this.content.querySelector('[data-filter="disabled"]');
    const updatesBtn = this.content.querySelector('[data-filter="updates"]');
    if (allBtn) allBtn.innerHTML = `All (<span class="filter-count">${totalEntities}</span>)`;
    if (enabledBtn) enabledBtn.innerHTML = `Enabled (<span class="filter-count">${enabledEntities}</span>)`;
    if (disabledBtn) disabledBtn.innerHTML = `Disabled (<span class="filter-count">${disabledEntities}</span>)`;
    if (updatesBtn) updatesBtn.innerHTML = `Updates (<span class="filter-count">${this.updateCount}</span>)`;

    // Render content
    if (filteredData.length === 0) {
      let emptyMessage = 'No entities found';
      let emptyDesc = '';
      
      if (hasSearch) {
        emptyMessage = 'No matching entities';
        emptyDesc = `No entities match "${this._escapeHtml(this.searchTerm)}"`;
      } else if (hasDomainFilter) {
        emptyMessage = 'No entities in domain';
        emptyDesc = `No entities found for domain "${this._escapeHtml(this.selectedDomain)}"`;
      } else if (this.viewState === 'disabled') {
        emptyMessage = 'No disabled entities';
        emptyDesc = 'All entities are currently enabled';
      } else if (this.viewState === 'enabled') {
        emptyMessage = 'No enabled entities';
        emptyDesc = 'All entities are currently disabled';
      } else {
        emptyMessage = 'No entities';
        emptyDesc = 'No entities found in the system';
      }
      
      contentEl.innerHTML = `
        <div class="empty-state">
          <h2>${emptyMessage}</h2>
          <p>${emptyDesc}</p>
        </div>
      `;
      return;
    }

    // Check if smart groups mode is enabled
    if (this.smartGroupsEnabled && this.smartGroupMode !== 'integration') {
      const smartGroups = this._getSmartGroups();
      if (smartGroups) {
        // Apply the same filters to smart groups
        const filteredGroups = {};
        Object.entries(smartGroups).forEach(([groupKey, entities]) => {
          const filtered = entities.filter(entity => {
            // View state filter
            if (this.viewState === 'enabled' && entity.is_disabled) return false;
            if (this.viewState === 'disabled' && !entity.is_disabled) return false;
            
            // Domain filter
            if (this.selectedDomain !== 'all' && !entity.entity_id.startsWith(`${this.selectedDomain}.`)) return false;
            
            // Favorites filter
            if (this._showOnlyFavorites && !this.favorites.has(entity.entity_id)) return false;
            
            // Search filter
            if (this.searchTerm) {
              const term = this.searchTerm.toLowerCase();
              return entity.entity_id.toLowerCase().includes(term) ||
                     (entity.original_name || '').toLowerCase().includes(term) ||
                     entity.integration.toLowerCase().includes(term);
            }
            
            return true;
          });
          
          if (filtered.length > 0) {
            filteredGroups[groupKey] = filtered;
          }
        });
        
        contentEl.innerHTML = this._renderSmartGroups(filteredGroups);
        this.attachIntegrationListeners();
        return;
      }
    }

    const sortedData = [...filteredData].sort((a, b) =>
      a.integration.localeCompare(b.integration, undefined, { sensitivity: 'base' })
    );

    contentEl.innerHTML = sortedData.map(integration =>
      this.renderIntegration(integration)
    ).join('');

    // Re-attach event listeners for integration headers and entity checkboxes
    this.attachIntegrationListeners();
  }

  _renderSmartGroups(groups) {
    const sortedKeys = Object.keys(groups).sort();
    
    const modeLabels = {
      'room': 'Room',
      'type': 'Entity Type'
    };
    
    const modeIcons = {
      'room': '🏠',
      'type': '📂'
    };
    
    return sortedKeys.map(groupKey => {
      const entities = groups[groupKey];
      const isExpanded = this.expandedIntegrations.has(`smart_${groupKey}`);
      const enabledCount = entities.filter(e => !e.is_disabled).length;
      const disabledCount = entities.filter(e => e.is_disabled).length;
      
      // Format group name
      let displayName = groupKey;
      if (this.smartGroupMode === 'type') {
        displayName = groupKey.charAt(0).toUpperCase() + groupKey.slice(1).replace(/_/g, ' ');
      } else if (this.smartGroupMode === 'room') {
        displayName = groupKey === 'Unassigned' ? '📍 Unassigned' : groupKey;
      }
      
      return `
        <div class="smart-group ${isExpanded ? 'expanded' : ''}" data-smart-group="${this._escapeAttr(groupKey)}">
          <div class="smart-group-header" data-smart-group-toggle="${this._escapeAttr(groupKey)}">
            <span class="smart-group-icon">${modeIcons[this.smartGroupMode] || '📁'}</span>
            <span class="smart-group-name">${this._escapeHtml(displayName)}</span>
            <span class="smart-group-count">${entities.length} entities</span>
            <span class="smart-group-stats">
              <span style="color: #4caf50">${enabledCount}</span> / 
              <span style="color: #f44336">${disabledCount}</span>
            </span>
            <span class="smart-group-expand">▼</span>
          </div>
          ${isExpanded ? `
            <div class="smart-group-content">
              ${entities.map(entity => this._renderEntityItem(entity, entity.integration)).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  renderIntegration(integration) {
    const isExpanded = this.expandedIntegrations.has(integration.integration);
    const deviceCount = Object.keys(integration.devices).length;
    
    let entityCount = 0;
    let disabledCount = 0;
    let enabledCount = 0;
    
    // Collect all entities from all devices
    const allEntities = [];
    Object.entries(integration.devices).forEach(([deviceId, device]) => {
      device.entities.forEach(entity => {
        entityCount++;
        if (entity.is_disabled) {
          disabledCount++;
        } else {
          enabledCount++;
        }
        allEntities.push({
          ...entity,
          deviceId,
          deviceName: this.getDeviceName(deviceId)
        });
      });
    });

    const intName = this._escapeAttr(integration.integration);
    const intDisplay = this._escapeHtml(integration.integration.charAt(0).toUpperCase() + integration.integration.slice(1));
    const intInitial = this._escapeHtml(integration.integration.charAt(0).toUpperCase());

    const _ivf = this.integrationViewFilter[integration.integration];
    const _filterClass = _ivf === 'enabled' ? 'em-filter-enabled' : _ivf === 'disabled' ? 'em-filter-disabled' : '';

    return `
      <div class="integration-group integration-card ${_filterClass}" data-integration="${intName}">
        <div class="integration-header" data-integration="${intName}">
          <div class="integration-select-wrapper" title="Select all in this integration">
            <label class="integration-select-label">
              <input type="checkbox" class="integration-select-checkbox" data-integration="${intName}">
              <span class="integration-select-text">Select all</span>
            </label>
          </div>
          <div class="integration-logo-container">
            <img class="integration-logo" src="https://brands.home-assistant.io/${encodeURIComponent(integration.integration)}/icon.png" alt="${intName}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 48 48%22><text x=%2224%22 y=%2232%22 font-size=%2224%22 text-anchor=%22middle%22 fill=%22%23999%22>${intInitial}</text></svg>'">
          </div>
          <span class="integration-icon ${isExpanded ? 'expanded' : ''}">›</span>
          <div class="integration-info">
            <div class="integration-name">${intDisplay}</div>
            <div class="integration-stats">${deviceCount} device${deviceCount !== 1 ? 's' : ''} • ${entityCount} entit${entityCount !== 1 ? 'ies' : 'y'} (<span style="color: #4caf50">${enabledCount} enabled</span> / <span style="color: #f44336">${disabledCount} disabled</span>)</div>
          </div>
          <div class="integration-actions">
            <button class="btn view-integration-enabled ${_ivf === 'enabled' ? 'btn-primary' : 'btn-secondary'}" data-integration="${intName}" title="Show only enabled entities" style="${_ivf === 'enabled' ? '' : 'color:#4caf50;border-color:#4caf50'}">View Enabled</button>
            <button class="btn view-integration-disabled ${_ivf === 'disabled' ? 'btn-primary' : 'btn-secondary'}" data-integration="${intName}" title="Show only disabled entities" style="${_ivf === 'disabled' ? '' : 'color:#f44336;border-color:#f44336'}">View Disabled</button>
            <button class="btn btn-secondary enable-integration" data-integration="${intName}">Enable All</button>
            <button class="btn btn-secondary disable-integration" data-integration="${intName}">Disable All</button>
          </div>
        </div>
        ${isExpanded ? `
          <div class="entity-list" data-integration="${intName}">
            ${this._renderEntityListWithLazyLoad(allEntities, integration.integration)}
          </div>
        ` : ''}
      </div>
    `;
  }

  _renderEntityListWithLazyLoad(entities, integrationId) {
    // Get current visible count for this integration
    const visibleCount = this.visibleEntityCounts[integrationId] || this.initialLoadCount;
    const visibleEntities = entities.slice(0, visibleCount);
    const hasMore = entities.length > visibleCount;
    const remainingCount = entities.length - visibleCount;

    const entityHtml = visibleEntities.map(entity => this._renderEntityItem(entity, integrationId)).join('');
    
    const loadMoreBtn = hasMore ? `
      <div class="load-more-container">
        <button class="btn btn-secondary load-more-btn" data-integration="${integrationId}" data-remaining="${remainingCount}">
          Load More (${remainingCount} remaining)
        </button>
        <button class="btn btn-secondary load-all-btn" data-integration="${integrationId}" data-total="${entities.length}">
          Load All
        </button>
      </div>
    ` : '';

    return entityHtml + loadMoreBtn;
  }

  _renderEntityItem(entity, integrationId) {
    const alias = this.entityAliases[entity.entity_id] || '';
    const tags = this.entityTags[entity.entity_id] || [];
    const eid = this._escapeAttr(entity.entity_id);
    const iid = this._escapeAttr(integrationId);
    const col = (id) => this.visibleColumns.includes(id);
    const state = this._hass?.states[entity.entity_id];

    // Header band: device name, state chip, time chip
    const deviceChip = col('device') && entity.deviceName
      ? `<span class="entity-header-device">📱 ${this._escapeHtml(entity.deviceName)}</span>` : '';
    const stateChip = col('state') && state
      ? `<span class="entity-header-state">⚡ ${this._escapeHtml(state.state)}${state.attributes?.unit_of_measurement ? ' ' + this._escapeHtml(state.attributes.unit_of_measurement) : ''}</span>` : '';
    const timeChip = col('lastChanged') && state?.last_changed
      ? `<span class="entity-header-time">🕐 ${this._escapeHtml(this._formatTimeDiff(Date.now() - new Date(state.last_changed).getTime()))} ago</span>` : '';
    const hasHeader = deviceChip || stateChip || timeChip;

    const hasBottom = col('checkbox') || col('favorite') || col('actions');

    return `
      <div class="entity-item" data-entity-id="${eid}" data-disabled="${entity.is_disabled ? 'true' : 'false'}">
        ${hasHeader ? `<div class="entity-card-header">${deviceChip}${stateChip}${timeChip}</div>` : ''}
        <div class="entity-card-body">
          ${col('alias') && alias ? `<div class="entity-alias" style="font-size: 13px; color: var(--em-primary); font-weight: 500;">${this._escapeHtml(alias)}</div>` : ''}
          ${col('name') && entity.original_name ? `<div class="entity-name">${this._escapeHtml(entity.original_name)}</div>` : ''}
          ${col('device') && entity.deviceName ? `<div class="entity-device-name">${this._escapeHtml(entity.deviceName)}</div>` : ''}
          ${col('id') ? `<div class="entity-id">${this._escapeHtml(entity.entity_id)}</div>` : ''}
          ${col('tags') && tags.length > 0 ? `<div class="entity-tags-inline" style="margin-top: 6px;">${tags.map(t => `<span class="entity-tag-small">${this._escapeHtml(t)}</span>`).join('')}</div>` : ''}
        </div>
        ${col('status') ? `<span class="entity-badge" style="background: ${entity.is_disabled ? '#f44336' : '#4caf50'} !important;">${entity.is_disabled ? 'Disabled' : 'Enabled'}</span>` : ''}
        ${hasBottom ? `<div class="entity-item-bottom">
          <div class="entity-bottom-left">
            ${col('checkbox') ? `<input type="checkbox" class="entity-checkbox" data-entity-id="${eid}" data-integration="${iid}"${this.selectedEntities.has(entity.entity_id) ? ' checked' : ''}>` : ''}
            ${col('favorite') ? `<button class="favorite-btn ${this.favorites.has(entity.entity_id) ? 'is-favorite' : ''}" data-entity-id="${eid}" title="Toggle favorite">
              ${this.favorites.has(entity.entity_id) ? '★' : '☆'}
            </button>` : ''}
          </div>
          ${col('actions') ? `<div class="entity-actions">
            <button class="icon-btn rename-entity" data-entity-id="${eid}" title="Rename">✎</button>
            <button class="icon-btn enable-entity" data-entity-id="${eid}" title="Enable">✓</button>
            <button class="icon-btn disable-entity" data-entity-id="${eid}" title="Disable">✕</button>
          </div>` : ''}
        </div>` : ''}
      </div>
    `;
  }

  _loadMoreEntities(integrationId, loadAll = false) {
    const integration = (this.data || []).find(int => int.integration === integrationId);
    if (!integration) return;

    const totalEntities = Object.values(integration.devices || {}).reduce(
      (count, device) => count + (device.entities?.length || 0), 0
    );

    if (loadAll) {
      this.visibleEntityCounts[integrationId] = totalEntities;
    } else {
      const currentCount = this.visibleEntityCounts[integrationId] || this.initialLoadCount;
      this.visibleEntityCounts[integrationId] = Math.min(currentCount + this.loadMoreCount, totalEntities);
    }

    this.updateView();
  }

  renderDevice(deviceId, device, integration) {
    const isExpanded = this.expandedDevices.has(deviceId);

    const enabledCount = device.entities.filter(e => !e.is_disabled).length;
    const disabledCount = device.entities.filter(e => e.is_disabled).length;

    return `
      <div class="device-item">
        <div class="device-header" data-device="${this._escapeAttr(deviceId)}">
          <span class="device-name">${this._escapeHtml(this.getDeviceName(deviceId))}</span>
          <span class="device-count">${device.entities.length} entit${device.entities.length !== 1 ? 'ies' : 'y'} (<span style="color: #4caf50">${enabledCount}</span>/<span style="color: #f44336">${disabledCount}</span>)</span>
        </div>
        ${isExpanded ? `
          <div class="entity-list">
            ${device.entities.map(entity => {
              const eid = this._escapeAttr(entity.entity_id);
              const iid = this._escapeAttr(integration);
              return `
              <div class="entity-item" data-entity-id="${eid}">
                <div class="entity-item-top">
                  <div class="checkbox-group">
                    <input type="checkbox" class="entity-checkbox" data-entity-id="${eid}" data-integration="${iid}"${this.selectedEntities.has(entity.entity_id) ? ' checked' : ''}>
                  </div>
                  <button class="favorite-btn ${this.favorites.has(entity.entity_id) ? 'is-favorite' : ''}" data-entity-id="${eid}" title="Toggle favorite">
                    ${this.favorites.has(entity.entity_id) ? '★' : '☆'}
                  </button>
                  <div class="entity-info">
                    ${entity.original_name ? `<div class="entity-name">${this._escapeHtml(entity.original_name)}</div>` : ''}
                    <div class="entity-id">${this._escapeHtml(entity.entity_id)}</div>
                  </div>
                  <span class="entity-badge" style="background: ${entity.is_disabled ? '#f44336' : '#4caf50'} !important;">${entity.is_disabled ? 'Disabled' : 'Enabled'}</span>
                </div>
                <div class="entity-item-bottom">
                  <div class="entity-actions">
                    <button class="icon-btn rename-entity" data-entity-id="${eid}" title="Rename">✎</button>
                    <button class="icon-btn enable-entity" data-entity-id="${eid}" title="Enable">✓</button>
                    <button class="icon-btn disable-entity" data-entity-id="${eid}" title="Disable">✕</button>
                  </div>
                </div>
              </div>`;
            }).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  attachIntegrationListeners() {
    // Smart group headers
    this.content.querySelectorAll('.smart-group-header').forEach(header => {
      header.addEventListener('click', () => {
        const groupKey = header.dataset.smartGroupToggle;
        const expandKey = `smart_${groupKey}`;
        if (this.expandedIntegrations.has(expandKey)) {
          this.expandedIntegrations.delete(expandKey);
        } else {
          this.expandedIntegrations.add(expandKey);
        }
        this.updateView();
      });
    });

    // Integration headers
    this.content.querySelectorAll('.integration-header').forEach(header => {
      header.addEventListener('click', (e) => {
        if (e.target.closest('.integration-select-wrapper')) return;
        const integration = header.dataset.integration;
        if (this.expandedIntegrations.has(integration)) {
          this.expandedIntegrations.delete(integration);
        } else {
          this.expandedIntegrations.add(integration);
        }
        this.updateView();
      });
    });

    // Device headers
    this.content.querySelectorAll('.device-header').forEach(header => {
      header.addEventListener('click', () => {
        const deviceId = header.dataset.device;
        if (this.expandedDevices.has(deviceId)) {
          this.expandedDevices.delete(deviceId);
        } else {
          this.expandedDevices.add(deviceId);
        }
        this.updateView();
      });
    });

    // Integration select-all checkboxes
    this.content.querySelectorAll('.integration-select-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        const integrationId = checkbox.dataset.integration;
        const entityCheckboxes = this.content.querySelectorAll(`.entity-checkbox[data-integration="${integrationId}"]`);
        if (entityCheckboxes.length > 0) {
          // Entities visible in DOM — sync them
          entityCheckboxes.forEach(cb => {
            cb.checked = checkbox.checked;
            if (checkbox.checked) {
              this.selectedEntities.add(cb.dataset.entityId);
            } else {
              this.selectedEntities.delete(cb.dataset.entityId);
            }
          });
        } else {
          // Integration is collapsed — operate on this.data directly, respecting active filters
          const intData = (this.data || []).find(i => i.integration === integrationId);
          if (intData) {
            Object.values(intData.devices).forEach(device => {
              device.entities.forEach(entity => {
                // Respect the active viewState filter
                if (this.viewState === 'disabled' && !entity.is_disabled) return;
                if (this.viewState === 'enabled' && entity.is_disabled) return;
                // Respect the active domain filter
                if (this.selectedDomain && this.selectedDomain !== 'all' &&
                    !entity.entity_id.startsWith(`${this.selectedDomain}.`)) return;
                if (checkbox.checked) {
                  this.selectedEntities.add(entity.entity_id);
                } else {
                  this.selectedEntities.delete(entity.entity_id);
                }
              });
            });
          }
        }
        checkbox.indeterminate = false;
        this.updateSelectedCount();
      });
    });

    // Entity checkboxes
    this.content.querySelectorAll('.entity-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          this.selectedEntities.add(checkbox.dataset.entityId);
        } else {
          this.selectedEntities.delete(checkbox.dataset.entityId);
        }
        this.updateSelectedCount();
        this._updateIntegrationCheckboxState(checkbox.dataset.integration);
      });
    });

    // Enable/Disable buttons
    this.content.querySelectorAll('.rename-entity').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showRenameDialog(btn.dataset.entityId);
      });
    });

    this.content.querySelectorAll('.enable-entity').forEach(btn => {
      btn.addEventListener('click', () => {
        this.enableEntity(btn.dataset.entityId);
      });
    });

    this.content.querySelectorAll('.disable-entity').forEach(btn => {
      btn.addEventListener('click', () => {
        this.disableEntity(btn.dataset.entityId);
      });
    });

    this.content.querySelectorAll('.enable-integration').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const integration = btn.dataset.integration;
        this.showConfirmDialog(
          `Enable all entities in ${integration}?`,
          `Are you sure you want to enable all entities in the ${integration} integration?`,
          () => this.enableIntegration(integration)
        );
      });
    });

    this.content.querySelectorAll('.disable-integration').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const integration = btn.dataset.integration;
        this.showConfirmDialog(
          `Disable all entities in ${integration}?`,
          `Are you sure you want to disable all entities in the ${integration} integration? This may affect automations and dashboards.`,
          () => this.disableIntegration(integration)
        );
      });
    });

    this.content.querySelectorAll('.view-integration-enabled, .view-integration-disabled').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const integration = btn.dataset.integration;
        const filterType = btn.classList.contains('view-integration-enabled') ? 'enabled' : 'disabled';
        const current = this.integrationViewFilter[integration];

        // Toggle: clicking the active filter clears it
        this.integrationViewFilter[integration] = current === filterType ? undefined : filterType;

        // Expand the integration so the entity list is visible
        this.expandedIntegrations.add(integration);

        // Apply immediately via CSS class on the existing container (no full re-render needed)
        const container = this.content.querySelector(`.integration-group[data-integration="${CSS.escape(integration)}"]`);
        if (container) {
          container.classList.remove('em-filter-enabled', 'em-filter-disabled');
          if (this.integrationViewFilter[integration]) {
            container.classList.add(`em-filter-${this.integrationViewFilter[integration]}`);
          }
          // Update button active states within this header
          container.querySelector('.view-integration-enabled')?.classList.toggle('btn-primary', this.integrationViewFilter[integration] === 'enabled');
          container.querySelector('.view-integration-enabled')?.classList.toggle('btn-secondary', this.integrationViewFilter[integration] !== 'enabled');
          container.querySelector('.view-integration-disabled')?.classList.toggle('btn-primary', this.integrationViewFilter[integration] === 'disabled');
          container.querySelector('.view-integration-disabled')?.classList.toggle('btn-secondary', this.integrationViewFilter[integration] !== 'disabled');
        } else {
          // Integration was collapsed — re-render to expand it with the filter applied
          this.updateView();
        }
      });
    });

    // Favorite buttons
    this.content.querySelectorAll('.favorite-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._toggleFavorite(btn.dataset.entityId);
      });
    });
    
    // Click entity card → full detail dialog
    this.content.querySelectorAll('.entity-item').forEach(item => {
      item.style.cursor = 'pointer';
      item.addEventListener('click', (e) => {
        if (e.target.closest('button, input, label')) return;
        const entityId = item.dataset.entityId;
        if (entityId) this._showEntityDetailsDialog(entityId);
      });
    });

    // Context menu on right-click
    this.content.querySelectorAll('.entity-item').forEach(item => {
      item.addEventListener('contextmenu', (e) => {
        const entityId = item.dataset.entityId;
        if (entityId) {
          this._showContextMenu(e, entityId);
        }
      });
    });
    
    // Load More buttons
    this.content.querySelectorAll('.load-more-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._loadMoreEntities(btn.dataset.integration, false);
      });
    });
    
    // Load All buttons
    this.content.querySelectorAll('.load-all-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._loadMoreEntities(btn.dataset.integration, true);
      });
    });
    
    // Drag and drop
    this._attachDragDropListeners();
    
    // State preview on hover
    this._attachStatePreviewListeners();
  }

  updateSelectedCount() {
    if (!this.content) return;
    const selectedCount = this.selectedEntities.size;

    // Update sidebar count badge
    const sidebarCount = this.querySelector('#sidebar-selected-count');
    if (sidebarCount) sidebarCount.textContent = selectedCount || '';

    // Dim/enable selection-dependent sidebar actions
    ['enable-selected', 'disable-selected', 'deselect-all'].forEach(a => {
      const el = this.querySelector(`.em-sidebar [data-action="${a}"]`);
      if (el) {
        el.style.opacity = selectedCount === 0 ? '0.4' : '';
        el.style.pointerEvents = selectedCount === 0 ? 'none' : '';
      }
    });
  }

  async enableEntity(entityId, skipUndo = false) {
    try {
      await this._hass.callWS({
        type: 'entity_manager/enable_entity',
        entity_id: entityId,
      });
      
      // Push undo action (skip when called from undo/redo)
      if (!skipUndo) {
        this._pushUndoAction({
          type: 'enable',
          entityId: entityId
        });
        this._logActivity('enable', { entity: entityId });
      }
      
      this.selectedEntities.delete(entityId);
      this.updateSelectedCount();
      this.loadData();
      if (!skipUndo) this._showToast(`Enabled ${entityId}`);
    } catch (error) {
      this.showErrorDialog(`Error enabling entity: ${error.message}`);
    }
  }

  async disableEntity(entityId, skipUndo = false) {
    try {
      await this._hass.callWS({
        type: 'entity_manager/disable_entity',
        entity_id: entityId,
      });
      
      // Push undo action (skip when called from undo/redo)
      if (!skipUndo) {
        this._pushUndoAction({
          type: 'disable',
          entityId: entityId
        });
        this._logActivity('disable', { entity: entityId });
      }
      
      this.selectedEntities.delete(entityId);
      this.updateSelectedCount();
      this.loadData();
      if (!skipUndo) this._showToast(`Disabled ${entityId}`);
    } catch (error) {
      this.showErrorDialog(`Error disabling entity: ${error.message}`);
    }
  }

  async enableIntegration(integration) {
    const integrationData = this.data.find(int => int.integration === integration);
    if (!integrationData || !integrationData.devices) {
      return;
    }
    
    const entityIds = Object.values(integrationData.devices)
      .flatMap(device => device.entities.map(e => e.entity_id));
    
    if (entityIds.length > 0) {
      await this.bulkEnableEntities(entityIds);
    }
  }

  async disableIntegration(integration) {
    const integrationData = this.data.find(int => int.integration === integration);
    if (!integrationData || !integrationData.devices) {
      return;
    }
    
    const entityIds = Object.values(integrationData.devices)
      .flatMap(device => device.entities.map(e => e.entity_id));
    
    if (entityIds.length > 0) {
      await this.bulkDisable(entityIds);
    }
  }

  async bulkEnable() {
    if (this.selectedEntities.size === 0) {
      this.showErrorDialog('No entities selected');
      return;
    }
    this.setLoading(true);
    try {
      const entityIdsCopy = Array.from(this.selectedEntities);
      await this.bulkEnableEntities(entityIdsCopy);
    } finally {
      this.setLoading(false);
    }
  }

  async bulkDisable(entityIds = null) {
    const toDisable = entityIds || Array.from(this.selectedEntities);
    if (toDisable.length === 0) {
      this.showErrorDialog('No entities selected');
      return;
    }

    this.setLoading(true);
    try {
      await this._hass.callWS({
        type: 'entity_manager/bulk_disable',
        entity_ids: toDisable,
      });
      
      // Push undo action for bulk disable
      this._pushUndoAction({
        type: 'bulk_disable',
        entityIds: [...toDisable],
        undo: async () => await this._hass.callWS({ type: 'entity_manager/bulk_enable', entity_ids: toDisable })
      });
      
      this.selectedEntities.clear();
      this.updateSelectedCount();
      this.loadData();
      this._showToast(`Disabled ${toDisable.length} entities`);
    } catch (error) {
      this.showErrorDialog(`Error disabling entities: ${error.message}`);
    } finally {
      this.setLoading(false);
    }
  }

  async bulkEnableEntities(entityIds) {
    this.setLoading(true);
    try {
      await this._hass.callWS({
        type: 'entity_manager/bulk_enable',
        entity_ids: entityIds,
      });
      
      // Push undo action for bulk enable
      this._pushUndoAction({
        type: 'bulk_enable',
        entityIds: [...entityIds],
        undo: async () => await this._hass.callWS({ type: 'entity_manager/bulk_disable', entity_ids: entityIds })
      });
      
      this.selectedEntities.clear();
      this.updateSelectedCount();
      this.loadData();
      this._showToast(`Enabled ${entityIds.length} entities`);
    } catch (error) {
      this.showErrorDialog(`Error enabling entities: ${error.message}`);
    } finally {
      this.setLoading(false);
    }
  }

  async _loadHaAutoBackup() {
    try {
      const result = await this._hass.callWS({ type: 'hassio/update/config/info' });
      // Response shape: { core_backup_before_update: bool, add_on_backup_before_update: bool }
      if (result && typeof result.core_backup_before_update === 'boolean') {
        this.haAutoBackup = {
          core: result.core_backup_before_update,
          addon: result.add_on_backup_before_update ?? result.core_backup_before_update,
        };
      } else {
        this.haAutoBackup = null;
      }
    } catch {
      this.haAutoBackup = null; // Hassio not available (plain HA Core)
    }
  }

  async _toggleHaAutoBackup() {
    if (this.haAutoBackup === null) return;
    const newVal = !this.haAutoBackup.core;
    try {
      await this._hass.callWS({
        type: 'hassio/update/config/update',
        core_backup_before_update: newVal,
        add_on_backup_before_update: newVal,
      });
      this.haAutoBackup = { core: newVal, addon: newVal };
      // Re-render the whole backup row in place
      const row = this.content?.querySelector('#ha-auto-backup-toggle')?.closest('div[style]');
      if (row) {
        row.style.borderColor = newVal ? '#4caf50' : '#f44336';
        row.style.background = newVal ? 'rgba(76,175,80,0.1)' : 'rgba(244,67,54,0.08)';
        const btn = row.querySelector('#ha-auto-backup-toggle');
        if (btn) {
          btn.textContent = newVal ? 'ON' : 'OFF';
          btn.style.background = newVal ? '#4caf50' : '#f44336';
          btn.style.borderColor = newVal ? '#4caf50' : '#f44336';
        }
        const desc = row.querySelector('span:last-child');
        if (desc) desc.textContent = newVal
          ? 'HA will automatically create a backup before every update'
          : 'No automatic backup will be created before updates';
      }
      this._showToast(`HA auto-backup before updates: ${newVal ? 'enabled' : 'disabled'}`, 'success');
    } catch (err) {
      this._showToast(`Failed to update setting: ${err.message}`, 'error');
    }
  }

  async loadUpdates() {
    this.setLoading(true);
    try {
      // Get all update entities from Home Assistant
      const [states] = await Promise.all([
        this._hass.callWS({ type: 'get_states' }),
        this._loadHaAutoBackup(),
      ]);
      this.updateEntities = states.filter(state => state.entity_id.startsWith('update.'));
      this.renderUpdates();
    } catch (error) {
      console.error('Error loading updates:', error);
      this.showErrorDialog(`Error loading updates: ${error.message}`);
    } finally {
      this.setLoading(false);
    }
  }

  renderUpdates() {
    const content = this.content.querySelector('#content');
    if (!content) return;

    // Filter updates based on selected filter
    let filteredUpdates = this.updateEntities;
    
    if (this.updateFilter === 'available') {
      filteredUpdates = this.updateEntities.filter(update => update.state === 'on');
    } else if (this.updateFilter === 'stable') {
      filteredUpdates = this.updateEntities.filter(update => {
        const latestVersion = update.attributes.latest_version || '';
        return !latestVersion.toLowerCase().includes('beta') && 
               !latestVersion.toLowerCase().includes('rc') &&
               !latestVersion.toLowerCase().includes('dev');
      });
    } else if (this.updateFilter === 'beta') {
      filteredUpdates = this.updateEntities.filter(update => {
        const latestVersion = update.attributes.latest_version || '';
        return latestVersion.toLowerCase().includes('beta') || 
               latestVersion.toLowerCase().includes('rc') ||
               latestVersion.toLowerCase().includes('dev');
      });
    }

    // Apply device/integration type filter.
    // HA sets device_class (e.g. 'firmware') on hardware updates; software/integration
    // updates leave device_class unset — use this as the sole discriminator.
    if (this.selectedUpdateType === 'device') {
      filteredUpdates = filteredUpdates.filter(update => !!update.attributes.device_class);
    } else if (this.selectedUpdateType === 'integration') {
      filteredUpdates = filteredUpdates.filter(update => !update.attributes.device_class);
    }
    
    // Apply search filter
    if (this.searchTerm) {
      filteredUpdates = filteredUpdates.filter(update => {
        const title = (update.attributes.title || update.attributes.friendly_name || update.entity_id).toLowerCase();
        return title.includes(this.searchTerm);
      });
    }

    // Hide up-to-date items if checkbox is checked
    if (this.hideUpToDate) {
      filteredUpdates = filteredUpdates.filter(update => update.state === 'on');
    }

    // Sort updates alphabetically by title
    filteredUpdates.sort((a, b) => {
      const aTitle = (a.attributes.title || a.attributes.friendly_name || a.entity_id).toLowerCase();
      const bTitle = (b.attributes.title || b.attributes.friendly_name || b.entity_id).toLowerCase();
      return aTitle.localeCompare(bTitle, undefined, { sensitivity: 'base' });
    });

    if (filteredUpdates.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <h2>No Updates Available</h2>
          <p>All systems are up to date!</p>
        </div>
      `;
      return;
    }

    const availableUpdates = filteredUpdates.filter(u => u.state === 'on');
    const backupSupportedCount = availableUpdates.filter(u => !!(u.attributes.supported_features & 8)).length;

    const haBackupRow = this.haAutoBackup !== null ? (() => {
      const on = this.haAutoBackup.core;
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;
                    padding:10px 14px;border-radius:10px;margin-top:10px;
                    border:2px solid ${on ? '#4caf50' : '#f44336'};
                    background:${on ? 'rgba(76,175,80,0.1)' : 'rgba(244,67,54,0.08)'}">
          <div style="display:flex;flex-direction:column;gap:2px">
            <span style="font-size:13px;font-weight:600;color:var(--em-text-primary)">🛡 HA Auto-backup before updates</span>
            <span style="font-size:11px;color:var(--em-text-secondary)">
              ${on ? 'HA will automatically create a backup before every update' : 'No automatic backup will be created before updates'}
            </span>
          </div>
          <button id="ha-auto-backup-toggle"
            title="Toggle HA's global backup before update setting"
            style="padding:7px 20px;border-radius:20px;border:2px solid ${on ? '#4caf50' : '#f44336'};
                   background:${on ? '#4caf50' : '#f44336'};color:white;
                   cursor:pointer;font-size:13px;font-weight:700;min-width:64px;flex-shrink:0">
            ${on ? 'ON' : 'OFF'}
          </button>
        </div>`;
    })() : '';

    content.innerHTML = `
      <div class="update-select-all">
        <div class="select-all-pill">
          <label class="select-all-label" for="select-all-updates">
            <input type="checkbox" id="select-all-updates" ${availableUpdates.length === 0 ? 'disabled' : ''}>
            <span>Select All (${availableUpdates.length})</span>
          </label>
          <div class="em-update-expand-wrap">
            <button class="em-update-expand-btn" id="update-selected">
              Update (<span id="update-count">0</span>)
            </button>
          </div>
        </div>
        ${backupSupportedCount > 0 ? `
        <label class="select-all-label" title="Check backup for all entities that support it">
          <input type="checkbox" id="select-all-backups">
          <span>🛡 Backup All (${backupSupportedCount})</span>
        </label>` : ''}
      </div>
      ${haBackupRow}
      <div class="update-list">
        ${filteredUpdates.map(update => this.renderUpdateItem(update)).join('')}
      </div>
    `;

    this.attachUpdateListeners();
  }

  renderUpdateItem(update) {
    const entityId = update.entity_id;
    const title = update.attributes.title || update.attributes.friendly_name || entityId;
    const currentVersion = update.attributes.installed_version || 'Unknown';
    const latestVersion = update.attributes.latest_version || 'Unknown';
    const hasUpdate = update.state === 'on';
    const isBeta = latestVersion.toLowerCase().includes('beta') || 
                   latestVersion.toLowerCase().includes('rc') ||
                   latestVersion.toLowerCase().includes('dev');
    const releaseUrl = update.attributes.release_url || null;
    
    const supportsBackup = hasUpdate && !!(update.attributes.supported_features & 8);

    const updateClasses = ['update-item'];
    if (hasUpdate) updateClasses.push('has-update');
    if (isBeta) updateClasses.push('beta');

    return `
      <div class="${updateClasses.join(' ')}" data-entity-id="${this._escapeAttr(entityId)}">
        <input type="checkbox" class="update-checkbox" data-update-id="${this._escapeAttr(entityId)}" ${!hasUpdate ? 'disabled' : ''}>
        <div class="update-icon">📦</div>
        <div class="update-info">
          <div class="update-title">${this._escapeHtml(title)}</div>
          <div class="update-details">
            <div class="update-version">
              <span>Current:</span>
              <span class="version-badge current">${this._escapeHtml(currentVersion)}</span>
            </div>
            ${hasUpdate ? `
              <div class="update-version">
                <span>→</span>
                <span class="version-badge ${isBeta ? 'beta' : 'latest'}">${this._escapeHtml(latestVersion)}</span>
              </div>
            ` : '<span style="color: var(--em-success);">✓ Up to date</span>'}
          </div>
        </div>
        ${hasUpdate ? `
          <div class="update-actions">
            ${supportsBackup ? `
              <label class="update-btn skip-btn update-backup-label" title="Create a backup before installing this update"
                style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;user-select:none;border-color:var(--em-success);color:var(--em-success)">
                <input type="checkbox" class="update-backup-checkbox" data-entity-id="${this._escapeAttr(entityId)}"
                  style="accent-color:var(--em-success);width:14px;height:14px;cursor:pointer;margin:0">
                <span>🛡 Backup</span>
              </label>` : ''}
            ${releaseUrl ? `<button class="update-btn skip-btn" data-action="release-notes" data-url="${this._escapeAttr(releaseUrl)}" style="border-color:#2196f3;color:#2196f3">Release Notes</button>` : ''}
            <button class="update-btn" data-action="update" data-entity-id="${this._escapeAttr(entityId)}">Update</button>
          </div>
        ` : ''}
      </div>
    `;
  }

  attachUpdateListeners() {
    // HA global auto-backup toggle
    this.content.querySelector('#ha-auto-backup-toggle')?.addEventListener('click', () => {
      this._toggleHaAutoBackup();
    });

    // Handle select all checkbox
    const selectAllCheckbox = this.content.querySelector('#select-all-updates');
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        this.content.querySelectorAll('.update-checkbox:not(:disabled)').forEach(checkbox => {
          checkbox.checked = isChecked;
          const updateId = checkbox.dataset.updateId;
          if (isChecked) {
            this.selectedUpdates.add(updateId);
          } else {
            this.selectedUpdates.delete(updateId);
          }
        });
        this.updateSelectedUpdateCount();
      });
    }

    // Handle select-all-backups checkbox
    const selectAllBackups = this.content.querySelector('#select-all-backups');
    if (selectAllBackups) {
      selectAllBackups.addEventListener('change', (e) => {
        this.content.querySelectorAll('.update-backup-checkbox').forEach(cb => {
          cb.checked = e.target.checked;
        });
      });
    }

    // Handle update checkboxes
    this.content.querySelectorAll('.update-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const updateId = e.target.dataset.updateId;
        if (e.target.checked) {
          this.selectedUpdates.add(updateId);
        } else {
          this.selectedUpdates.delete(updateId);
        }
        this.updateSelectedUpdateCount();
      });
    });

    // Handle individual update buttons
    this.content.querySelectorAll('.update-btn[data-action="update"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const entityId = btn.dataset.entityId;
        
        // Find the update entity to get title and version info
        const updateEntity = this.updateEntities.find(u => u.entity_id === entityId);
        const title = updateEntity?.attributes.title || updateEntity?.attributes.friendly_name || entityId;
        const currentVersion = updateEntity?.attributes.installed_version || 'Unknown';
        const latestVersion = updateEntity?.attributes.latest_version || 'Unknown';
        
        const backupCb = btn.closest('.update-item')?.querySelector('.update-backup-checkbox');
        const doBackup = backupCb?.checked ?? false;
        const backupNote = doBackup ? '\n\n🛡 A backup will be created before installing.' : '';
        this.showConfirmDialog(
          'Confirm Update',
          `Are you sure you want to update ${title} from version ${currentVersion} to ${latestVersion}?${backupNote}`,
          () => this.performUpdate(entityId, doBackup)
        );
      });
    });

    // Handle release notes buttons
    this.content.querySelectorAll('.update-btn[data-action="release-notes"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.open(btn.dataset.url, '_blank');
      });
    });

    // Handle update-selected button (lives inside #content, re-bound each render)
    const updateSelectedBtn = this.content.querySelector('#update-selected');
    if (updateSelectedBtn) {
      updateSelectedBtn.addEventListener('click', () => {
        if (this.selectedUpdates.size === 0) return;
        this.confirmBulkUpdate();
      });
    }
  }

  updateSelectedUpdateCount() {
    const countSpan = this.content?.querySelector('#update-count');
    if (countSpan) countSpan.textContent = this.selectedUpdates.size;
    const wrap = this.content?.querySelector('.em-update-expand-wrap');
    if (wrap) wrap.classList.toggle('is-visible', this.selectedUpdates.size > 0);
  }

  // Switch the update row from indeterminate spinner to a filled SVG progress ring.
  // Called when HA reports update_percentage on the entity during installation.
  _updateRowProgress(entityId, pct) {
    const row = this.content?.querySelector(`.update-item[data-entity-id="${CSS.escape(entityId)}"]`);
    if (!row || !row.classList.contains('is-active')) return;
    const actionsEl = row.querySelector('.update-actions');
    if (!actionsEl) return;

    const circumference = 62.83; // 2π × radius 10
    const offset = (circumference * (1 - pct / 100)).toFixed(2);

    if (actionsEl.querySelector('.em-progress-ring')) {
      // Ring already shown — update dashoffset and percentage text
      const fill = actionsEl.querySelector('.em-ring-fill');
      if (fill) fill.setAttribute('stroke-dashoffset', offset);
      const pctEl = actionsEl.querySelector('.em-update-pct');
      if (pctEl) pctEl.textContent = `${pct}%`;
    } else {
      // Replace indeterminate spinner with determinate SVG ring
      actionsEl.innerHTML = `
        <svg class="em-progress-ring" width="28" height="28" viewBox="0 0 28 28" style="flex-shrink:0">
          <circle cx="14" cy="14" r="10" fill="none" stroke="color-mix(in srgb, var(--em-primary) 25%, transparent)" stroke-width="3"/>
          <circle cx="14" cy="14" r="10" fill="none" stroke="var(--em-primary)" stroke-width="3"
            stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${offset}"
            transform="rotate(-90 14 14)" stroke-linecap="round" class="em-ring-fill"/>
        </svg>
        <span style="font-size:13px;color:var(--em-primary);font-weight:500">
          Updating… <span class="em-update-pct">${pct}%</span>
        </span>`;
    }
  }

  _setUpdateRowState(entityId, state, { backup = false } = {}) {
    const row = this.content?.querySelector(`.update-item[data-entity-id="${CSS.escape(entityId)}"]`);
    if (!row) return;

    row.classList.remove('is-queued', 'is-active', 'is-done', 'is-failed');
    if (!state) return;
    row.classList.add(`is-${state}`);

    const actionsEl = row.querySelector('.update-actions');
    if (!actionsEl) return;

    if (state === 'queued') {
      actionsEl.innerHTML = `<span style="font-size:12px;color:var(--em-text-secondary);padding:8px 12px">⏳ Queued</span>`;
    } else if (state === 'active') {
      actionsEl.innerHTML = `
        <div class="em-update-spinner"></div>
        <span style="font-size:13px;color:var(--em-primary);font-weight:500">
          ${backup ? '🛡 Backing up…' : 'Updating…'}
        </span>`;
    } else if (state === 'done') {
      actionsEl.innerHTML = `<span style="font-size:14px;color:var(--em-success);font-weight:700">✓ Updated</span>`;
    } else if (state === 'failed') {
      actionsEl.innerHTML = `<span style="font-size:14px;color:var(--em-danger);font-weight:700">✕ Failed</span>`;
    }
  }

  async performUpdate(entityId, backup = false) {
    this._setUpdateRowState(entityId, 'active', { backup });
    if (!this._pendingUpdateWatches) this._pendingUpdateWatches = new Set();
    this._pendingUpdateWatches.add(entityId);

    // Fallback: if the entity state never transitions to 'off' within 5 minutes
    // (e.g. HA doesn't push a state update), mark as done anyway.
    const fallbackTimer = setTimeout(() => {
      if (this._pendingUpdateWatches?.has(entityId)) {
        this._pendingUpdateWatches.delete(entityId);
        this._setUpdateRowState(entityId, 'done');
        setTimeout(() => this.loadUpdates(), 2000);
      }
    }, 300000);

    try {
      await this._hass.callService('update', 'install', {
        entity_id: entityId,
        ...(backup && { backup: true }),
      });
      // Service accepted — state watcher in set hass() will detect completion
      // and call _setUpdateRowState(entityId, 'done') + loadUpdates().
    } catch (error) {
      clearTimeout(fallbackTimer);
      this._pendingUpdateWatches?.delete(entityId);
      console.error('Error performing update:', error);
      this._setUpdateRowState(entityId, 'failed');
      this.showErrorDialog(`Error updating ${entityId}: ${error.message}`);
    }
  }

  confirmBulkUpdate() {
    const count = this.selectedUpdates.size;
    const selectedEntityIds = Array.from(this.selectedUpdates);

    // Capture per-entity backup state before dialog opens
    const backupMap = {};
    selectedEntityIds.forEach(entityId => {
      const cb = this.content.querySelector(`.update-backup-checkbox[data-entity-id="${CSS.escape(entityId)}"]`);
      backupMap[entityId] = cb?.checked ?? false;
    });

    const updateList = selectedEntityIds.map(entityId => {
      const update = this.updateEntities.find(u => u.entity_id === entityId);
      const title = update?.attributes.title || update?.attributes.friendly_name || entityId;
      return `• ${title}${backupMap[entityId] ? ' 🛡' : ''}`;
    }).join('\n');

    const backupCount = Object.values(backupMap).filter(Boolean).length;
    const backupNote = backupCount > 0 ? `\n\n🛡 ${backupCount} item${backupCount !== 1 ? 's' : ''} will be backed up before updating.` : '';
    this.showConfirmDialog(
      'Confirm Bulk Update',
      `Are you sure you want to update the following ${count} item${count !== 1 ? 's' : ''}?\n\n${updateList}${backupNote}\n\nThis action cannot be undone.`,
      () => this.performBulkUpdate(backupMap)
    );
  }

  async performBulkUpdate(backupMap = {}) {
    const entityIds = Array.from(this.selectedUpdates);

    this.setLoading(true);

    // Mark all selected rows as queued upfront
    entityIds.forEach(id => this._setUpdateRowState(id, 'queued'));

    // Always sequential — HA backup (whether from our checkbox or HA's global
    // "backup before update" setting) is single-threaded and cannot run in parallel.
    const succeeded = [];
    const failed = [];

    for (let i = 0; i < entityIds.length; i++) {
      const entityId = entityIds[i];
      const backup = !!backupMap[entityId];
      const update = this.updateEntities?.find(u => u.entity_id === entityId);
      const title = update?.attributes?.title || update?.attributes?.friendly_name || entityId;
      const step = `${i + 1}/${entityIds.length}`;

      // Activate this row + show toast
      this._setUpdateRowState(entityId, 'active', { backup });
      this._showToast(
        backup ? `🛡 Backing up & updating ${title} (${step})…` : `⬆ Updating ${title} (${step})…`,
        'info', 0
      );

      try {
        await this._hass.callService('update', 'install', {
          entity_id: entityId,
          ...(backup && { backup: true }),
        });
        this._setUpdateRowState(entityId, 'done');
        succeeded.push(title);
      } catch (err) {
        console.error(`Error updating ${entityId}:`, err);
        this._setUpdateRowState(entityId, 'failed');
        failed.push(title);
      }
    }

    // Final summary toast
    const parts = [];
    if (succeeded.length) parts.push(`✓ ${succeeded.length} updated`);
    if (failed.length) parts.push(`✕ ${failed.length} failed`);
    this._showToast(parts.join(' · '), failed.length ? 'warning' : 'success');

    this.selectedUpdates.clear();
    this.updateSelectedUpdateCount();
    this.setLoading(false);
    setTimeout(() => this.loadUpdates(), 3000);
  }

  _showAllEntitiesDialog() {
    const integrations = this.data || [];

    // Detect raw config entry IDs used as platform names (32-char hex, no underscores/spaces).
    // Real integration names always contain letters outside a-f (e.g. "shelly", "mqtt", "zwave_js")
    // or use underscores. Config entry IDs are purely hexadecimal.
    const isHashId = s => s.length >= 20 && /^[0-9a-f]+$/i.test(s);

    const renderEntityRow = entity => {
      const name = this._escapeHtml(entity.original_name || entity.entity_id);
      const disabled = entity.is_disabled;
      const dot = `<span style="font-size:9px;color:${disabled ? 'var(--em-text-muted, #9e9e9e)' : 'var(--em-success)'}">●</span>`;
      const catBadge = entity.entity_category
        ? `<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:var(--em-bg-secondary);color:var(--em-text-secondary);flex-shrink:0">${this._escapeHtml(entity.entity_category)}</span>`
        : '';
      const disabledBadge = disabled
        ? `<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:rgba(244,67,54,0.1);color:#f44336;flex-shrink:0">disabled</span>`
        : '';
      return `<div class="entity-list-item em-entity-row" style="padding:7px 14px;cursor:pointer"
                   data-entity-id="${this._escapeAttr(entity.entity_id)}">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                  ${dot}
                  <span style="font-weight:600;font-size:13px">${name}</span>
                  <span style="font-size:11px;opacity:0.6;font-family:monospace">${this._escapeHtml(entity.entity_id)}</span>
                  ${catBadge}${disabledBadge}
                </div>
              </div>`;
    };

    const renderIntegration = integ => {
      const integLabel = integ.integration.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const allEntities = Object.values(integ.devices).flatMap(d => d.entities || []);

      const deviceGroupsHtml = Object.entries(integ.devices)
        .filter(([, dev]) => (dev.entities || []).length > 0)
        .sort(([idA, devA], [idB, devB]) => {
          if (idA === 'no_device') return 1;
          if (idB === 'no_device') return -1;
          return (devA.name || '').localeCompare(devB.name || '');
        })
        .map(([devId, dev]) => {
          const devLabel = devId === 'no_device'
            ? 'No Device (Orphaned)'
            : this._escapeHtml(dev.name || 'Unknown Device');

          const entitiesHtml = (dev.entities || [])
            .slice().sort((a, b) => (a.original_name || a.entity_id).localeCompare(b.original_name || b.entity_id))
            .map(renderEntityRow).join('');

          const cnt = dev.entities.length;
          return this._collGroup(
            `<span style="display:flex;align-items:center;gap:8px;flex:1">
              <span>${devLabel}</span>
              <span style="font-size:11px;opacity:0.55">${cnt} ${cnt === 1 ? 'entity' : 'entities'}</span>
            </span>`,
            entitiesHtml
          );
        }).join('');

      return { label: integLabel, count: allEntities.length, html: deviceGroupsHtml };
    };

    let totalCount = 0;
    const namedGroups = [];
    const otherEntities = [];   // collect all entities from hash-named integrations

    for (const integ of integrations) {
      const allEntities = Object.values(integ.devices).flatMap(d => d.entities || []);
      if (!allEntities.length) continue;
      totalCount += allEntities.length;

      if (isHashId(integ.integration)) {
        otherEntities.push(...allEntities);
      } else {
        namedGroups.push(renderIntegration(integ));
      }
    }

    namedGroups.sort((a, b) => a.label.localeCompare(b.label));

    const namedHtml = namedGroups.map(g =>
      this._collGroup(
        `<span style="display:flex;align-items:center;gap:8px;flex:1">
          <span style="font-weight:700">${this._escapeHtml(g.label)}</span>
          <span style="font-size:11px;opacity:0.55">${g.count} ${g.count === 1 ? 'entity' : 'entities'}</span>
        </span>`,
        g.html
      )
    ).join('');

    const otherHtml = otherEntities.length
      ? this._collGroup(
          `<span style="display:flex;align-items:center;gap:8px;flex:1">
            <span style="font-weight:700">Other</span>
            <span style="font-size:11px;opacity:0.55">${otherEntities.length} ${otherEntities.length === 1 ? 'entity' : 'entities'}</span>
          </span>`,
          otherEntities
            .slice().sort((a, b) => (a.original_name || a.entity_id).localeCompare(b.original_name || b.entity_id))
            .map(renderEntityRow).join('')
        )
      : '';

    const { overlay, closeDialog } = this.createDialog({
      title: `All Entities (${totalCount})`,
      color: 'var(--em-primary)',
      extraClass: 'entity-list-dialog',
      contentHtml: `
        <div class="entity-list-content">
          ${namedHtml + otherHtml || '<p style="text-align:center;padding:20px;opacity:0.6">No entities found</p>'}
        </div>`,
      actionsHtml: `<button class="btn btn-secondary" id="close-all-entities">Close</button>`
    });

    overlay.querySelector('#close-all-entities').addEventListener('click', closeDialog);

    overlay.querySelectorAll('.em-collapsible').forEach(header => {
      header.addEventListener('click', () => {
        const body = header.nextElementSibling;
        const arrow = header.querySelector('.em-collapse-arrow');
        const collapsed = body.style.display === 'none';
        body.style.display = collapsed ? '' : 'none';
        if (arrow) arrow.style.transform = collapsed ? '' : 'rotate(-90deg)';
      });
    });

    overlay.querySelectorAll('.em-entity-row[data-entity-id]').forEach(row => {
      row.addEventListener('click', () => this._showEntityDetailsDialog(row.dataset.entityId));
    });
  }

  async _showBrowserModDialog() {
    const bmIntegration = (this.data || []).find(i => i.integration === 'browser_mod');
    if (!bmIntegration) {
      this._showToast('browser_mod integration not found', 'error');
      return;
    }

    const staleThreshold = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // Fetch entity registry once to find config_entry_ids
    let registry = [];
    try {
      registry = await this._hass.callWS({ type: 'config/entity_registry/list' });
    } catch (_) {}

    // Build per-browser info
    const browsers = Object.entries(bmIntegration.devices)
      .filter(([deviceId]) => deviceId !== 'no_device')
      .map(([deviceId, device]) => {
        const entities = device.entities;

        // Last active = most-recent last_changed across all entities
        let lastActive = 0;
        entities.forEach(e => {
          const t = this._hass?.states[e.entity_id]?.last_changed;
          if (t) lastActive = Math.max(lastActive, new Date(t).getTime());
        });

        // Live activity from browser_mod entity states
        const activeEnt = entities.find(e => e.entity_id.startsWith('binary_sensor.') && e.entity_id.endsWith('_active'));
        const visibilityEnt = entities.find(e => e.entity_id.startsWith('sensor.') && e.entity_id.endsWith('_visibility'));
        const pathEnt = entities.find(e => e.entity_id.startsWith('sensor.') && e.entity_id.endsWith('_path'));
        const isActive = activeEnt ? this._hass?.states[activeEnt.entity_id]?.state === 'on' : false;
        const isVisible = visibilityEnt ? this._hass?.states[visibilityEnt.entity_id]?.state === 'visible' : false;
        const currentPath = pathEnt ? this._hass?.states[pathEnt.entity_id]?.state : null;

        // browser_mod browser_id: unique_id of the active binary_sensor is "{browser_id}_active"
        const activeRegEntry = registry.find(r => r.entity_id === activeEnt?.entity_id);
        const browserId = activeRegEntry?.unique_id?.replace(/_active$/, '') ?? null;

        return {
          deviceId,
          name: this.getDeviceName(deviceId) || deviceId,
          entities,
          lastActive,
          isStale: lastActive > 0 && lastActive < staleThreshold,
          neverSeen: lastActive === 0,
          isActive,
          isVisible,
          currentPath,
          browserId,
        };
      })
      .sort((a, b) => {
        // Active first, then visible, then by last activity
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        if (a.isVisible !== b.isVisible) return a.isVisible ? -1 : 1;
        return b.lastActive - a.lastActive;
      });

    const staleIds = browsers.filter(b => (b.isStale || b.neverSeen) && b.browserId).map(b => b.browserId);

    const renderBrowser = (b) => {
      const eid = this._escapeAttr(b.deviceId);
      const lastActiveStr = b.neverSeen ? 'Never seen'
        : b.isStale ? `${this._fmtAgo(new Date(b.lastActive).toISOString())} ⚠ stale`
        : this._fmtAgo(new Date(b.lastActive).toISOString());

      // Status badge: active > visible > stale/never
      let statusBadge = '';
      if (b.isActive) {
        statusBadge = `<span style="background:#4caf50;color:#fff;padding:1px 8px;border-radius:10px;font-size:0.78em;margin-left:6px;vertical-align:middle">● Active</span>`;
      } else if (b.isVisible) {
        statusBadge = `<span style="background:#2196f3;color:#fff;padding:1px 8px;border-radius:10px;font-size:0.78em;margin-left:6px;vertical-align:middle">● Visible</span>`;
      } else if (b.neverSeen) {
        statusBadge = `<span style="background:#ff9800;color:#fff;padding:1px 7px;border-radius:10px;font-size:0.78em;margin-left:6px;vertical-align:middle">never active</span>`;
      } else if (b.isStale) {
        statusBadge = `<span style="background:#ff9800;color:#fff;padding:1px 7px;border-radius:10px;font-size:0.78em;margin-left:6px;vertical-align:middle">stale</span>`;
      }

      const pathHtml = (b.isActive || b.isVisible) && b.currentPath
        ? `<span style="font-size:0.8em;opacity:0.6;flex-basis:100%;margin-top:2px;padding-left:2px">📍 ${this._escapeHtml(b.currentPath)}</span>`
        : '';

      const deregisterBtn = b.browserId
        ? `<button class="btn em-bm-deregister" data-browser-id="${this._escapeAttr(b.browserId)}" data-device-id="${eid}"
              style="background:#f44336;color:#fff;border:none;border-radius:4px;padding:3px 10px;font-size:0.8em;cursor:pointer">Deregister</button>`
        : `<a href="/config/integrations/integration/browser_mod" target="_blank"
              style="font-size:0.8em;color:#2196f3;padding:3px 6px;text-decoration:none">Manage ↗</a>`;

      const browserIdChip = b.browserId
        ? `<span class="em-bm-browser-id-chip" data-browser-id="${this._escapeAttr(b.browserId)}"
              title="Click to view in browser_mod settings"
              style="display:inline-flex;align-items:center;gap:4px;font-family:monospace;font-size:0.75em;
                     background:rgba(128,128,128,0.12);border:1px solid rgba(128,128,128,0.25);
                     border-radius:4px;padding:1px 4px 1px 7px;cursor:pointer;user-select:none;
                     flex-basis:100%;margin-top:4px;max-width:fit-content;opacity:0.8;
                     transition:background 0.2s,border-color 0.2s">
              <span style="opacity:0.6;font-size:0.9em">ID</span>
              <span class="em-bm-id-text">${this._escapeHtml(b.browserId)}</span>
              <span style="opacity:0.4;font-size:0.85em;margin-left:2px">↗</span>
              <button class="em-bm-copy-btn" data-browser-id="${this._escapeAttr(b.browserId)}"
                title="Copy to clipboard"
                style="background:none;border:none;cursor:pointer;padding:1px 5px;font-size:1em;
                       opacity:0.45;line-height:1;border-left:1px solid rgba(128,128,128,0.25);
                       margin-left:4px">⎘</button>
           </span>`
        : '';

      return `
        <div class="entity-list-item" style="padding:10px 12px" data-device-id="${eid}">
          <div class="entity-list-row" style="flex-wrap:wrap;align-items:center;gap:6px">
            <span class="entity-list-name" style="font-weight:600;flex:1;min-width:140px">
              ${this._escapeHtml(b.name)}${statusBadge}
            </span>
            <span class="entity-list-id-inline" style="font-size:0.82em;opacity:0.65;flex:1;min-width:100px">
              ${b.entities.length} entit${b.entities.length !== 1 ? 'ies' : 'y'}
            </span>
            <span style="font-size:0.82em;opacity:0.75;flex:1;min-width:120px">
              Last active: <strong>${lastActiveStr}</strong>
            </span>
            ${browserIdChip}
            ${pathHtml}
            <div style="display:flex;gap:6px;flex-shrink:0">
              <button class="btn btn-secondary em-bm-disable-all" data-device-id="${eid}"
                style="padding:3px 10px;font-size:0.8em">Disable all</button>
              ${deregisterBtn}
            </div>
          </div>
        </div>
      `;
    };

    const staleCount = browsers.filter(b => b.isStale || b.neverSeen).length;
    const infoBar = staleCount > 0 ? `
      <div style="margin-bottom:12px;padding:8px 12px;background:rgba(255,152,0,0.1);border-radius:6px;border:1px solid rgba(255,152,0,0.3);font-size:0.9em">
        ⚠ ${staleCount} browser${staleCount !== 1 ? 's' : ''} with no activity in 7+ days — use "Clean up stale" to deregister them
      </div>` : '';

    const activeCount = browsers.filter(b => b.isActive).length;
    const visibleCount = browsers.filter(b => !b.isActive && b.isVisible).length;
    const activitySuffix = activeCount > 0
      ? ` — ${activeCount} active${visibleCount > 0 ? `, ${visibleCount} visible` : ''}`
      : visibleCount > 0 ? ` — ${visibleCount} visible` : '';

    const { overlay, closeDialog } = this.createDialog({
      title: `browser_mod Browsers (${browsers.length}${activitySuffix})`,
      color: '#2196f3',
      extraClass: 'entity-list-dialog',
      contentHtml: `
        <div class="entity-list-content">
          ${infoBar}
          ${browsers.length === 0
            ? '<p style="text-align:center;padding:24px;opacity:0.6">No registered browsers found.</p>'
            : browsers.map(renderBrowser).join('')}
        </div>`,
      actionsHtml: `
        <div style="display:flex;gap:8px;flex-wrap:wrap;width:100%;align-items:center">
          <div style="display:flex;gap:8px;margin-right:auto;flex-wrap:wrap">
            ${staleIds.length > 0
              ? `<button class="btn" id="em-bm-cleanup-stale" style="background:#ff9800;color:#fff;border:none;border-radius:4px;padding:6px 16px;cursor:pointer">
                   Clean up stale (${staleIds.length})
                 </button>`
              : ''}
            ${(() => {
              const activeBrowser = browsers.find(b => b.isActive && b.browserId);
              const othersWithId = browsers.filter(b => !b.isActive && b.browserId);
              return activeBrowser && othersWithId.length > 0
                ? `<button class="btn" id="em-bm-deregister-others" style="background:#e53935;color:#fff;border:none;border-radius:4px;padding:6px 16px;cursor:pointer">
                     Deregister all but active (${othersWithId.length})
                   </button>`
                : '';
            })()}
          </div>
          <button class="btn btn-secondary" id="close-bm-dialog">Close</button>
        </div>`,
    });

    overlay.querySelector('#close-bm-dialog').addEventListener('click', closeDialog);

    // Chip click → flash + navigate to browser_mod settings
    overlay.querySelectorAll('.em-bm-browser-id-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        chip.style.background = 'rgba(33,150,243,0.18)';
        chip.style.borderColor = 'rgba(33,150,243,0.7)';
        setTimeout(() => {
          closeDialog();
          window.history.pushState(null, '', '/config/integrations/integration/browser_mod');
          window.dispatchEvent(new CustomEvent('location-changed', { bubbles: true, composed: true }));
        }, 220);
      });
    });

    // Copy icon inside chip → copy to clipboard (no navigation)
    overlay.querySelectorAll('.em-bm-copy-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.browserId;
        try {
          await navigator.clipboard.writeText(id);
          const prev = btn.textContent;
          btn.textContent = '✓';
          btn.style.color = '#4caf50';
          btn.style.opacity = '1';
          setTimeout(() => { btn.textContent = prev; btn.style.color = ''; btn.style.opacity = ''; }, 1500);
        } catch (_) {
          this._showToast(`Browser ID: ${id}`, 'info');
        }
      });
    });

    // Disable all entities for a browser
    overlay.querySelectorAll('.em-bm-disable-all').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const deviceId = btn.dataset.deviceId;
        const browser = browsers.find(b => b.deviceId === deviceId);
        if (!browser) return;
        btn.disabled = true;
        btn.textContent = 'Disabling…';
        try {
          for (const entity of browser.entities) {
            await this._hass.callWS({
              type: 'entity_manager/disable_entity',
              entity_id: entity.entity_id,
            });
          }
          this._showToast(`Disabled ${browser.entities.length} entities for ${browser.name}`, 'success');
          btn.textContent = 'Disabled';
        } catch (err) {
          this._showToast(`Failed: ${err.message}`, 'error');
          btn.disabled = false;
          btn.textContent = 'Disable all';
        }
      });
    });

    // Deregister individual browser via browser_mod.deregister_browser service
    overlay.querySelectorAll('.em-bm-deregister').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const browserId = btn.dataset.browserId;
        const deviceId = btn.dataset.deviceId;
        const browser = browsers.find(b => b.deviceId === deviceId);
        if (!confirm(`Deregister browser "${browser?.name}"?\n\nThis removes it from browser_mod. All its entities will be deleted.`)) return;
        btn.disabled = true;
        btn.textContent = 'Deregistering…';
        try {
          await this._hass.callService('browser_mod', 'deregister_browser', { browser_id: browserId });
          btn.closest('.entity-list-item')?.remove();
          this._showToast(`Deregistered ${browser?.name}`, 'success');
          this.loadData();
        } catch (err) {
          this._showToast(`Deregister failed: ${err.message}`, 'error');
          btn.disabled = false;
          btn.textContent = 'Deregister';
        }
      });
    });

    // Clean up all stale browsers at once
    const cleanupBtn = overlay.querySelector('#em-bm-cleanup-stale');
    if (cleanupBtn) {
      cleanupBtn.addEventListener('click', async () => {
        if (!confirm(`Deregister ${staleIds.length} stale browser${staleIds.length !== 1 ? 's' : ''}?\n\nAll browsers with no activity in 7+ days will be removed.`)) return;
        cleanupBtn.disabled = true;
        cleanupBtn.textContent = 'Cleaning up…';
        try {
          await this._hass.callService('browser_mod', 'deregister_browser', { browser_id: staleIds });
          this._showToast(`Deregistered ${staleIds.length} stale browser${staleIds.length !== 1 ? 's' : ''}`, 'success');
          closeDialog();
          this.loadData();
        } catch (err) {
          this._showToast(`Cleanup failed: ${err.message}`, 'error');
          cleanupBtn.disabled = false;
          cleanupBtn.textContent = `Clean up stale (${staleIds.length})`;
        }
      });
    }

    // Deregister all but the currently active browser
    const deregOthersBtn = overlay.querySelector('#em-bm-deregister-others');
    if (deregOthersBtn) {
      const activeBrowser = browsers.find(b => b.isActive && b.browserId);
      const otherIds = browsers.filter(b => !b.isActive && b.browserId).map(b => b.browserId);
      deregOthersBtn.addEventListener('click', async () => {
        if (!confirm(`Deregister ${otherIds.length} browser${otherIds.length !== 1 ? 's' : ''}?\n\nKeeps "${activeBrowser?.name}" and removes everything else.`)) return;
        deregOthersBtn.disabled = true;
        deregOthersBtn.textContent = 'Deregistering…';
        try {
          await this._hass.callService('browser_mod', 'deregister_browser', { browser_id: otherIds });
          this._showToast(`Deregistered ${otherIds.length} browser${otherIds.length !== 1 ? 's' : ''}`, 'success');
          closeDialog();
          this.loadData();
        } catch (err) {
          this._showToast(`Deregister failed: ${err.message}`, 'error');
          deregOthersBtn.disabled = false;
          deregOthersBtn.textContent = `Deregister all but active (${otherIds.length})`;
        }
      });
    }
  }

  async showEntityListDialog(type) {
    let title = '';
    let entities = [];
    let color = '';
    let allowToggle = false;
    let groupedHtml = '';

    try {
      if (type === 'integration') {
        title = 'Integrations';
        color = '#2196f3';
        const integrationItems = (this.data || []).map(integration => {
          let entityCount = 0;
          Object.values(integration.devices).forEach(device => {
            entityCount += device.entities.length;
          });
          return {
            id: integration.integration,
            name: integration.integration.charAt(0).toUpperCase() + integration.integration.slice(1),
            meta: `${Object.keys(integration.devices).length} device${Object.keys(integration.devices).length !== 1 ? 's' : ''} • ${entityCount} entit${entityCount !== 1 ? 'ies' : 'y'}`
          };
        });
        entities = integrationItems;
      } else if (type === 'device') {
        title = 'Devices';
        color = '#4caf50';
        const deviceGroups = (this.data || []).map(integration => {
          const devices = Object.entries(integration.devices).map(([deviceId, device]) => ({
            id: deviceId,
            name: this.getDeviceName(deviceId),
            meta: `${device.entities.length} entit${device.entities.length !== 1 ? 'ies' : 'y'}`
          }));
          return { integration: integration.integration, devices };
        }).filter(group => group.devices.length > 0);

        entities = deviceGroups.flatMap(group => group.devices.map(device => ({
          id: device.id,
          name: device.name
        })));

        // Mark duplicates — same deviceId appearing under multiple integrations
        const seenDeviceIds = new Set();
        let dupCount = 0;

        const deviceListHtml = deviceGroups.map(group => {
          const groupTitle = group.integration.charAt(0).toUpperCase() + group.integration.slice(1);
          const items = group.devices.map(d => {
            const isDup = seenDeviceIds.has(d.id);
            if (!isDup) seenDeviceIds.add(d.id); else dupCount++;
            return `
              <div class="entity-list-item${isDup ? ' em-device-dup' : ''}" data-device-id="${this._escapeAttr(d.id)}">
                <div class="entity-list-row">
                  <span class="entity-list-name">${this._escapeHtml(d.name)}</span>
                  <span class="entity-list-id-inline">${this._escapeHtml(d.id)}</span>
                  ${d.meta ? `<span class="entity-list-id-inline">${this._escapeHtml(d.meta)}</span>` : ''}
                  ${isDup ? '<span style="background:#ff9800;color:#fff;padding:1px 6px;border-radius:10px;font-size:0.78em;margin-left:6px;vertical-align:middle">duplicate</span>' : ''}
                </div>
              </div>
            `;
          }).join('');
          return `
            <div class="entity-list-group">
              <div class="entity-list-group-title">${this._escapeHtml(groupTitle)}</div>
              ${items}
            </div>
          `;
        }).join('');

        const dupFilterBar = dupCount > 0 ? `
          <div style="margin-bottom:12px;display:flex;align-items:center;gap:10px;padding:8px 12px;background:rgba(255,152,0,0.1);border-radius:6px;border:1px solid rgba(255,152,0,0.3)">
            <span style="font-size:0.9em;flex:1;opacity:0.85">
              ${dupCount} duplicate ${dupCount === 1 ? 'entry' : 'entries'} — same device shared across multiple integrations
            </span>
            <button class="btn btn-secondary" id="em-device-dup-toggle" style="font-size:0.82em;padding:3px 12px">
              Show duplicates
            </button>
          </div>
        ` : '';

        groupedHtml = dupFilterBar + deviceListHtml;
      } else if (type === 'entity') {
        title = 'Entities';
        color = '#ff9800';
        const entityItems = [];
        (this.data || []).forEach(integration => {
          Object.entries(integration.devices).forEach(([deviceId, device]) => {
            device.entities.forEach(entity => {
              entityItems.push({
                id: entity.entity_id,
                name: entity.original_name || entity.entity_id,
                meta: `${this.getDeviceName(deviceId)} • ${integration.integration}`
              });
            });
          });
        });
        entities = entityItems;
      } else {
        const states = await this._hass.callWS({ type: 'get_states' });
        

        if (type === 'automation') {
          title = 'Automations';
          color = '#2196f3';
          allowToggle = false; // handled inline

          try {
            const automations = await this._hass.callWS({ type: 'entity_manager/get_automations' });
            const autoBody = automations.map(a => {
              const st = this._hass?.states[a.entity_id];
              const attrs = st?.attributes || {};
              const rows = [
                ['State',         a.state === 'on' ? 'Enabled' : 'Disabled'],
                ['Last triggered', a.last_triggered ? this._fmtAgo(a.last_triggered) : 'Never'],
                ['Triggered by',  null, this._triggerBadge(a)],
                ['Last changed',  st?.last_changed ? this._fmtAgo(st.last_changed) : null],
                ['Mode',          attrs.mode || null],
                ['Current runs',  attrs.current != null ? String(attrs.current) : null],
                ['Max runs',      attrs.max != null ? String(attrs.max) : null],
              ].filter(r => r[1] != null || r[2] != null);
              const infoHtml = rows.map(([label, val, raw]) =>
                `<span style="white-space:nowrap">${label}: <strong>${raw || this._escapeHtml(val)}</strong></span>`
              ).join('');
              return this._renderManagedItem({
                entity_id: a.entity_id,
                name: a.name,
                state: a.state,
                entityType: 'automation',
                stateBadgeHtml: `<span style="background:${a.state === 'on' ? '#4caf50' : '#9e9e9e'};color:#fff;padding:1px 8px;border-radius:10px;font-size:0.8em;margin-left:6px;vertical-align:middle">${a.state === 'on' ? 'On' : 'Off'}</span>`,
                infoHtml,
              });
            }).join('');
            groupedHtml = this._collGroup(`Automations (${automations.length})`, autoBody);
            entities = automations.map(a => ({ id: a.entity_id, name: a.name, state: a.state }));
          } catch (e) {
            entities = states.filter(s => s.entity_id.startsWith('automation.'))
              .map(s => ({ id: s.entity_id, name: s.attributes.friendly_name || s.entity_id, state: s.state }));
          }
        } else if (type === 'script') {
          title = 'Scripts';
          color = '#ff9800';
          allowToggle = false; // handled inline

          const scriptStates = states.filter(s => s.entity_id.startsWith('script.'));
          const scriptBody = scriptStates.map(s => {
            const isRunning = s.state === 'on';
            const attrs = s.attributes;
            const lastTriggered = attrs.last_triggered;
            const mode = attrs.mode || 'single';
            const rows = [
              ['State',        isRunning ? 'Running' : 'Idle'],
              ['Last run',     lastTriggered ? this._fmtAgo(lastTriggered) : 'Never'],
              ['Mode',         mode],
              ['Current runs', attrs.current != null ? String(attrs.current) : null],
              ['Max runs',     attrs.max != null ? String(attrs.max) : null],
              ['Last changed', s.last_changed ? this._fmtAgo(s.last_changed) : null],
            ].filter(r => r[1] != null);
            const infoHtml = rows.map(([label, val]) =>
              `<span style="white-space:nowrap">${label}: <strong>${this._escapeHtml(val)}</strong></span>`
            ).join('');
            return this._renderManagedItem({
              entity_id: s.entity_id,
              name: attrs.friendly_name || s.entity_id,
              state: s.state,
              entityType: 'script',
              stateBadgeHtml: `<span style="background:${isRunning ? '#ff9800' : '#9e9e9e'};color:#fff;padding:1px 8px;border-radius:10px;font-size:0.8em;margin-left:6px;vertical-align:middle">${isRunning ? 'Running' : 'Idle'}</span>`,
              infoHtml,
            });
          }).join('');
          groupedHtml = scriptStates.length
            ? this._collGroup(`Scripts (${scriptStates.length})`, scriptBody)
            : '<p style="text-align:center;padding:24px;opacity:0.6">No scripts found.</p>';
          entities = scriptStates.map(s => ({ id: s.entity_id, name: s.attributes.friendly_name || s.entity_id, state: s.state }));

        } else if (type === 'helper') {
          title = 'Helpers';
          color = '#9c27b0';
          allowToggle = false; // handled inline

          const helperDomains = ['input_boolean', 'input_number', 'input_text', 'input_select',
            'input_datetime', 'input_button', 'counter', 'timer', 'variable'];
          const helperStates = states.filter(s => helperDomains.some(d => s.entity_id.startsWith(d + '.')));

          const byDomain = {};
          helperStates.forEach(s => {
            const domain = s.entity_id.split('.')[0];
            if (!byDomain[domain]) byDomain[domain] = [];
            byDomain[domain].push(s);
          });

          const renderHelperItem = (s) => {
            const domain = s.entity_id.split('.')[0];
            const attrs = s.attributes;
            const isBoolean = domain === 'input_boolean';
            const unit = attrs.unit_of_measurement ? ` ${this._escapeHtml(attrs.unit_of_measurement)}` : '';
            const stateColor = isBoolean ? (s.state === 'on' ? '#4caf50' : '#9e9e9e') : '#9c27b0';
            const stateText = isBoolean ? (s.state === 'on' ? 'On' : 'Off') : this._escapeHtml(s.state) + unit;

            // Build domain-specific info rows
            const rows = [['Value', this._escapeHtml(s.state) + unit]];
            if (domain === 'input_number') {
              if (attrs.min != null) rows.push(['Min', String(attrs.min)]);
              if (attrs.max != null) rows.push(['Max', String(attrs.max)]);
              if (attrs.step != null) rows.push(['Step', String(attrs.step)]);
              if (attrs.mode) rows.push(['Mode', attrs.mode]);
            } else if (domain === 'input_text') {
              if (attrs.min != null) rows.push(['Min length', String(attrs.min)]);
              if (attrs.max != null) rows.push(['Max length', String(attrs.max)]);
              if (attrs.pattern) rows.push(['Pattern', attrs.pattern]);
              if (attrs.mode) rows.push(['Mode', attrs.mode]);
            } else if (domain === 'input_select') {
              if (attrs.options?.length) rows.push(['Options', attrs.options.join(', ')]);
            } else if (domain === 'input_datetime') {
              if (attrs.has_date != null) rows.push(['Has date', attrs.has_date ? 'Yes' : 'No']);
              if (attrs.has_time != null) rows.push(['Has time', attrs.has_time ? 'Yes' : 'No']);
            } else if (domain === 'counter') {
              if (attrs.initial != null) rows.push(['Initial', String(attrs.initial)]);
              if (attrs.step != null) rows.push(['Step', String(attrs.step)]);
              if (attrs.min != null) rows.push(['Min', String(attrs.min)]);
              if (attrs.max != null) rows.push(['Max', String(attrs.max)]);
            } else if (domain === 'timer') {
              if (attrs.duration) rows.push(['Duration', attrs.duration]);
              if (attrs.remaining) rows.push(['Remaining', attrs.remaining]);
              if (attrs.finishes_at) rows.push(['Finishes at', attrs.finishes_at]);
            }
            rows.push(['Last changed', this._fmtAgo(s.last_changed)]);

            const infoHtml = rows.map(([label, val]) =>
              `<span style="white-space:nowrap">${label}: <strong>${this._escapeHtml(String(val))}</strong></span>`
            ).join('');

            return this._renderManagedItem({
              entity_id: s.entity_id,
              name: attrs.friendly_name || s.entity_id,
              state: isBoolean ? s.state : 'off',
              entityType: 'helper',
              stateBadgeHtml: `<span style="background:${stateColor};color:#fff;padding:1px 8px;border-radius:10px;font-size:0.8em;margin-left:6px;vertical-align:middle">${stateText}</span>`,
              infoHtml,
            });
          };

          if (helperStates.length === 0) {
            groupedHtml = '<p style="text-align:center;padding:24px;opacity:0.6">No helpers found.</p>';
          } else {
            groupedHtml = Object.entries(byDomain).sort().map(([domain, items]) => {
              const domainLabel = domain.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              return this._collGroup(`${domainLabel} (${items.length})`, items.map(renderHelperItem).join(''));
            }).join('');
          }
          entities = helperStates.map(s => ({ id: s.entity_id, name: s.attributes.friendly_name || s.entity_id, state: s.state }));
        } else if (type === 'template') {
          title = 'Templates';
          color = '#ff9800';
          allowToggle = false;

          try {
            const templateList = this.templateSensors || await this._hass.callWS({ type: 'entity_manager/get_template_sensors' });
            this.templateSensors = templateList;

            // Enrich each template with last_real_changed from recorder history.
            // This survives restarts: templates briefly go unknown on restart, which
            // resets last_changed. We scan history (oldest→newest) ignoring
            // unknown/unavailable to find when the real value last actually changed.
            try {
              const start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
              const historyResult = await this._hass.callWS({
                type: 'history/history_during_period',
                start_time: start,
                entity_ids: templateList.map(t => t.entity_id),
                minimal_response: true,
                no_attributes: true,
              });
              for (const t of templateList) {
                const history = historyResult?.[t.entity_id] || [];
                let lastRealValue = null;
                let lastRealChangeTime = null;
                for (const entry of history) {
                  const s = entry.s !== undefined ? entry.s : entry.state;
                  const lc = entry.lc !== undefined ? entry.lc : entry.last_changed;
                  if (!s || s === 'unknown' || s === 'unavailable') continue;
                  if (s !== lastRealValue) {
                    lastRealValue = s;
                    // lc can be a unix timestamp (number) or ISO string
                    lastRealChangeTime = typeof lc === 'number'
                      ? new Date(lc * 1000).toISOString()
                      : lc;
                  }
                }
                if (lastRealChangeTime) t.last_real_changed = lastRealChangeTime;
              }
            } catch (_histErr) {
              // Recorder not available — fall back to last_changed
            }

            const _stateDisplay = (t) => {
              const s = t.state;
              if (s === null || s === undefined || s === '')
                return t.disabled
                  ? `<span style="color:#f44336">No state (disabled)</span>`
                  : `<span style="opacity:0.5">—</span>`;
              if (s === 'unknown')
                return `<span style="color:#ff9800" title="Template has not been evaluated yet">Not evaluated</span>`;
              if (s === 'unavailable')
                return `<span style="color:#f44336" title="A dependency is offline or the template has an error">Unavailable</span>`;
              const uom = t.unit_of_measurement ? ` ${this._escapeHtml(t.unit_of_measurement)}` : '';
              return `<span>${this._escapeHtml(String(s))}${uom}</span>`;
            };

            const renderTemplateItem = (t) => {
              const disabledBadge = t.disabled
                ? `<span style="background:#f44336;color:#fff;padding:1px 6px;border-radius:10px;font-size:0.78em;margin-left:6px;vertical-align:middle">disabled</span>`
                : '';
              const connectedHtml = t.connected_entities && t.connected_entities.length > 0
                ? `<div style="margin-top:5px;font-size:0.82em;opacity:0.75">Connected to: ${t.connected_entities.map(e => `<span style="color:#2196f3">${this._escapeHtml(e)}</span>`).join(', ')}</div>`
                : '';
              const entityIdAttr = this._escapeHtml(t.entity_id);
              const currentName = this._escapeHtml(t.name || '');
              return `
                <div class="entity-list-item" style="padding:10px 12px">
                  <div class="entity-list-row" style="flex-wrap:wrap;align-items:center;gap:6px">
                    <span class="entity-list-name" style="font-weight:600;flex:1;min-width:0">${this._escapeHtml(t.name || t.entity_id)}${disabledBadge}</span>
                    <span class="entity-list-id-inline" style="font-size:0.82em;opacity:0.7;flex:1;min-width:0">${entityIdAttr}</span>
                    <div style="display:flex;gap:6px;flex-shrink:0">
                      <button class="em-tpl-edit btn btn-secondary" data-entity-id="${entityIdAttr}" data-current-name="${currentName}" style="padding:2px 10px;font-size:0.8em">Rename</button>
                      <button class="em-tpl-remove btn" data-entity-id="${entityIdAttr}" style="padding:2px 10px;font-size:0.8em;background:#f44336;color:#fff;border:none;border-radius:4px;cursor:pointer">Remove</button>
                    </div>
                  </div>
                  <div style="font-size:0.88em;margin-top:5px;display:flex;gap:16px;flex-wrap:wrap;opacity:0.9">
                    <span>State: <strong>${_stateDisplay(t)}</strong></span>
                    <span>Last active: <strong>${this._fmtAgo(t.last_real_changed || t.last_changed, 'Unknown')}</strong></span>
                    <span>Triggered by: <strong>${this._triggerBadge(t)}</strong></span>
                  </div>
                  ${connectedHtml}
                </div>
              `;
            };

            // Group by domain (sensor, binary_sensor, template, etc.)
            const byDomain = {};
            templateList.forEach(t => {
              const domain = t.entity_id.split('.')[0];
              if (!byDomain[domain]) byDomain[domain] = [];
              byDomain[domain].push(t);
            });

            if (Object.keys(byDomain).length === 0) {
              groupedHtml = '<p style="text-align:center;padding:24px;opacity:0.6">No template sensors found.</p>';
            } else {
              groupedHtml = Object.entries(byDomain).sort().map(([domain, items]) => {
                const domainLabel = domain.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                return this._collGroup(`${domainLabel} (${items.length})`, items.map(renderTemplateItem).join(''));
              }).join('');
            }

            entities = templateList.map(t => ({ id: t.entity_id, name: t.name || t.entity_id }));
          } catch (e) {
            // Fallback to simple state-based list
            entities = states.filter(s => s.entity_id.startsWith('template.'))
              .map(s => ({
                id: s.entity_id,
                name: s.attributes.friendly_name || s.entity_id,
                state: s.state
              }));
          }
        } else if (type === 'updates') {
          title = 'Pending Updates';
          color = '#ff9800';
          allowToggle = false;

          const updateEntities = states.filter(s => s.entity_id.startsWith('update.') && s.state === 'on');
          if (updateEntities.length === 0) {
            groupedHtml = '<p style="text-align:center;padding:24px;opacity:0.6">Everything is up to date!</p>';
          } else {
            groupedHtml = `
              <div class="entity-list-group">
                <div class="entity-list-group-title">Pending Updates (${updateEntities.length})</div>
                ${updateEntities.map(s => {
                  const inst = s.attributes.installed_version || '?';
                  const latest = s.attributes.latest_version || '?';
                  const label = s.attributes.friendly_name || s.entity_id;
                  const releaseUrl = s.attributes.release_url || '';
                  return `
                    <div class="entity-list-item" style="padding:10px 12px">
                      <div class="entity-list-row" style="flex-wrap:wrap;align-items:center">
                        <span class="entity-list-name" style="font-weight:600">${this._escapeHtml(label)}</span>
                        <span class="entity-list-id-inline" style="font-size:0.82em;opacity:0.7">${this._escapeHtml(s.entity_id)}</span>
                      </div>
                      <div style="font-size:0.88em;margin-top:5px;display:flex;gap:16px;flex-wrap:wrap;opacity:0.9">
                        <span>Installed: <strong>${this._escapeHtml(inst)}</strong></span>
                        <span>Latest: <strong style="color:#4caf50">${this._escapeHtml(latest)}</strong></span>
                        ${releaseUrl ? `<a href="${this._escapeAttr(releaseUrl)}" target="_blank" rel="noopener" style="color:#2196f3">Release notes</a>` : ''}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `;
          }
          entities = updateEntities.map(s => ({ id: s.entity_id, name: s.attributes.friendly_name || s.entity_id }));

        } else if (type === 'unavailable') {
          title = 'Unavailable Entities';
          color = '#f44336';
          allowToggle = false;

          const unavailEntities = states.filter(s => s.state === 'unavailable');
          const unavailByDomain = {};
          unavailEntities.forEach(s => {
            const d = s.entity_id.split('.')[0];
            if (!unavailByDomain[d]) unavailByDomain[d] = [];
            unavailByDomain[d].push(s);
          });

          if (unavailEntities.length === 0) {
            groupedHtml = '<p style="text-align:center;padding:24px;opacity:0.6">All entities are reachable!</p>';
          } else {
            groupedHtml = Object.entries(unavailByDomain).sort().map(([domain, items]) => {
              const domainLabel = domain.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              const body = items.map(s => `
                <div class="entity-list-item" style="padding:10px 12px">
                  <div class="entity-list-row" style="flex-wrap:wrap;align-items:center">
                    <span class="entity-list-name" style="font-weight:600">${this._escapeHtml(s.attributes.friendly_name || s.entity_id)}</span>
                    <span class="entity-list-id-inline" style="font-size:0.82em;opacity:0.7">${this._escapeHtml(s.entity_id)}</span>
                  </div>
                  <div style="font-size:0.88em;margin-top:4px;opacity:0.8">
                    Unavailable since: <strong style="color:#f44336">${this._fmtAgo(s.last_changed, 'Unknown')}</strong>
                  </div>
                </div>
              `).join('');
              return this._collGroup(`${domainLabel} (${items.length})`, body);
            }).join('');
          }
          entities = unavailEntities.map(s => ({ id: s.entity_id, name: s.attributes.friendly_name || s.entity_id }));

        } else if (type === 'orphaned') {
          title = 'Orphaned Entities (No Device)';
          color = '#ff9800';
          allowToggle = false;

          const orphanedByIntegration = {};
          (this.data || []).forEach(integration => {
            const noDevice = integration.devices['no_device'];
            if (noDevice && noDevice.entities.length > 0) {
              orphanedByIntegration[integration.integration] = noDevice.entities;
            }
          });

          if (Object.keys(orphanedByIntegration).length === 0) {
            groupedHtml = '<p style="text-align:center;padding:24px;opacity:0.6">No orphaned entities found.</p>';
          } else {
            groupedHtml = Object.entries(orphanedByIntegration).sort().map(([integ, items]) => {
              const integLabel = integ.charAt(0).toUpperCase() + integ.slice(1);
              const body = items.map(e => `
                <div class="entity-list-item" style="padding:10px 12px">
                  <div class="entity-list-row" style="flex-wrap:wrap;align-items:center">
                    <span class="entity-list-name" style="font-weight:600">${this._escapeHtml(e.original_name || e.entity_id)}</span>
                    <span class="entity-list-id-inline" style="font-size:0.82em;opacity:0.7">${this._escapeHtml(e.entity_id)}</span>
                    ${e.is_disabled ? '<span style="background:#f44336;color:#fff;padding:1px 6px;border-radius:10px;font-size:0.78em;margin-left:6px">disabled</span>' : ''}
                  </div>
                </div>
              `).join('');
              return this._collGroup(`${integLabel} (${items.length})`, body);
            }).join('');
          }
          entities = Object.values(orphanedByIntegration).flat().map(e => ({ id: e.entity_id, name: e.original_name || e.entity_id }));

        } else if (type === 'health') {
          title = 'Stale Entities (No update in 30+ days)';
          color = '#ff9800';
          allowToggle = false;

          const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
          const staleEntities = states.filter(s => {
            if (s.state === 'unavailable' || s.state === 'unknown') return false;
            if (!s.last_updated) return false;
            return new Date(s.last_updated).getTime() < thirtyDaysAgo;
          });

          const staleByDomain = {};
          staleEntities.forEach(s => {
            const d = s.entity_id.split('.')[0];
            if (!staleByDomain[d]) staleByDomain[d] = [];
            staleByDomain[d].push(s);
          });

          if (staleEntities.length === 0) {
            groupedHtml = '<p style="text-align:center;padding:24px;opacity:0.6">All entities are reporting regularly.</p>';
          } else {
            groupedHtml = Object.entries(staleByDomain).sort().map(([domain, items]) => {
              const domainLabel = domain.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              const body = items.map(s => `
                <div class="entity-list-item" style="padding:10px 12px">
                  <div class="entity-list-row" style="flex-wrap:wrap;align-items:center">
                    <span class="entity-list-name" style="font-weight:600">${this._escapeHtml(s.attributes.friendly_name || s.entity_id)}</span>
                    <span class="entity-list-id-inline" style="font-size:0.82em;opacity:0.7">${this._escapeHtml(s.entity_id)}</span>
                  </div>
                  <div style="font-size:0.88em;margin-top:4px;opacity:0.8;display:flex;gap:16px">
                    <span>State: <strong>${this._escapeHtml(String(s.state))}</strong></span>
                    <span>Last updated: <strong style="color:#ff9800">${this._fmtAgo(s.last_updated, 'Unknown')}</strong></span>
                  </div>
                </div>
              `).join('');
              return this._collGroup(`${domainLabel} (${items.length})`, body);
            }).join('');
          }
          entities = staleEntities.map(s => ({ id: s.entity_id, name: s.attributes.friendly_name || s.entity_id }));

        } else if (type === 'hacs') {
          title = 'HACS Store';
          color = '#4caf50';
          allowToggle = false;

          try {
            const hacsItems = this.hacsItems || await this._hass.callWS({ type: 'entity_manager/list_hacs_items' });
            this.hacsItems = hacsItems;
            const store = hacsItems?.store || [];
            const installedNames = new Set((hacsItems?.installed_names || []).map(n => n.toLowerCase()));
            const cutoffDays = hacsItems?.cutoff_days || 7;

            // Category metadata: id matches what hacs.data uses
            const filters = [
              { id: 'all',         label: 'All' },
              { id: 'integration', label: 'Integrations' },
              { id: 'plugin',      label: 'Plugins' },
              { id: 'theme',       label: 'Themes' },
              { id: 'appdaemon',   label: 'AppDaemon' },
              { id: 'template',    label: 'Templates' },
            ];

            // Count per category
            const catCounts = {};
            store.forEach(item => {
              const cat = item.category || 'unknown';
              catCounts[cat] = (catCounts[cat] || 0) + 1;
            });
            const totalCount = store.length;
            const newCount = store.filter(i => i.new).length;
            const installedCount = store.filter(i => installedNames.has((i.name || '').toLowerCase())).length;

            const filtersHtml = filters.map(f => {
              const count = f.id === 'all' ? totalCount : (catCounts[f.id] || 0);
              return `<button class="btn btn-secondary hacs-filter-btn" data-hacs-filter="${f.id}">${this._escapeHtml(f.label)} <span style="opacity:0.7;font-size:0.85em">(${count})</span></button>`;
            }).join('');

            const summaryHtml = `
              <div class="entity-list-group" style="margin-bottom: 12px;">
                <div class="entity-list-group-title">Summary</div>
                <div class="entity-list-item"><div class="entity-list-row">
                  <span class="entity-list-name">Total in Store</span>
                  <span class="entity-list-id-inline">${totalCount}</span>
                </div></div>
                <div class="entity-list-item"><div class="entity-list-row">
                  <span class="entity-list-name">Installed on this system</span>
                  <span class="entity-list-id-inline">${installedCount}</span>
                </div></div>
                <div class="entity-list-item"><div class="entity-list-row">
                  <span class="entity-list-name">New (last ${cutoffDays} days)</span>
                  <span class="entity-list-id-inline">${newCount}</span>
                </div></div>
              </div>
              <div class="entity-list-group" style="margin-bottom: 12px;">
                <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center">
                  <input id="hacs-search" type="search" placeholder="Search store…" autocomplete="off"
                    style="flex:1;padding:6px 10px;border-radius:6px;border:2px solid #2196f3;background:var(--em-bg-secondary,#121212);color:var(--em-text-primary,#e0e0e0);font-size:0.9em;outline:none">
                  <button class="btn btn-secondary hacs-my-downloads-btn" title="Show only installed items">
                    My Downloads (${installedCount})
                  </button>
                </div>
                <div class="entity-list-group-title" style="margin-bottom:6px">Filter by category</div>
                <div class="entity-list-row" style="gap: 8px; flex-wrap: wrap;">${filtersHtml}</div>
              </div>
            `;

            const renderStoreItem = (item) => {
              const isInstalled = installedNames.has((item.name || '').toLowerCase());
              const badges = [
                isInstalled ? `<span style="background:#4caf50;color:#fff;padding:2px 8px;border-radius:10px;font-size:0.82em;margin-left:6px;vertical-align:middle">installed</span>` : '',
                item.new ? `<span style="background:#ff9800;color:#fff;padding:2px 8px;border-radius:10px;font-size:0.82em;margin-left:6px;vertical-align:middle">new</span>` : '',
              ].join('');
              const meta = [
                item.full_name ? this._escapeHtml(item.full_name) : '',
                item.downloads ? `⬇ ${item.downloads.toLocaleString()}` : '',
                item.stars ? `★ ${item.stars}` : '',
                item.last_updated ? new Date(item.last_updated).toLocaleDateString() : '',
              ].filter(Boolean).join(' · ');
              const desc = item.description ? `<div style="font-size:0.9em;opacity:0.85;margin-top:3px;white-space:normal;line-height:1.4">${this._escapeHtml(item.description)}</div>` : '';
              return `
                <div class="entity-list-item hacs-store-item" style="cursor:pointer;padding:10px 12px"
                  data-hacs-category="${this._escapeAttr(item.category || 'unknown')}"
                  data-repo-name="${this._escapeAttr((item.name || '').toLowerCase())}"
                  data-repo-fullname="${this._escapeAttr(item.full_name || '')}"
                  data-repo-desc="${this._escapeAttr(item.description || '')}"
                  data-installed="${isInstalled ? '1' : '0'}"
                  title="Open on GitHub">
                  <div class="entity-list-row" style="flex-wrap:wrap;align-items:center">
                    <span class="entity-list-name" style="font-size:1em;font-weight:600">${this._escapeHtml(item.name)}${badges}</span>
                    <span style="font-size:0.85em;opacity:0.75;margin-top:2px;width:100%">${meta}</span>
                  </div>
                  ${desc}
                </div>
              `;
            };

            groupedHtml = `
              ${summaryHtml}
              <div class="entity-list-group">
                <div class="entity-list-group-title">All Store Items (${totalCount})</div>
                <p id="hacs-no-results" style="display:none;text-align:center;padding:12px;opacity:0.7;font-style:italic"></p>
                ${store.length ? store.map(renderStoreItem).join('') : '<p style="text-align:center;padding:12px">No store data available — check HACS is installed</p>'}
              </div>
            `;

            entities = store.map(item => ({
              id: item.full_name || item.name,
              name: item.name,
              category: item.category || 'unknown',
            }));
          } catch (e) {
            groupedHtml = `<p style="text-align:center;padding:24px;opacity:0.6">HACS store data not available.<br>Ensure HACS is installed and Home Assistant has been restarted.</p>`;
            entities = [];
          }
        } else if (type === 'lovelace') {
          title = 'Lovelace';
          color = '#9c27b0';
          allowToggle = false;
          try {
            // Use cached data from loadCounts or re-fetch
            let dashboardList = this.lovelaceDashboardList;
            if (!dashboardList) {
              dashboardList = await this._hass.callWS({ type: 'lovelace/dashboards/list' }) || [];
            }
            // Ensure configs are loaded
            for (const dash of dashboardList) {
              if (!dash._config) {
                try {
                  dash._config = await this._hass.callWS({ type: 'lovelace/config', url_path: dash.url_path || null });
                } catch (e) { /* skip */ }
              }
            }

            // Recursively extract all card objects with their location path
            const extractAllCards = (cards, path) => {
              const out = [];
              for (const card of (cards || [])) {
                if (!card || typeof card !== 'object') continue;
                out.push({ card, path });
                if (card.cards) out.push(...extractAllCards(card.cards, path));
                if (card.card) out.push(...extractAllCards([card.card], path));
                if (card.elements) out.push(...extractAllCards(card.elements, path));
              }
              return out;
            };

            // Extract entity_ids referenced in a card config
            const extractEntities = (card) => {
              const ids = new Set();
              const add = (v) => { if (typeof v === 'string' && v.includes('.')) ids.add(v); };
              add(card.entity);
              add(card.entity_id);
              add(card.camera_image);
              (Array.isArray(card.entities) ? card.entities : []).forEach(e => {
                if (typeof e === 'string') add(e);
                else if (e?.entity) add(e.entity);
              });
              (card.conditions || []).forEach(c => { if (c) add(c.entity); });
              return [...ids];
            };

            // Build stats
            const cardTypeCount = {};
            const entityRefs = {}; // entity_id → Set of paths
            const dashboardStats = [];
            let totalCards = 0;

            for (const dash of dashboardList) {
              if (!dash._config) continue;
              const dashName = dash.title || dash.url_path || 'Overview';
              const dashUrl = dash.url_path ? `/lovelace/${dash.url_path}` : '/lovelace';
              let dashCards = 0;
              let dashViews = 0;

              for (const [vi, view] of (dash._config.views || []).entries()) {
                dashViews++;
                const viewName = view.title || view.path || `View ${vi + 1}`;
                const viewCards = [...(view.cards || [])];
                (view.sections || []).forEach(s => { if (s) viewCards.push(...(s.cards || [])); });
                const allCards = extractAllCards(viewCards, `${dashName} › ${viewName}`);
                dashCards += allCards.length;

                for (const { card, path } of allCards) {
                  const t = card.type || 'entities';
                  cardTypeCount[t] = (cardTypeCount[t] || 0) + 1;
                  extractEntities(card).forEach(eid => {
                    if (!entityRefs[eid]) entityRefs[eid] = new Set();
                    entityRefs[eid].add(path);
                  });
                }
              }
              totalCards += dashCards;
              dashboardStats.push({ name: dashName, url: dashUrl, views: dashViews, cards: dashCards });
            }

            // ── Group 1: Dashboards ──────────────────────────────────────────
            const dashHtml = dashboardStats.length ? dashboardStats.map(d => `
              <div class="entity-list-item" style="padding:9px 12px">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                  <span style="font-weight:600;flex:1;min-width:120px">${this._escapeHtml(d.name)}</span>
                  <span style="font-size:0.8em;opacity:0.55">${this._escapeHtml(d.url)}</span>
                  <span style="font-size:0.82em;opacity:0.75">${d.views} view${d.views !== 1 ? 's' : ''}</span>
                  <span style="font-size:0.82em;font-weight:600;color:#9c27b0">${d.cards} card${d.cards !== 1 ? 's' : ''}</span>
                  <a href="${this._escapeHtml(d.url)}" target="_blank"
                     style="font-size:0.8em;color:#2196f3;text-decoration:none;flex-shrink:0">Open ↗</a>
                </div>
              </div>
            `).join('') : '<p style="padding:12px;opacity:0.6">No dashboards found.</p>';

            // ── Group 2: Card types ──────────────────────────────────────────
            const HA_BUILTIN_CARDS = new Set([
              'alarm-panel','badge','button','calendar','camera','conditional',
              'entities','entity','entity-filter','gauge','glance','grid',
              'history-graph','horizontal-stack','humidifier','iframe','light',
              'logbook','map','markdown','media-control','picture','picture-elements',
              'picture-entity','picture-glance','plant-status','sensor',
              'shopping-list','statistics-graph','thermostat','tile','todo-list',
              'vertical-stack','weather-forecast','webpage',
              // Energy dashboard cards
              'energy-date-selection','energy-distribution','energy-gas-graph',
              'energy-grid-neutrality-gauge','energy-solar-consumed-gauge',
              'energy-solar-graph','energy-sources-table','energy-usage-graph',
              'energy-water-graph',
            ]);

            const sortedTypes = Object.entries(cardTypeCount).sort((a, b) => b[1] - a[1]);
            const maxTypeCount = sortedTypes[0]?.[1] || 1;
            const cardTypeHtml = sortedTypes.length ? sortedTypes.map(([t, count]) => {
              const isCustom = t.startsWith('custom:');
              const isBuiltin = HA_BUILTIN_CARDS.has(t);
              const barColor = isCustom ? '#ff9800' : '#9c27b0';
              const pct = Math.round((count / maxTypeCount) * 100);
              const badge = isBuiltin
                ? `<span style="font-size:0.7em;padding:1px 6px;border-radius:10px;background:#e3f2fd;color:#1565c0;font-weight:600;flex-shrink:0">built-in</span>`
                : isCustom
                  ? `<span style="font-size:0.7em;padding:1px 6px;border-radius:10px;background:#fff3e0;color:#e65100;font-weight:600;flex-shrink:0">custom</span>`
                  : `<span style="font-size:0.7em;padding:1px 6px;border-radius:10px;background:rgba(128,128,128,0.15);color:inherit;opacity:0.6;flex-shrink:0">unknown</span>`;
              return `
                <div class="entity-list-item" style="padding:7px 12px">
                  <div style="display:flex;align-items:center;gap:8px">
                    <code style="flex:0 0 190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.83em;${isCustom ? 'color:#ff9800' : ''}">${this._escapeHtml(t)}</code>
                    ${badge}
                    <div style="flex:1;background:rgba(128,128,128,0.15);border-radius:3px;height:7px">
                      <div style="background:${barColor};width:${pct}%;height:7px;border-radius:3px;min-width:3px"></div>
                    </div>
                    <span style="font-size:0.85em;font-weight:600;flex:0 0 28px;text-align:right;color:${barColor}">${count}</span>
                  </div>
                </div>`;
            }).join('') : '<p style="padding:12px;opacity:0.6">No cards found.</p>';

            // ── Group 3: Entity references ───────────────────────────────────
            const sortedRefs = Object.entries(entityRefs)
              .map(([eid, paths]) => [eid, [...paths]])
              .sort((a, b) => b[1].length - a[1].length);
            const entityRefHtml = sortedRefs.length ? sortedRefs.map(([eid, locs]) => {
              const state = this._hass.states?.[eid];
              const fname = state?.attributes?.friendly_name || '';
              const preview = locs.slice(0, 2).join(' · ');
              const more = locs.length > 2 ? ` +${locs.length - 2} more` : '';
              return `
                <div class="entity-list-item" style="padding:7px 12px">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                    ${fname ? `<span style="font-weight:600">${this._escapeHtml(fname)}</span>` : ''}
                    <span style="font-size:0.82em;opacity:0.65">${this._escapeHtml(eid)}</span>
                    <span style="margin-left:auto;font-size:0.82em;font-weight:700;color:#9c27b0">${locs.length}×</span>
                  </div>
                  <div style="font-size:0.78em;opacity:0.5;margin-top:2px">${this._escapeHtml(preview)}${more}</div>
                </div>`;
            }).join('') : '<p style="padding:12px;opacity:0.6">No entity references found.</p>';

            groupedHtml = [
              this._collGroup(`Dashboards (${dashboardStats.length})`, dashHtml),
              this._collGroup(`Card Types (${sortedTypes.length} types · ${totalCards} total)`, cardTypeHtml),
              this._collGroup(`Entities in Lovelace (${sortedRefs.length})`, entityRefHtml),
            ].join('');

            entities = new Array(totalCards).fill(null); // drives the dialog title count
          } catch (e) {
            console.error('Lovelace dialog error:', e);
            groupedHtml = `<p style="padding:20px;text-align:center;opacity:0.6">Error loading Lovelace config: ${this._escapeHtml(e.message)}</p>`;
            entities = [];
          }
        }
      }
      
      // Sort by name
      entities.sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
      
      const entityList = entities.filter(Boolean).map(e => `
        <div class="entity-list-item">
          <div class="entity-list-row">
            <span class="entity-list-name">${e.name}</span>
            <span class="entity-list-id-inline">${e.id}</span>
            ${e.meta ? `<span class="entity-list-id-inline">${e.meta}</span>` : ''}
            <span class="entity-list-actions">
              ${allowToggle ? `
                <button class="entity-list-toggle ${e.state === 'on' ? 'on' : 'off'}" data-entity-id="${e.id}" data-entity-type="${type}">
                  ${e.state === 'on' ? 'On' : 'Off'}
                </button>
              ` : ''}
              <button class="entity-list-action-btn info-btn" data-entity-id="${e.id}" title="Show info">
                <svg viewBox="0 0 24 24" width="16" height="16"><path d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" fill="currentColor"/></svg>
              </button>
              <button class="entity-list-action-btn edit-btn" data-entity-id="${e.id}" data-entity-type="${type}" title="Edit in HA">
                <svg viewBox="0 0 24 24" width="16" height="16"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" fill="currentColor"/></svg>
              </button>
            </span>
          </div>
        </div>
      `).join('');

      const listHtml = groupedHtml || entityList;
      
      const { overlay, closeDialog } = this.createDialog({
        title: `${title} (${entities.length})`,
        color,
        extraClass: 'entity-list-dialog',
        contentHtml: `
          <div class="entity-list-content">
            ${listHtml || '<p style="text-align: center; padding: 20px;">No items found</p>'}
          </div>
        `,
        actionsHtml: '<button class="btn btn-secondary" id="close-entity-list">Close</button>'
      });

      overlay.querySelector('#close-entity-list').addEventListener('click', closeDialog);

      // Device duplicate filter toggle — hide duplicates by default
      const dupToggle = overlay.querySelector('#em-device-dup-toggle');
      if (dupToggle) {
        overlay.querySelectorAll('.em-device-dup').forEach(el => { el.style.display = 'none'; });
        let showingDups = false;
        dupToggle.addEventListener('click', () => {
          showingDups = !showingDups;
          overlay.querySelectorAll('.em-device-dup').forEach(el => { el.style.display = showingDups ? '' : 'none'; });
          dupToggle.textContent = showingDups ? 'Hide duplicates' : 'Show duplicates';
          dupToggle.classList.toggle('btn-primary', showingDups);
          dupToggle.classList.toggle('btn-secondary', !showingDups);
        });
      }

      // Collapsible group headers
      overlay.querySelectorAll('.em-collapsible').forEach(header => {
        header.addEventListener('click', () => {
          const body = header.nextElementSibling;
          const arrow = header.querySelector('.em-collapse-arrow');
          const collapsed = body.style.display === 'none';
          body.style.display = collapsed ? '' : 'none';
          if (arrow) arrow.style.transform = collapsed ? '' : 'rotate(-90deg)';
        });
      });

      // Template entity: Rename
      overlay.querySelectorAll('.em-tpl-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const entityId = btn.dataset.entityId;
          const [domain, ...rest] = entityId.split('.');
          const currentObjectId = rest.join('.');
          const currentDisplayName = btn.dataset.currentName || '';

          const escapedDomain = this._escapeHtml(domain);
          const escapedObjectId = this._escapeHtml(currentObjectId);
          const escapedDisplayName = this._escapeHtml(currentDisplayName);

          const { overlay: editOverlay, closeDialog: closeEdit } = this.createDialog({
            title: `Edit Template Entity`,
            color: '#2196f3',
            contentHtml: `
              <div style="display:flex;flex-direction:column;gap:16px;padding:4px 0">
                <div>
                  <label style="font-size:0.85em;opacity:0.7;display:block;margin-bottom:6px">
                    Entity ID <span style="opacity:0.55">(domain: ${escapedDomain})</span>
                  </label>
                  <div style="display:flex;align-items:center;gap:4px">
                    <span style="opacity:0.55;font-size:0.9em;flex-shrink:0">${escapedDomain}.</span>
                    <input id="tpl-edit-id" type="text" value="${escapedObjectId}"
                      style="flex:1;padding:7px 10px;border:1px solid var(--em-border,#e0e0e0);border-radius:4px;font-size:0.9em;background:var(--em-bg-primary,#fff);color:var(--em-text-primary,#212121)"
                      placeholder="object_id">
                  </div>
                  <div style="font-size:0.78em;opacity:0.5;margin-top:4px">Lowercase letters, numbers and underscores only. Changing this updates references in UI automations &amp; scripts.</div>
                </div>
                <div>
                  <label style="font-size:0.85em;opacity:0.7;display:block;margin-bottom:6px">
                    Display name <span style="opacity:0.55">(optional override)</span>
                  </label>
                  <input id="tpl-edit-name" type="text" value="${escapedDisplayName}"
                    style="width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid var(--em-border,#e0e0e0);border-radius:4px;font-size:0.9em;background:var(--em-bg-primary,#fff);color:var(--em-text-primary,#212121)"
                    placeholder="Leave blank to use default">
                </div>
              </div>
            `,
            actionsHtml: `
              <button class="btn btn-secondary" id="tpl-edit-cancel">Cancel</button>
              <button class="btn btn-primary" id="tpl-edit-save">Save</button>
            `,
          });

          editOverlay.querySelector('#tpl-edit-cancel').addEventListener('click', closeEdit);
          setTimeout(() => editOverlay.querySelector('#tpl-edit-id')?.focus(), 50);

          editOverlay.querySelector('#tpl-edit-save').addEventListener('click', async () => {
            const newObjectId = editOverlay.querySelector('#tpl-edit-id').value.trim();
            const newDisplayName = editOverlay.querySelector('#tpl-edit-name').value.trim();

            if (!newObjectId) {
              this._showToast('Entity ID cannot be empty', 'error');
              return;
            }
            if (!/^[a-z0-9_]+$/.test(newObjectId)) {
              this._showToast('Entity ID: only lowercase letters, numbers, underscores', 'error');
              return;
            }

            const newEntityId = `${domain}.${newObjectId}`;
            const saveBtn = editOverlay.querySelector('#tpl-edit-save');
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving…';

            let idChanged = false;
            try {
              if (newEntityId !== entityId) {
                await this._hass.callWS({
                  type: 'entity_manager/rename_entity',
                  old_entity_id: entityId,
                  new_entity_id: newEntityId,
                });
                idChanged = true;
              }

              const targetId = idChanged ? newEntityId : entityId;
              if (newDisplayName !== currentDisplayName) {
                await this._hass.callWS({
                  type: 'entity_manager/update_entity_display_name',
                  entity_id: targetId,
                  name: newDisplayName || null,
                });
              }

              // Update YAML config files if entity_id changed
              let yamlResult = null;
              if (idChanged) {
                saveBtn.textContent = 'Updating YAML…';
                try {
                  yamlResult = await this._hass.callWS({
                    type: 'entity_manager/update_yaml_references',
                    old_entity_id: entityId,
                    new_entity_id: newEntityId,
                  });
                } catch (yamlErr) {
                  console.warn('YAML update failed:', yamlErr);
                  yamlResult = { total_replacements: 0, files_updated: [], errors: [{ file: '?', error: yamlErr.message }] };
                }
              }

              closeEdit();

              // Update the row in the parent dialog
              const itemEl = btn.closest('.entity-list-item');
              if (itemEl) {
                if (idChanged) {
                  const idEl = itemEl.querySelector('.entity-list-id-inline');
                  if (idEl) idEl.textContent = newEntityId;
                  btn.dataset.entityId = newEntityId;
                  const removeBtn = itemEl.querySelector('.em-tpl-remove');
                  if (removeBtn) removeBtn.dataset.entityId = newEntityId;
                }
                const nameEl = itemEl.querySelector('.entity-list-name');
                if (nameEl) nameEl.firstChild.textContent = newDisplayName || (idChanged ? newEntityId : entityId);
                btn.dataset.currentName = newDisplayName;
              }

              // Build a meaningful toast message
              if (idChanged && yamlResult) {
                const fileCount = yamlResult.files_updated.length;
                const replCount = yamlResult.total_replacements;
                const errCount = yamlResult.errors.length;
                let msg = `Renamed to ${newEntityId}.`;
                if (replCount > 0) {
                  msg += ` Updated ${replCount} reference${replCount !== 1 ? 's' : ''} in ${fileCount} YAML file${fileCount !== 1 ? 's' : ''}.`;
                } else {
                  msg += ' No YAML references found.';
                }
                if (errCount > 0) msg += ` ⚠️ ${errCount} file error(s) — check logs.`;
                this._showToast(msg, replCount > 0 ? 'success' : 'info', 6000);
              } else {
                this._showToast(`Saved ${idChanged ? newEntityId : entityId}`, 'success');
              }

              if (idChanged) this.loadCounts();
            } catch (err) {
              console.error('Edit template entity error:', err);
              saveBtn.disabled = false;
              saveBtn.textContent = 'Save';
              this.showErrorDialog(`Failed to update: ${err.message}`);
            }
          });
        });
      });

      // Template entity: Remove
      overlay.querySelectorAll('.em-tpl-remove').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const entityId = btn.dataset.entityId;
          if (!confirm(`Remove template entity "${entityId}"?\n\nThis cannot be undone.`)) return;
          btn.disabled = true;
          try {
            const result = await this._hass.callWS({
              type: 'entity_manager/remove_entity',
              entity_id: entityId,
            });
            if (result.warning) {
              this._showToast(result.warning, 'warning', 6000);
            }
            // Remove the item row from the dialog
            const itemEl = btn.closest('.entity-list-item');
            if (itemEl) itemEl.remove();
            this._showToast(`Removed ${entityId}`, 'success');
            // Refresh counts
            this.loadCounts();
          } catch (err) {
            console.error('Remove error:', err);
            this.showErrorDialog(`Failed to remove ${entityId}: ${err.message}`);
          } finally {
            btn.disabled = false;
          }
        });
      });

      if (allowToggle) {
        overlay.querySelectorAll('.entity-list-toggle').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const entityId = btn.dataset.entityId;
            const currentlyOn = btn.classList.contains('on');

            btn.disabled = true;
            btn.style.opacity = '0.7';
            try {
              await this._hass.callService('homeassistant', 'toggle', {
                entity_id: entityId
              });
              const nextOn = !currentlyOn;
              btn.classList.toggle('on', nextOn);
              btn.classList.toggle('off', !nextOn);
              btn.textContent = nextOn ? 'On' : 'Off';
            } catch (error) {
              console.error('Error toggling entity:', error);
              this.showErrorDialog(`Error toggling ${entityId}: ${error.message}`);
            } finally {
              btn.disabled = false;
              btn.style.opacity = '';
            }
          });
        });
      }

      // HACS store: search + category filter + My Downloads + item click
      const hacsFilterButtons = overlay.querySelectorAll('.hacs-filter-btn');
      const hacsSearchInput = overlay.querySelector('#hacs-search');
      const hacsMyDownloadsBtn = overlay.querySelector('.hacs-my-downloads-btn');

      {
        let activeCatFilter = 'all';
        let myDownloadsOnly = false;

        const noResultsEl = overlay.querySelector('#hacs-no-results');

        const applyHacsFilters = () => {
          const items = overlay.querySelectorAll('.hacs-store-item');
          const term = (hacsSearchInput?.value || '').toLowerCase().trim();
          let visibleCount = 0;

          items.forEach(item => {
            const category = item.dataset.hacsCategory || 'unknown';
            const isInstalled = item.dataset.installed === '1';

            const catOk = activeCatFilter === 'all' || category === activeCatFilter;
            const installedOk = !myDownloadsOnly || isInstalled;
            // Search against all visible text in the item — name, full_name, description, meta
            const searchOk = !term || item.textContent.toLowerCase().includes(term);

            const show = catOk && installedOk && searchOk;
            item.style.display = show ? '' : 'none';
            if (show) visibleCount++;
          });

          // Show/hide no-results message
          if (noResultsEl) {
            noResultsEl.style.display = items.length > 0 && visibleCount === 0 ? '' : 'none';
            if (term) noResultsEl.textContent = `No results for "${term}"`;
          }

          // Update active state on filter buttons
          hacsFilterButtons.forEach(btn => {
            btn.classList.toggle('btn-primary', btn.dataset.hacsFilter === activeCatFilter);
            btn.classList.toggle('btn-secondary', btn.dataset.hacsFilter !== activeCatFilter);
          });
          if (hacsMyDownloadsBtn) {
            hacsMyDownloadsBtn.classList.toggle('btn-primary', myDownloadsOnly);
            hacsMyDownloadsBtn.classList.toggle('btn-secondary', !myDownloadsOnly);
          }
        };

        // Category filter buttons
        hacsFilterButtons.forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            activeCatFilter = btn.dataset.hacsFilter || 'all';
            applyHacsFilters();
          });
        });

        // My Downloads toggle
        if (hacsMyDownloadsBtn) {
          hacsMyDownloadsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            myDownloadsOnly = !myDownloadsOnly;
            applyHacsFilters();
          });
        }

        // Live search — instant, no debounce; also covers the clear-X button on type="search"
        if (hacsSearchInput) {
          hacsSearchInput.addEventListener('input', () => applyHacsFilters());
          hacsSearchInput.addEventListener('search', () => applyHacsFilters());
          hacsSearchInput.addEventListener('click', e => e.stopPropagation());
        }

        // Click item → flash highlight, open GitHub repo in new tab
        overlay.addEventListener('click', (e) => {
          const item = e.target.closest('.hacs-store-item');
          if (!item) return;
          e.stopPropagation();
          const fullName = item.dataset.repoFullname;

          // Flash highlight for visual feedback
          item.style.transition = 'background 0.15s ease';
          item.style.background = 'rgba(33,150,243,0.35)';
          setTimeout(() => { item.style.background = ''; item.style.transition = ''; }, 400);

          if (fullName) {
            window.open(`https://github.com/${fullName}`, '_blank', 'noopener');
          }
        });

        applyHacsFilters();
      }

      // Rename (automation / script / helper)
      overlay.querySelectorAll('.em-entity-rename').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const entityId = btn.dataset.entityId;
          const currentName = btn.dataset.currentName || '';
          const { overlay: rnOverlay, closeDialog: closeRename } = this.createDialog({
            title: 'Rename',
            color: 'var(--em-primary)',
            contentHtml: `
              <div style="padding:4px 0">
                <label style="font-size:0.85em;opacity:0.7;display:block;margin-bottom:6px">Display name</label>
                <input id="em-rename-input" type="text" value="${this._escapeHtml(currentName)}"
                  style="width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--em-border,#e0e0e0);border-radius:4px;font-size:0.95em;background:var(--em-bg-primary,#fff);color:var(--em-text-primary,#212121)"
                  placeholder="Enter display name">
                <p style="font-size:0.82em;opacity:0.6;margin-top:8px">${this._escapeHtml(entityId)}</p>
              </div>`,
            actionsHtml: `<button class="btn btn-secondary" id="em-rename-cancel">Cancel</button>
                          <button class="btn btn-primary" id="em-rename-save">Save</button>`,
          });
          const input = rnOverlay.querySelector('#em-rename-input');
          input.focus(); input.select();
          const doSave = async () => {
            const newName = input.value.trim();
            try {
              await this._hass.callWS({
                type: 'entity_manager/update_entity_display_name',
                entity_id: entityId,
                name: newName || null,
              });
              btn.dataset.currentName = newName;
              const row = btn.closest('.entity-list-item');
              if (row) {
                const nameEl = row.querySelector('.entity-list-name');
                if (nameEl) nameEl.childNodes[0].textContent = newName || entityId;
              }
              closeRename();
              this._showToast(`Renamed to "${newName || entityId}"`, 'success');
            } catch (err) {
              this._showToast(`Rename failed: ${err.message}`, 'error');
            }
          };
          rnOverlay.querySelector('#em-rename-cancel').addEventListener('click', closeRename);
          rnOverlay.querySelector('#em-rename-save').addEventListener('click', doSave);
          input.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') doSave();
            if (ev.key === 'Escape') closeRename();
          });
        });
      });

      // Remove (automation / script / helper)
      overlay.querySelectorAll('.em-entity-remove').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const entityId = btn.dataset.entityId;
          const domain = entityId.split('.')[0];
          const nameEl = btn.closest('.entity-list-item')?.querySelector('.entity-list-name');
          const displayName = nameEl?.childNodes[0]?.textContent?.trim() || entityId;

          if (!confirm(`Remove "${displayName}"?\n\n${entityId}\n\nThis cannot be undone.`)) return;

          btn.disabled = true;
          try {
            // Get unique_id from entity registry
            const reg = await this._hass.callWS({ type: 'config/entity_registry/list' });
            const entry = reg.find(r => r.entity_id === entityId);
            const uniqueId = entry?.unique_id;
            if (!uniqueId) {
              throw new Error('Entity has no unique ID — it may be YAML-defined and must be removed there.');
            }

            let wsCmd;
            if (domain === 'automation') {
              wsCmd = { type: 'config/automation/delete', automation_id: uniqueId };
            } else if (domain === 'script') {
              wsCmd = { type: 'config/script/delete', script_id: uniqueId };
            } else if (['input_boolean','input_number','input_text','input_select',
                        'input_datetime','input_button'].includes(domain)) {
              wsCmd = { type: `${domain}/delete`, [`${domain}_id`]: uniqueId };
            } else if (domain === 'counter') {
              wsCmd = { type: 'counter/delete', counter_id: uniqueId };
            } else if (domain === 'timer') {
              wsCmd = { type: 'timer/delete', timer_id: uniqueId };
            } else {
              throw new Error(`Removal of "${domain}" entities is not supported from this panel.`);
            }

            await this._hass.callWS(wsCmd);
            btn.closest('.entity-list-item')?.remove();
            this._showToast(`Removed ${entityId}`, 'success');
            this.loadCounts();
          } catch (err) {
            console.error('Remove error:', err);
            this._showToast(`Remove failed: ${err.message}`, 'error', 6000);
          } finally {
            btn.disabled = false;
          }
        });
      });

      // Edit buttons - navigate to HA's edit page
      overlay.querySelectorAll('.entity-list-action-btn.edit-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const entityId = btn.dataset.entityId;
          const entityType = btn.dataset.entityType;
          let editPath = '';

          if (entityType === 'automation' || entityType === 'script') {
            // HA editor URLs use the automation/script unique_id (UUID), not the entity object_id
            try {
              const reg = await this._hass.callWS({ type: 'config/entity_registry/list' });
              const entry = reg.find(r => r.entity_id === entityId);
              const uniqueId = entry?.unique_id;
              if (uniqueId) {
                editPath = entityType === 'automation'
                  ? `/config/automation/edit/${encodeURIComponent(uniqueId)}`
                  : `/config/script/edit/${encodeURIComponent(uniqueId)}`;
              } else {
                // YAML-defined — no unique_id, fall back to list page
                editPath = entityType === 'automation'
                  ? '/config/automation/dashboard'
                  : '/config/script/dashboard';
                this._showToast(`This ${entityType} is YAML-defined — opening the list instead.`, 'info', 4000);
              }
            } catch {
              editPath = entityType === 'automation'
                ? '/config/automation/dashboard'
                : '/config/script/dashboard';
            }
          } else if (entityType === 'helper') {
            // Helpers don't have individual edit URLs in HA — editing is dialog-based on the helpers page.
            // Template helpers have their own page; everything else goes to /config/helpers.
            const domain = entityId.split('.')[0];
            editPath = domain === 'template' ? '/config/template' : '/config/helpers';
          }

          if (editPath) {
            closeDialog();
            history.pushState(null, '', editPath);
            window.dispatchEvent(new CustomEvent('location-changed'));
          }
        });
      });

    } catch (error) {
      console.error('Error loading entity list:', error);
      this.showErrorDialog(`Error loading ${title}: ${error.message}`);
    }
  }

  createDialog({ title, color, contentHtml, actionsHtml, extraClass = '' }) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-dialog-overlay';
    overlay.setAttribute('data-theme', this.getAttribute('data-theme') || 'light');
    overlay.innerHTML = `
      <div class="confirm-dialog-box ${this._escapeAttr(extraClass)}">
        <div class="confirm-dialog-header"${color ? ` style="border-color: ${this._escapeAttr(color)};"` : ''}>
          <h2${color ? ` style="color: ${this._escapeAttr(color)};"` : ''}>${this._escapeHtml(title)}</h2>
        </div>
        ${contentHtml}
        <div class="confirm-dialog-actions">
          ${actionsHtml}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.classList.add('em-dialog-open');

    const closeDialog = () => {
      document.body.classList.remove('em-dialog-open');
      overlay.remove();
    };

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeDialog();
      }
    });

    return { overlay, closeDialog };
  }

  showErrorDialog(message) {
    this._fireEvent('hass-notification', {
      message,
      action: {
        action: 'dismiss',
        text: 'Dismiss',
      },
    });
  }

  showConfirmDialog(title, message, onConfirm) {
    const { overlay, closeDialog } = this.createDialog({
      title,
      color: 'var(--em-primary)',
      contentHtml: `
        <div class="confirm-dialog-content">
          <p>${this._escapeHtml(message)}</p>
        </div>
      `,
      actionsHtml: `
        <button class="btn btn-secondary confirm-no">No</button>
        <button class="btn btn-primary confirm-yes">Yes</button>
      `
    });

    const yesBtn = overlay.querySelector('.confirm-yes');
    const noBtn = overlay.querySelector('.confirm-no');

    yesBtn.addEventListener('click', () => {
      closeDialog();
      onConfirm();
    });

    noBtn.addEventListener('click', closeDialog);
  }

  _showPromptDialog(title, message, defaultValue, onSubmit) {
    const { overlay, closeDialog } = this.createDialog({
      title,
      color: 'var(--em-primary)',
      contentHtml: `
        <div class="confirm-dialog-content">
          <p>${this._escapeHtml(message)}</p>
          <input type="text" class="rename-input" id="prompt-dialog-input" value="${this._escapeAttr(defaultValue || '')}" style="margin-top: 8px;">
        </div>
      `,
      actionsHtml: `
        <button class="btn btn-secondary confirm-no">Cancel</button>
        <button class="btn btn-primary confirm-yes">OK</button>
      `
    });

    const input = overlay.querySelector('#prompt-dialog-input');
    const yesBtn = overlay.querySelector('.confirm-yes');
    const noBtn = overlay.querySelector('.confirm-no');

    input.focus();
    input.select();

    const submit = () => {
      const value = input.value.trim();
      closeDialog();
      if (value) onSubmit(value);
    };

    yesBtn.addEventListener('click', submit);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') submit();
    });
    noBtn.addEventListener('click', closeDialog);
  }

  showRenameDialog(entityId) {
    const { overlay, closeDialog } = this.createDialog({
      title: 'Rename Entity',
      color: 'var(--em-primary)',
      contentHtml: `
        <div class="confirm-dialog-content">
          <p style="margin-bottom: 12px;">Current Entity ID: <strong>${this._escapeHtml(entityId)}</strong></p>
          <p style="margin-bottom: 8px; color: #666;">Enter new entity ID (without domain prefix):</p>
          <input type="text" id="rename-input" class="rename-input" placeholder="new_entity_name" value="${this._escapeAttr(entityId.split('.')[1])}" pattern="[a-z0-9_]+" title="Only lowercase letters, numbers, and underscores">
          <p style="margin-top: 8px; font-size: 14px; color: #f44336;">⚠️ This will update the entity ID across all automations, scripts, and helpers.</p>
        </div>
      `,
      actionsHtml: `
        <button class="btn btn-secondary confirm-no">Cancel</button>
        <button class="btn btn-primary confirm-yes">Rename</button>
      `
    });

    const input = overlay.querySelector('#rename-input');
    const yesBtn = overlay.querySelector('.confirm-yes');
    const noBtn = overlay.querySelector('.confirm-no');

    input.focus();
    input.select();

    const performRename = async () => {
      const newName = input.value.trim();
      if (!newName) {
        this.showErrorDialog('Please enter a valid entity name');
        return;
      }

      if (!/^[a-z0-9_]+$/.test(newName)) {
        this.showErrorDialog('Entity name can only contain lowercase letters, numbers, and underscores');
        return;
      }

      const domain = entityId.split('.')[0];
      const newEntityId = `${domain}.${newName}`;
      
      if (newEntityId === entityId) {
        closeDialog();
        return;
      }
      
      closeDialog();
      await this.renameEntity(entityId, newEntityId);
    };

    yesBtn.addEventListener('click', performRename);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        performRename();
      }
    });

    noBtn.addEventListener('click', closeDialog);
  }

  async renameEntity(oldEntityId, newEntityId, skipUndo = false) {
    try {
      await this._hass.callWS({
        type: 'entity_manager/rename_entity',
        old_entity_id: oldEntityId,
        new_entity_id: newEntityId,
      });
      
      // Push undo action and log activity (skip when called from undo/redo)
      if (!skipUndo) {
        this._pushUndoAction({
          type: 'rename',
          oldId: oldEntityId,
          newId: newEntityId
        });
        this._logActivity('rename', { from: oldEntityId, to: newEntityId });
      }
      
      this._fireEvent('hass-notification', {
        message: `Entity renamed from ${oldEntityId} to ${newEntityId}`,
      });
      
      await this.loadData();
    } catch (error) {
      console.error('Error renaming entity:', error);
      this.showErrorDialog(`Error renaming entity: ${error.message}`);
    }
  }
}

customElements.define('entity-manager-panel', EntityManagerPanel);
