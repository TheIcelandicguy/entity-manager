// Entity Manager Panel - Updated UI v2.0
class EntityManagerPanel extends HTMLElement {
  constructor() {
    super();
    this._hass = null;
    this._panel = null;
    this.data = [];
    this.deviceInfo = {};
    this.expandedIntegrations = new Set();
    this.expandedDevices = new Set();
    this.selectedEntities = new Set();
    this.searchTerm = '';
    this.viewState = 'all';
    this.selectedDomain = 'all';
    this.domainOptions = [];
    this.isLoading = false;
    
    // Listen for theme changes
    this._themeObserver = new MutationObserver(() => {
      this.updateTheme();
    });
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
    // Force re-read of CSS variables by updating a data attribute
    if (this.content) {
      const isDark = document.documentElement.style.getPropertyValue('--primary-text-color')?.includes('fff') ||
                     getComputedStyle(document.documentElement).getPropertyValue('--primary-background-color')?.includes('111');
      this.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
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

  set panel(panel) {
    this._panel = panel;
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
      
      this.updateView();
    } catch (error) {
      console.error('Entity Manager - Error loading device info:', error);
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

    // Create stylesheet with all modern styles
    const styles = document.createElement('style');
    styles.innerHTML = `
      entity-manager-panel {
        display: block;
        font-family: var(--paper-font-body1_-_font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
      }
      
      /* Root variables - automatically adapt to HA theme */
      entity-manager-panel {
        --em-primary: var(--primary-color);
        --em-success: var(--success-color, #4caf50);
        --em-danger: var(--error-color, #f44336);
        --em-warning: var(--warning-color, #ff9800);
        --em-text-primary: var(--primary-text-color);
        --em-text-secondary: var(--secondary-text-color);
        --em-bg-primary: var(--card-background-color);
        --em-bg-secondary: var(--secondary-background-color);
        --em-border: var(--divider-color);
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
        border-bottom: 1px solid var(--em-border);
      }
      
      .app-header-left {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      
      .menu-btn {
        background: transparent;
        border: 1px solid var(--em-border);
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
        padding: 24px;
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
        background: var(--card-background-color);
        padding: 4px;
        border-radius: 12px;
        border: 1px solid var(--divider-color);
      }
      
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

      .filter-select {
        padding: 10px 12px;
        border: 2px solid #1565c0;
        border-radius: 10px;
        background: var(--input-fill-color, var(--card-background-color));
        color: var(--primary-text-color);
        font-size: 16px;
        font-weight: 500;
        transition: all 0.3s ease;
        min-width: 160px;
        color-scheme: light dark;
      }

      .filter-select option {
        background: var(--card-background-color);
        color: var(--primary-text-color);
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
        background: var(--card-background-color) !important;
        color: var(--primary-text-color);
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
        border-color: var(--primary-color);
      }

      .domain-button:focus {
        outline: none;
        border-color: var(--primary-color);
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
      
      [data-theme="dark"] .domain-menu {
        background: #1e1e1e !important;
        color: #fff;
        border-color: #2196f3 !important;
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
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .confirm-dialog-box {
        background: #fff;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        max-width: 500px;
        width: 90%;
        animation: slideUp 0.3s ease;
        overflow: hidden;
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
      
      [data-theme="dark"] .confirm-dialog-box {
        background: #2c2c2c;
        color: #fff;
      }
      
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
      
      .confirm-dialog-actions {
        padding: 16px 24px 24px 24px;
        display: flex;
        gap: 12px;
        justify-content: flex-end;
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
      
      [data-theme="dark"] .confirm-no {
        background: #444 !important;
        color: #fff !important;
      }
      
      [data-theme="dark"] .confirm-no:hover {
        background: #555 !important;
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
        background: var(--card-background-color);
        color: var(--primary-text-color);
        transition: all 0.3s ease;
        font-family: var(--paper-font-body1_-_font-family);
      }
      
      .search-box:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
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
        background: var(--card-background-color);
        color: var(--primary-text-color);
        border: 2px solid #1565c0;
        font-size: 1.25em;
      }
      
      .btn-secondary:hover {
        background: var(--secondary-background-color);
        border-color: #2196f3;
      }
      
      .btn-secondary.enable-integration {
        color: #4caf50 !important;
        border: 2px solid #4caf50 !important;
      }
      
      .btn-secondary.enable-integration:hover {
        background: #4caf50 !important;
        color: white !important;
        border-color: #4caf50 !important;
      }
      
      .btn-secondary.disable-integration {
        color: #f44336 !important;
        border: 2px solid #f44336 !important;
      }
      
      .btn-secondary.disable-integration:hover {
        background: #f44336 !important;
        color: white !important;
        border-color: #f44336 !important;
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
      }
      
      .stat-card:hover {
        border-color: var(--primary-color);
        box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3), inset 0 0 0 1px rgba(33, 150, 243, 0.2);
        transform: translateY(-2px);
      }
      
      .stat-label {
        color: var(--secondary-text-color);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 8px;
        font-weight: 600;
      }
      
      .stat-value {
        font-size: 32px;
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
        background: rgba(33, 150, 243, 0.1);
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
        color: #2196f3 !important;
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
        border-left-color: #1976d2 !important;
      }
      
      .device-header {
        display: flex;
        align-items: center;
        padding: 14px 12px;
        cursor: pointer;
        user-select: none;
        background: var(--secondary-background-color);
        transition: background 0.2s ease;
        border-bottom: 2px solid #1565c0;
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
        border: 2px solid #1565c0;
      }
      
      .entity-item {
        display: flex;
        align-items: center;
        padding: 12px 10px;
        border-radius: 8px;
        border: 2px solid white;
        transition: all 0.2s ease;
        font-size: 1.25em;
        flex: 1 1 300px;
        gap: 8px;
      }
      
      .entity-item:hover {
        background: var(--card-background-color);
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
        color: var(--primary-text-color);
      }
      
      .entity-name {
        font-size: 14px;
        color: var(--secondary-text-color);
        margin-top: 2px;
      }
      
      .entity-badge {
        font-size: 10px;
        padding: 4px 8px;
        border-radius: 6px;
        background: #2196f3 !important;
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
        cursor: pointer;
        border-radius: 8px;
        font-weight: 600;
        transition: all 0.2s ease;
        font-size: 1.25em;
      }
      
      .icon-btn.enable-entity {
        color: #4caf50 !important;
        border-color: #4caf50 !important;
      }
      
      .icon-btn.enable-entity:hover {
        background: #4caf50 !important;
        color: white !important;
      }
      
      .icon-btn.disable-entity {
        color: #f44336 !important;
        border-color: #f44336 !important;
      }
      
      .icon-btn.disable-entity:hover {
        background: #f44336 !important;
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
      
      action-handler {
        border: 2px solid #1565c0 !important;
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
        </div>
        <div class="domain-dropdown" id="domain-dropdown">
          <button class="domain-button" id="domain-button" aria-label="Filter by domain" type="button">
            <span id="domain-button-label">All domains</span>
            <span aria-hidden="true">▾</span>
          </button>
          <div class="domain-menu" id="domain-menu" role="listbox" aria-label="Domain options"></div>
        </div>
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
        this.loadData();
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
        <div class="stat-label">Enabled</div>
        <div class="stat-value" style="color: #4caf50 !important;">${enabledEntities}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Disabled</div>
        <div class="stat-value" style="color: #f44336 !important;">${disabledEntities}</div>
      </div>
    `;

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

    contentEl.innerHTML = filteredData.map(integration =>
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
    
    Object.values(integration.devices).forEach(device => {
      device.entities.forEach(entity => {
        entityCount++;
        if (entity.is_disabled) {
          disabledCount++;
        } else {
          enabledCount++;
        }
      });
    });

    return `
      <div class="integration-group">
        <div class="integration-header" data-integration="${integration.integration}">
          <div class="integration-logo-container">
            <img class="integration-logo" src="https://brands.home-assistant.io/${integration.integration}/icon.png" alt="${integration.integration}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 48 48%22><text x=%2224%22 y=%2232%22 font-size=%2224%22 text-anchor=%22middle%22 fill=%22%23999%22>${integration.integration.charAt(0).toUpperCase()}</text></svg>'">
          </div>
          <span class="integration-icon ${isExpanded ? 'expanded' : ''}">›</span>
          <div class="integration-info">
            <div class="integration-name">${integration.integration.charAt(0).toUpperCase() + integration.integration.slice(1)}</div>
            <div class="integration-stats">${deviceCount} device${deviceCount !== 1 ? 's' : ''} • ${entityCount} entit${entityCount !== 1 ? 'ies' : 'y'} (<span style="color: #4caf50">${enabledCount} enabled</span> / <span style="color: #f44336">${disabledCount} disabled</span>)</div>
          </div>
          <div class="integration-actions">
            <button class="btn btn-secondary enable-integration" data-integration="${integration.integration}">Enable All</button>
            <button class="btn btn-secondary disable-integration" data-integration="${integration.integration}">Disable All</button>
          </div>
        </div>
        ${isExpanded ? `
          <div class="device-list">
            ${Object.entries(integration.devices).map(([deviceId, device]) =>
              this.renderDevice(deviceId, device, integration.integration)
            ).join('')}
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
          <span class="device-name">${this.getDeviceName(deviceId)}</span>
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
                  <div class="entity-id">${entity.entity_id}</div>
                  ${entity.original_name ? `<div class="entity-name">${entity.original_name}</div>` : ''}
                </div>
                <span class="entity-badge">${entity.state || 'unknown'}</span>
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
      await this.bulkEnableEntities(Array.from(this.selectedEntities));
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
    const overlay = document.createElement('div');
    overlay.className = 'confirm-dialog-overlay';
    overlay.innerHTML = `
      <div class="confirm-dialog-box">
        <div class="confirm-dialog-header">
          <h2>${title}</h2>
        </div>
        <div class="confirm-dialog-content">
          <p>${message}</p>
        </div>
        <div class="confirm-dialog-actions">
          <button class="btn btn-secondary confirm-no">No</button>
          <button class="btn btn-primary confirm-yes">Yes</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const yesBtn = overlay.querySelector('.confirm-yes');
    const noBtn = overlay.querySelector('.confirm-no');

    const closeDialog = () => {
      overlay.remove();
    };

    yesBtn.addEventListener('click', () => {
      closeDialog();
      onConfirm();
    });

    noBtn.addEventListener('click', closeDialog);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeDialog();
      }
    });
  }

  showRenameDialog(entityId) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-dialog-overlay';
    overlay.innerHTML = `
      <div class="confirm-dialog-box">
        <div class="confirm-dialog-header">
          <h2>Rename Entity</h2>
        </div>
        <div class="confirm-dialog-content">
          <p style="margin-bottom: 12px;">Current Entity ID: <strong>${entityId}</strong></p>
          <p style="margin-bottom: 8px; color: #666;">Enter new entity ID (without domain prefix):</p>
          <input type="text" id="rename-input" class="rename-input" placeholder="new_entity_name" value="${entityId.split('.')[1]}">
          <p style="margin-top: 8px; font-size: 14px; color: #f44336;">⚠️ This will update the entity ID across all automations, scripts, and helpers.</p>
        </div>
        <div class="confirm-dialog-actions">
          <button class="btn btn-secondary confirm-no">Cancel</button>
          <button class="btn btn-primary confirm-yes">Rename</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector('#rename-input');
    const yesBtn = overlay.querySelector('.confirm-yes');
    const noBtn = overlay.querySelector('.confirm-no');

    const closeDialog = () => {
      overlay.remove();
    };

    input.focus();
    input.select();

    const performRename = async () => {
      const newName = input.value.trim();
      if (!newName) {
        this.showErrorDialog('Please enter a valid entity name');
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
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeDialog();
      }
    });
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
