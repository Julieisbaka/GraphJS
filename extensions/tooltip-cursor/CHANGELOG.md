# Changelog

All notable changes to this project will be documented in this file.

## [0.0.9] - 2026-04-25

### Fixed

- Removed the trailing `.git` from `repository.url` so the package metadata exactly matches the GitHub repository URL format npm documents for trusted publishing checks.

## [0.0.8] - 2026-04-25

### Fixed

- Removed the `git+` prefix from `repository.url` so the package metadata matches npm Trusted Publishing's GitHub repository URL checks more closely.

## [0.0.7] - 2026-04-25

### Fixed

- Added an explicit `repository.url` pointing at `https://github.com/Julieisbaka/GraphJS` so npm Trusted Publishing can match the package metadata to the GitHub repository during publish authorization.

## [0.0.6] - 2026-04-25

### Changed

- The peer dependency now requires `@julieisbaka/graphjs >=0.4.3` to match the current core release line.

## [0.0.5] - 2026-04-25

### Changed

- The npm package is now published as `@julieisbaka/graphjs-extension-tooltip-cursor`.
- README examples now import the core package from `@julieisbaka/graphjs` and the extension from `@julieisbaka/graphjs-extension-tooltip-cursor`.
- The peer dependency now targets `@julieisbaka/graphjs`.
- JSDoc references now point at the published `@julieisbaka/graphjs` package instead of a repo-local path.

## [0.0.4] - 2026-04-15

### Changed

- `graph.render()` calls in the `set` command and `mousemove`/`mouseleave` event handlers replaced with `api.requestRender()`.

## [0.0.3] - 2026-04-14

### Changed

- Replaced deprecated `api.state` access with `api.getPluginState()` in `afterRender` and `beforeDestroy` hooks.

## [0.0.2] - 2026-04-14

### Added

- JSDoc docstrings for exported plugin API and helper utilities to improve IntelliSense and developer discoverability.

## [0.0.1] - 2026-04-14

### Added

- Initial release of tooltip-cursor extension plugin.
- Mouse hover guide lines and nearest-point tooltip rendering.
- Event listener install/cleanup lifecycle support.
