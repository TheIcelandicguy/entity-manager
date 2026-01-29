class EntityManagerPanel extends HTMLElement {
  constructor() {
    super();
    this.hass = null;
    this.data = [];
    this.deviceInfo = {};
    this.expandedIntegrations = new Set();
    this.expandedDevices = new Set();
    this.selectedEntities = new Set();
    this.searchTerm = '';
    this.viewState = 'disabled';
  }

  set panel(info) {
    this.hass = info.hass;
    if (!this.content) {
      this.render();
      this.showLoading();
      this.loadData();
    }
  }

  async loadData() {
    try {
      const result = await this.hass.callWS({
        type: 'entity_manager/get_disabled_entities',
        state: this.viewState,
      });
      
      this.data = result;
      
      // Load device information
      await this.loadDeviceInfo();
      
      this.updateView();
    } catch (err) {
      console.error('Error loading disabled entities:', err);
      this.showError('Failed to load disabled entities');
    }
  }

  async loadDeviceInfo() {
    try {
      const deviceRegistry = await this.hass.callWS({
        type: 'config/device_registry/list',
      });
      
      this.deviceInfo = {};
      deviceRegistry.forEach(device => {
        this.deviceInfo[device.id] = device;
      });
    } catch (err) {
      console.error('Error loading device info:', err);
    }
  }

  render() {
    this.content = document.createElement('div');
    this.content.style.cssText = `
      padding: 16px;
      max-width: 1400px;
      margin: 0 auto;
      font-family: Roboto, sans-serif;
      background: var(--primary-background-color);
      min-height: 100vh;
    `;
    
    this.content.innerHTML = `
      <style>
        * {
          font-family: Roboto, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .header {
          margin-bottom: 24px;
          padding: 20px;
          background: linear-gradient(135deg, #03a9f4 0%, #0277bd 100%);
          border-radius: 12px;
          color: white;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header h1 {
          margin: 0 0 8px 0;
          font-size: 2em;
          font-weight: 500;
          color: white;
        }
        .header p {
          margin: 0;
          color: rgba(255, 255, 255, 0.9);
          font-size: 14px;
        }
        .toolbar {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .filter-group {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .filter-toggle {
          padding: 8px 16px;
          border: 2px solid #03a9f4;
          background: var(--card-background-color);
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #03a9f4;
          transition: all 0.2s;
        }
        .filter-toggle:hover {
          background: rgba(3, 169, 244, 0.1);
        }
        .filter-toggle.active {
          background: #03a9f4;
          color: white;
        }
        .search-box {
          flex: 1;
          min-width: 300px;
          padding: 8px 12px;
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          font-size: 14px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
        }
        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background 0.2s;
        }
        .btn-primary {
          background: linear-gradient(135deg, #03a9f4 0%, #0277bd 100%);
          color: white;
          font-weight: 600;
          box-shadow: 0 2px 4px rgba(3, 169, 244, 0.3);
        }
        .btn-primary:hover {
          box-shadow: 0 4px 8px rgba(3, 169, 244, 0.4);
          transform: translateY(-1px);
        }
        .btn-secondary {
          background: var(--divider-color);
          color: var(--primary-text-color);
        }
        .btn-secondary:hover {
          background: var(--secondary-background-color);
        }
        .btn-danger {
          background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
          color: white;
          font-weight: 600;
          box-shadow: 0 2px 4px rgba(244, 67, 54, 0.3);
        }
        .btn-danger:hover {
          box-shadow: 0 4px 8px rgba(244, 67, 54, 0.4);
          transform: translateY(-1px);
        }
        .stats {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .stat-card {
          background: var(--card-background-color);
          padding: 20px;
          border-radius: 12px;
          flex: 1;
          min-width: 150px;
          border-left: 4px solid #03a9f4;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .stat-label {
          color: var(--secondary-text-color);
          font-size: 12px;
          text-transform: uppercase;
          margin-bottom: 8px;
          font-weight: 500;
          letter-spacing: 0.5px;
        }
        .stat-value {
          font-size: 32px;
          font-weight: 600;
          margin-bottom: 12px;
        }
        .integration-header {
          display: flex;
          align-items: center;
          padding: 16px;
          cursor: pointer;
          user-select: none;
          border-bottom: 1px solid var(--divider-color);
          transition: background 0.2s;
        }
        .integration-header:hover {
          background: var(--secondary-background-color);
        }
        .integration-icon {
          margin-right: 12px;
          transition: transform 0.2s;
          color: #03a9f4;
        }
        .integration-icon.expanded {
          transform: rotate(90deg);
        }
        .integration-info {
          flex: 1;
        }
        .integration-name {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 4px;
          color: var(--primary-text-color);
        }
        .integration-stats {
          font-size: 12px;
          color: var(--secondary-text-color);
        }
        .integration-actions {
          display: flex;
          gap: 8px;
          margin-left: 16px;
        }
        .device-list {
          padding: 0 16px 16px 16px;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 12px;
        }
        .device-item {
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          background: var(--card-background-color);
        }
        .device-header {
          display: flex;
          align-items: center;
          padding: 12px;
          cursor: pointer;
          user-select: none;
        }
        .device-header:hover {
          background: var(--secondary-background-color);
        }
        .device-name {
          flex: 1;
          font-weight: 500;
        }
        .device-count {
          font-size: 12px;
          color: var(--secondary-text-color);
          margin-right: 16px;
        }
        .entity-list {
          padding: 0 12px 12px 36px;
        }
        .entity-item {
          display: flex;
          align-items: center;
          padding: 8px;
          margin-bottom: 4px;
          border-radius: 4px;
        }
        .entity-item:hover {
          background: var(--secondary-background-color);
        }
        .entity-checkbox {
          margin-right: 12px;
          cursor: pointer;
        }
        .entity-info {
          flex: 1;
        }
        .entity-id {
          font-size: 13px;
        }
        .entity-name {
          font-size: 11px;
          color: var(--secondary-text-color);
        }
        .entity-badge {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 3px;
          background: var(--divider-color);
          margin-left: 8px;
        }
        .entity-actions {
          display: flex;
          gap: 4px;
        }
        .icon-btn {
          padding: 4px 8px;
          border: none;
          background: transparent;
          cursor: pointer;
          border-radius: 4px;
          font-size: 16px;
          font-weight: bold;
        }
        .icon-btn:hover {
          background: var(--divider-color);
        }
        .icon-btn.enable {
          color: #4caf50;
        }
        .icon-btn.disable {
          color: #f44336;
        }
        .empty-state {
          text-align: center;
          padding: 48px;
          color: var(--secondary-text-color);
        }
        .checkbox-group {
          display: flex;
          align-items: center;
          margin-right: 12px;
        }
      </style>
      
      <div class="header">
        <h1>Entity Manager</h1>
        <p>Manage disabled entities by integration and device (Updated UI)</p>
      </div>
      
      <div class="stats" id="stats"></div>
      
      <div class="toolbar">
        <div class="filter-group">
          <button class="filter-toggle" data-filter="disabled">Disabled</button>
          <button class="filter-toggle" data-filter="enabled">Enabled</button>
          <button class="filter-toggle" data-filter="all">All</button>
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
    
    this.appendChild(this.content);
    
    // Event listeners
    this.content.querySelector('#search-input').addEventListener('input', (e) => {
      this.searchTerm = e.target.value.toLowerCase();
      this.updateView();
    });
    
    this.content.querySelector('#enable-selected').addEventListener('click', () => {
      this.bulkEnable();
    });
    
    this.content.querySelector('#disable-selected').addEventListener('click', () => {
      this.bulkDisable();
    });
    
    this.content.querySelector('#refresh').addEventListener('click', () => {
      this.showLoading();
      this.loadData();
    });

    this.content.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.viewState = btn.dataset.filter;
        this.setActiveFilter();
        this.showLoading();
        this.loadData();
      });
    });

    this.setActiveFilter();
  }

  updateView() {
    const statsEl = this.content.querySelector('#stats');
    const contentEl = this.content.querySelector('#content');
    
    // Filter data based on search
    let filteredData = this.data;
    if (this.searchTerm) {
      filteredData = this.data.map(integration => {
        const filteredDevices = {};
        Object.entries(integration.devices).forEach(([deviceId, device]) => {
          const filteredEntities = device.entities.filter(entity => 
            entity.entity_id.toLowerCase().includes(this.searchTerm) ||
            (entity.original_name && entity.original_name.toLowerCase().includes(this.searchTerm)) ||
            integration.integration.toLowerCase().includes(this.searchTerm) ||
            (this.getDeviceName(deviceId).toLowerCase().includes(this.searchTerm))
          );
          
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
    
    // Update stats
    const totalIntegrations = filteredData.length;
    const totalDevices = filteredData.reduce((sum, int) => sum + Object.keys(int.devices).length, 0);
    const totalEntities = filteredData.reduce(
      (sum, integration) =>
        sum + Object.values(integration.devices).reduce(
          (deviceSum, device) => deviceSum + device.entities.length,
          0,
        ),
      0,
    );
    
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
        <div class="stat-label">Disabled Entities</div>
        <div class="stat-value">${totalEntities}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Selected</div>
        <div class="stat-value">${this.selectedEntities.size}</div>
      </div>
    `;
    
    // Update selected count in buttons
    this.content.querySelector('#selected-count').textContent = this.selectedEntities.size;
    this.content.querySelector('#selected-count-2').textContent = this.selectedEntities.size;
    
    // Render integrations
    if (filteredData.length === 0) {
      contentEl.innerHTML = `
        <div class="empty-state">
          <h2>🎉 No disabled entities found</h2>
          <p>All your entities are enabled, or they match your search criteria.</p>
        </div>
      `;
      return;
    }
    
    contentEl.innerHTML = filteredData.map(integration => this.renderIntegration(integration)).join('');
    
    // Attach event listeners
    this.attachEventListeners();
  }

  renderIntegration(integration) {
    const isExpanded = this.expandedIntegrations.has(integration.integration);
    const deviceCount = Object.keys(integration.devices).length;
    const shownEntities = Object.values(integration.devices).reduce(
      (sum, device) => sum + device.entities.length,
      0,
    );
    const disabledCount = integration.disabled_entities ?? 0;
    const totalCount = integration.total_entities ?? shownEntities;
    
    return `
      <div class="integration-group">
        <div class="integration-header" data-integration="${integration.integration}">
          <div class="integration-icon ${isExpanded ? 'expanded' : ''}">▶</div>
          <div class="integration-info">
            <div class="integration-name">${integration.integration}</div>
            <div class="integration-stats">
              ${deviceCount} device${deviceCount !== 1 ? 's' : ''} • 
              ${shownEntities} shown • ${disabledCount} disabled • ${totalCount} total
            </div>
          </div>
          <div class="integration-actions">
            <button class="btn btn-primary" data-action="enable-integration" data-integration="${integration.integration}">
              Enable All
            </button>
            <button class="btn btn-danger" data-action="disable-integration" data-integration="${integration.integration}">
              Disable All
            </button>
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

  renderDevice(deviceId, device, integrationName) {
    const isExpanded = this.expandedDevices.has(deviceId);
    const deviceName = this.getDeviceName(deviceId);
    const entityCount = device.entities.length;
    const disabledCount = device.disabled_entities ?? 0;
    const totalCount = device.total_entities ?? entityCount;
    
    return `
      <div class="device-item">
        <div class="device-header" data-device="${deviceId}">
          <div class="integration-icon ${isExpanded ? 'expanded' : ''}">▶</div>
          <div class="device-name">${deviceName}</div>
          <div class="device-count">${entityCount} shown • ${disabledCount} disabled • ${totalCount} total</div>
          <button class="btn btn-primary" data-action="enable-device" data-device="${deviceId}">
            Enable All
          </button>
          <button class="btn btn-danger" data-action="disable-device" data-device="${deviceId}">
            Disable All
          </button>
        </div>
        ${isExpanded ? `
          <div class="entity-list">
            ${device.entities.map(entity => this.renderEntity(entity)).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  renderEntity(entity) {
    const isSelected = this.selectedEntities.has(entity.entity_id);
    const displayName = entity.original_name || entity.entity_id.split('.')[1].replace(/_/g, ' ');
    const isDisabled = !!entity.is_disabled;
    const action = isDisabled ? 'enable-entity' : 'disable-entity';
    const actionLabel = isDisabled ? 'Enable' : 'Disable';
    const actionIcon = isDisabled ? '✓' : '✕';
    
    return `
      <div class="entity-item">
        <input 
          type="checkbox" 
          class="entity-checkbox" 
          data-entity="${entity.entity_id}"
          ${isSelected ? 'checked' : ''}
        />
        <div class="entity-info">
          <div class="entity-id">${entity.entity_id}</div>
          ${entity.original_name ? `<div class="entity-name">${entity.original_name}</div>` : ''}
          ${entity.entity_category ? `<span class="entity-badge">${entity.entity_category}</span>` : ''}
          ${isDisabled ? `<span class="entity-badge">disabled${entity.disabled_by ? ` by: ${entity.disabled_by}` : ''}</span>` : '<span class="entity-badge">enabled</span>'}
        </div>
        <div class="entity-actions">
          <button class="icon-btn ${isDisabled ? 'enable' : 'disable'}" data-action="${action}" data-entity="${entity.entity_id}" title="${actionLabel}">
            ${actionIcon}
          </button>
        </div>
      </div>
    `;
  }

  getDeviceName(deviceId) {
    if (!deviceId || deviceId === 'no_device') {
      return '(No Device)';
    }
    const device = this.deviceInfo[deviceId];
    return device ? (device.name_by_user || device.name || deviceId) : deviceId;
  }

  attachEventListeners() {
    // Integration toggle
    this.content.querySelectorAll('[data-integration]').forEach(el => {
      if (el.classList.contains('integration-header')) {
        el.addEventListener('click', (e) => {
          if (e.target.closest('button')) return;
          const integration = el.dataset.integration;
          if (this.expandedIntegrations.has(integration)) {
            this.expandedIntegrations.delete(integration);
          } else {
            this.expandedIntegrations.add(integration);
          }
          this.updateView();
        });
      }
    });
    
    // Device toggle
    this.content.querySelectorAll('[data-device]').forEach(el => {
      if (el.classList.contains('device-header')) {
        el.addEventListener('click', (e) => {
          if (e.target.closest('button')) return;
          const deviceId = el.dataset.device;
          if (this.expandedDevices.has(deviceId)) {
            this.expandedDevices.delete(deviceId);
          } else {
            this.expandedDevices.add(deviceId);
          }
          this.updateView();
        });
      }
    });
    
    // Entity checkboxes
    this.content.querySelectorAll('.entity-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const entityId = e.target.dataset.entity;
        if (e.target.checked) {
          this.selectedEntities.add(entityId);
        } else {
          this.selectedEntities.delete(entityId);
        }
        this.updateView();
      });
    });
    
    // Action buttons
    this.content.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        
        if (action === 'enable-entity') {
          await this.enableEntity(btn.dataset.entity);
        } else if (action === 'enable-device') {
          await this.enableDeviceWithConfirm(btn.dataset.device);
        } else if (action === 'enable-integration') {
          await this.enableIntegrationWithConfirm(btn.dataset.integration);
        } else if (action === 'disable-entity') {
          await this.disableEntity(btn.dataset.entity);
        } else if (action === 'disable-device') {
          await this.disableDeviceWithConfirm(btn.dataset.device);
        } else if (action === 'disable-integration') {
          await this.disableIntegrationWithConfirm(btn.dataset.integration);
        }
      });
    });
  }

  async enableEntity(entityId) {
    try {
      await this.hass.callWS({
        type: 'entity_manager/enable_entity',
        entity_id: entityId,
      });
      this.selectedEntities.delete(entityId);
      await this.loadData();
    } catch (err) {
      console.error('Error enabling entity:', err);
      alert(`Failed to enable ${entityId}: ${err.message}`);
    }
  }

  async enableDeviceWithConfirm(deviceId) {
    const integration = this.data.find(int => int.devices[deviceId]);
    if (!integration) return;
    
    const entityIds = integration.devices[deviceId].entities.map(e => e.entity_id);
    const deviceName = this.getDeviceName(deviceId);
    
    if (!confirm(`Enable all ${entityIds.length} entities for device "${deviceName}"?`)) return;
    await this.bulkEnableEntities(entityIds);
  }

  async enableIntegrationWithConfirm(integrationName) {
    const integration = this.data.find(int => int.integration === integrationName);
    if (!integration) return;
    
    const entityIds = [];
    Object.values(integration.devices).forEach(device => {
      device.entities.forEach(entity => {
        entityIds.push(entity.entity_id);
      });
    });
    
    if (!confirm(`Enable all ${entityIds.length} entities for integration "${integrationName}"?`)) return;
    await this.bulkEnableEntities(entityIds);
  }

  async disableDeviceWithConfirm(deviceId) {
    const integration = this.data.find(int => int.devices[deviceId]);
    if (!integration) return;
    
    const entityIds = integration.devices[deviceId].entities.map(e => e.entity_id);
    const deviceName = this.getDeviceName(deviceId);
    
    if (!confirm(`⚠️ WARNING: Disable all ${entityIds.length} entities for device "${deviceName}"? This may affect automations and dashboards.`)) return;
    await this.bulkDisableEntities(entityIds);
  }

  async disableIntegrationWithConfirm(integrationName) {
    const integration = this.data.find(int => int.integration === integrationName);
    if (!integration) return;
    
    const entityIds = [];
    Object.values(integration.devices).forEach(device => {
      device.entities.forEach(entity => {
        entityIds.push(entity.entity_id);
      });
    });
    
    if (!confirm(`⚠️ WARNING: Disable all ${entityIds.length} entities for integration "${integrationName}"? This may affect automations and dashboards.`)) return;
    await this.bulkDisableEntities(entityIds);
  }

  async bulkEnable() {
    if (this.selectedEntities.size === 0) {
      alert('No entities selected');
      return;
    }
    
    await this.bulkEnableEntities(Array.from(this.selectedEntities));
  }

  async bulkDisable() {
    if (this.selectedEntities.size === 0) {
      alert('No entities selected');
      return;
    }
    
    try {
      const result = await this.hass.callWS({
        type: 'entity_manager/bulk_disable',
        entity_ids: Array.from(this.selectedEntities),
      });
      
      this.selectedEntities.clear();
      await this.loadData();
      
      if (result.failed.length > 0) {
        alert(`Disabled ${result.success.length} entities. Failed: ${result.failed.length}`);
      }
    } catch (err) {
      console.error('Error bulk disabling:', err);
      alert('Failed to disable entities');
    }
  }

  async bulkEnableEntities(entityIds) {
    try {
      const result = await this.hass.callWS({
        type: 'entity_manager/bulk_enable',
        entity_ids: entityIds,
      });
      
      entityIds.forEach(id => this.selectedEntities.delete(id));
      await this.loadData();
      
      if (result.failed.length > 0) {
        alert(`Enabled ${result.success.length} entities. Failed: ${result.failed.length}`);
      }
    } catch (err) {
      console.error('Error bulk enabling:', err);
      alert('Failed to enable entities');
    }
  }

  async bulkDisableEntities(entityIds) {
    try {
      const result = await this.hass.callWS({
        type: 'entity_manager/bulk_disable',
        entity_ids: entityIds,
      });
      
      entityIds.forEach(id => this.selectedEntities.delete(id));
      await this.loadData();
      
      if (result.failed.length > 0) {
        alert(`Disabled ${result.success.length} entities. Failed: ${result.failed.length}`);
      }
    } catch (err) {
      console.error('Error bulk disabling:', err);
      alert('Failed to disable entities');
    }
  }

  async disableEntity(entityId) {
    try {
      await this.hass.callWS({
        type: 'entity_manager/disable_entity',
        entity_id: entityId,
      });
      this.selectedEntities.delete(entityId);
      await this.loadData();
    } catch (err) {
      console.error('Error disabling entity:', err);
      alert(`Failed to disable ${entityId}: ${err.message}`);
    }
  }

  setActiveFilter() {
    this.content.querySelectorAll('[data-filter]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === this.viewState);
    });
  }

  showError(message) {
    const contentEl = this.content.querySelector('#content');
    contentEl.innerHTML = `
      <div class="empty-state">
        <h2>⚠️ Error</h2>
        <p>${message}</p>
      </div>
    `;
  }

  showLoading() {
    const contentEl = this.content.querySelector('#content');
    contentEl.innerHTML = `
      <div class="empty-state">
        <h2>⏳ Loading...</h2>
        <p>Fetching entity data...</p>
      </div>
    `;
  }
}

customElements.define('entity-manager-panel', EntityManagerPanel);
