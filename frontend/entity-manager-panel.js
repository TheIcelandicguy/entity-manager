// Entity Manager Panel - Updated UI v2.0
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
    this._undoStack = []; // Undo history for bulk operations
    this._undoTimeout = null;

    // Listen for theme changes
    this._themeObserver = new MutationObserver(() => {
      this.updateTheme();
    });

    // Keyboard shortcut handler
    this._keyHandler = (e) => {
      // Escape: close any open dialog
      if (e.key === 'Escape') {
        const overlay = document.querySelector('.confirm-dialog-overlay');
        if (overlay) {
          document.body.classList.remove('em-dialog-open');
          overlay.remove();
        }
      }
      // Ctrl+A / Cmd+A: select all visible entities
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        // Only act when not in a text input and entities view is active
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (this.viewState === 'updates') return;
        e.preventDefault();
        this.selectAllVisible();
      }
    };
  }

  connectedCallback() {
    // Observe theme changes on document
    this._themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'class']
    });
    this.updateTheme();
    document.addEventListener('keydown', this._keyHandler);
  }

  disconnectedCallback() {
    if (this._themeObserver) {
      this._themeObserver.disconnect();
    }
    if (this._domainOutsideHandler) {
      document.removeEventListener('click', this._domainOutsideHandler);
      this._domainOutsideHandler = null;
    }
    document.removeEventListener('keydown', this._keyHandler);
    if (this._undoTimeout) clearTimeout(this._undoTimeout);
  }

  updateTheme() {
    // Detect dark mode from Home Assistant theme
    const isDark = 
      document.documentElement.getAttribute('data-theme') === 'dark' ||
      getComputedStyle(document.documentElement).getPropertyValue('--primary-background-color')?.includes('1') ||
      getComputedStyle(document.documentElement).getPropertyValue('--primary-background-color')?.includes('2') ||
      getComputedStyle(document.documentElement).getPropertyValue('--primary-text-color')?.includes('fff') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    this.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.content && hass) {
      this.render();
      this.loadData();
    }
  }

  get hass() {
    return this._hass;
  }

  _fireEvent(type, detail = {}) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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
      // Get all states to count automations, scripts, and helpers
      const states = await this._hass.callWS({ type: 'get_states' });
      
      this.automationCount = states.filter(s => s.entity_id.startsWith('automation.')).length;
      this.scriptCount = states.filter(s => s.entity_id.startsWith('script.')).length;
      this.helperCount = states.filter(s => s.entity_id.startsWith('input_')).length +
                         states.filter(s => s.entity_id.startsWith('template.')).length +
                         states.filter(s => s.entity_id.startsWith('variable.')).length;
      this.updateCount = states.filter(s => s.entity_id.startsWith('update.')).length;
      
      this.updateView();
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
    const exportBtn = this.content?.querySelector('#export-btn');

    if (enableBtn) enableBtn.disabled = isLoading;
    if (disableBtn) disableBtn.disabled = isLoading;
    if (refreshBtn) refreshBtn.disabled = isLoading;
    if (exportBtn) exportBtn.disabled = isLoading;

    // Show skeleton while loading initial data
    const contentEl = this.content?.querySelector('#content');
    if (contentEl && isLoading && this.data.length === 0) {
      contentEl.innerHTML = this.renderSkeleton();
    }
  }

  renderSkeleton() {
    const cards = Array.from({ length: 5 }, () => `
      <div class="skeleton-card">
        <div class="skeleton-circle"></div>
        <div class="skeleton-lines">
          <div class="skeleton-line medium"></div>
          <div class="skeleton-line short"></div>
        </div>
      </div>
    `).join('');
    return `<div class="skeleton-container">${cards}</div>`;
  }

  render() {
    // Clear any existing content
    this.innerHTML = '';

    // Create stylesheet with all modern styles
    const styles = document.createElement('style');
    styles.innerHTML = `
      entity-manager-panel {
        display: block;
        font-family: var(--paper-font-body1_-_font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
      }
      
      /* Global defaults so overlays appended to body can see these vars */
      :root {
        --em-primary: var(--primary-color, #2196f3);
        --em-success: var(--success-color, #4caf50);
        --em-danger: var(--error-color, #f44336);
        --em-warning: var(--warning-color, #ff9800);
        --em-text-primary: var(--primary-text-color, #000000);
        --em-text-secondary: var(--secondary-text-color, #666666);
        --em-bg-primary: var(--card-background-color, #ffffff);
        --em-bg-secondary: var(--secondary-background-color, #ffffff);
        --em-border: var(--divider-color, #e0e0e0);
        --dialog-border-width: 2px;
        --dialog-border-radius: 16px;
      }

      /* Root variables - consistent color scheme */
      entity-manager-panel {
        --em-primary: var(--primary-color, #2196f3);
        --em-success: var(--success-color, #4caf50);
        --em-danger: var(--error-color, #f44336);
        --em-warning: var(--warning-color, #ff9800);
        --em-text-primary: var(--primary-text-color, #000000);
        --em-text-secondary: var(--secondary-text-color, #666666);
        --em-bg-primary: var(--card-background-color, #ffffff);
        --em-bg-secondary: var(--secondary-background-color, #ffffff);
        --em-border: var(--divider-color, #e0e0e0);
        
        /* Global spacing & sizing for all dialogs/popups */
        --dialog-padding: 24px;
        --dialog-border-width: 2px;
        --dialog-border-radius: 16px;
        --dialog-header-padding: 24px 24px 16px 24px;
        --dialog-content-padding: 24px;
        --dialog-actions-padding: 16px 24px 24px 24px;
        --dialog-gap: 12px;
      }
      
      /* Dark mode via data-theme on parent */
      [data-theme="dark"] entity-manager-panel {
        --em-text-primary: #ffffff;
        --em-text-secondary: #cccccc;
        --em-bg-primary: #1e1e1e;
        --em-bg-secondary: #2d2d2d;
      }
      
      /* Dark mode via system preference */
      @media (prefers-color-scheme: dark) {
        entity-manager-panel {
          --em-text-primary: #ffffff;
          --em-text-secondary: #cccccc;
          --em-bg-primary: #1e1e1e;
          --em-bg-secondary: #2d2d2d;
        }
      }
      
      .app-header {
        background: var(--em-bg-primary);
        color: var(--em-text-primary);
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 64px;
        padding: 0 24px;
        box-sizing: border-box;
        position: sticky;
        top: 0;
        z-index: 100;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        border-bottom: 2px solid #1565c0;
      }
      
      .menu-btn {
        background: transparent;
        border: 2px solid #1565c0;
        color: var(--em-text-primary);
        cursor: pointer;
        padding: 8px;
        border-radius: 8px;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .menu-btn:hover {
        background: var(--em-bg-secondary);
        border-color: var(--em-primary);
      }
      
      .menu-btn svg {
        width: 24px;
        height: 24px;
        fill: currentColor;
      }
      
      .app-header-title {
        font-size: 24px;
        font-weight: 600;
        letter-spacing: 0.5px;
        color: var(--em-text-primary);
      }
      
      #main-content {
        padding: var(--dialog-padding);
        max-width: 1600px;
        margin: 0 auto;
        min-height: 100vh;
        background: var(--em-bg-secondary);
      }
      
      .header {
        margin-bottom: 32px;
        animation: slideInDown 0.4s ease;
      }
      
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
      
      .header h1 {
        margin: 0 0 8px 0;
        font-size: 2.5em;
        font-weight: 700;
        color: var(--em-text-primary);
        letter-spacing: -0.5px;
      }
      
      .header p {
        margin: 0;
        color: var(--em-text-secondary);
        font-size: 1em;
        font-weight: 400;
      }
      
      .toolbar {
        display: flex;
        gap: 12px;
        margin-bottom: 24px;
        flex-wrap: wrap;
        align-items: center;
      }
      
      .filter-group {
        display: flex;
        gap: 6px;
        align-items: center;
        background: var(--em-bg-primary);
        padding: 4px;
        border-radius: 12px;
        border: 2px solid #1565c0;
      }
      
      .filter-toggle {
        padding: 10px 16px;
        border: 2px solid #1565c0;
        background: transparent;
        border-radius: 10px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 500;
        color: var(--em-text-secondary);
        transition: all 0.3s ease;
      }
      
      .filter-toggle:hover {
        color: var(--em-text-primary);
        border-color: #2196f3;
      }

      .filter-toggle .filter-count {
        font-weight: 700;
      }

      .filter-toggle[data-filter="enabled"] {
        border-color: #4caf50;
        color: #4caf50;
      }

      .filter-toggle[data-filter="enabled"].active {
        background: #4caf50 !important;
        border-color: #4caf50 !important;
        color: #fff !important;
      }

      .filter-toggle[data-filter="disabled"] {
        border-color: #f44336;
        color: #f44336;
      }

      .filter-toggle[data-filter="disabled"].active {
        background: #f44336 !important;
        border-color: #f44336 !important;
        color: #fff !important;
      }

      .filter-toggle[data-filter="updates"] {
        border-color: #ff9800;
        color: #ff9800;
      }

      .filter-toggle[data-filter="updates"].active {
        background: #ff9800 !important;
        border-color: #ff9800 !important;
        color: #fff !important;
      }
      
      .filter-toggle.active {
        background: #2196f3 !important;
        box-shadow: 0 4px 12px rgba(33, 150, 243, 0.15) !important;
        border-color: #2196f3 !important;
        color: white !important;
      }

      .filter-select {
        padding: 10px 12px;
        border: 2px solid #1565c0;
        border-radius: 10px;
        background: var(--em-bg-primary);
        color: var(--em-text-primary);
        font-weight: 500;
        transition: all 0.3s ease;
        min-width: 160px;
      }

      .domain-dropdown {
        position: relative;
        min-width: 180px;
      }

      .domain-button {
        width: 100%;
        padding: 10px 12px;
        border: 2px solid #1565c0;
        border-radius: 10px;
        background: var(--em-bg-primary) !important;
        color: var(--em-text-primary);
        font-size: 16px;
        font-weight: 500;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .domain-button:hover {
        border-color: #2196f3;
      }

      .domain-button:focus {
        outline: none;
        border-color: #2196f3;
        box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
      }

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
        display: none;
        color: #333;
      }

      .domain-menu.open {
        display: block;
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
        font-weight: 600;
      }

      [data-theme="dark"] .domain-menu {
        background: #1e1e1e !important;
        color: #fff;
        border-color: #2196f3 !important;
      }

      [data-theme="dark"] .domain-option {
        color: #fff;
      }

      [data-theme="dark"] .domain-option:hover {
        background: rgba(33, 150, 243, 0.2);
      }

      .filter-select:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
      }
      
      /* Confirmation Dialog Styles */
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
        overscroll-behavior: contain;
      }

      body.em-dialog-open {
        overflow: hidden;
        height: 100%;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .confirm-dialog-box {
        background: var(--card-background-color, #ffffff) !important;
        border-radius: var(--dialog-border-radius);
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        max-width: 500px;
        width: 90%;
        animation: slideUp 0.3s ease;
        overflow: hidden;
        border: var(--dialog-border-width) solid #1565c0;
      }
      
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
      
      .confirm-dialog-header {
        padding: var(--dialog-header-padding);
        border-bottom: 2px solid var(--divider-color, #e0e0e0);
        background: var(--card-background-color, #ffffff);
      }
      
      .confirm-dialog-header h2 {
        margin: 0;
        font-size: 22px;
        font-weight: 600;
        color: var(--primary-text-color, #333);
      }
      
      .confirm-dialog-content {
        padding: var(--dialog-content-padding);
      }
      
      .confirm-dialog-content p {
        margin: 0;
        font-size: 16px;
        line-height: 1.5;
        color: var(--secondary-text-color, #666);
      }
      
      .confirm-dialog-actions {
        padding: var(--dialog-actions-padding);
        display: flex;
        gap: var(--dialog-gap);
        justify-content: flex-end;
        background: var(--card-background-color, #ffffff);
      }

      .entity-list-dialog .confirm-dialog-actions {
        justify-content: center;
      }
      
      .confirm-dialog-actions .btn {
        min-width: 80px;
      }
      
      .confirm-no {
        background: #e0e0e0 !important;
        color: #333 !important;
      }
      
      .confirm-no:hover {
        background: #d0d0d0 !important;
      }
      
      .entity-list-dialog {
        max-width: 600px;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        border: 2px solid var(--em-primary) !important;
        background: var(--card-background-color) !important;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3) !important;
      }
      
      .entity-list-content {
        padding: 0;
        background: var(--card-background-color, #ffffff);
        overflow-y: auto;
        max-height: 60vh;
      }


      .entity-list-group {
        border-bottom: 1px solid var(--divider-color);
      }

      .entity-list-group-title {
        padding: 12px var(--dialog-padding);
        font-weight: 700;
        font-size: 24px;
        color: var(--em-text-primary);
        background: var(--em-bg-secondary);
        border-bottom: 1px solid var(--divider-color);
      }
      
      .entity-list-item {
        padding: var(--dialog-gap) var(--dialog-padding);
        display: flex;
        flex-direction: column;
        gap: 8px;
        border-bottom: 1px solid var(--divider-color);
        background: var(--card-background-color, #ffffff);
        transition: background 0.2s ease;
      }
      
      .entity-list-item:hover {
        background: var(--em-bg-secondary);
      }
      
      .entity-list-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        border: 1px solid #2196f3;
        border-radius: 6px;
        background: #ffffff;
        width: 100%;
        box-sizing: border-box;
        flex-wrap: wrap;
      }
      
      .entity-list-name {
        flex: 1;
        font-weight: 600;
        color: #000000;
        min-width: 0;
        word-break: break-word;
      }
      
      .entity-list-id {
        font-size: 12px;
        color: var(--secondary-text-color);
        font-family: monospace;
        padding-left: 2px;
      }

      .entity-list-id-inline {
        font-size: 12px;
        color: var(--secondary-text-color, #757575);
        font-family: monospace;
        margin-left: 8px;
        white-space: normal;
        word-break: break-all;
        overflow-wrap: anywhere;
        opacity: 0.9;
      }

      .entity-list-row .entity-list-toggle {
        margin-left: auto;
      }

      @media (max-width: 480px) {
        .entity-list-name {
          flex-basis: 100%;
        }

        .entity-list-id-inline {
          flex-basis: 100%;
          margin-left: 0;
          margin-top: 4px;
        }

        .entity-list-row .entity-list-toggle {
          margin-left: auto;
          margin-top: 6px;
        }
      }
      
      .entity-list-toggle {
        padding: 4px 10px;
        border-radius: 14px;
        font-size: 11px;
        font-weight: 700;
        color: white;
        border: 2px solid transparent;
        cursor: pointer;
        text-transform: uppercase;
        white-space: nowrap;
        transition: all 0.2s ease;
      }
      
      .entity-list-toggle.on {
        background: #4caf50;
        border-color: #4caf50;
      }
      
      .entity-list-toggle.off {
        background: #f44336;
        border-color: #f44336;
      }

      .entity-list-toggle:hover {
        opacity: 0.8;
      }
      
      [data-theme="dark"] .confirm-no {
        background: #444 !important;
        color: #fff !important;
      }
      
      [data-theme="dark"] .confirm-no:hover {
        background: #555 !important;
      }

      .confirm-dialog-overlay[data-theme="dark"] .confirm-dialog-box {
        background: #2c2c2c !important;
        color: #fff;
      }

      .confirm-dialog-overlay[data-theme="dark"] .confirm-dialog-header {
        background: #2c2c2c;
        border-bottom-color: #444;
      }

      .confirm-dialog-overlay[data-theme="dark"] .confirm-dialog-header h2 {
        color: #fff;
      }

      .confirm-dialog-overlay[data-theme="dark"] .confirm-dialog-content {
        background: #2c2c2c;
      }

      .confirm-dialog-overlay[data-theme="dark"] .confirm-dialog-content p {
        color: #ccc;
      }

      .confirm-dialog-overlay[data-theme="dark"] .confirm-dialog-actions {
        background: #2c2c2c;
        border-top-color: #444;
      }

      .confirm-dialog-overlay[data-theme="dark"] .entity-list-content {
        background: #2c2c2c;
      }

      .confirm-dialog-overlay[data-theme="dark"] .entity-list-item {
        background: #2c2c2c;
        border-bottom-color: #444;
      }

      .confirm-dialog-overlay[data-theme="dark"] .entity-list-group-title {
        background: #1e1e1e;
        color: #fff;
        border-bottom-color: #444;
      }

      .confirm-dialog-overlay[data-theme="dark"] .entity-list-row {
        background: #1e1e1e;
        border-color: #2196f3;
      }

      .confirm-dialog-overlay[data-theme="dark"] .entity-list-name {
        color: #fff;
      }

      .confirm-dialog-overlay[data-theme="dark"] .entity-list-id,
      .confirm-dialog-overlay[data-theme="dark"] .entity-list-id-inline {
        color: #ccc;
      }

      .confirm-dialog-overlay[data-theme="dark"] .btn-secondary {
        background: #1e1e1e;
        color: #fff;
        border-color: #2196f3;
      }
      
      .confirm-yes {
        background: #2196f3 !important;
        color: #fff !important;
      }
      
      .confirm-yes:hover {
        background: #1976d2 !important;
      }
      
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

      .search-box {
        flex: 1;
        min-width: 280px;
        padding: 12px 16px;
        border: 2px solid #1565c0;
        border-radius: 12px;
        font-size: 18px;
        background: var(--em-bg-primary);
        color: var(--em-text-primary);
        transition: all 0.3s ease;
        font-family: var(--paper-font-body1_-_font-family);
      }
      
      .search-box:focus {
        outline: none;
        border-color: var(--em-primary);
        box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
      }
      
      .search-box::placeholder {
        color: var(--em-text-secondary);
      }
      
      .hide-uptodate-label {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: var(--em-bg-secondary);
        border: 2px solid var(--em-border);
        border-radius: 12px;
        color: var(--em-text-primary);
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        user-select: none;
      }
      
      .hide-uptodate-label:hover {
        background: rgba(33, 150, 243, 0.1);
      }
      
      .hide-uptodate-label input[type="checkbox"] {
        cursor: pointer;
        width: 18px;
        height: 18px;
        accent-color: var(--em-primary);
      }
      
      .btn {
        padding: 10px 20px;
        border: 2px solid transparent;
        border-radius: 10px;
        cursor: pointer;
        font-size: 18px;
        font-weight: 600;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      
      .btn:active {
        transform: scale(0.98);
      }
      
      .btn-primary {
        background: linear-gradient(135deg, #2196f3, #1976d2) !important;
        color: white !important;
        border: 2px solid #1565c0 !important;
      }
      
      .btn-primary:hover {
        box-shadow: 0 6px 20px rgba(33, 150, 243, 0.4) !important;
      }
      
      .btn-secondary {
        background: var(--em-bg-primary);
        color: var(--em-text-primary);
        border: 2px solid #1565c0;
        padding: 10px 20px;
        border-radius: 10px;
        font-size: 18px;
        font-weight: 600;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
      }
      
      .btn-secondary:hover {
        background: var(--em-bg-secondary);
        border-color: #2196f3;
      }
      
      .btn-secondary.enable-integration {
        color: var(--em-success) !important;
        border: 2px solid var(--em-success) !important;
      }
      
      .btn-secondary.enable-integration:hover {
        background: var(--em-success) !important;
        color: white !important;
        border-color: var(--em-success) !important;
      }
      
      .btn-secondary.disable-integration {
        color: var(--em-danger) !important;
        border: 2px solid var(--em-danger) !important;
      }
      
      .btn-secondary.disable-integration:hover {
        background: var(--em-danger) !important;
        color: white !important;
        border-color: var(--em-danger) !important;
      }
      
      .btn-success {
        background: var(--em-success) !important;
        color: white !important;
        border: 2px solid var(--em-success) !important;
      }
      
      .btn-success:hover {
        opacity: 0.8;
      }
      
      .stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }
      
      .stat-card {
        background: var(--card-background-color);
        padding: 24px;
        border-radius: 16px;
        border: 2px solid var(--em-primary);
        box-shadow: 0 2px 8px rgba(33, 150, 243, 0.15), inset 0 0 0 1px rgba(33, 150, 243, 0.1);
        transition: all 0.3s ease;
        text-align: center;
        flex: 1 1 auto;
        min-width: 120px;
      }
      
      .stat-card:hover {
        border-color: var(--primary-color);
        box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3), inset 0 0 0 1px rgba(33, 150, 243, 0.2);
        transform: translateY(-2px);
      }
      
      .clickable-stat {
        cursor: pointer;
      }
      
      .clickable-stat:hover {
        transform: translateY(-4px);
        box-shadow: 0 6px 16px rgba(33, 150, 243, 0.4), inset 0 0 0 2px rgba(33, 150, 243, 0.3);
      }
      
      .stat-label {
        color: var(--secondary-text-color);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 6px;
        font-weight: 600;
      }
      
      .stat-value {
        font-size: 24px;
        font-weight: 700;
        color: #2196f3 !important;
      }
      
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
      
      .integration-logo-container {
        width: 48px;
        height: 48px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(var(--rgb-primary-color, 33, 150, 243), 0.1);
        margin-right: 16px;
        flex-shrink: 0;
      }
      
      .integration-logo {
        width: 40px;
        height: 40px;
        object-fit: contain;
      }
      
      .integration-header {
        display: flex;
        align-items: center;
        padding: 18px 20px;
        cursor: pointer;
        user-select: none;
        border-bottom: 1px solid var(--divider-color);
        transition: background 0.2s ease;
      }
      
      .integration-header:hover {
        background: var(--secondary-background-color);
      }
      
      .integration-icon {
        margin-right: 12px;
        transition: transform 0.3s ease;
        font-size: 18px;
        color: var(--primary-color) !important;
      }
      
      .integration-icon.expanded {
        transform: rotate(90deg);
      }
      
      .integration-info {
        flex: 1;
      }
      
      .integration-name {
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 4px;
        color: var(--primary-text-color);
      }
      
      .integration-stats {
        font-size: 15px;
        color: var(--secondary-text-color);
        font-weight: 500;
      }
      
      .integration-actions {
        display: flex;
        gap: 8px;
      }
      
      .device-list {
        padding: 12px 20px 20px 20px;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 12px;
      }
      
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
        box-shadow: 0 2px 8px rgba(var(--rgb-primary-color, 33, 150, 243), 0.3);
      }
      
      .device-header {
        display: flex;
        align-items: center;
        padding: 14px 12px;
        cursor: pointer;
        user-select: none;
        background: var(--secondary-background-color);
        transition: background 0.2s ease;
        border-bottom: 2px solid var(--primary-color);
      }
      
      .device-header:hover {
        background: var(--divider-color);
      }
      
      .device-name {
        flex: 1;
        font-weight: 600;
        color: var(--primary-text-color);
        font-size: 1.25em;
      }
      
      .device-count {
        font-size: 15px;
        color: var(--secondary-text-color);
        margin-right: 12px;
        font-weight: 500;
      }
      
      .entity-list {
        padding: 8px 12px 12px 12px;
        background: var(--secondary-background-color);
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 12px;
        border: 2px solid #2196f3;
      }
      
      .entity-item {
        display: flex;
        align-items: center;
        padding: 12px 10px;
        border-radius: 8px;
        border: 2px solid var(--em-primary);
        background: var(--em-bg-primary);
        transition: all 0.2s ease;
        flex: 1 1 300px;
        gap: 8px;
      }
      
      .entity-item:hover {
        background: var(--em-bg-secondary);
        border-color: var(--em-primary);
      }
      
      .entity-checkbox {
        margin-right: 12px;
        cursor: pointer;
        accent-color: var(--primary-color);
      }
      
      .entity-info {
        flex: 1;
      }
      
      .entity-id {
        font-size: 16px;
        font-weight: 500;
        color: var(--em-text-primary);
      }
      
      .entity-name {
        font-size: 14px;
        color: var(--em-text-secondary);
        margin-top: 2px;
      }
      
      .entity-badge {
        font-size: 10px;
        padding: 4px 8px;
        border-radius: 6px;
        background: var(--em-primary) !important;
        color: white !important;
        margin-left: 8px;
        font-weight: 600;
      }
      
      .entity-actions {
        display: flex;
        gap: 4px;
      }
      
      .icon-btn {
        padding: 8px 12px;
        border: 2px solid #e0e0e0;
        background: #f5f5f5 !important;
        color: var(--em-text-primary);
        cursor: pointer;
        border-radius: 8px;
        font-weight: 600;
        transition: all 0.2s ease;
        font-size: 1.25em;
      }
      
      .icon-btn.rename-entity {
        color: var(--em-primary) !important;
        border-color: var(--em-primary) !important;
      }
      
      .icon-btn.rename-entity:hover {
        background: var(--em-primary) !important;
        color: white !important;
      }
      
      .icon-btn.enable-entity {
        color: var(--em-success) !important;
        border-color: var(--em-success) !important;
      }
      
      .icon-btn.enable-entity:hover {
        background: var(--em-success) !important;
        color: white !important;
      }
      
      .icon-btn.disable-entity {
        color: var(--em-danger) !important;
        border-color: var(--em-danger) !important;
      }
      
      .icon-btn.disable-entity:hover {
        background: var(--em-danger) !important;
        color: white !important;
      }
      
      .empty-state {
        text-align: center;
        padding: 64px 32px;
        color: var(--secondary-text-color);
      }
      
      .empty-state h2 {
        font-size: 24px;
        margin-bottom: 12px;
        color: var(--primary-text-color);
      }
      
      .checkbox-group {
        display: flex;
        align-items: center;
        margin-right: 12px;
      }
      
      /* Undo Toast */
      .undo-toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--em-bg-primary, #333);
        color: var(--em-text-primary, #fff);
        border: 2px solid var(--em-primary, #2196f3);
        border-radius: 12px;
        padding: 12px 20px;
        display: flex;
        align-items: center;
        gap: 16px;
        z-index: 10000;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.3s ease;
        font-size: 14px;
      }

      .undo-toast .undo-btn {
        background: var(--em-primary, #2196f3);
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 6px 16px;
        font-weight: 600;
        cursor: pointer;
        font-size: 14px;
        transition: opacity 0.2s;
      }

      .undo-toast .undo-btn:hover {
        opacity: 0.85;
      }

      .undo-toast .undo-dismiss {
        background: transparent;
        border: none;
        color: var(--em-text-secondary, #999);
        cursor: pointer;
        font-size: 18px;
        padding: 0 4px;
        line-height: 1;
      }

      @keyframes slideUp {
        from { transform: translateX(-50%) translateY(40px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }

      /* Loading Skeleton */
      .skeleton-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 8px 0;
      }

      .skeleton-card {
        background: var(--em-bg-primary);
        border: 2px solid var(--em-border);
        border-radius: 12px;
        padding: 20px;
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .skeleton-circle {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: linear-gradient(90deg, var(--em-border) 25%, var(--em-bg-secondary) 50%, var(--em-border) 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        flex-shrink: 0;
      }

      .skeleton-lines {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .skeleton-line {
        height: 14px;
        border-radius: 4px;
        background: linear-gradient(90deg, var(--em-border) 25%, var(--em-bg-secondary) 50%, var(--em-border) 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
      }

      .skeleton-line.short { width: 40%; }
      .skeleton-line.medium { width: 70%; }
      .skeleton-line.long { width: 90%; }

      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      /* Update List Styles */
      .update-select-all {
        margin-bottom: 12px;
      }

      .select-all-label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: var(--em-bg-primary);
        border: 2px solid var(--em-primary);
        border-radius: 10px;
        color: var(--em-text-primary);
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        user-select: none;
      }

      .select-all-label:hover {
        background: rgba(33, 150, 243, 0.1);
      }

      .select-all-label input[type="checkbox"] {
        cursor: pointer;
        width: 18px;
        height: 18px;
        accent-color: var(--em-primary);
      }

      .select-all-label input[type="checkbox"]:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }

      .update-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .update-item {
        background: var(--em-bg-primary);
        border: 2px solid var(--em-border);
        border-radius: 12px;
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 16px;
        transition: all 0.2s ease;
      }
      
      .update-item:hover {
        background: var(--em-bg-secondary);
        box-shadow: 0 4px 12px rgba(33, 150, 243, 0.2);
      }
      
      .update-item.has-update {
        border-left: 4px solid var(--em-warning);
      }
      
      .update-item.beta {
        border-left: 4px solid var(--em-primary);
      }
      
      .update-checkbox {
        cursor: pointer;
        accent-color: var(--em-primary);
        width: 20px;
        height: 20px;
      }
      
      .update-icon {
        width: 48px;
        height: 48px;
        border-radius: 8px;
        background: rgba(33, 150, 243, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        flex-shrink: 0;
      }
      
      .update-info {
        flex: 1;
        min-width: 0;
      }
      
      .update-title {
        font-size: 18px;
        font-weight: 600;
        color: var(--em-text-primary);
        margin-bottom: 4px;
      }
      
      .update-details {
        font-size: 14px;
        color: var(--em-text-secondary);
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
      }
      
      .update-version {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .version-badge {
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
      }
      
      .version-badge.current {
        background: rgba(33, 150, 243, 0.15);
        color: var(--em-primary);
      }
      
      .version-badge.latest {
        background: rgba(76, 175, 80, 0.15);
        color: var(--em-success);
      }
      
      .version-badge.beta {
        background: rgba(255, 152, 0, 0.15);
        color: var(--em-warning);
      }
      
      .update-actions {
        display: flex;
        gap: 8px;
      }
      
      .update-btn {
        padding: 8px 16px;
        border: 2px solid var(--em-success);
        background: var(--em-success);
        color: white;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s ease;
      }
      
      .update-btn:hover {
        opacity: 0.8;
      }
      
      .update-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .skip-btn {
        background: transparent;
        color: var(--em-text-secondary);
        border-color: var(--em-border);
      }
      
      .skip-btn:hover {
        background: var(--em-bg-secondary);
        color: var(--em-text-primary);
      }
      
      /* Mobile Responsive Styles */
      @media (max-width: 768px) {
        #main-content {
          padding: 8px;
        }
        
        .app-header {
          padding: 0 8px;
          height: 56px;
        }
        
        .app-header-title {
          font-size: 18px;
        }
        
        .header {
          margin-bottom: 12px;
        }
        
        .header h1 {
          font-size: 1.3em;
          margin-bottom: 2px;
        }
        
        .header p {
          font-size: 0.8em;
        }
        
        #stats {
          gap: 6px;
          margin-bottom: 10px;
        }
        
        .stat-card {
          padding: 10px;
          border-radius: 8px;
          min-width: 80px;
        }
        
        .stat-label {
          font-size: 8px;
          margin-bottom: 4px;
        }
        
        .stat-value {
          font-size: 18px;
        }
        
        .toolbar {
          flex-direction: row;
          gap: 6px;
          margin-bottom: 12px;
          row-gap: 8px;
        }
        
        .filter-group {
          width: 100%;
          justify-content: space-between;
          gap: 4px;
          padding: 3px;
        }
        
        .filter-toggle {
          flex: 1;
          padding: 6px 6px;
          font-size: 12px;
          min-width: 0;
        }
        
        .domain-dropdown {
          flex: 0 1 auto;
          min-width: 100px;
        }
        
        .domain-button {
          padding: 6px 10px !important;
          font-size: 12px !important;
          white-space: nowrap;
        }
        
        .domain-menu {
          font-size: 13px !important;
        }
        
        .domain-option {
          padding: 8px 10px !important;
        }
        
        .hide-uptodate-label {
          flex: 0 1 auto;
          padding: 6px 10px;
          font-size: 12px;
          gap: 6px;
          border-radius: 8px;
          white-space: nowrap;
        }
        
        .hide-uptodate-label input[type="checkbox"] {
          width: 16px;
          height: 16px;
        }
        
        .search-box {
          width: 100%;
          font-size: 13px;
          padding: 8px 10px;
          flex-basis: 100%;
        }
        
        .btn {
          flex: 1 1 auto;
          font-size: 11px;
          padding: 8px 10px;
          min-width: 70px;
        }
        
        .integration-group {
          margin-bottom: 10px;
          border-left-width: 3px;
        }
        
        .integration-header {
          padding: 10px 8px;
          flex-wrap: wrap;
        }
        
        .integration-logo-container {
          width: 32px;
          height: 32px;
          margin-right: 8px;
        }
        
        .integration-logo {
          width: 24px;
          height: 28px;
        }
        
        .integration-icon {
          font-size: 16px;
          margin-right: 8px;
        }
        
        .integration-info {
          flex: 1;
          min-width: 0;
        }
        
        .integration-name {
          font-size: 16px;
          margin-bottom: 2px;
        }
        
        .integration-stats {
          font-size: 12px;
        }
        
        .integration-actions {
          flex-basis: 100%;
          margin-top: 8px;
          gap: 6px;
          flex-wrap: nowrap;
        }
        
        .integration-actions .btn {
          font-size: 12px;
          padding: 8px 12px;
          white-space: nowrap;
        }
        
        .device-list {
          padding: 8px;
          gap: 8px;
          background: var(--em-bg-secondary);
        }
        
        .device-item {
          min-width: unset;
          width: 100%;
          border: 2px solid var(--em-border);
          background: var(--em-bg-primary);
        }
        
        .device-header {
          padding: 10px;
          flex-wrap: wrap;
        }
        
        .device-name {
          font-size: 1em;
          flex-basis: 100%;
          margin-bottom: 4px;
        }
        
        .device-count {
          font-size: 12px;
        }
        
        .entity-list {
          padding: 6px;
          gap: 6px;
          background: var(--em-bg-secondary);
          border: 2px solid var(--em-border);
        }
        
        .entity-item {
          flex: 1 1 100%;
          padding: 8px;
          font-size: 1em;
          gap: 6px;
          display: grid;
          grid-template-columns: auto 1fr;
          grid-template-rows: auto auto;
          border: 2px solid var(--em-border) !important;
          background: var(--em-bg-primary);
        }
        
        .entity-item:hover {
          background: var(--em-bg-secondary);
          border-color: var(--em-border) !important;
        }
        
        .update-item {
          padding: 10px;
          gap: 12px;
          flex-wrap: wrap;
        }
        
        .update-icon {
          width: 36px;
          height: 36px;
          font-size: 18px;
        }
        
        .update-info {
          min-width: 100%;
          flex-basis: 100%;
        }
        
        .update-title {
          font-size: 14px;
        }
        
        .update-details {
          font-size: 12px;
          gap: 8px;
        }
        
        .version-badge {
          font-size: 10px;
          padding: 2px 6px;
        }
        
        .update-actions {
          flex-basis: 100%;
          gap: 6px;
        }
        
        .update-btn {
          padding: 6px 12px;
          font-size: 12px;
          flex: 1;
          min-width: 0;
        }
        
        .entity-checkbox {
          grid-row: 1 / 3;
          margin-right: 8px;
          margin-top: 2px;
        }
        
        .entity-info {
          grid-column: 2;
          grid-row: 1;
          width: 100%;
          word-break: break-word;
          overflow-wrap: break-word;
          min-width: 0;
        }
        
        .entity-id {
          font-size: 13px;
          word-break: break-all;
        }
        
        .entity-name {
          font-size: 12px;
        }
        
        .entity-badge {
          font-size: 9px;
          padding: 2px 6px;
          margin-left: 6px;
          display: inline-block;
        }
        
        .entity-actions {
          grid-column: 2;
          grid-row: 2;
          display: flex;
          justify-content: flex-end;
          gap: 4px;
          margin-top: 6px;
        }
        
        .icon-btn {
          padding: 6px 10px;
          font-size: 0.95em;
        }
        
        .confirm-dialog-box {
          width: 95%;
          margin: 0 10px;
        }
        
        .confirm-dialog-header {
          padding: 16px;
        }
        
        .confirm-dialog-header h2 {
          font-size: 18px;
        }
        
        .confirm-dialog-content {
          padding: 16px;
          font-size: 14px;
        }
        
        .confirm-dialog-actions {
          padding: 12px 16px;
          gap: 8px;
        }
        
        .empty-state {
          padding: 32px 16px;
        }
        
        .empty-state h2 {
          font-size: 20px;
        }
      }
      
      @media (max-width: 480px) {
        .app-header {
          padding: 0 6px;
        }
        
        .app-header-title {
          font-size: 14px;
        }
        
        .menu-btn {
          padding: 6px;
        }
        
        .header h1 {
          font-size: 1.2em;
          margin-bottom: 2px;
        }
        
        .header p {
          font-size: 0.75em;
        }
        
        #stats {
          gap: 4px;
          margin-bottom: 8px;
        }
        
        .stat-card {
          padding: 6px;
          border-radius: 6px;
          min-width: 60px;
        }
        
        .stat-label {
          font-size: 7px;
          margin-bottom: 2px;
        }
        
        .stat-value {
          font-size: 14px;
        }
        
        .toolbar {
          gap: 4px;
          margin-bottom: 8px;
        }
        
        .filter-group {
          gap: 2px;
          padding: 2px;
        }
        
        .filter-toggle {
          font-size: 10px;
          padding: 5px 4px;
          min-width: 0;
        }
        
        .domain-dropdown {
          min-width: 80px;
        }
        
        .domain-button {
          padding: 5px 8px !important;
          font-size: 10px !important;
        }
        
        .domain-menu {
          font-size: 12px !important;
          max-height: 200px !important;
        }
        
        .domain-option {
          padding: 6px 8px !important;
        }
        
        .hide-uptodate-label {
          padding: 5px 8px;
          font-size: 10px;
          gap: 4px;
        }
        
        .hide-uptodate-label input[type="checkbox"] {
          width: 14px;
          height: 14px;
        }
        
        .search-box {
          font-size: 12px;
          padding: 6px 8px;
        }
        
        .btn {
          font-size: 10px;
          padding: 6px 8px;
          min-width: 60px;
        }
        
        .integration-name {
          font-size: 13px;
        }
        
        .integration-stats {
          font-size: 10px;
        }
        
        .integration-actions .btn {
          font-size: 10px;
          padding: 5px 8px;
        }
        
        .device-name {
          font-size: 0.9em;
        }
        
        .entity-id {
          font-size: 11px;
        }
        
        .entity-name {
          font-size: 10px;
        }
        
        .icon-btn {
          padding: 4px 6px;
          font-size: 0.85em;
        }
        
        .update-item {
          padding: 8px;
          gap: 8px;
        }
        
        .update-icon {
          width: 28px;
          height: 28px;
          font-size: 14px;
        }
        
        .update-title {
          font-size: 12px;
        }
        
        .update-details {
          font-size: 10px;
          gap: 6px;
        }
        
        .version-badge {
          font-size: 9px;
          padding: 1px 4px;
        }
        
        .update-btn {
          padding: 5px 10px;
          font-size: 10px;
        }
      }
    `;
    document.head.appendChild(styles);
    
    // Prepend styles to panel itself for proper scoping
    this.insertBefore(styles.cloneNode(true), this.firstChild);

    // Create app header
    const header = document.createElement('div');
    header.className = 'app-header';
    header.innerHTML = `
      <button class="menu-btn" id="menu-btn" aria-label="Menu">
        <svg viewBox="0 0 24 24"><path d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z" fill="currentColor"/></svg>
      </button>
      <span class="app-header-title">Entity Manager</span>
    `;
    this.appendChild(header);

    // Create main content area
    this.content = document.createElement('div');
    this.content.id = 'main-content';
    this.appendChild(this.content);

    // Fill content with HTML
    this.content.innerHTML = `
      <div class="header">
        <h1>Entity Manager</h1>
        <p>Manage disabled entities by integration and device</p>
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
        <button class="btn btn-success" id="update-selected" style="display: none;">
          Update Selected (<span id="update-count">0</span>)
        </button>
        <button class="btn btn-secondary" id="refresh">Refresh</button>
        <button class="btn btn-secondary" id="export-btn" title="Export entity states as JSON">Export</button>
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

    // Handle search
    const searchInput = this.content.querySelector('#search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value.toLowerCase();
        this.updateView();
      });
    }

    // Handle filter buttons
    this.content.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.viewState = btn.dataset.filter;
        this.setActiveFilter();
        
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

    const refreshBtn = this.content.querySelector('#refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadData());
    }

    const exportBtn = this.content.querySelector('#export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportEntityStates());
    }

    this.setActiveFilter();
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
    
    // Apply domain and search filters
    if (hasDomainFilter || hasSearch) {
      filteredData = this.data.map(integration => {
        const filteredDevices = {};
        Object.entries(integration.devices).forEach(([deviceId, device]) => {
          // Filter entities by domain and search
          const filteredEntities = device.entities.filter(entity => {
            const matchesDomain = !hasDomainFilter || entity.entity_id.startsWith(`${this.selectedDomain}.`);
            if (!matchesDomain) return false;

            if (!hasSearch) return true;

            const entityId = entity.entity_id.toLowerCase();
            const originalName = entity.original_name ? entity.original_name.toLowerCase() : '';
            const integrationName = integration.integration.toLowerCase();
            const deviceName = this.getDeviceName(deviceId).toLowerCase();

            return (
              entityId.includes(this.searchTerm) ||
              originalName.includes(this.searchTerm) ||
              integrationName.includes(this.searchTerm) ||
              deviceName.includes(this.searchTerm)
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
      <div class="stat-card">
        <div class="stat-label">Automations</div>
        <div class="stat-value" style="color: #2196f3 !important;">${this.automationCount}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Scripts</div>
        <div class="stat-value" style="color: #2196f3 !important;">${this.scriptCount}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Helpers</div>
        <div class="stat-value" style="color: #2196f3 !important;">${this.helperCount}</div>
      </div>
    `;

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
        emptyDesc = `No entities match "${this.searchTerm}"`;
      } else if (hasDomainFilter) {
        emptyMessage = 'No entities in domain';
        emptyDesc = `No entities found for domain "${this.selectedDomain}"`;
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

    const sortedData = [...filteredData].sort((a, b) =>
      a.integration.localeCompare(b.integration, undefined, { sensitivity: 'base' })
    );

    contentEl.innerHTML = sortedData.map(integration =>
      this.renderIntegration(integration)
    ).join('');

    // Re-attach event listeners for integration headers and entity checkboxes
    this.attachIntegrationListeners();
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

    return `
      <div class="integration-group">
        <div class="integration-header" data-integration="${integration.integration}">
          <div class="integration-logo-container">
            <img class="integration-logo" src="https://brands.home-assistant.io/${encodeURIComponent(integration.integration)}/icon.png" alt="${this.escapeHtml(integration.integration)}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 48 48%22><text x=%2224%22 y=%2232%22 font-size=%2224%22 text-anchor=%22middle%22 fill=%22%23999%22>${this.escapeHtml(integration.integration.charAt(0).toUpperCase())}</text></svg>'">
          </div>
          <span class="integration-icon ${isExpanded ? 'expanded' : ''}">›</span>
          <div class="integration-info">
            <div class="integration-name">${this.escapeHtml(integration.integration.charAt(0).toUpperCase() + integration.integration.slice(1))}</div>
            <div class="integration-stats">${deviceCount} device${deviceCount !== 1 ? 's' : ''} • ${entityCount} entit${entityCount !== 1 ? 'ies' : 'y'} (<span style="color: #4caf50">${enabledCount} enabled</span> / <span style="color: #f44336">${disabledCount} disabled</span>)</div>
          </div>
          <div class="integration-actions">
            <button class="btn btn-secondary enable-integration" data-integration="${integration.integration}">Enable All</button>
            <button class="btn btn-secondary disable-integration" data-integration="${integration.integration}">Disable All</button>
          </div>
        </div>
        ${isExpanded ? `
          <div class="entity-list">
            ${allEntities.map(entity => `
              <div class="entity-item">
                <div class="checkbox-group">
                  <input type="checkbox" class="entity-checkbox" data-entity-id="${entity.entity_id}" data-integration="${integration.integration}">
                </div>
                <div class="entity-info">
                  ${entity.original_name ? `<div class="entity-name">${this.escapeHtml(entity.original_name)}</div>` : ''}
                  <div class="entity-id">${this.escapeHtml(entity.entity_id)}</div>
                  <div class="entity-device" style="font-size: 12px; color: var(--em-text-secondary); margin-top: 4px;">📱 ${this.escapeHtml(entity.deviceName)}</div>
                </div>
                <span class="entity-badge" style="background: ${entity.is_disabled ? '#f44336' : '#4caf50'} !important;">${entity.is_disabled ? 'Disabled' : 'Enabled'}</span>
                <div class="entity-actions">
                  <button class="icon-btn rename-entity" data-entity-id="${entity.entity_id}" title="Rename">✎</button>
                  <button class="icon-btn enable-entity" data-entity-id="${entity.entity_id}" title="Enable">✓</button>
                  <button class="icon-btn disable-entity" data-entity-id="${entity.entity_id}" title="Disable">✕</button>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  renderDevice(deviceId, device, integration) {
    const isExpanded = this.expandedDevices.has(deviceId);
    
    const enabledCount = device.entities.filter(e => !e.is_disabled).length;
    const disabledCount = device.entities.filter(e => e.is_disabled).length;

    return `
      <div class="device-item">
        <div class="device-header" data-device="${deviceId}">
          <span class="device-name">${this.escapeHtml(this.getDeviceName(deviceId))}</span>
          <span class="device-count">${device.entities.length} entit${device.entities.length !== 1 ? 'ies' : 'y'} (<span style="color: #4caf50">${enabledCount}</span>/<span style="color: #f44336">${disabledCount}</span>)</span>
        </div>
        ${isExpanded ? `
          <div class="entity-list">
            ${device.entities.map(entity => `
              <div class="entity-item">
                <div class="checkbox-group">
                  <input type="checkbox" class="entity-checkbox" data-entity-id="${entity.entity_id}" data-integration="${integration}">
                </div>
                <div class="entity-info">
                  ${entity.original_name ? `<div class="entity-name">${this.escapeHtml(entity.original_name)}</div>` : ''}
                  <div class="entity-id">${this.escapeHtml(entity.entity_id)}</div>
                </div>
                <span class="entity-badge" style="background: ${entity.is_disabled ? '#f44336' : '#4caf50'} !important;">${entity.is_disabled ? 'Disabled' : 'Enabled'}</span>
                <div class="entity-actions">
                  <button class="icon-btn rename-entity" data-entity-id="${entity.entity_id}" title="Rename">✎</button>
                  <button class="icon-btn enable-entity" data-entity-id="${entity.entity_id}" title="Enable">✓</button>
                  <button class="icon-btn disable-entity" data-entity-id="${entity.entity_id}" title="Disable">✕</button>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  attachIntegrationListeners() {
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
  }

  updateSelectedCount() {
    if (!this.content) return;
    
    const selectedCount = this.selectedEntities.size;
    const enableBtn = this.content.querySelector('#selected-count');
    const disableBtn = this.content.querySelector('#selected-count-2');
    if (enableBtn) enableBtn.textContent = selectedCount;
    if (disableBtn) disableBtn.textContent = selectedCount;
  }

  selectAllVisible() {
    const checkboxes = this.content?.querySelectorAll('.entity-checkbox');
    if (!checkboxes || checkboxes.length === 0) return;
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => {
      cb.checked = !allChecked;
      if (!allChecked) {
        this.selectedEntities.add(cb.dataset.entityId);
      } else {
        this.selectedEntities.delete(cb.dataset.entityId);
      }
    });
    this.updateSelectedCount();
  }

  async enableEntity(entityId) {
    try {
      await this._hass.callWS({
        type: 'entity_manager/enable_entity',
        entity_id: entityId,
      });
      this.selectedEntities.delete(entityId);
      this.updateSelectedCount();
      this.loadData();
    } catch (error) {
      this.showErrorDialog(`Error enabling entity: ${error.message}`);
    }
  }

  async disableEntity(entityId) {
    try {
      await this._hass.callWS({
        type: 'entity_manager/disable_entity',
        entity_id: entityId,
      });
      this.selectedEntities.delete(entityId);
      this.updateSelectedCount();
      this.loadData();
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
      const entityIds = Array.from(this.selectedEntities);
      await this.bulkEnableEntities(entityIds);
      this.showUndoToast('disable', entityIds, `Enabled ${entityIds.length} entit${entityIds.length !== 1 ? 'ies' : 'y'}`);
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
      this.selectedEntities.clear();
      this.updateSelectedCount();
      this.loadData();
      this.showUndoToast('enable', toDisable, `Disabled ${toDisable.length} entit${toDisable.length !== 1 ? 'ies' : 'y'}`);
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
      this.selectedEntities.clear();
      this.updateSelectedCount();
      this.loadData();
    } catch (error) {
      this.showErrorDialog(`Error enabling entities: ${error.message}`);
    } finally {
      this.setLoading(false);
    }
  }

  showUndoToast(undoAction, entityIds, message) {
    // Remove any existing undo toast
    const existing = document.querySelector('.undo-toast');
    if (existing) existing.remove();
    if (this._undoTimeout) clearTimeout(this._undoTimeout);

    const toast = document.createElement('div');
    toast.className = 'undo-toast';
    toast.innerHTML = `
      <span>${this.escapeHtml(message)}</span>
      <button class="undo-btn">Undo</button>
      <button class="undo-dismiss">&times;</button>
    `;
    document.body.appendChild(toast);

    const dismiss = () => {
      if (this._undoTimeout) clearTimeout(this._undoTimeout);
      toast.remove();
    };

    toast.querySelector('.undo-dismiss').addEventListener('click', dismiss);

    toast.querySelector('.undo-btn').addEventListener('click', async () => {
      dismiss();
      this.setLoading(true);
      try {
        if (undoAction === 'enable') {
          await this._hass.callWS({ type: 'entity_manager/bulk_enable', entity_ids: entityIds });
        } else {
          await this._hass.callWS({ type: 'entity_manager/bulk_disable', entity_ids: entityIds });
        }
        this._fireEvent('hass-notification', { message: 'Undo successful' });
        this.loadData();
      } catch (error) {
        this.showErrorDialog(`Undo failed: ${error.message}`);
      } finally {
        this.setLoading(false);
      }
    });

    // Auto-dismiss after 10 seconds
    this._undoTimeout = setTimeout(dismiss, 10000);
  }

  async exportEntityStates() {
    this.setLoading(true);
    try {
      const result = await this._hass.callWS({
        type: 'entity_manager/export_states',
      });
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      a.download = `entity-manager-export-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this._fireEvent('hass-notification', { message: `Exported ${result.length} entities` });
    } catch (error) {
      console.error('Error exporting entities:', error);
      this.showErrorDialog(`Error exporting entities: ${error.message}`);
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
      <div class="${updateClasses.join(' ')}" data-entity-id="${entityId}">
        <input type="checkbox" class="update-checkbox" data-update-id="${entityId}" ${!hasUpdate ? 'disabled' : ''}>
        <div class="update-icon">📦</div>
        <div class="update-info">
          <div class="update-title">${this.escapeHtml(title)}</div>
          <div class="update-details">
            <div class="update-version">
              <span>Current:</span>
              <span class="version-badge current">${this.escapeHtml(currentVersion)}</span>
            </div>
            ${hasUpdate ? `
              <div class="update-version">
                <span>→</span>
                <span class="version-badge ${isBeta ? 'beta' : 'latest'}">${this.escapeHtml(latestVersion)}</span>
              </div>
            ` : '<span style="color: var(--em-success);">✓ Up to date</span>'}
          </div>
        </div>
        ${hasUpdate ? `
          <div class="update-actions">
            ${releaseUrl ? `<button class="update-btn skip-btn" data-action="release-notes" data-url="${releaseUrl}">Release Notes</button>` : ''}
            <button class="update-btn" data-action="update" data-entity-id="${entityId}">Update</button>
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
                <span class="entity-list-name">${this.escapeHtml(d.name)}</span>
                <span class="entity-list-id-inline">${this.escapeHtml(d.id)}</span>
                ${d.meta ? `<span class="entity-list-id-inline">${this.escapeHtml(d.meta)}</span>` : ''}
              </div>
            </div>
          `).join('');

          return `
            <div class="entity-list-group">
              <div class="entity-list-group-title">${this.escapeHtml(groupTitle)}</div>
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
          const helperPrefixes = ['input_', 'template.', 'variable.'];
          entities = states.filter(s => helperPrefixes.some(prefix => s.entity_id.startsWith(prefix)))
            .map(s => ({
              id: s.entity_id,
              name: s.attributes.friendly_name || s.entity_id,
              state: s.state
            }));
        }
      }
      
      // Sort by name
      entities.sort((a, b) => a.name.localeCompare(b.name));
      
      const entityList = entities.map(e => `
        <div class="entity-list-item">
          <div class="entity-list-row">
            <span class="entity-list-name">${this.escapeHtml(e.name)}</span>
            <span class="entity-list-id-inline">${this.escapeHtml(e.id)}</span>
            ${e.meta ? `<span class="entity-list-id-inline">${this.escapeHtml(e.meta)}</span>` : ''}
            ${allowToggle ? `
              <button class="entity-list-toggle ${e.state === 'on' ? 'on' : 'off'}" data-entity-id="${e.id}" data-entity-type="${type}">
                ${e.state === 'on' ? 'On' : 'Off'}
              </button>
            ` : ''}
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
      <div class="confirm-dialog-box ${extraClass}">
        <div class="confirm-dialog-header"${color ? ` style="border-color: ${color};"` : ''}>
          <h2${color ? ` style="color: ${color};"` : ''}>${this.escapeHtml(title)}</h2>
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
          <p>${this.escapeHtml(message)}</p>
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

  showRenameDialog(entityId) {
    const { overlay, closeDialog } = this.createDialog({
      title: 'Rename Entity',
      color: 'var(--em-primary)',
      contentHtml: `
        <div class="confirm-dialog-content">
          <p style="margin-bottom: 12px;">Current Entity ID: <strong>${this.escapeHtml(entityId)}</strong></p>
          <p style="margin-bottom: 8px; color: #666;">Enter new entity ID (without domain prefix):</p>
          <input type="text" id="rename-input" class="rename-input" placeholder="new_entity_name" value="${this.escapeHtml(entityId.split('.')[1])}" pattern="[a-z0-9_]+" title="Only lowercase letters, numbers, and underscores">
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

  async renameEntity(oldEntityId, newEntityId) {
    try {
      await this._hass.callWS({
        type: 'entity_manager/rename_entity',
        old_entity_id: oldEntityId,
        new_entity_id: newEntityId,
      });
      
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
