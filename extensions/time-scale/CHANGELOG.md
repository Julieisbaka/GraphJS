# Changelog

All notable changes to this project will be documented in this file.

## [0.0.4] - 2026-04-25

### Changed

- The npm package is now published as `@julieisbaka/graphjs-extension-time-scale`.
- README examples now import the core package from `@julieisbaka/graphjs` and the extension from `@julieisbaka/graphjs-extension-time-scale`.
- The peer dependency now targets `@julieisbaka/graphjs`.

## [0.0.3] - 2026-04-15

### Changed

- `graph.render()` in the `set` command replaced with `api.requestRender()`.

## [0.0.2] - 2026-04-14

### Added

- JSDoc docstrings for exported plugin API and helper utilities to improve IntelliSense and developer discoverability.

## [0.0.1] - 2026-04-14

### Added

- Initial release of time-scale extension plugin.
- Time-formatted x-axis tick labels via Intl.DateTimeFormat.
- Configurable formatter, locale, and tick count.
