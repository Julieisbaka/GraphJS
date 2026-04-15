# Changelog

All notable changes to this project will be documented in this file.

## [0.0.3] - 2026-04-15

### Changed

- `graph.render()` in the `setText` command replaced with `api.requestRender()`.
- `afterRender` hook no longer reads `graph.options` directly. Dimensions are now read via `api.getOptions()`, keeping the plugin consistent with the API surface.

## [0.0.2] - 2026-04-14

### Added

- JSDoc docstrings for exported plugin API to improve IntelliSense and developer discoverability.

## [0.0.1] - 2026-04-14

### Added

- Initial release of watermark extension plugin.
- Configurable watermark text, style, and offsets.
- Package metadata, README, and MIT license.
