# Changelog

All notable changes to this project will be documented in this file.

## [0.0.10] - 2026-04-25

### Changed

- The peer dependency now requires `@julieisbaka/graphjs >=0.4.3` to match the current core release line.

## [0.0.9] - 2026-04-25

### Changed

- The npm package is now published as `@julieisbaka/graphjs-extension-pan-zoom`.
- The runtime no longer depends on a repo-local internal utils path, so the package remains publishable without breaking local workspace tests.
- README examples now import the core package from `@julieisbaka/graphjs` and the extension from `@julieisbaka/graphjs-extension-pan-zoom`.
- The peer dependency now targets `@julieisbaka/graphjs`.

## [0.0.8] - 2026-04-20

### Fixed

- Added missing `clamp` to the import from `../../src/core/utils.js`. The `pan-zoom.set` command was calling `clamp()` to bound `zoomStep`, but only `clampBounds` was imported, causing a `ReferenceError` at runtime.

## [0.0.7] - 2026-04-15

### Changed

- All `graph.render()` calls in commands and pointer event handlers replaced with `api.requestRender()`. This expresses render requests through the plugin API surface rather than directly on the graph object.

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
