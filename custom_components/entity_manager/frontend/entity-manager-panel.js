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
        gap: 4px;
        align-items: center;
        background: linear-gradient(145deg, var(--card-background-color), var(--secondary-background-color));
        padding: 5px;
        border-radius: 14px;
        border: 1px solid rgba(0, 0, 0, 0.06);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.5);
      }

      .filter-toggle {
        padding: 10px 18px;
        border: none;
        background: transparent;
        border-radius: 10px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        color: var(--secondary-text-color);
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
      }

      .filter-toggle:hover:not(.active) {
        color: var(--primary-text-color);
        background: rgba(33, 150, 243, 0.08);
      }

      .filter-toggle.active {
        background: linear-gradient(135deg, #2196f3, #1976d2) !important;
        color: white !important;
        box-shadow: 0 4px 12px rgba(33, 150, 243, 0.35) !important;
      }

      .filter-toggle:active {
        transform: scale(0.97);
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
        padding: 14px 16px;
        border: 1px solid rgba(33, 150, 243, 0.25);
        border-radius: 14px;
        background: linear-gradient(145deg, var(--card-background-color), var(--secondary-background-color)) !important;
        color: var(--primary-text-color);
        font-size: 14px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      }

      .domain-button:hover {
        border-color: #2196f3;
        box-shadow: 0 4px 12px rgba(33, 150, 243, 0.15);
      }

      .domain-button:focus {
        outline: none;
        border-color: #2196f3;
        box-shadow: 0 0 0 4px rgba(33, 150, 243, 0.12);
      }

      .domain-menu {
        position: absolute;
        top: calc(100% + 8px);
        left: 0;
        right: 0;
        background: var(--card-background-color) !important;
        border: 1px solid rgba(33, 150, 243, 0.2) !important;
        border-radius: 14px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
        max-height: 280px;
        overflow-y: auto;
        z-index: 1000 !important;
        display: none;
        color: var(--primary-text-color);
        animation: dropdownSlide 0.2s ease;
      }

      @keyframes dropdownSlide {
        from {
          opacity: 0;
          transform: translateY(-8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      [data-theme="dark"] .domain-menu {
        background: #2a2a2a !important;
        border-color: rgba(33, 150, 243, 0.3) !important;
      }

      .domain-menu.open {
        display: block;
      }

      .domain-option {
        padding: 12px 16px;
        cursor: pointer;
        color: var(--primary-text-color);
        transition: all 0.15s ease;
        border-radius: 8px;
        margin: 4px 6px;
        font-size: 14px;
      }

      .domain-option:first-child {
        margin-top: 6px;
      }

      .domain-option:last-child {
        margin-bottom: 6px;
      }

      .domain-option:hover {
        background: rgba(33, 150, 243, 0.1);
        color: #2196f3;
      }

      .domain-option.active {
        background: linear-gradient(135deg, rgba(33, 150, 243, 0.15), rgba(33, 150, 243, 0.08));
        color: #2196f3;
        font-weight: 600;
      }

      .filter-select:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
      }
      
      /* Confirmation Dialog Styles - Modern Design */
      .confirm-dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        animation: dialogFadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      }

      @keyframes dialogFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .confirm-dialog-box {
        background: linear-gradient(145deg, #ffffff, #f8f9fa);
        border-radius: 20px;
        box-shadow:
          0 25px 50px -12px rgba(0, 0, 0, 0.4),
          0 0 0 1px rgba(255, 255, 255, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.8);
        max-width: 480px;
        width: 90%;
        animation: dialogSlideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        overflow: hidden;
        border: 1px solid rgba(33, 150, 243, 0.2);
      }

      @keyframes dialogSlideUp {
        from {
          opacity: 0;
          transform: translateY(30px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      [data-theme="dark"] .confirm-dialog-box {
        background: linear-gradient(145deg, #2d2d2d, #252525);
        color: #fff;
        border-color: rgba(33, 150, 243, 0.3);
        box-shadow:
          0 25px 50px -12px rgba(0, 0, 0, 0.6),
          0 0 0 1px rgba(255, 255, 255, 0.05),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
      }

      .confirm-dialog-header {
        padding: 24px 28px 20px 28px;
        background: linear-gradient(135deg, rgba(33, 150, 243, 0.1), rgba(33, 150, 243, 0.05));
        border-bottom: 1px solid rgba(33, 150, 243, 0.15);
        display: flex;
        align-items: center;
        gap: 14px;
      }

      .confirm-dialog-header::before {
        content: '';
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: linear-gradient(135deg, #2196f3, #1976d2);
        box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4);
        flex-shrink: 0;
      }

      .confirm-dialog-header.warning::before {
        background: linear-gradient(135deg, #ff9800, #f57c00);
        box-shadow: 0 4px 12px rgba(255, 152, 0, 0.4);
      }

      .confirm-dialog-header.danger::before {
        background: linear-gradient(135deg, #f44336, #d32f2f);
        box-shadow: 0 4px 12px rgba(244, 67, 54, 0.4);
      }

      .confirm-dialog-header.success::before {
        background: linear-gradient(135deg, #4caf50, #388e3c);
        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
      }

      [data-theme="dark"] .confirm-dialog-header {
        background: linear-gradient(135deg, rgba(33, 150, 243, 0.15), rgba(33, 150, 243, 0.05));
        border-bottom-color: rgba(33, 150, 243, 0.2);
      }

      .confirm-dialog-header h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: #1a1a1a;
        letter-spacing: -0.3px;
      }

      [data-theme="dark"] .confirm-dialog-header h2 {
        color: #fff;
      }

      .confirm-dialog-content {
        padding: 28px;
      }

      .confirm-dialog-content p {
        margin: 0;
        font-size: 15px;
        line-height: 1.6;
        color: #555;
      }

      [data-theme="dark"] .confirm-dialog-content p {
        color: #bbb;
      }

      .confirm-dialog-actions {
        padding: 20px 28px 28px 28px;
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        background: rgba(0, 0, 0, 0.02);
        border-top: 1px solid rgba(0, 0, 0, 0.05);
      }

      [data-theme="dark"] .confirm-dialog-actions {
        background: rgba(0, 0, 0, 0.15);
        border-top-color: rgba(255, 255, 255, 0.05);
      }

      .confirm-dialog-actions .btn {
        min-width: 100px;
        padding: 12px 24px;
        font-size: 14px;
        font-weight: 600;
        border-radius: 12px;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .confirm-no {
        background: linear-gradient(145deg, #f0f0f0, #e5e5e5) !important;
        color: #555 !important;
        border: 1px solid rgba(0, 0, 0, 0.1) !important;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      }

      .confirm-no:hover {
        background: linear-gradient(145deg, #e5e5e5, #d5d5d5) !important;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }

      .confirm-no:active {
        transform: translateY(0);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      }

      [data-theme="dark"] .confirm-no {
        background: linear-gradient(145deg, #404040, #353535) !important;
        color: #ddd !important;
        border-color: rgba(255, 255, 255, 0.1) !important;
      }

      [data-theme="dark"] .confirm-no:hover {
        background: linear-gradient(145deg, #4a4a4a, #404040) !important;
      }

      .confirm-yes {
        background: linear-gradient(135deg, #2196f3, #1976d2) !important;
        color: #fff !important;
        border: none !important;
        box-shadow: 0 4px 12px rgba(33, 150, 243, 0.35);
      }

      .confirm-yes:hover {
        background: linear-gradient(135deg, #42a5f5, #2196f3) !important;
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(33, 150, 243, 0.45);
      }

      .confirm-yes:active {
        transform: translateY(0);
        box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
      }

      .confirm-yes.danger {
        background: linear-gradient(135deg, #f44336, #d32f2f) !important;
        box-shadow: 0 4px 12px rgba(244, 67, 54, 0.35);
      }

      .confirm-yes.danger:hover {
        background: linear-gradient(135deg, #ef5350, #f44336) !important;
        box-shadow: 0 6px 20px rgba(244, 67, 54, 0.45);
      }

      .confirm-yes.success {
        background: linear-gradient(135deg, #4caf50, #388e3c) !important;
        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.35);
      }

      .confirm-yes.success:hover {
        background: linear-gradient(135deg, #66bb6a, #4caf50) !important;
        box-shadow: 0 6px 20px rgba(76, 175, 80, 0.45);
      }

      .rename-input {
        width: 100%;
        padding: 14px 16px;
        border: 2px solid rgba(33, 150, 243, 0.3);
        border-radius: 12px;
        font-size: 15px;
        font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
        background: linear-gradient(145deg, #f8f9fa, #ffffff);
        color: #333;
        transition: all 0.2s ease;
        box-sizing: border-box;
      }

      .rename-input:focus {
        outline: none;
        border-color: #2196f3;
        box-shadow: 0 0 0 4px rgba(33, 150, 243, 0.15);
        background: #fff;
      }

      .rename-input::placeholder {
        color: #999;
      }

      [data-theme="dark"] .rename-input {
        background: linear-gradient(145deg, #353535, #2d2d2d);
        color: #fff;
        border-color: rgba(33, 150, 243, 0.4);
      }

      [data-theme="dark"] .rename-input:focus {
        background: #333;
        box-shadow: 0 0 0 4px rgba(33, 150, 243, 0.2);
      }

      [data-theme="dark"] .rename-input::placeholder {
        color: #777;
      }

      /* Dialog icon styles */
      .dialog-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        flex-shrink: 0;
      }

      .dialog-icon.info {
        background: linear-gradient(135deg, #2196f3, #1976d2);
        box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4);
      }

      .dialog-icon.warning {
        background: linear-gradient(135deg, #ff9800, #f57c00);
        box-shadow: 0 4px 12px rgba(255, 152, 0, 0.4);
      }

      .dialog-icon.danger {
        background: linear-gradient(135deg, #f44336, #d32f2f);
        box-shadow: 0 4px 12px rgba(244, 67, 54, 0.4);
      }

      .dialog-icon.success {
        background: linear-gradient(135deg, #4caf50, #388e3c);
        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
      }

      
      .search-box {
        flex: 1;
        min-width: 280px;
        padding: 14px 20px;
        border: 1px solid rgba(33, 150, 243, 0.25);
        border-radius: 14px;
        font-size: 15px;
        background: linear-gradient(145deg, var(--card-background-color), var(--secondary-background-color));
        color: var(--primary-text-color);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-family: var(--paper-font-body1_-_font-family);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.5);
      }

      .search-box::placeholder {
        color: var(--secondary-text-color);
        opacity: 0.7;
      }

      .search-box:focus {
        outline: none;
        border-color: #2196f3;
        box-shadow: 0 0 0 4px rgba(33, 150, 243, 0.12), 0 4px 12px rgba(33, 150, 243, 0.1);
        background: var(--card-background-color);
      }
      
      .btn {
        padding: 12px 24px;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-size: 15px;
        font-weight: 600;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        position: relative;
        overflow: hidden;
        letter-spacing: 0.3px;
      }

      .btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 50%);
        pointer-events: none;
      }

      .btn:active {
        transform: scale(0.97);
      }

      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none !important;
      }

      .btn-primary {
        background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%) !important;
        color: white !important;
        box-shadow: 0 4px 14px rgba(33, 150, 243, 0.35);
      }

      .btn-primary:hover:not(:disabled) {
        background: linear-gradient(135deg, #42a5f5 0%, #2196f3 100%) !important;
        box-shadow: 0 6px 20px rgba(33, 150, 243, 0.45);
        transform: translateY(-2px);
      }

      .btn-primary:active {
        box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
      }

      .btn-secondary {
        background: linear-gradient(145deg, var(--card-background-color), var(--secondary-background-color));
        color: var(--primary-text-color);
        border: 2px solid rgba(33, 150, 243, 0.3);
        font-size: 15px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      }

      .btn-secondary:hover:not(:disabled) {
        border-color: #2196f3;
        box-shadow: 0 4px 12px rgba(33, 150, 243, 0.2);
        transform: translateY(-1px);
      }

      .btn-secondary.enable-integration {
        color: #4caf50 !important;
        border: 2px solid rgba(76, 175, 80, 0.4) !important;
        background: linear-gradient(145deg, rgba(76, 175, 80, 0.05), rgba(76, 175, 80, 0.02));
      }

      .btn-secondary.enable-integration:hover:not(:disabled) {
        background: linear-gradient(135deg, #4caf50, #43a047) !important;
        color: white !important;
        border-color: #4caf50 !important;
        box-shadow: 0 4px 14px rgba(76, 175, 80, 0.4);
        transform: translateY(-2px);
      }

      .btn-secondary.disable-integration {
        color: #f44336 !important;
        border: 2px solid rgba(244, 67, 54, 0.4) !important;
        background: linear-gradient(145deg, rgba(244, 67, 54, 0.05), rgba(244, 67, 54, 0.02));
      }

      .btn-secondary.disable-integration:hover:not(:disabled) {
        background: linear-gradient(135deg, #f44336, #e53935) !important;
        color: white !important;
        border-color: #f44336 !important;
        box-shadow: 0 4px 14px rgba(244, 67, 54, 0.4);
        transform: translateY(-2px);
      }
      
      .stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 20px;
        margin-bottom: 28px;
      }

      .stat-card {
        background: linear-gradient(145deg, var(--card-background-color), var(--secondary-background-color));
        padding: 24px;
        border-radius: 18px;
        border: 1px solid rgba(33, 150, 243, 0.15);
        box-shadow:
          0 4px 20px rgba(0, 0, 0, 0.06),
          0 1px 3px rgba(0, 0, 0, 0.04);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }

      .stat-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #2196f3, #42a5f5);
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .stat-card:hover {
        border-color: rgba(33, 150, 243, 0.3);
        box-shadow:
          0 8px 30px rgba(33, 150, 243, 0.15),
          0 4px 10px rgba(0, 0, 0, 0.05);
        transform: translateY(-4px);
      }

      .stat-card:hover::before {
        opacity: 1;
      }

      .stat-label {
        color: var(--secondary-text-color);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1.2px;
        margin-bottom: 10px;
        font-weight: 600;
        opacity: 0.8;
      }

      .stat-value {
        font-size: 36px;
        font-weight: 800;
        color: #2196f3 !important;
        letter-spacing: -1px;
        line-height: 1;
        background: linear-gradient(135deg, #2196f3, #1976d2);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .stat-card:nth-child(4) .stat-value {
        background: linear-gradient(135deg, #4caf50, #388e3c) !important;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .stat-card:nth-child(5) .stat-value {
        background: linear-gradient(135deg, #f44336, #d32f2f) !important;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      
      .integration-group {
        background: var(--em-bg-primary);
        border-radius: 16px;
        margin-bottom: 16px;
        overflow: hidden;
        border: 1px solid rgba(33, 150, 243, 0.2);
        border-left: 4px solid #2196f3;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow:
          0 4px 20px rgba(0, 0, 0, 0.04),
          0 1px 3px rgba(0, 0, 0, 0.02);
      }

      .integration-group:hover {
        box-shadow:
          0 8px 30px rgba(33, 150, 243, 0.12),
          0 4px 10px rgba(0, 0, 0, 0.04);
        border-color: rgba(33, 150, 243, 0.35);
        border-left-color: #1976d2;
        transform: translateX(2px);
      }

      .integration-logo-container {
        width: 52px;
        height: 52px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, rgba(33, 150, 243, 0.12), rgba(33, 150, 243, 0.06));
        margin-right: 18px;
        flex-shrink: 0;
        box-shadow: 0 2px 8px rgba(33, 150, 243, 0.1);
        border: 1px solid rgba(33, 150, 243, 0.1);
      }

      .integration-logo {
        width: 36px;
        height: 36px;
        object-fit: contain;
      }

      .integration-header {
        display: flex;
        align-items: center;
        padding: 20px 24px;
        cursor: pointer;
        user-select: none;
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        transition: all 0.25s ease;
        background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.01));
      }

      .integration-header:hover {
        background: linear-gradient(180deg, rgba(33, 150, 243, 0.04), rgba(33, 150, 243, 0.02));
      }

      .integration-icon {
        margin-right: 14px;
        transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        font-size: 20px;
        color: #2196f3 !important;
        font-weight: bold;
      }

      .integration-icon.expanded {
        transform: rotate(90deg);
      }

      .integration-info {
        flex: 1;
      }

      .integration-name {
        font-size: 18px;
        font-weight: 700;
        margin-bottom: 4px;
        color: var(--primary-text-color);
        letter-spacing: -0.3px;
      }

      .integration-stats {
        font-size: 14px;
        color: var(--secondary-text-color);
        font-weight: 500;
      }

      .integration-actions {
        display: flex;
        gap: 10px;
      }

      .device-list {
        padding: 16px 24px 24px 24px;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 16px;
        background: rgba(0, 0, 0, 0.015);
      }

      .device-item {
        border: 1px solid rgba(33, 150, 243, 0.25);
        border-radius: 14px;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        flex: 0 1 auto;
        min-width: 320px;
        background: var(--card-background-color);
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
      }

      .device-item:hover {
        border-color: rgba(33, 150, 243, 0.5);
        box-shadow: 0 6px 20px rgba(33, 150, 243, 0.12);
        transform: translateY(-2px);
      }

      .device-header {
        display: flex;
        align-items: center;
        padding: 16px 18px;
        cursor: pointer;
        user-select: none;
        background: linear-gradient(145deg, var(--secondary-background-color), var(--card-background-color));
        transition: all 0.25s ease;
        border-bottom: 1px solid rgba(33, 150, 243, 0.15);
      }

      .device-header:hover {
        background: linear-gradient(145deg, rgba(33, 150, 243, 0.08), rgba(33, 150, 243, 0.04));
      }

      .device-name {
        flex: 1;
        font-weight: 600;
        color: var(--primary-text-color);
        font-size: 16px;
        letter-spacing: -0.2px;
      }

      .device-count {
        font-size: 13px;
        color: var(--secondary-text-color);
        margin-right: 12px;
        font-weight: 500;
        background: rgba(0, 0, 0, 0.05);
        padding: 4px 10px;
        border-radius: 20px;
      }

      .entity-list {
        padding: 14px 16px 16px 16px;
        background: linear-gradient(180deg, rgba(0, 0, 0, 0.02), transparent);
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 10px;
      }

      .entity-item {
        display: flex;
        align-items: center;
        padding: 14px 16px;
        border-radius: 12px;
        border: 1px solid rgba(0, 0, 0, 0.06);
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        font-size: 14px;
        flex: 1 1 300px;
        gap: 12px;
        background: var(--card-background-color);
      }

      .entity-item:hover {
        background: linear-gradient(145deg, var(--card-background-color), rgba(33, 150, 243, 0.04));
        border-color: rgba(33, 150, 243, 0.2);
        box-shadow: 0 2px 8px rgba(33, 150, 243, 0.08);
      }

      .entity-checkbox {
        width: 20px;
        height: 20px;
        margin-right: 8px;
        cursor: pointer;
        accent-color: #2196f3;
        border-radius: 4px;
      }

      .entity-info {
        flex: 1;
        min-width: 0;
      }

      .entity-id {
        font-size: 14px;
        font-weight: 600;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .entity-name {
        font-size: 12px;
        color: var(--secondary-text-color);
        margin-top: 3px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .entity-badge {
        font-size: 10px;
        padding: 5px 10px;
        border-radius: 20px;
        background: linear-gradient(135deg, #2196f3, #1976d2) !important;
        color: white !important;
        margin-left: 8px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        box-shadow: 0 2px 6px rgba(33, 150, 243, 0.3);
      }

      .entity-actions {
        display: flex;
        gap: 6px;
      }

      .icon-btn {
        padding: 8px 14px;
        border: 1px solid rgba(0, 0, 0, 0.1);
        background: linear-gradient(145deg, #f8f9fa, #f0f0f0) !important;
        cursor: pointer;
        border-radius: 10px;
        font-weight: 600;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        font-size: 14px;
      }

      .icon-btn:active {
        transform: scale(0.95);
      }

      .icon-btn.rename-entity {
        color: #2196f3 !important;
        border-color: rgba(33, 150, 243, 0.3) !important;
      }

      .icon-btn.rename-entity:hover {
        background: linear-gradient(135deg, #2196f3, #1976d2) !important;
        color: white !important;
        border-color: #2196f3 !important;
        box-shadow: 0 4px 12px rgba(33, 150, 243, 0.35);
        transform: translateY(-2px);
      }

      .icon-btn.enable-entity {
        color: #4caf50 !important;
        border-color: rgba(76, 175, 80, 0.3) !important;
      }

      .icon-btn.enable-entity:hover {
        background: linear-gradient(135deg, #4caf50, #43a047) !important;
        color: white !important;
        border-color: #4caf50 !important;
        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.35);
        transform: translateY(-2px);
      }

      .icon-btn.disable-entity {
        color: #f44336 !important;
        border-color: rgba(244, 67, 54, 0.3) !important;
      }

      .icon-btn.disable-entity:hover {
        background: linear-gradient(135deg, #f44336, #e53935) !important;
        color: white !important;
        border-color: #f44336 !important;
        box-shadow: 0 4px 12px rgba(244, 67, 54, 0.35);
        transform: translateY(-2px);
      }

      [data-theme="dark"] .icon-btn {
        background: linear-gradient(145deg, #3a3a3a, #2d2d2d) !important;
        border-color: rgba(255, 255, 255, 0.1);
      }
      
      .empty-state {
        text-align: center;
        padding: 80px 40px;
        color: var(--secondary-text-color);
        background: linear-gradient(145deg, var(--card-background-color), var(--secondary-background-color));
        border-radius: 20px;
        border: 2px dashed rgba(33, 150, 243, 0.2);
        margin: 20px 0;
      }

      .empty-state::before {
        content: '';
        display: block;
        width: 80px;
        height: 80px;
        margin: 0 auto 24px;
        background: linear-gradient(135deg, rgba(33, 150, 243, 0.1), rgba(33, 150, 243, 0.05));
        border-radius: 50%;
        border: 2px solid rgba(33, 150, 243, 0.2);
      }

      .empty-state h2 {
        font-size: 22px;
        margin-bottom: 10px;
        color: var(--primary-text-color);
        font-weight: 600;
      }

      .empty-state p {
        font-size: 15px;
        color: var(--secondary-text-color);
        max-width: 400px;
        margin: 0 auto;
        line-height: 1.5;
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
          `Enable All Entities`,
          `Are you sure you want to enable all entities in the <strong>${integration}</strong> integration?`,
          () => this.enableIntegration(integration),
          { type: 'success', confirmText: 'Enable All', cancelText: 'Cancel' }
        );
      });
    });

    this.content.querySelectorAll('.disable-integration').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const integration = btn.dataset.integration;
        this.showConfirmDialog(
          `Disable All Entities`,
          `Are you sure you want to disable all entities in the <strong>${integration}</strong> integration? This may affect automations and dashboards.`,
          () => this.disableIntegration(integration),
          { type: 'warning', confirmText: 'Disable All', cancelText: 'Cancel' }
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

  showConfirmDialog(title, message, onConfirm, options = {}) {
    const { type = 'info', confirmText = 'Yes', cancelText = 'No' } = options;

    const iconMap = {
      info: '?',
      warning: '!',
      danger: '!',
      success: '✓'
    };

    const overlay = document.createElement('div');
    overlay.className = 'confirm-dialog-overlay';
    overlay.innerHTML = `
      <div class="confirm-dialog-box">
        <div class="confirm-dialog-header ${type}">
          <div class="dialog-icon ${type}">${iconMap[type] || '?'}</div>
          <h2>${title}</h2>
        </div>
        <div class="confirm-dialog-content">
          <p>${message}</p>
        </div>
        <div class="confirm-dialog-actions">
          <button class="btn confirm-no">${cancelText}</button>
          <button class="btn confirm-yes ${type === 'danger' ? 'danger' : ''}">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const yesBtn = overlay.querySelector('.confirm-yes');
    const noBtn = overlay.querySelector('.confirm-no');

    const closeDialog = () => {
      overlay.style.animation = 'dialogFadeIn 0.2s ease reverse';
      overlay.querySelector('.confirm-dialog-box').style.animation = 'dialogSlideUp 0.2s ease reverse';
      setTimeout(() => overlay.remove(), 180);
    };

    yesBtn.addEventListener('click', () => {
      closeDialog();
      setTimeout(onConfirm, 100);
    });

    noBtn.addEventListener('click', closeDialog);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeDialog();
      }
    });

    // Handle escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeDialog();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  showRenameDialog(entityId) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-dialog-overlay';
    overlay.innerHTML = `
      <div class="confirm-dialog-box">
        <div class="confirm-dialog-header info">
          <div class="dialog-icon info">✎</div>
          <h2>Rename Entity</h2>
        </div>
        <div class="confirm-dialog-content">
          <p style="margin-bottom: 16px; padding: 12px 16px; background: rgba(33, 150, 243, 0.08); border-radius: 10px; border-left: 3px solid #2196f3;">
            <strong style="color: var(--primary-text-color);">Current:</strong>
            <code style="background: rgba(0,0,0,0.06); padding: 3px 8px; border-radius: 4px; margin-left: 8px; font-family: monospace;">${entityId}</code>
          </p>
          <p style="margin-bottom: 10px; font-size: 14px; color: var(--secondary-text-color);">Enter new entity ID (without domain prefix):</p>
          <input type="text" id="rename-input" class="rename-input" placeholder="new_entity_name" value="${entityId.split('.')[1]}">
          <p style="margin-top: 14px; font-size: 13px; padding: 10px 14px; background: rgba(255, 152, 0, 0.1); border-radius: 8px; border-left: 3px solid #ff9800; color: #e65100;">
            This will update the entity ID across all automations, scripts, and helpers.
          </p>
        </div>
        <div class="confirm-dialog-actions">
          <button class="btn confirm-no">Cancel</button>
          <button class="btn confirm-yes">Rename</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector('#rename-input');
    const yesBtn = overlay.querySelector('.confirm-yes');
    const noBtn = overlay.querySelector('.confirm-no');

    const closeDialog = () => {
      overlay.style.animation = 'dialogFadeIn 0.2s ease reverse';
      overlay.querySelector('.confirm-dialog-box').style.animation = 'dialogSlideUp 0.2s ease reverse';
      setTimeout(() => overlay.remove(), 180);
    };

    // Focus and select after a small delay for animation
    setTimeout(() => {
      input.focus();
      input.select();
    }, 100);

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
      setTimeout(() => this.renameEntity(entityId, newEntityId), 100);
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

    // Handle escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeDialog();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
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
