# Changelog

All notable changes to this project will be documented in this file.

## [0.0.6] - 2026-04-15

### Changed
- Updated `clampBounds` import in `index.js` to use the public export from `graphjs/utils` instead of the old internal helper. No behavior change, just removes the local duplicate implementation.

## [0.0.5] - 2026-04-15

### Changed

- Replaced duplicated inline clamp-to-bounds logic in wheel zoom and drag-pan handlers with `clampBounds` from `graphjs/utils`. Removes the local `clamp` helper and ~20 lines of duplicated code.

## [0.0.4] - 2026-04-15

### Changed

- `minZoomStep` and `maxZoomStep` are now configurable plugin options (defaults: `0.01` and `0.8`). Previously the clamp bounds were hardcoded in the `pan-zoom.set` command handler.

## [0.0.3] - 2026-04-15

### Changed

- Replaced deprecated `api.state` usage with `api.getPluginState()` across lifecycle hooks and install flow.

## [0.0.2] - 2026-04-14

### Added

- JSDoc docstrings for exported plugin API and helper utilities to improve IntelliSense and developer discoverability.

## [0.0.1] - 2026-04-14

### Added

- Initial release of pan-zoom extension plugin.
- Mouse wheel zoom and drag-to-pan behavior.
- View window state mapped to GraphJS render bounds.
