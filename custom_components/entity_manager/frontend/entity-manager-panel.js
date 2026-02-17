// Entity Manager Panel - Updated UI v2.0
// Loads external CSS for cleaner code organization

// Determine base URL for loading external resources
const _emScripts = document.querySelectorAll('script[src*="entity-manager-panel"]');
const _emBaseUrl = _emScripts.length > 0 
  ? _emScripts[_emScripts.length - 1].src.replace(/\/[^/]+$/, '/')
  : '/api/entity_manager/frontend/';

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
    this.showAllSidebarIntegrations = false; // Show all integrations in sidebar
    this.updateFilter = 'all'; // all, available, stable, beta
    this.selectedUpdateType = 'all'; // all, device, integration
    this.hideUpToDate = false; // Hide up-to-date items
    this.domainOptions = [];
    this.isLoading = false;
    this.updateEntities = [];
    this.automationCount = 0;
    this.scriptCount = 0;
    this.helperCount = 0;
    this.updateCount = 0;
    this.hacsCount = 0;
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
    this.smartGroupMode = localStorage.getItem('em-smart-group-mode') || 'integration'; // integration, room, type
    
    // Virtual scrolling state
    this.virtualScrollEnabled = true;
    this.visibleEntityRange = { start: 0, end: 50 };
    this.entityRowHeight = 60; // pixels
    this.scrollContainer = null;
    
    // Lazy loading state
    this.loadedIntegrations = new Set();
    this.lazyLoadEnabled = true;
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
    if (this._themeObserver) {
      this._themeObserver.disconnect();
    }
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
    try {
      const saved = localStorage.getItem('em-custom-themes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
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
        chip.style.color = this._getContrastColor(color);
      }
    });
  }
  
  _getContrastColor(hex) {
    // Convert hex to RGB and calculate luminance
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#212121' : '#ffffff';
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
  
  _showToast(message, type = 'info', duration = 3000) {
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
    this._updateSelectionUI();
    this._showToast(`Selected ${checkboxes.length} entities`, 'success');
  }
  
  _deselectAll() {
    this.selectedEntities.clear();
    this.querySelectorAll('.entity-checkbox:checked').forEach(cb => cb.checked = false);
    this._updateSelectionUI();
    this._showToast('Selection cleared', 'info');
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
    
    const { overlay, closeDialog } = this.createDialog({
      title: 'Bulk Rename Entities',
      color: 'var(--em-primary)',
      contentHtml: `
        <div class="bulk-rename-content">
          <p style="margin-bottom: 16px; color: var(--em-text-secondary);">
            ${selectedCount > 0 ? `Rename ${selectedCount} selected entities` : 'Rename all visible entities'} using find/replace patterns.
          </p>
          <div class="bulk-rename-row">
            <label>Find pattern:</label>
            <input type="text" id="bulk-find" class="rename-input" placeholder="e.g., sensor_old_">
          </div>
          <div class="bulk-rename-row">
            <label>Replace with:</label>
            <input type="text" id="bulk-replace" class="rename-input" placeholder="e.g., sensor_new_">
          </div>
          <div class="bulk-rename-options">
            <label><input type="checkbox" id="bulk-regex"> Use regex</label>
            <label><input type="checkbox" id="bulk-case"> Case sensitive</label>
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
      
      // Get entities to rename
      let entities = selectedCount > 0 
        ? Array.from(this.selectedEntities)
        : Array.from(this.querySelectorAll('.entity-checkbox')).map(cb => cb.dataset.entityId);
      
      renameMap = [];
      
      try {
        const pattern = useRegex 
          ? new RegExp(find, caseSensitive ? 'g' : 'gi')
          : new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'g' : 'gi');
        
        entities.forEach(entityId => {
          const [domain, name] = entityId.split('.');
          if (pattern.test(name)) {
            const newName = name.replace(pattern, replace);
            if (newName !== name) {
              renameMap.push({ old: entityId, new: `${domain}.${newName}` });
            }
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
      closeDialog();
      
      this._showToast(`Renaming ${renameMap.length} entities...`, 'info', 0);
      
      // Group by domain/integration
      const renameByDomain = {};
      for (const item of renameMap) {
        const domain = item.old.split('.')[0];
        if (!renameByDomain[domain]) {
          renameByDomain[domain] = [];
        }
        renameByDomain[domain].push(item);
      }
      
      let successCount = 0;
      let errorCount = 0;
      
      // Process integrations one at a time, but entities within each in parallel
      for (const [domain, items] of Object.entries(renameByDomain)) {
        const results = await Promise.allSettled(
          items.map(item => this.renameEntity(item.old, item.new))
        );
        successCount += results.filter(r => r.status === 'fulfilled').length;
        errorCount += results.filter(r => r.status === 'rejected').length;
      }
      
      // Remove loading toast
      document.querySelector('.em-toast')?.remove();
      
      if (errorCount === 0) {
        this._showToast(`Successfully renamed ${successCount} entities`, 'success');
      } else {
        this._showToast(`Renamed ${successCount}, failed ${errorCount}`, 'warning');
      }
      
      await this.loadData();
    });
    
    overlay.querySelector('.confirm-no').addEventListener('click', closeDialog);
  }
  
  // ===== CONTEXT MENU =====
  
  _showContextMenu(e, entityId) {
    e.preventDefault();
    
    // Remove existing context menu
    document.querySelector('.em-context-menu')?.remove();
    
    const entity = this._findEntityById(entityId);
    const isFavorite = this.favorites.has(entityId);
    const isDisabled = entity?.is_disabled;
    const hasMultipleSelected = this.selectedEntities.size > 1;
    
    // If right-clicked entity is not in selection, add it
    if (hasMultipleSelected && !this.selectedEntities.has(entityId)) {
      this.selectedEntities.add(entityId);
    }
    
    const menu = document.createElement('div');
    menu.className = 'em-context-menu';
    
    // Build menu based on selection
    let menuHtml = '';
    
    if (hasMultipleSelected) {
      // Multi-select menu
      menuHtml = `
        <div class="em-context-header" style="padding: 8px 12px; color: var(--em-text-secondary); font-size: 11px; border-bottom: 1px solid var(--em-border);">
          ${this.selectedEntities.size} entities selected
        </div>
        <div class="em-context-item" data-action="bulk-rename">
          <span class="icon">✎</span> Bulk Rename Selected
        </div>
        <div class="em-context-item" data-action="bulk-enable">
          <span class="icon">✓</span> Enable All Selected
        </div>
        <div class="em-context-item" data-action="bulk-disable">
          <span class="icon">✕</span> Disable All Selected
        </div>
        <div class="em-context-divider"></div>
        <div class="em-context-item" data-action="bulk-labels">
          <span class="icon">🔖</span> Add Labels to Selected
        </div>
        <div class="em-context-item" data-action="bulk-favorite">
          <span class="icon">★</span> Add All to Favorites
        </div>
        <div class="em-context-item" data-action="bulk-compare">
          <span class="icon">⇔</span> Compare Selected
        </div>
        <div class="em-context-divider"></div>
        <div class="em-context-item" data-action="clear-selection">
          <span class="icon">✗</span> Clear Selection
        </div>
      `;
    } else {
      // Single entity menu
      menuHtml = `
        <div class="em-context-item" data-action="rename">
          <span class="icon">✎</span> Rename
        </div>
        <div class="em-context-item" data-action="${isDisabled ? 'enable' : 'disable'}">
          <span class="icon">${isDisabled ? '✓' : '✕'}</span> ${isDisabled ? 'Enable' : 'Disable'}
        </div>
        <div class="em-context-divider"></div>
        <div class="em-context-item" data-action="favorite">
          <span class="icon">${isFavorite ? '★' : '☆'}</span> ${isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        </div>
        <div class="em-context-item" data-action="tags">
          <span class="icon">🏷️</span> Manage Tags
        </div>
        <div class="em-context-item" data-action="labels">
          <span class="icon">🔖</span> Manage Labels
        </div>
        <div class="em-context-item" data-action="alias">
          <span class="icon">📝</span> Set Alias
        </div>
        <div class="em-context-item" data-action="compare">
          <span class="icon">⇔</span> Add to Comparison
        </div>
        <div class="em-context-divider"></div>
        <div class="em-context-item" data-action="stats">
          <span class="icon">📊</span> Statistics
        </div>
        <div class="em-context-item" data-action="history">
          <span class="icon">📈</span> State History
        </div>
        <div class="em-context-item" data-action="dependencies">
          <span class="icon">🔗</span> Dependencies
        </div>
        <div class="em-context-item" data-action="impact">
          <span class="icon">⚠️</span> Automation Impact
        </div>
        <div class="em-context-divider"></div>
        <div class="em-context-item" data-action="copy-id">
          <span class="icon">📋</span> Copy Entity ID
        </div>
        <div class="em-context-item" data-action="open-ha">
          <span class="icon">↗</span> Open in HA
        </div>
      `;
    }
    
    menu.innerHTML = menuHtml;
    
    // Position menu
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    
    document.body.appendChild(menu);
    
    // Adjust if menu goes off screen
    const rect = menu.getBoundingClientRect();
    
    // Adjust horizontal position
    if (rect.right > window.innerWidth) {
      menu.style.left = `${e.clientX - rect.width}px`;
    }
    if (rect.left < 0) {
      menu.style.left = '0px';
    }
    
    // Adjust vertical position
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${e.clientY - rect.height}px`;
    }
    if (rect.top < 0) {
      menu.style.top = '0px';
    }
    
    // Handle actions
    menu.addEventListener('click', async (evt) => {
      const action = evt.target.closest('.em-context-item')?.dataset.action;
      menu.remove();
      
      switch (action) {
        case 'rename':
          this.showRenameDialog(entityId);
          break;
        case 'enable':
          await this.enableEntity(entityId);
          break;
        case 'disable':
          await this.disableEntity(entityId);
          break;
        case 'favorite':
          this._toggleFavorite(entityId);
          break;
        case 'tags':
          this._showTagEditor(entityId);
          break;
        case 'labels':
          this._showLabelEditor(entityId);
          break;
        case 'alias':
          this._showAliasEditor(entityId);
          break;
        case 'compare':
          this._addToComparison(entityId);
          break;
        case 'stats':
          this._showEntityStatistics(entityId);
          break;
        case 'history':
          this._showStateHistory(entityId);
          break;
        case 'dependencies':
          this._showEntityDependencies(entityId);
          break;
        case 'impact':
          this._analyzeAutomationImpact(entityId);
          break;
        case 'copy-id':
          navigator.clipboard.writeText(entityId);
          this._showToast('Entity ID copied to clipboard', 'success');
          break;
        case 'open-ha':
          // Navigate within Home Assistant (same window)
          history.pushState(null, '', `/config/entities/entity/${entityId}`);
          window.dispatchEvent(new CustomEvent('location-changed'));
          break;
        // Bulk actions for multiple selected entities
        case 'bulk-rename':
          this._openBulkRenameDialog();
          break;
        case 'bulk-enable':
          await this._bulkEnableSelected();
          break;
        case 'bulk-disable':
          await this._disableSelectedEntities();
          break;
        case 'bulk-labels':
          this._showBulkLabelEditor();
          break;
        case 'bulk-favorite':
          for (const id of this.selectedEntities) {
            if (!this.favorites.has(id)) this._toggleFavorite(id);
          }
          this._showToast(`Added ${this.selectedEntities.size} entities to favorites`, 'success');
          break;
        case 'bulk-compare':
          for (const id of this.selectedEntities) {
            this._addToComparison(id);
          }
          break;
        case 'clear-selection':
          this.selectedEntities.clear();
          this.updateSelectedCount();
          this.updateView();
          this._showToast('Selection cleared', 'info');
          break;
      }
    });
    
    // Close on click outside
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
    try {
      const saved = localStorage.getItem('em-favorites');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  }
  
  _saveFavorites() {
    localStorage.setItem('em-favorites', JSON.stringify([...this.favorites]));
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
    try {
      const saved = localStorage.getItem('em-activity-log');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }
  
  _saveActivityLog() {
    // Keep only last 100 entries
    if (this.activityLog.length > 100) {
      this.activityLog = this.activityLog.slice(-100);
    }
    localStorage.setItem('em-activity-log', JSON.stringify(this.activityLog));
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
  
  async _undo() {
    if (this.undoStack.length === 0) {
      this._showToast('Nothing to undo', 'info');
      return;
    }
    
    const action = this.undoStack.pop();
    this.redoStack.push(action);
    
    // Reverse the action
    switch (action.type) {
      case 'enable':
        await this.disableEntity(action.entityId, true);
        this._showToast(`Undid enable: ${action.entityId}`, 'info');
        break;
      case 'disable':
        await this.enableEntity(action.entityId, true);
        this._showToast(`Undid disable: ${action.entityId}`, 'info');
        break;
      case 'rename':
        await this.renameEntity(action.newId, action.oldId, true);
        this._showToast(`Undid rename`, 'info');
        break;
      case 'bulk-enable':
        for (const id of action.entityIds) {
          await this.disableEntity(id, true);
        }
        this._showToast(`Undid bulk enable (${action.entityIds.length})`, 'info');
        break;
      case 'bulk-disable':
        for (const id of action.entityIds) {
          await this.enableEntity(id, true);
        }
        this._showToast(`Undid bulk disable (${action.entityIds.length})`, 'info');
        break;
    }
    
    this._updateUndoRedoUI();
    await this.loadData();
  }
  
  async _redo() {
    if (this.redoStack.length === 0) {
      this._showToast('Nothing to redo', 'info');
      return;
    }
    
    const action = this.redoStack.pop();
    this.undoStack.push(action);
    
    // Redo the action
    switch (action.type) {
      case 'enable':
        await this.enableEntity(action.entityId, true);
        this._showToast(`Redid enable: ${action.entityId}`, 'info');
        break;
      case 'disable':
        await this.disableEntity(action.entityId, true);
        this._showToast(`Redid disable: ${action.entityId}`, 'info');
        break;
      case 'rename':
        await this.renameEntity(action.oldId, action.newId, true);
        this._showToast(`Redid rename`, 'info');
        break;
      case 'bulk-enable':
        for (const id of action.entityIds) {
          await this.enableEntity(id, true);
        }
        this._showToast(`Redid bulk enable (${action.entityIds.length})`, 'info');
        break;
      case 'bulk-disable':
        for (const id of action.entityIds) {
          await this.disableEntity(id, true);
        }
        this._showToast(`Redid bulk disable (${action.entityIds.length})`, 'info');
        break;
    }
    
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
    try {
      return JSON.parse(localStorage.getItem('em-filter-presets')) || [];
    } catch { return []; }
  }
  
  _saveFilterPresets() {
    localStorage.setItem('em-filter-presets', JSON.stringify(this.filterPresets));
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
    try {
      return JSON.parse(localStorage.getItem('em-visible-columns')) || 
        ['checkbox', 'favorite', 'name', 'id', 'device', 'state', 'status', 'actions'];
    } catch {
      return ['checkbox', 'favorite', 'name', 'id', 'device', 'state', 'status', 'actions'];
    }
  }
  
  _saveVisibleColumns() {
    localStorage.setItem('em-visible-columns', JSON.stringify(this.visibleColumns));
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
    try {
      return JSON.parse(localStorage.getItem('em-entity-tags')) || {};
    } catch { return {}; }
  }
  
  _saveEntityTags() {
    localStorage.setItem('em-entity-tags', JSON.stringify(this.entityTags));
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
        if (entity.labels && entity.labels.length > 0) {
          for (const labelId of entity.labels) {
            if (!labeledEntities[labelId]) {
              const labelInfo = labels.find(l => l.label_id === labelId);
              labeledEntities[labelId] = {
                label_id: labelId,
                name: labelInfo?.name || labelId,
                color: labelInfo?.color || '#4CAF50',
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
    
    labelsList.innerHTML = '<div class="sidebar-item" style="opacity: 0.5;"><span class="icon">⏳</span><span class="label">Loading...</span></div>';
    
    try {
      const labeledEntities = await this._loadLabeledEntities();
      const labels = Object.values(labeledEntities).sort((a, b) => b.entities.length - a.entities.length);
      
      if (labels.length === 0) {
        labelsList.innerHTML = '<div class="sidebar-item" style="opacity: 0.7;"><span class="icon">📝</span><span class="label">No labeled entities</span></div>';
        return;
      }
      
      const displayLabels = this.showAllSidebarLabels ? labels : labels.slice(0, 8);
      
      let html = displayLabels.map(label => `
        <div class="sidebar-item ${this.selectedLabelFilter === label.label_id ? 'active' : ''}" data-label-id="${this._escapeAttr(label.label_id)}">
          <span class="icon" style="color: ${this._escapeAttr(label.color)};">●</span>
          <span class="label">${this._escapeHtml(label.name)}</span>
          <span class="count">${label.entities.length}</span>
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
    } catch (e) {
      console.error('Error displaying labels:', e);
      labelsList.innerHTML = '<div class="sidebar-item" style="color: var(--em-error);"><span class="icon">⚠️</span><span class="label">Error loading labels</span></div>';
    }
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
    const layout = this.querySelector('.em-layout');
    if (layout) {
      const oldSidebar = layout.querySelector('.em-sidebar');
      if (oldSidebar) {
        oldSidebar.outerHTML = this._renderSidebar();
        this._attachSidebarListeners();
        // Reload labels list in sidebar
        await this._loadAndDisplayLabels();
      }
    }
  }
  
  async _getEntityLabels(entityId) {
    try {
      const entityRegistry = await this._hass.callWS({ type: 'config/entity_registry/list' });
      const entity = entityRegistry.find(e => e.entity_id === entityId);
      return entity?.labels || [];
    } catch (e) {
      console.error('Error getting entity labels:', e);
      return [];
    }
  }
  
  async _addLabelToEntity(entityId, labelId) {
    try {
      const currentLabels = await this._getEntityLabels(entityId);
      if (!currentLabels.includes(labelId)) {
        await this._hass.callWS({
          type: 'config/entity_registry/update',
          entity_id: entityId,
          labels: [...currentLabels, labelId]
        });
      }
    } catch (e) {
      console.error('Error adding label:', e);
      throw e;
    }
  }
  
  async _removeLabelFromEntity(entityId, labelId) {
    try {
      const currentLabels = await this._getEntityLabels(entityId);
      await this._hass.callWS({
        type: 'config/entity_registry/update',
        entity_id: entityId,
        labels: currentLabels.filter(l => l !== labelId)
      });
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
  
  async _showLabelEditor(entityId) {
    const allLabels = await this._loadHALabels();
    const entityLabels = await this._getEntityLabels(entityId);
    
    const { overlay, closeDialog } = this.createDialog({
      title: 'Manage Labels',
      color: 'var(--em-primary)',
      contentHtml: `
        <div class="label-editor">
          <p style="color: var(--em-text-secondary); margin-bottom: 12px;">Entity: ${entityId}</p>
          <div class="current-labels" style="margin-bottom: 16px;">
            <strong>Current Labels:</strong>
            <div id="entity-labels" style="margin-top: 8px;">
              ${entityLabels.length === 0 ? '<span style="color: var(--em-text-secondary);">No labels assigned</span>' : 
                entityLabels.map(labelId => {
                  const label = allLabels.find(l => l.label_id === labelId);
                  return `<span class="label-chip" style="background: ${label?.color || 'var(--em-primary)'}; color: white; padding: 4px 8px; border-radius: 12px; margin: 2px; display: inline-block;">
                    ${label?.name || labelId} 
                    <button data-remove="${labelId}" style="background: none; border: none; color: white; cursor: pointer; margin-left: 4px;">&times;</button>
                  </span>`;
                }).join('')}
            </div>
          </div>
          <div class="available-labels">
            <strong>Available Labels:</strong>
            <div id="available-labels" style="margin-top: 8px; max-height: 150px; overflow-y: auto;">
              ${allLabels.length === 0 ? '<p style="color: var(--em-text-secondary);">No labels defined yet.</p>' :
                allLabels.map(label => `
                  <div class="label-option" data-label-id="${label.label_id}" style="padding: 8px; cursor: pointer; border-radius: 4px; margin: 4px 0; display: flex; align-items: center; gap: 8px; ${entityLabels.includes(label.label_id) ? 'opacity: 0.5;' : ''}">
                    <span style="width: 16px; height: 16px; border-radius: 50%; background: ${label.color || 'var(--em-primary)'}; display: inline-block;"></span>
                    <span>${label.name}</span>
                    ${entityLabels.includes(label.label_id) ? '<span style="margin-left: auto; color: var(--em-success);">✓</span>' : '<span style="margin-left: auto; color: var(--em-text-secondary);">+ Add</span>'}
                  </div>
                `).join('')}
            </div>
          </div>
          <div class="create-label" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--em-border);">
            <strong>Create New Label:</strong>
            <div style="display: flex; gap: 8px; margin-top: 8px; align-items: center;">
              <input type="text" id="new-label-name" placeholder="Label name" style="flex: 1; padding: 8px; border: 1px solid var(--em-border); border-radius: 4px; background: var(--em-surface); color: var(--em-text);">
              <input type="color" id="new-label-color" value="#4CAF50" style="width: 40px; height: 36px; border: none; cursor: pointer; border-radius: 4px;">
              <button class="btn btn-primary" id="create-label-btn">Create</button>
            </div>
          </div>
        </div>
      `,
      actionsHtml: `<button class="btn btn-primary">Done</button>`
    });
    
    const refreshLabels = async () => {
      const updatedLabels = await this._getEntityLabels(entityId);
      const labelsContainer = overlay.querySelector('#entity-labels');
      labelsContainer.innerHTML = updatedLabels.length === 0 ?
        '<span style="color: var(--em-text-secondary);">No labels assigned</span>' :
        updatedLabels.map(labelId => {
          const label = allLabels.find(l => l.label_id === labelId);
          return `<span class="label-chip" style="background: ${this._escapeAttr(label?.color || 'var(--em-primary)')}; color: white; padding: 4px 8px; border-radius: 12px; margin: 2px; display: inline-block;">
            ${this._escapeHtml(label?.name || labelId)}
            <button data-remove="${this._escapeAttr(labelId)}" style="background: none; border: none; color: white; cursor: pointer; margin-left: 4px;">&times;</button>
          </span>`;
        }).join('');

      // Update available labels list
      const availableContainer = overlay.querySelector('#available-labels');
      availableContainer.innerHTML = allLabels.map(label => `
        <div class="label-option" data-label-id="${this._escapeAttr(label.label_id)}" style="padding: 8px; cursor: pointer; border-radius: 4px; margin: 4px 0; display: flex; align-items: center; gap: 8px; ${updatedLabels.includes(label.label_id) ? 'opacity: 0.5;' : ''}">
          <span style="width: 16px; height: 16px; border-radius: 50%; background: ${this._escapeAttr(label.color || 'var(--em-primary)')}; display: inline-block;"></span>
          <span>${this._escapeHtml(label.name)}</span>
          ${updatedLabels.includes(label.label_id) ? '<span style="margin-left: auto; color: var(--em-success);">✓</span>' : '<span style="margin-left: auto; color: var(--em-text-secondary);">+ Add</span>'}
        </div>
      `).join('');
    };
    
    // Handle adding labels
    overlay.querySelector('#available-labels').addEventListener('click', async (e) => {
      const option = e.target.closest('.label-option');
      if (option) {
        const labelId = option.dataset.labelId;
        const currentLabels = await this._getEntityLabels(entityId);
        if (!currentLabels.includes(labelId)) {
          try {
            await this._addLabelToEntity(entityId, labelId);
            this._showToast('Label added', 'success');
            await refreshLabels();
          } catch {
            this._showToast('Error adding label', 'error');
          }
        }
      }
    });
    
    // Handle removing labels
    overlay.querySelector('#entity-labels').addEventListener('click', async (e) => {
      const removeBtn = e.target.closest('[data-remove]');
      if (removeBtn) {
        try {
          await this._removeLabelFromEntity(entityId, removeBtn.dataset.remove);
          this._showToast('Label removed', 'success');
          await refreshLabels();
        } catch {
          this._showToast('Error removing label', 'error');
        }
      }
    });
    
    // Handle creating new label
    overlay.querySelector('#create-label-btn').addEventListener('click', async () => {
      const nameInput = overlay.querySelector('#new-label-name');
      const colorInput = overlay.querySelector('#new-label-color');
      const name = nameInput.value.trim();
      
      if (!name) {
        this._showToast('Please enter a label name', 'warning');
        return;
      }
      
      try {
        const newLabel = await this._createLabel(name, colorInput.value);
        allLabels.push(newLabel);
        nameInput.value = '';
        this._showToast(`Label "${name}" created`, 'success');
        
        // Refresh available labels list
        const availableContainer = overlay.querySelector('#available-labels');
        const currentLabels = await this._getEntityLabels(entityId);
        availableContainer.innerHTML = allLabels.map(label => `
          <div class="label-option" data-label-id="${this._escapeAttr(label.label_id)}" style="padding: 8px; cursor: pointer; border-radius: 4px; margin: 4px 0; display: flex; align-items: center; gap: 8px; ${currentLabels.includes(label.label_id) ? 'opacity: 0.5;' : ''}">
            <span style="width: 16px; height: 16px; border-radius: 50%; background: ${this._escapeAttr(label.color || 'var(--em-primary)')}; display: inline-block;"></span>
            <span>${this._escapeHtml(label.name)}</span>
            ${currentLabels.includes(label.label_id) ? '<span style="margin-left: auto; color: var(--em-success);">✓</span>' : '<span style="margin-left: auto; color: var(--em-text-secondary);">+ Add</span>'}
          </div>
        `).join('');
      } catch (e) {
        this._showToast('Error creating label', 'error');
      }
    });

    overlay.querySelector('.btn-primary').addEventListener('click', closeDialog);
  }
  
  async _showBulkLabelEditor() {
    const allLabels = await this._loadHALabels();
    const entityCount = this.selectedEntities.size;
    
    const { overlay, closeDialog } = this.createDialog({
      title: 'Add Labels to Selected Entities',
      color: 'var(--em-primary)',
      contentHtml: `
        <div class="bulk-label-editor">
          <p style="color: var(--em-text-secondary); margin-bottom: 16px;">Add labels to ${entityCount} selected entities</p>
          <div class="label-selection" id="label-selection" style="max-height: 200px; overflow-y: auto;">
            ${allLabels.length === 0 ? '<p style="color: var(--em-text-secondary);">No labels defined yet.</p>' :
              allLabels.map(label => `
                <label class="label-checkbox" style="display: flex; align-items: center; gap: 8px; padding: 8px; cursor: pointer; border-radius: 4px; margin: 4px 0;">
                  <input type="checkbox" data-label-id="${label.label_id}">
                  <span style="width: 16px; height: 16px; border-radius: 50%; background: ${label.color || 'var(--em-primary)'}; display: inline-block;"></span>
                  <span>${label.name}</span>
                </label>
              `).join('')}
          </div>
          <div class="create-label" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--em-border);">
            <strong>Create New Label:</strong>
            <div style="display: flex; gap: 8px; margin-top: 8px; align-items: center;">
              <input type="text" id="new-label-name" placeholder="Label name" style="flex: 1; padding: 8px; border: 1px solid var(--em-border); border-radius: 4px; background: var(--em-surface); color: var(--em-text);">
              <input type="color" id="new-label-color" value="#4CAF50" style="width: 40px; height: 36px; border: none; cursor: pointer; border-radius: 4px;">
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
    
    // Handle creating new label in bulk editor
    overlay.querySelector('#create-label-btn').addEventListener('click', async () => {
      const nameInput = overlay.querySelector('#new-label-name');
      const colorInput = overlay.querySelector('#new-label-color');
      const name = nameInput.value.trim();
      
      if (!name) {
        this._showToast('Please enter a label name', 'warning');
        return;
      }
      
      try {
        const newLabel = await this._createLabel(name, colorInput.value);
        allLabels.push(newLabel);
        nameInput.value = '';
        this._showToast(`Label "${name}" created`, 'success');
        
        // Refresh label selection list
        const selectionContainer = overlay.querySelector('#label-selection');
        selectionContainer.innerHTML = allLabels.map(label => `
          <label class="label-checkbox" style="display: flex; align-items: center; gap: 8px; padding: 8px; cursor: pointer; border-radius: 4px; margin: 4px 0;">
            <input type="checkbox" data-label-id="${this._escapeAttr(label.label_id)}">
            <span style="width: 16px; height: 16px; border-radius: 50%; background: ${this._escapeAttr(label.color || 'var(--em-primary)')}; display: inline-block;"></span>
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
      
      if (selectedLabels.length === 0) {
        this._showToast('Select at least one label', 'warning');
        return;
      }
      
      closeDialog();
      this._showToast(`Adding labels to ${entityCount} entities...`, 'info', 0);
      
      let successCount = 0;
      for (const entityId of this.selectedEntities) {
        try {
          const currentLabels = await this._getEntityLabels(entityId);
          const newLabels = [...new Set([...currentLabels, ...selectedLabels])];
          await this._hass.callWS({
            type: 'config/entity_registry/update',
            entity_id: entityId,
            labels: newLabels
          });
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
    try {
      return JSON.parse(localStorage.getItem('em-entity-aliases')) || {};
    } catch { return {}; }
  }
  
  _saveEntityAliases() {
    localStorage.setItem('em-entity-aliases', JSON.stringify(this.entityAliases));
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
    try {
      return JSON.parse(localStorage.getItem('em-entity-order')) || {};
    } catch { return {}; }
  }
  
  _saveEntityOrder() {
    localStorage.setItem('em-entity-order', JSON.stringify(this.entityOrder));
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
        
        <div class="sidebar-section">
          <div class="sidebar-section-title">Actions</div>
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
        </div>
        
        <div class="sidebar-section">
          <div class="sidebar-section-title">Quick Filters</div>
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
        
        <div class="sidebar-section" id="labels-section">
          <div class="sidebar-section-title">Labels</div>
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
        
        <div class="sidebar-section">
          <div class="sidebar-section-title">Smart Groups</div>
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
          ` : ''}
        </div>
        
        <div class="sidebar-section">
          <div class="sidebar-section-title">Integrations</div>
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
        
        <div class="sidebar-section">
          <div class="sidebar-section-title">Help</div>
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
      const result = await this._hass.callWS({
        type: 'entity_manager/get_disabled_entities',
        state: this.viewState, // Pass the current filter state (all, enabled, disabled)
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
      // Only count updates that are actually available (state === 'on')
      this.updateCount = states.filter(s => s.entity_id.startsWith('update.') && s.state === 'on').length;
      // Count templates
      this.templateCount = states.filter(s => s.entity_id.startsWith('template.')).length;
      // Count HACS custom integrations (count update entities from HACS)
      this.hacsCount = states.filter(s => s.entity_id.startsWith('update.') && s.attributes?.integration === 'hacs').length;
      // If no HACS entities found by integration attr, count all update entities as potential HACS
      if (this.hacsCount === 0) {
        this.hacsCount = states.filter(s => s.entity_id.startsWith('update.')).length;
      }
      // Try to get HACS repository data for custom store count
      try {
        const hacsEntity = states.find(s => s.entity_id === 'update.hacs');
        if (hacsEntity?.attributes?.repositories) {
          this.hacsRepos = hacsEntity.attributes.repositories || [];
        }
      } catch (e) {
        this.hacsRepos = [];
      }
      // Count Lovelace dashboard cards
      try {
        const dashboards = await this._hass.callWS({ type: 'lovelace/dashboards/list' });
        let cardCount = 0;
        for (const dashboard of (dashboards || [])) {
          try {
            const config = await this._hass.callWS({ type: 'lovelace/config', dashboard_id: dashboard.id });
            cardCount += config?.views?.reduce((count, view) => count + (view.cards?.length || 0), 0) || 0;
          } catch (e) {
            // Skip error for individual dashboard
          }
        }
        this.lovelaceCardCount = cardCount;
      } catch (e) {
        // Fallback: try to get default config
        try {
          const config = await this._hass.callWS({ type: 'lovelace/config' });
          this.lovelaceCardCount = config?.views?.reduce((count, view) => count + (view.cards?.length || 0), 0) || 0;
        } catch (e2) {
          this.lovelaceCardCount = 0;
        }
      }
      
      this.updateView();
      
      // Refresh sidebar to show integrations
      const layout = this.querySelector('.em-layout');
      if (layout) {
        const oldSidebar = layout.querySelector('.em-sidebar');
        if (oldSidebar) {
          oldSidebar.outerHTML = this._renderSidebar();
          this._attachSidebarListeners();
        }
      }
      
      // Auto-load labels for sidebar
      this._loadAndDisplayLabels();
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
    if (!this.content) return;
    const menu = this.content.querySelector('#domain-menu');
    const label = this.content.querySelector('#domain-button-label');
    if (!menu || !label) return;

    const current = this.domainOptions.includes(this.selectedDomain) ? this.selectedDomain : 'all';
    this.selectedDomain = current;

    label.textContent = current === 'all' ? 'All domains' : current;

    const options = ['all', ...this.domainOptions];
    menu.innerHTML = options.map(domain => {
      const text = domain === 'all' ? 'All domains' : domain;
      const activeClass = domain === current ? 'active' : '';
      return `<div class="domain-option ${activeClass}" data-domain="${domain}">${text}</div>`;
    }).join('');
  }

  setLoading(isLoading) {
    this.isLoading = isLoading;
    const enableBtn = this.content?.querySelector('#enable-selected');
    const disableBtn = this.content?.querySelector('#disable-selected');
    const refreshBtn = this.content?.querySelector('#refresh');
    
    if (enableBtn) enableBtn.disabled = isLoading;
    if (disableBtn) disableBtn.disabled = isLoading;
    if (refreshBtn) refreshBtn.disabled = isLoading;
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
        <div class="domain-dropdown" id="domain-dropdown">
          <button class="domain-button" id="domain-button" aria-label="Filter by domain" type="button">
            <span id="domain-button-label">All domains</span>
            <span aria-hidden="true">▾</span>
          </button>
          <div class="domain-menu" id="domain-menu" role="listbox" aria-label="Domain options"></div>
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
        <input 
          type="text" 
          class="search-box" 
          placeholder="Search entities, devices, or integrations..."
          id="search-input"
        />
        <button class="btn btn-primary" id="enable-selected">
          Enable Selected (<span id="selected-count">0</span>)
        </button>
        <button class="btn btn-secondary" id="disable-selected">
          Disable Selected (<span id="selected-count-2">0</span>)
        </button>
        <button class="btn btn-secondary" id="deselect-all">
          Deselect (<span id="deselect-count">0</span>)
        </button>
        <button class="btn btn-success" id="update-selected" style="display: none;">
          Update Selected (<span id="update-count">0</span>)
        </button>
        <button class="btn btn-secondary" id="refresh">Refresh</button>
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
        const layout = this.querySelector('.em-layout');
        if (layout) {
          const oldSidebar = layout.querySelector('.em-sidebar');
          if (oldSidebar) {
            oldSidebar.outerHTML = this._renderSidebar();
            this._attachSidebarListeners();
          }
        }
        
        // Show/hide update filter dropdown and buttons
        const updateFilterDropdown = this.content.querySelector('#update-filter-dropdown');
        const domainDropdown = this.content.querySelector('#domain-dropdown');
        const enableBtn = this.content.querySelector('#enable-selected');
        const disableBtn = this.content.querySelector('#disable-selected');
        const updateBtn = this.content.querySelector('#update-selected');
        
        if (this.viewState === 'updates') {
          updateFilterDropdown.style.display = 'block';
          const updateTypeDropdown = this.content.querySelector('#update-type-dropdown');
          if (updateTypeDropdown) updateTypeDropdown.style.display = 'block';
          const hideLabel = this.content.querySelector('#hide-uptodate-label');
          if (hideLabel) hideLabel.style.display = 'flex';
          domainDropdown.style.display = 'none';
          enableBtn.style.display = 'none';
          disableBtn.style.display = 'none';
          updateBtn.style.display = 'inline-block';
          this.loadUpdates();
        } else {
          updateFilterDropdown.style.display = 'none';
          const updateTypeDropdown = this.content.querySelector('#update-type-dropdown');
          if (updateTypeDropdown) updateTypeDropdown.style.display = 'none';
          const hideLabel = this.content.querySelector('#hide-uptodate-label');
          if (hideLabel) hideLabel.style.display = 'none';
          domainDropdown.style.display = 'block';
          enableBtn.style.display = 'inline-block';
          disableBtn.style.display = 'inline-block';
          updateBtn.style.display = 'none';
          this.loadData();
        }
      });
    });

    // Handle domain filter
    const domainButton = this.content.querySelector('#domain-button');
    const domainMenu = this.content.querySelector('#domain-menu');
    if (domainButton && domainMenu) {
      domainButton.addEventListener('click', (e) => {
        e.stopPropagation();
        domainMenu.classList.toggle('open');
      });

      domainMenu.addEventListener('click', (e) => {
        const option = e.target.closest('.domain-option');
        if (!option) return;
        this.selectedDomain = option.dataset.domain;
        domainMenu.classList.remove('open');
        this.updateView();
      });
      
      if (!this._domainOutsideHandler) {
        this._domainOutsideHandler = (event) => {
          if (!domainMenu.classList.contains('open')) return;
          if (!this.contains(event.target)) return;
          if (!domainMenu.contains(event.target) && !domainButton.contains(event.target)) {
            domainMenu.classList.remove('open');
          }
        };
        document.addEventListener('click', this._domainOutsideHandler);
      }
    }
    
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
    
    // Handle update selected button
    const updateSelectedBtn = this.content.querySelector('#update-selected');
    if (updateSelectedBtn) {
      updateSelectedBtn.addEventListener('click', () => {
        if (this.selectedUpdates.size === 0) return;
        this.confirmBulkUpdate();
      });
    }

    // Handle bulk actions
    const enableBtn = this.content.querySelector('#enable-selected');
    if (enableBtn) {
      enableBtn.addEventListener('click', () => this.bulkEnable());
    }

    const disableBtn = this.content.querySelector('#disable-selected');
    if (disableBtn) {
      disableBtn.addEventListener('click', () => this.bulkDisable());
    }

    const deselectBtn = this.content.querySelector('#deselect-all');
    if (deselectBtn) {
      deselectBtn.addEventListener('click', () => {
        this.selectedEntities.clear();
        this.updateSelectedCount();
        this.updateView();
        this._showToast('Selection cleared', 'info');
      });
    }

    const refreshBtn = this.content.querySelector('#refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadData());
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
      // Handle preset delete button
      const deleteBtn = e.target.closest('.preset-delete');
      if (deleteBtn) {
        e.stopPropagation();
        this._deleteFilterPreset(parseInt(deleteBtn.dataset.delete));
        return;
      }
      
      const item = e.target.closest('.sidebar-item');
      if (!item) return;
      
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
        // Re-render sidebar to update active states
        const layout = this.querySelector('.em-layout');
        if (layout) {
          const oldSidebar = layout.querySelector('.em-sidebar');
          if (oldSidebar) {
            oldSidebar.outerHTML = this._renderSidebar();
            this._attachSidebarListeners();
          }
        }
        this._showToast('Showing all integrations', 'info');
      } else if (action === 'show-all-integrations') {
        this.showAllSidebarIntegrations = true;
        // Re-render sidebar to show all integrations
        const layout = this.querySelector('.em-layout');
        if (layout) {
          const oldSidebar = layout.querySelector('.em-sidebar');
          if (oldSidebar) {
            oldSidebar.outerHTML = this._renderSidebar();
            this._attachSidebarListeners();
          }
        }
      } else if (action === 'collapse-integrations') {
        this.showAllSidebarIntegrations = false;
        // Re-render sidebar to collapse integrations
        const layout = this.querySelector('.em-layout');
        if (layout) {
          const oldSidebar = layout.querySelector('.em-sidebar');
          if (oldSidebar) {
            oldSidebar.outerHTML = this._renderSidebar();
            this._attachSidebarListeners();
          }
        }
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
        // Re-render sidebar to show/hide group options
        const layout = this.querySelector('.em-layout');
        if (layout) {
          const oldSidebar = layout.querySelector('.em-sidebar');
          if (oldSidebar) {
            oldSidebar.outerHTML = this._renderSidebar();
            // Re-attach sidebar listeners after replacing HTML
            this._attachSidebarListeners();
          }
        }
      } else if (action === 'save-preset') {
        this._saveCurrentFilterPreset();
      } else if (groupMode) {
        this._setSmartGroupMode(groupMode);
        // Update sidebar to show active state
        this.querySelector('.em-sidebar').querySelectorAll('[data-group-mode]').forEach(el => {
          el.classList.toggle('active', el.dataset.groupMode === groupMode);
        });
      } else if (presetId) {
        this._applyFilterPreset(parseInt(presetId));
      } else if (filter === 'favorites') {
        // Filter to show only favorites
        this.searchTerm = '';
        const searchInput = this.content.querySelector('#search-input');
        if (searchInput) searchInput.value = '';
        this._showOnlyFavorites = true;
        this.updateView();
        this._showToast('Showing favorites only', 'info');
      } else if (action === 'load-labels') {
        // Load labels from Home Assistant
        this._loadAndDisplayLabels();
      } else if (action === 'clear-label-filter') {
        this.selectedLabelFilter = null;
        this.updateView();
        // Re-render sidebar
        const layout = this.querySelector('.em-layout');
        if (layout) {
          const oldSidebar = layout.querySelector('.em-sidebar');
          if (oldSidebar) {
            oldSidebar.outerHTML = this._renderSidebar();
            this._attachSidebarListeners();
            // Reload labels list in sidebar
            this._loadAndDisplayLabels();
          }
        }
        this._showToast('Showing all entities', 'info');
      } else if (action === 'show-all-labels') {
        this.showAllSidebarLabels = true;
        this._loadAndDisplayLabels();
      } else if (action === 'collapse-labels') {
        this.showAllSidebarLabels = false;
        this._loadAndDisplayLabels();
      } else if (action === 'help-guide') {
        this._showHelpGuide();
      } else if (item.dataset.labelId) {
        // Filter by label
        this._filterByLabel(item.dataset.labelId);
      } else if (integration) {
        // Filter to show only this integration's entities
        this._showOnlyFavorites = false;
        this.viewState = 'all';
        this.selectedDomain = 'all';
        this.searchTerm = '';
        this.selectedIntegrationFilter = integration;
        
        // Reset search input
        const searchInput = this.content.querySelector('#search-input');
        if (searchInput) searchInput.value = '';
        
        // Make sure integration is expanded
        this.expandedIntegrations.add(integration);
        
        // Update view to show only this integration
        this.updateView();
        
        // Re-render sidebar to update active states
        const layout = this.querySelector('.em-layout');
        if (layout) {
          const oldSidebar = layout.querySelector('.em-sidebar');
          if (oldSidebar) {
            oldSidebar.outerHTML = this._renderSidebar();
            this._attachSidebarListeners();
          }
        }
        
        this._showToast(`Showing ${integration} entities`, 'info');
      }
    });
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
      <div class="stat-card">
        <div class="stat-label">Integrations</div>
        <div class="stat-value">${totalIntegrations}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Devices</div>
        <div class="stat-value">${totalDevices}</div>
      </div>
      <div class="stat-card">
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
      <div class="stat-card clickable-stat" data-stat-type="hacs" title="Click to view HACS integrations">
        <div class="stat-label">HACS</div>
        <div class="stat-value" style="color: #4caf50 !important;">${this.hacsCount}</div>
      </div>
      <div class="stat-card clickable-stat" data-stat-type="lovelace" title="Click to view Lovelace cards">
        <div class="stat-label">Lovelace Cards</div>
        <div class="stat-value" style="color: #9c27b0 !important;">${this.lovelaceCardCount}</div>
      </div>
    `;

    // Attach click listeners to clickable stat cards
    statsEl.querySelectorAll('.clickable-stat[data-stat-type]').forEach(card => {
      card.addEventListener('click', () => {
        this.showEntityListDialog(card.dataset.statType);
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

    return `
      <div class="integration-group integration-card" data-integration="${intName}">
        <div class="integration-header" data-integration="${intName}">
          <div class="integration-logo-container">
            <img class="integration-logo" src="https://brands.home-assistant.io/${encodeURIComponent(integration.integration)}/icon.png" alt="${intName}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 48 48%22><text x=%2224%22 y=%2232%22 font-size=%2224%22 text-anchor=%22middle%22 fill=%22%23999%22>${intInitial}</text></svg>'">
          </div>
          <span class="integration-icon ${isExpanded ? 'expanded' : ''}">›</span>
          <div class="integration-info">
            <div class="integration-name">${intDisplay}</div>
            <div class="integration-stats">${deviceCount} device${deviceCount !== 1 ? 's' : ''} • ${entityCount} entit${entityCount !== 1 ? 'ies' : 'y'} (<span style="color: #4caf50">${enabledCount} enabled</span> / <span style="color: #f44336">${disabledCount} disabled</span>)</div>
          </div>
          <div class="integration-actions">
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

    return `
      <div class="entity-item" data-entity-id="${eid}">
        <div class="entity-item-top">
          <div class="checkbox-group">
            <input type="checkbox" class="entity-checkbox" data-entity-id="${eid}" data-integration="${iid}">
          </div>
          <button class="favorite-btn ${this.favorites.has(entity.entity_id) ? 'is-favorite' : ''}" data-entity-id="${eid}" title="Toggle favorite">
            ${this.favorites.has(entity.entity_id) ? '★' : '☆'}
          </button>
          <div class="entity-info">
            ${alias ? `<div class="entity-alias" style="font-size: 13px; color: var(--em-primary); font-weight: 500;">${this._escapeHtml(alias)}</div>` : ''}
            ${entity.original_name ? `<div class="entity-name">${this._escapeHtml(entity.original_name)}</div>` : ''}
            <div class="entity-id">${this._escapeHtml(entity.entity_id)}</div>
            ${entity.deviceName ? `<div class="entity-device" style="font-size: 12px; color: var(--em-text-secondary); margin-top: 4px;">📱 ${this._escapeHtml(entity.deviceName)}</div>` : ''}
            ${tags.length > 0 ? `<div class="entity-tags-inline">${tags.map(t => `<span class="entity-tag-small">${this._escapeHtml(t)}</span>`).join('')}</div>` : ''}
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
                    <input type="checkbox" class="entity-checkbox" data-entity-id="${eid}" data-integration="${iid}">
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
      header.addEventListener('click', () => {
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

    // Entity checkboxes
    this.content.querySelectorAll('.entity-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          this.selectedEntities.add(checkbox.dataset.entityId);
        } else {
          this.selectedEntities.delete(checkbox.dataset.entityId);
        }
        this.updateSelectedCount();
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
    
    // Favorite buttons
    this.content.querySelectorAll('.favorite-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._toggleFavorite(btn.dataset.entityId);
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
    const enableBtn = this.content.querySelector('#selected-count');
    const disableBtn = this.content.querySelector('#selected-count-2');
    const deselectCount = this.content.querySelector('#deselect-count');
    if (enableBtn) enableBtn.textContent = selectedCount;
    if (disableBtn) disableBtn.textContent = selectedCount;
    if (deselectCount) deselectCount.textContent = selectedCount;
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

  async loadUpdates() {
    this.setLoading(true);
    try {
      // Get all update entities from Home Assistant
      const states = await this._hass.callWS({ type: 'get_states' });
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

    // Apply device/integration type filter
    if (this.selectedUpdateType === 'device') {
      filteredUpdates = filteredUpdates.filter(update => {
        const deviceClass = update.attributes.device_class;
        const entityId = update.entity_id;
        // Device updates typically have device_class or are for specific hardware
        return deviceClass || entityId.includes('device') || update.attributes.title?.toLowerCase().includes('device');
      });
    } else if (this.selectedUpdateType === 'integration') {
      filteredUpdates = filteredUpdates.filter(update => {
        const deviceClass = update.attributes.device_class;
        const entityId = update.entity_id;
        // Integration updates are typically add-ons, HACS, or software updates
        return !deviceClass && (!entityId.includes('device') || update.attributes.title?.toLowerCase().includes('add-on') || update.attributes.title?.toLowerCase().includes('integration'));
      });
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

    content.innerHTML = `
      <div class="update-select-all">
        <label class="select-all-label">
          <input type="checkbox" id="select-all-updates" ${availableUpdates.length === 0 ? 'disabled' : ''}>
          <span>Select All (${availableUpdates.length})</span>
        </label>
      </div>
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
            ${releaseUrl ? `<button class="update-btn skip-btn" data-action="release-notes" data-url="${this._escapeAttr(releaseUrl)}">Release Notes</button>` : ''}
            <button class="update-btn" data-action="update" data-entity-id="${this._escapeAttr(entityId)}">Update</button>
          </div>
        ` : ''}
      </div>
    `;
  }

  attachUpdateListeners() {
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
        
        this.showConfirmDialog(
          'Confirm Update',
          `Are you sure you want to update ${title} from version ${currentVersion} to ${latestVersion}?`,
          () => this.performUpdate(entityId)
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
  }

  updateSelectedUpdateCount() {
    const countSpan = this.content?.querySelector('#update-count');
    if (countSpan) {
      countSpan.textContent = this.selectedUpdates.size;
    }
  }

  async performUpdate(entityId) {
    try {
      await this._hass.callService('update', 'install', {
        entity_id: entityId
      });
      
      this._fireEvent('hass-notification', {
        message: `Update started for ${entityId}`,
      });
      
      // Refresh the list after a short delay
      setTimeout(() => this.loadUpdates(), 2000);
    } catch (error) {
      console.error('Error performing update:', error);
      this.showErrorDialog(`Error updating ${entityId}: ${error.message}`);
    }
  }

  confirmBulkUpdate() {
    const count = this.selectedUpdates.size;
    const selectedEntityIds = Array.from(this.selectedUpdates);
    const updateList = selectedEntityIds.map(entityId => {
      const update = this.updateEntities.find(u => u.entity_id === entityId);
      const title = update?.attributes.title || update?.attributes.friendly_name || entityId;
      return `• ${title}`;
    }).join('\n');
    
    this.showConfirmDialog(
      'Confirm Bulk Update',
      `Are you sure you want to update the following ${count} item${count !== 1 ? 's' : ''}?\n\n${updateList}\n\nThis action cannot be undone.`,
      () => this.performBulkUpdate()
    );
  }

  async performBulkUpdate() {
    this.setLoading(true);
    try {
      const updatePromises = Array.from(this.selectedUpdates).map(entityId =>
        this._hass.callService('update', 'install', { entity_id: entityId })
      );
      
      await Promise.all(updatePromises);
      
      this._fireEvent('hass-notification', {
        message: `Started ${this.selectedUpdates.size} update(s)`,
      });
      
      this.selectedUpdates.clear();
      this.updateSelectedUpdateCount();
      
      // Refresh the list after a short delay
      setTimeout(() => this.loadUpdates(), 2000);
    } catch (error) {
      console.error('Error performing bulk update:', error);
      this.showErrorDialog(`Error performing bulk update: ${error.message}`);
    } finally {
      this.setLoading(false);
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
        const integrationItems = this.data.map(integration => {
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
        const deviceGroups = this.data.map(integration => {
          const devices = Object.entries(integration.devices).map(([deviceId, device]) => ({
            id: deviceId,
            name: this.getDeviceName(deviceId),
            meta: `${device.entities.length} entit${device.entities.length !== 1 ? 'ies' : 'y'}`
          }));
          return {
            integration: integration.integration,
            devices
          };
        }).filter(group => group.devices.length > 0);

        entities = deviceGroups.flatMap(group => group.devices.map(device => ({
          id: device.id,
          name: device.name
        })));

        groupedHtml = deviceGroups.map(group => {
          const groupTitle = group.integration.charAt(0).toUpperCase() + group.integration.slice(1);
          const items = group.devices.map(d => `
            <div class="entity-list-item">
              <div class="entity-list-row">
                <span class="entity-list-name">${d.name}</span>
                <span class="entity-list-id-inline">${d.id}</span>
                ${d.meta ? `<span class="entity-list-id-inline">${d.meta}</span>` : ''}
              </div>
            </div>
          `).join('');

          return `
            <div class="entity-list-group">
              <div class="entity-list-group-title">${groupTitle}</div>
              ${items}
            </div>
          `;
        }).join('');
      } else if (type === 'entity') {
        title = 'Entities';
        color = '#ff9800';
        const entityItems = [];
        this.data.forEach(integration => {
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
          allowToggle = true;
          entities = states.filter(s => s.entity_id.startsWith('automation.'))
            .map(s => ({
              id: s.entity_id,
              name: s.attributes.friendly_name || s.entity_id,
              state: s.state
            }));
        } else if (type === 'script') {
          title = 'Scripts';
          color = '#ff9800';
          allowToggle = true;
          entities = states.filter(s => s.entity_id.startsWith('script.'))
            .map(s => ({
              id: s.entity_id,
              name: s.attributes.friendly_name || s.entity_id,
              state: s.state
            }));
        } else if (type === 'helper') {
          title = 'Helpers';
          color = '#9c27b0';
          allowToggle = true;
          const helperPrefixes = ['input_', 'variable.'];
          entities = states.filter(s => helperPrefixes.some(prefix => s.entity_id.startsWith(prefix)))
            .map(s => ({
              id: s.entity_id,
              name: s.attributes.friendly_name || s.entity_id,
              state: s.state
            }));
        } else if (type === 'template') {
          title = 'Templates';
          color = '#ff9800';
          allowToggle = false;
          entities = states.filter(s => s.entity_id.startsWith('template.'))
            .map(s => ({
              id: s.entity_id,
              name: s.attributes.friendly_name || s.entity_id,
              state: s.state
            }));
        } else if (type === 'hacs') {
          title = 'HACS Integration Manager';
          color = '#4caf50';
          allowToggle = false;
          
          // Get HACS entity only
          const hacsEntity = states.find(s => s.entity_id === 'update.hacs');
          
          if (hacsEntity) {
            entities = [{
              id: 'update.hacs',
              name: 'HACS Integration Manager',
              meta: `${hacsEntity.state === 'on' ? 'Update available' : 'Up to date'} • v${hacsEntity.attributes?.installed_version || 'unknown'}`,
              state: hacsEntity.state
            }];
          } else {
            entities = [{
              id: 'hacs-not-found',
              name: 'HACS Integration not found',
              meta: 'Install HACS from https://hacs.xyz'
            }];
          }
        } else if (type === 'lovelace') {
          title = 'Lovelace Cards';
          color = '#9c27b0';
          allowToggle = false;
          try {
            const dashboards = await this._hass.callWS({ type: 'lovelace/dashboards/list' });
            const cardList = [];
            for (const dashboard of (dashboards || [])) {
              try {
                const config = await this._hass.callWS({ type: 'lovelace/config', dashboard_id: dashboard.id });
                const dashboardName = dashboard.title || dashboard.id;
                (config?.views || []).forEach((view, viewIdx) => {
                  (view.cards || []).forEach((card, cardIdx) => {
                    cardList.push({
                      id: `${dashboard.id}-view${viewIdx}-card${cardIdx}`,
                      name: `${dashboardName} > ${view.title || 'View ' + (viewIdx + 1)} > ${card.type || 'custom card'}`,
                      meta: card.type || 'unknown'
                    });
                  });
                });
              } catch (e) {
                // Skip dashboard on error
              }
            }
            entities = cardList.slice(0, 500); // Limit to 500 cards for display
          } catch (e) {
            entities = [{ id: 'error', name: 'Error loading Lovelace config', meta: e.message }];
          }
        }
      }
      
      // Sort by name
      entities.sort((a, b) => a.name.localeCompare(b.name));
      
      const entityList = entities.map(e => `
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

      // Info buttons - open HA's more-info dialog
      overlay.querySelectorAll('.entity-list-action-btn.info-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const entityId = btn.dataset.entityId;
          const event = new CustomEvent('hass-more-info', {
            detail: { entityId },
            bubbles: true,
            composed: true,
          });
          document.querySelector('home-assistant')?.dispatchEvent(event) ||
            this.dispatchEvent(event);
        });
      });

      // Edit buttons - navigate to HA's edit page
      overlay.querySelectorAll('.entity-list-action-btn.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const entityId = btn.dataset.entityId;
          const entityType = btn.dataset.entityType;
          let editPath = '';

          if (entityType === 'automation') {
            // automation.my_auto -> my_auto
            const autoId = entityId.replace('automation.', '');
            editPath = `/config/automation/edit/${autoId}`;
          } else if (entityType === 'script') {
            const scriptId = entityId.replace('script.', '');
            editPath = `/config/script/edit/${scriptId}`;
          } else if (entityType === 'helper') {
            editPath = `/config/helpers`;
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
