# GraphJS Documentation Hub

This folder contains long-form and reference documentation for GraphJS core APIs, hooks, utility functions, and first-party plugins.

## Contents

- Getting started
  - [Installation](./getting-started/installation.md)
  - [Package Usage Guide](./getting-started/package-usage-guide.md)
- Guides
  - [Plugin Development Guide](./guides/plugin-development-guide.md)
  - [Troubleshooting Guide](./guides/troubleshooting.md)
- Reference
  - [Core API Reference](./reference/core-api.md)
  - [Hook Reference](./reference/hooks-reference.md)
  - [Utilities API Reference](./reference/utils-api.md)
  - [Validation API Reference](./reference/validation-reference.md)
  - [Default Options Reference](./reference/default-options.md)
- First-party plugins
  - [Crosshair Plugin](./plugins/crosshair.md)
  - [Legend Plugin](./plugins/legend.md)
  - [Pan-Zoom Plugin](./plugins/pan-zoom.md)
  - [Sampling Plugin](./plugins/sampling.md)
  - [Time-Scale Plugin](./plugins/time-scale.md)
  - [Tooltip Cursor Plugin](./plugins/tooltip-cursor.md)
  - [Watermark Plugin](./plugins/watermark.md)

## Quick API Index

### Classes

- `Graph` -> [Core API Reference](./reference/core-api.md#graph-class)
- `Registry` -> [Core API Reference](./reference/core-api.md#registry-class)
- `HookRegistry` -> [Core API Reference](./reference/core-api.md#hookregistry-class)

### Constants

- `BUILTIN_HOOKS` -> [Core API Reference](./reference/core-api.md#builtin_hooks)
- `DEFAULT_OPTIONS` -> [Default Options Reference](./reference/default-options.md)

### Validation Functions

- `validateDomain` -> [Validation API Reference](./reference/validation-reference.md#validatedomaindomain)
- `validateGraphOptions` -> [Validation API Reference](./reference/validation-reference.md#validategraphoptionsoptions)
- `validatePluginContract` -> [Validation API Reference](./reference/validation-reference.md#validateplugincontractplugin)

### Utility Functions

- `isPlainObject` -> [Utilities API Reference](./reference/utils-api.md)
- `deepMerge` -> [Utilities API Reference](./reference/utils-api.md)
- `deepFreeze` -> [Utilities API Reference](./reference/utils-api.md)
- `clamp` -> [Utilities API Reference](./reference/utils-api.md)
- `decimatePointsStride` -> [Utilities API Reference](./reference/utils-api.md)
- `resolveCanvas` -> [Utilities API Reference](./reference/utils-api.md)
- `getDevicePixelRatio` -> [Utilities API Reference](./reference/utils-api.md)
- `normalizeSeriesData` -> [Utilities API Reference](./reference/utils-api.md)
- `getDataBounds` -> [Utilities API Reference](./reference/utils-api.md)
- `makeLinearScale` -> [Utilities API Reference](./reference/utils-api.md)
- `invertLinearScale` -> [Utilities API Reference](./reference/utils-api.md)
- `clampBounds` -> [Utilities API Reference](./reference/utils-api.md)
- `applyDomainOverride` -> [Utilities API Reference](./reference/utils-api.md)
- `filterVisibleSeries` -> [Utilities API Reference](./reference/utils-api.md)
- `drawLineSeries` -> [Utilities API Reference](./reference/utils-api.md)

## Reference Metadata Policy

Each API/function/hook entry in this documentation includes:

- Description
- Parameters
- Output / return value
- Version added
- Deprecation version (if applicable)
- Removal version (if applicable)
- Behavior notes and changes
- Interactions with other APIs
- Use cases
- Best practices

## Version Notes

GraphJS changelog detail starts at `0.2.4` in this repository. For APIs that predate those entries, this documentation marks version-added as `Initial line (<= 0.2.4)` unless a newer version is explicitly documented in `CHANGELOG.md`.

First-party plugin pages include an "Internal Changes Over Time" section sourced from each plugin package changelog in `extensions/<plugin>/CHANGELOG.md`.
