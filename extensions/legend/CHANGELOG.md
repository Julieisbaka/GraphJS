# Changelog

All notable changes to this project will be documented in this file.

## [0.0.5] - 2026-04-25

### Changed

- The peer dependency now requires `@julieisbaka/graphjs >=0.4.3` to match the current core release line.

## [0.0.4] - 2026-04-25

### Changed

- The npm package is now published as `@julieisbaka/graphjs-extension-legend`.
- README examples now import the core package from `@julieisbaka/graphjs` and the extension from `@julieisbaka/graphjs-extension-legend`.
- The peer dependency now targets `@julieisbaka/graphjs`.

## [0.0.3] - 2026-04-15

### Changed

- `graph.render()` in the `set` command replaced with `api.requestRender()`.

## [0.0.2] - 2026-04-14

### Added

- JSDoc docstrings for exported plugin API to improve IntelliSense and developer discoverability.

## [0.0.1] - 2026-04-14

### Added

- Initial release of legend extension plugin.
- Legend box rendering with configurable style and placement.
- Package metadata, README, and MIT license.
