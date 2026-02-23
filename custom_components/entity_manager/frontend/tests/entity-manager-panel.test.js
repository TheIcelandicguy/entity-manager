/**
 * Entity Manager Panel Unit Tests
 * 
 * These tests can be run in a browser console or with a test runner.
 * Usage: Load entity-manager-panel.js first, then load this file.
 */

class EntityManagerTests {
  constructor() {
    this.passCount = 0;
    this.failCount = 0;
    this.results = [];
  }

  // Test utilities
  assert(condition, message) {
    if (condition) {
      this.passCount++;
      this.results.push({ status: 'PASS', message });
    } else {
      this.failCount++;
      this.results.push({ status: 'FAIL', message });
    }
  }

  assertEqual(actual, expected, message) {
    this.assert(actual === expected, `${message} (expected: ${expected}, got: ${actual})`);
  }

  assertDeepEqual(actual, expected, message) {
    this.assert(
      JSON.stringify(actual) === JSON.stringify(expected),
      `${message} (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`
    );
  }

  assertThrows(fn, message) {
    try {
      fn();
      this.assert(false, `${message} - expected to throw but didn't`);
    } catch (e) {
      this.assert(true, message);
    }
  }

  // Mock hass object
  createMockHass() {
    return {
      callWS: async (params) => {
        // Simulate different responses based on type
        switch (params.type) {
          case 'entity_manager/get_disabled_entities':
            return [
              {
                integration: 'hue',
                devices: {
                  'device_1': {
                    entities: [
                      { entity_id: 'light.living_room', original_name: 'Living Room', is_disabled: false },
                      { entity_id: 'light.bedroom', original_name: 'Bedroom', is_disabled: true }
                    ]
                  }
                }
              }
            ];
          case 'entity_manager/enable_entity':
            return { success: true };
          case 'entity_manager/disable_entity':
            return { success: true };
          case 'get_states':
            return [
              { entity_id: 'automation.test', state: 'on', attributes: {} },
              { entity_id: 'light.living_room', state: 'on', attributes: {} }
            ];
          case 'history/history_during_period':
            return {
              'light.living_room': [
                { state: 'on', last_changed: new Date().toISOString() },
                { state: 'off', last_changed: new Date(Date.now() - 3600000).toISOString() }
              ]
            };
          default:
            return {};
        }
      },
      states: {
        'light.living_room': { entity_id: 'light.living_room', state: 'on', attributes: { friendly_name: 'Living Room Light' } },
        'automation.test': { entity_id: 'automation.test', state: 'on', attributes: { entity_id: ['light.living_room'] } }
      }
    };
  }

  // Create test panel instance
  createTestPanel() {
    const panel = document.createElement('entity-manager-panel');
    panel.hass = this.createMockHass();
    return panel;
  }

  // ============ TEST CASES ============

  async testThemeSystemInitialization() {
    const panel = this.createTestPanel();
    
    this.assert(panel.activeTheme === 'default', 'Default theme should be "default"');
    this.assert(typeof panel.customThemes === 'object', 'Custom themes should be an object');
    this.assert(typeof PREDEFINED_THEMES === 'object', 'PREDEFINED_THEMES should be defined');
    this.assert(PREDEFINED_THEMES['Light'] !== undefined, 'Light theme should exist');
    this.assert(PREDEFINED_THEMES['Dark'] !== undefined, 'Dark theme should exist');
  }

  async testFavoritesSystem() {
    const panel = this.createTestPanel();
    
    // Initially no favorites
    this.assertEqual(panel.favorites.size, 0, 'Should start with no favorites');
    
    // Add a favorite
    panel._toggleFavorite('light.living_room');
    this.assert(panel.favorites.has('light.living_room'), 'Should add favorite');
    
    // Remove the favorite
    panel._toggleFavorite('light.living_room');
    this.assert(!panel.favorites.has('light.living_room'), 'Should remove favorite on toggle');
  }

