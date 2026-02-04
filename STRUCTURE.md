# Project Structure

```
entity-manager/
├── custom_components/
│   └── entity_manager/
│       ├── __init__.py                 # Main integration initialization
│       ├── config_flow.py              # Configuration flow for setup
│       ├── manifest.json               # Integration metadata
│       ├── strings.json                # UI strings
│       ├── websocket_api.py            # WebSocket API endpoints
│       ├── voice_assistant.py          # Voice assistant intent handlers
│       ├── frontend/
│       │   └── entity-manager-panel.js # Frontend web component
│       └── translations/
│           └── en.json                 # English translations
├── sentences/                          # Voice assistant sentences (root level)
│   └── en/
│       └── entity_manager.yaml         # English voice command sentences
├── docs/                               # Documentation (optional)
├── .gitignore                          # Git ignore file
├── hacs.json                           # HACS configuration
├── info.md                             # HACS info page
├── INSTALL.md                          # Installation guide
├── LICENSE                             # MIT License
└── README.md                           # Main documentation

```

## File Descriptions

### Core Integration Files

**`__init__.py`**
- Initializes the integration
- Registers the WebSocket API
- Creates the frontend panel
- Handles setup and teardown

**`config_flow.py`**
- Handles configuration UI
- Manages integration setup
- Provides options flow (for future settings)

**`manifest.json`**
- Defines integration metadata
- Lists dependencies
- Specifies version and domain

**`websocket_api.py`**
- Implements WebSocket commands
- Handles entity operations (enable/disable)
- Provides data to frontend
- Manages bulk operations

**`voice_assistant.py`**
- Implements voice assistant intent handlers
- Processes enable/disable entity commands
- Integrates with Home Assistant Assist

### Voice Assistant Files

**`sentences/en/entity_manager.yaml`**
- Defines English voice command patterns
- Maps spoken phrases to intents
- Supports natural language entity control
- Located at repository root (required for HA 2024.x+)

### Frontend Files

**`frontend/entity-manager-panel.js`**
- Custom web component
- Renders the UI
- Handles user interactions
- Communicates with backend via WebSocket

### Configuration Files

**`hacs.json`**
- HACS integration configuration
- Specifies minimum HA version
- Defines integration properties

**`strings.json`**
- Default UI strings
- Setup flow text
- Used by Home Assistant's translation system

**`translations/en.json`**
- English translations
- Setup and configuration text

### Documentation

**`README.md`**
- Main documentation
- Features overview
- Usage instructions
- Examples

**`INSTALL.md`**
- Detailed installation guide
- Troubleshooting
- Update/uninstall instructions

**`info.md`**
- Brief description for HACS
- Key features
- Quick start

**`LICENSE`**
- MIT License
- Usage rights

## Data Flow

```
User Interface (JS)
        ↓
WebSocket Connection
        ↓
WebSocket API (Python)
        ↓
Home Assistant Core
        ↓
Entity Registry
```

## Key Components

### Backend (Python)

1. **WebSocket Commands**:
   - `entity_manager/get_disabled_entities` - Fetch all disabled entities
   - `entity_manager/enable_entity` - Enable single entity
   - `entity_manager/disable_entity` - Disable single entity
   - `entity_manager/bulk_enable` - Enable multiple entities
   - `entity_manager/bulk_disable` - Disable multiple entities

2. **Data Structure**:
   ```python
   {
       "integration": "shelly",
       "devices": {
           "device_id": {
               "entities": [
                   {
                       "entity_id": "sensor.shelly_power",
                       "disabled_by": "user",
                       "platform": "shelly",
                       ...
                   }
               ]
           }
       },
       "total_entities": 10
   }
   ```

### Frontend (JavaScript)

1. **Main Class**: `EntityManagerPanel`
   - Extends `HTMLElement`
   - Custom element registration
   - State management

2. **State**:
   - `data` - Disabled entities grouped by integration/device
   - `deviceInfo` - Device registry cache
   - `expandedIntegrations` - UI state for expanded sections
   - `expandedDevices` - UI state for expanded devices
   - `selectedEntities` - Checkboxes selection state
   - `searchTerm` - Current search filter

3. **Methods**:
   - `loadData()` - Fetch entities from backend
   - `updateView()` - Render current state
   - `enableEntity()` - Enable single entity
   - `bulkEnable()` - Enable selected entities
   - Event handlers for UI interactions

## Development Workflow

1. **Local Development**:
   - Edit files in `custom_components/entity_manager/`
   - Copy to Home Assistant config directory
   - Restart Home Assistant
   - Clear browser cache
   - Test changes

2. **Adding Features**:
   - Backend: Modify `websocket_api.py`
   - Frontend: Modify `entity-manager-panel.js`
   - Update documentation

3. **Testing**:
   - Test with various integrations
   - Test bulk operations
   - Test search functionality
   - Verify error handling

## Extension Points

Want to add features? Here are good starting points:

1. **Filtering Options**:
   - Modify `updateView()` in JS
   - Add filter UI elements
   - Apply filters to `filteredData`

2. **Export Functionality**:
   - Add export button in toolbar
   - Create export function
   - Generate CSV/JSON of disabled entities

3. **Statistics/Charts**:
   - Add charting library
   - Create stats view
   - Show trends over time

4. **Scheduling**:
   - Add backend service for scheduled enable/disable
   - Create UI for schedules
   - Store schedules in config

5. **Presets**:
   - Save entity enable/disable presets
   - Quick toggle between configurations
   - Store in Home Assistant storage
