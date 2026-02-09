# Entity Manager

![Version](https://img.shields.io/badge/version-2.7.0-blue.svg)

## Overview
Entity Manager is a powerful and lightweight library for managing entities in your application with ORM capabilities. With version 2.7.0, we introduce several enhancements to improve performance and usability.

## Features
- **New Features:**  
  - **Asynchronous Operations:** Added support for asynchronous entity management. This allows for non-blocking operations for optimal performance.
  - **Data Validation:** Introduced a robust data validation layer that helps ensure the integrity of entity data.
  - **GraphQL Integration:** Full support for GraphQL has been implemented, allowing seamless integration with modern APIs.

## Fixes
- **Bug Fixes:**  
  - Fixed an issue where entity states were not properly retained during transactions.  
  - Improved error handling to provide more descriptive messages in case of failures.

## Removals
- **Deprecated Features:**  
  - Removed the legacy API which was previously marked as deprecated in earlier versions. Users are encouraged to migrate to the new API for improved functionality.

## Technical Details
This version continues to build on the principles of efficiency and ease of use, with an emphasis on modern development practices. Our commitment is to provide a seamless experience for developers.

## Installation
To update to version 2.7.0, simply run:
```bash
pip install entity-manager --upgrade
```

## Contributions
We welcome contributions from the community! Please check our [contributing guide](CONTRIBUTING.md) for more details.