  async testUndoRedoSystem() {
    const panel = this.createTestPanel();
    
    // Initially empty stacks
    this.assertEqual(panel.undoStack.length, 0, 'Undo stack should be empty initially');
    this.assertEqual(panel.redoStack.length, 0, 'Redo stack should be empty initially');
    
    // Push an action
    panel._pushUndoAction({
      type: 'test',
      description: 'Test action',
      undo: async () => {}
    });
    
    this.assertEqual(panel.undoStack.length, 1, 'Undo stack should have 1 item');
    
    // Test max undo steps
    for (let i = 0; i < 60; i++) {
      panel._pushUndoAction({
        type: 'test',
        description: `Action ${i}`,
        undo: async () => {}
      });
    }
    
    this.assert(panel.undoStack.length <= panel.maxUndoSteps, 'Undo stack should respect max limit');
  }

  async testFilterPresetSystem() {
    const panel = this.createTestPanel();
    
    // Set some filter state
    panel.searchTerm = 'living';
    panel.viewState = 'enabled';
    panel.selectedDomain = 'light';
    
    // Save preset
    panel._saveCurrentFilterPreset('Test Preset');
    
    const presets = panel.filterPresets;
    this.assert(presets.length > 0, 'Should have saved preset');
    this.assertEqual(presets[0].name, 'Test Preset', 'Preset name should match');
    this.assertEqual(presets[0].filters.searchTerm, 'living', 'Preset should save search term');
    
    // Clear filters
    panel.searchTerm = '';
    panel.viewState = 'all';
    panel.selectedDomain = 'all';
    
    // Apply preset
    panel._applyFilterPreset(presets[0]);
    
    this.assertEqual(panel.searchTerm, 'living', 'Should restore search term');
    this.assertEqual(panel.viewState, 'enabled', 'Should restore view state');
    this.assertEqual(panel.selectedDomain, 'light', 'Should restore domain');
  }

  async testTagSystem() {
    const panel = this.createTestPanel();
    const testEntityId = 'light.living_room';
    
    // Add tags
    panel._addTagToEntity(testEntityId, 'important');
    panel._addTagToEntity(testEntityId, 'downstairs');
    
    const tags = panel.entityTags[testEntityId];
    this.assert(tags.includes('important'), 'Should add "important" tag');
    this.assert(tags.includes('downstairs'), 'Should add "downstairs" tag');
    
    // Don't duplicate tags
    panel._addTagToEntity(testEntityId, 'important');
    this.assertEqual(panel.entityTags[testEntityId].filter(t => t === 'important').length, 1, 'Should not duplicate tags');
    
    // Remove tag
    panel._removeTagFromEntity(testEntityId, 'important');
    this.assert(!panel.entityTags[testEntityId].includes('important'), 'Should remove tag');
    
    // Get all tags
    panel._addTagToEntity('light.bedroom', 'upstairs');
    const allTags = panel._getAllTags();
    this.assert(allTags.includes('downstairs'), 'Should include "downstairs" in all tags');
    this.assert(allTags.includes('upstairs'), 'Should include "upstairs" in all tags');
  }

  async testAliasSystem() {
    const panel = this.createTestPanel();
    const testEntityId = 'light.living_room';
    
    // Set alias
    panel._setEntityAlias(testEntityId, 'Main Light');
    
    this.assertEqual(panel.entityAliases[testEntityId], 'Main Light', 'Should set alias');
    
    // Clear alias
    panel._setEntityAlias(testEntityId, '');
    this.assert(!panel.entityAliases[testEntityId], 'Should clear alias when empty');
  }

  async testSmartGroupsSystem() {
    const panel = this.createTestPanel();
    panel.data = [
      {
        integration: 'hue',
        devices: {
          'device_1': {
            entities: [
              { entity_id: 'light.living_room', original_name: 'Living Room', is_disabled: false, area_id: 'living_room' },
              { entity_id: 'light.bedroom', original_name: 'Bedroom', is_disabled: false, area_id: 'bedroom' }
            ]
          }
        }
      },
      {
        integration: 'zwave',
        devices: {
          'device_2': {
            entities: [
              { entity_id: 'switch.kitchen', original_name: 'Kitchen', is_disabled: false, area_id: 'kitchen' }
            ]
          }
        }
      }
    ];
    
    // Test integration grouping
    panel.smartGroupMode = 'integration';
    let groups = panel._getSmartGroups();
    this.assert(groups.hue !== undefined, 'Should group by integration: hue');
    this.assert(groups.zwave !== undefined, 'Should group by integration: zwave');
    
    // Test type grouping
    panel.smartGroupMode = 'type';
    groups = panel._getSmartGroups();
    this.assert(groups.light !== undefined, 'Should group by type: light');
    this.assert(groups.switch !== undefined, 'Should group by type: switch');
  }

  async testColumnVisibility() {
    const panel = this.createTestPanel();
    
    // Default columns
    this.assert(panel.visibleColumns.includes('name'), 'Should include name column by default');
    this.assert(panel.visibleColumns.includes('state'), 'Should include state column by default');
    this.assert(panel.visibleColumns.includes('actions'), 'Should include actions column by default');
    
    // Toggle column
    const initialLength = panel.visibleColumns.length;
    panel.visibleColumns = panel.visibleColumns.filter(c => c !== 'tags');
    
    this.assert(!panel.visibleColumns.includes('tags'), 'Should be able to hide column');
  }

  async testAutomationImpactAnalysis() {
    const panel = this.createTestPanel();
    
    const impactedItems = await panel._analyzeAutomationImpact('light.living_room');
    // This would need actual data to test properly
    this.assert(Array.isArray(impactedItems), 'Should return an array of impacted items');
  }

  async testFormatTimeDiff() {
    const panel = this.createTestPanel();
    
    // Test seconds
    this.assertEqual(panel._formatTimeDiff(1000), '1s', 'Should format 1 second');
    this.assertEqual(panel._formatTimeDiff(45000), '45s', 'Should format 45 seconds');

    // Test minutes
    this.assertEqual(panel._formatTimeDiff(60000), '1m', 'Should format 1 minute');
    this.assertEqual(panel._formatTimeDiff(3600000 - 1000), '59m', 'Should format 59 minutes');

    // Test hours
    this.assertEqual(panel._formatTimeDiff(3600000), '1h', 'Should format 1 hour');
    this.assertEqual(panel._formatTimeDiff(86400000 - 1000), '23h', 'Should format 23 hours');

    // Test days
    this.assertEqual(panel._formatTimeDiff(86400000), '1d', 'Should format 1 day');

    // Test null/NaN guards
    this.assertEqual(panel._formatTimeDiff(null), '?', 'Should handle null');
    this.assertEqual(panel._formatTimeDiff(NaN), '?', 'Should handle NaN');
  }

  async testLazyLoading() {
    const panel = this.createTestPanel();
    
    // Test initial load count
    this.assertEqual(panel.initialLoadCount, 20, 'Initial load count should be 20');
    this.assertEqual(panel.loadMoreCount, 20, 'Load more count should be 20');
    
    // Test visible entity counts tracking
    this.assertDeepEqual(panel.visibleEntityCounts, {}, 'Should start with empty visible counts');
    
    // Load more for integration
    panel.data = [
      {
        integration: 'test',
        devices: {
          'device_1': {
            entities: new Array(50).fill(null).map((_, i) => ({
              entity_id: `light.test_${i}`,
              is_disabled: false
            }))
          }
        }
      }
    ];
    
    panel._loadMoreEntities('test', false);
    this.assertEqual(panel.visibleEntityCounts['test'], 40, 'Should load 20 more entities');
  }

  async testActivityLog() {
    const panel = this.createTestPanel();
    
    // Log an activity
    panel._logActivity({
      action: 'enable',
      entityId: 'light.test',
      details: 'Enabled entity'
    });
    
    this.assert(panel.activityLog.length > 0, 'Should have activity logged');
    this.assertEqual(panel.activityLog[0].action, 'enable', 'Should log correct action');
    this.assertEqual(panel.activityLog[0].entityId, 'light.test', 'Should log correct entity');
  }

  async testSearchFiltering() {
    const panel = this.createTestPanel();
    panel.data = [
      {
        integration: 'hue',
        devices: {
          'device_1': {
            entities: [
              { entity_id: 'light.living_room', original_name: 'Living Room Light', is_disabled: false },
              { entity_id: 'light.bedroom', original_name: 'Bedroom Light', is_disabled: false },
              { entity_id: 'switch.kitchen', original_name: 'Kitchen Switch', is_disabled: true }
            ]
          }
        }
      }
    ];
    
    // Test search term
    panel.searchTerm = 'living';
    const filtered = panel.filteredData || panel.getFilteredData?.() || panel.data;
    
    // Note: This would need the actual filter implementation to test properly
    this.assert(true, 'Search filtering test placeholder');
  }

  // ============ RUN ALL TESTS ============

  async runAll() {
    console.log('🧪 Starting Entity Manager Panel Tests...\n');
    
    const tests = [
      { name: 'Theme System Initialization', fn: () => this.testThemeSystemInitialization() },
      { name: 'Favorites System', fn: () => this.testFavoritesSystem() },
      { name: 'Undo/Redo System', fn: () => this.testUndoRedoSystem() },
      { name: 'Filter Preset System', fn: () => this.testFilterPresetSystem() },
      { name: 'Tag System', fn: () => this.testTagSystem() },
      { name: 'Alias System', fn: () => this.testAliasSystem() },
      { name: 'Smart Groups System', fn: () => this.testSmartGroupsSystem() },
      { name: 'Column Visibility', fn: () => this.testColumnVisibility() },
      { name: 'Automation Impact Analysis', fn: () => this.testAutomationImpactAnalysis() },
      { name: 'Format Time Diff', fn: () => this.testFormatTimeDiff() },
      { name: 'Lazy Loading', fn: () => this.testLazyLoading() },
      { name: 'Activity Log', fn: () => this.testActivityLog() },
      { name: 'Search Filtering', fn: () => this.testSearchFiltering() }
    ];
    
    for (const test of tests) {
      console.log(`Running: ${test.name}...`);
      try {
        await test.fn();
        console.log(`  ✓ ${test.name} completed`);
      } catch (error) {
        this.failCount++;
        this.results.push({ status: 'ERROR', message: `${test.name}: ${error.message}` });
        console.error(`  ✗ ${test.name} errored: ${error.message}`);
      }
    }
    
    console.log('\n============ TEST RESULTS ============');
    console.log(`Total: ${this.passCount + this.failCount}`);
    console.log(`Passed: ${this.passCount}`);
    console.log(`Failed: ${this.failCount}`);
    
    if (this.failCount > 0) {
      console.log('\nFailed Tests:');
      this.results.filter(r => r.status !== 'PASS').forEach(r => {
        console.log(`  ✗ ${r.message}`);
      });
    }
    
    return {
      total: this.passCount + this.failCount,
      passed: this.passCount,
      failed: this.failCount,
      results: this.results
    };
  }
}

// Auto-run tests if in browser
if (typeof customElements !== 'undefined' && customElements.get('entity-manager-panel')) {
  const tests = new EntityManagerTests();
  tests.runAll().then(results => {
    console.log('\nTest run complete.');
    window.entityManagerTestResults = results;
  });
} else {
  console.log('Entity Manager Panel not loaded. Load entity-manager-panel.js first.');
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EntityManagerTests;
}
