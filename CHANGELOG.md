# Changelog

All notable changes to this project will be documented in this file.

## [0.1.6] - 2026-04-15

### Added

- `ErrorBoundary` class extracted from `PluginHost` — testable standalone class that encapsulates plugin error handling logic. `PluginHost` now delegates to it.
- `Graph.registerRenderer(type, fn)` — static renderer registry. Extensions can now register custom series types (e.g. `"bar"`, `"scatter"`) without plugin workarounds. The built-in `"line"` renderer is pre-registered.
- `Graph.renderers` — public `Map<string, GraphSeriesRenderer>` exposing the renderer registry.
- `graph.setBoundsStrategy(fn)` — override how data bounds are resolved before each render. Receives `(dataBounds, options)` and must return a `DataBounds` object. Passing `null` restores default domain-override behavior.
- Exported `drawLineSeries` from `Graph.js` so extensions can reference or wrap the built-in line renderer.

## [0.1.5] - 2026-04-15

### Removed

- Removed deprecated `PluginApi.state` getter. Use `api.getPluginState(api.id)` (or `api.getPluginState()`) instead.
- Removed support for deprecated flat plugin hooks on the plugin object (e.g. `plugin.afterRender`). Hooks must be defined under `plugin.hooks`.

## [0.1.4] - 2026-04-14

### Fixed

- Smoothed `0.1.3` deprecation behavior for flat plugin hooks (`plugin.afterRender`, etc.) by warning only once per plugin/hook pair instead of warning on every hook call.
- Fixed `graph.getOptions()` from `0.1.3` to return a deep copy of options, preventing accidental mutation via nested objects.

### Changed

- Smoothed `0.1.2` plugin-state migration ergonomics: `api.getPluginState()` now defaults to the current plugin id when no argument is provided.

## [0.1.3] - 2026-04-14

### Added

- `graph.getOptions()` — returns a shallow copy of the current options, replacing direct `graph.options` access for reads.

### Removed

- Removed the unused `animation` default option. No animation system exists in the core; the property was a dead placeholder.

### Deprecated

- Direct `graph.options` property access for reads is deprecated in favour of `graph.getOptions()`. Use `graph.setOptions()` for writes.
- Defining hook methods directly on the plugin object (e.g. `plugin.afterRender`) is deprecated. Move all hooks into `plugin.hooks.afterRender`. A runtime warning is now emitted when the flat form is detected.

## [0.1.2] - 2026-04-14

### Added

- `api.getPluginState(pluginId)` on the plugin API — retrieves the state of any plugin by id, enabling cross-plugin coordination without going through commands.

### Deprecated

- `api.state` (the getter on the plugin API object) is deprecated in favour of `api.getPluginState(api.id)`. It will be removed in a future minor release. Both are supported for now.

## [0.1.1] - 2026-04-14

### Added

- Exposed `DEFAULT_OPTIONS` as part of the public API.
- Exposed `validateDomain`, `validateGraphOptions`, and `validatePluginContract` as part of the public API.

## [0.1.0] - 2026-04-14

### Added

- Typed API declarations (`src/index.d.ts`) for Graph, plugins, commands, options, and utils.
- Runtime options validation and plugin contract validation.
- Domain override API: `setDomain`, `clearDomain`, and `getDomain`.
- Immutable input mode (`immutableInputs`) using deep freeze.
- Sampling support (`sampling`) with stride decimation.
- Scalability options:
	- dirty-render short-circuiting
	- static layer caching
	- optional OffscreenCanvas-backed layer buffers
- Plugin maturity features:
	- dependency ordering (`before` / `after`)
	- capability flags for hook dispatch optimization
	- hook context versioning (`contextVersion`)
	- optional plugin error boundary sandboxing
- New utility exports: `deepFreeze`, `decimatePointsStride`.

## [0.0.3] - 2026-04-14

### Added

- JSDoc docstrings for all public utility exports in `src/core/utils.js` to improve IDE help and developer discoverability.

## [0.0.2] - 2026-04-14

### Added

- Public utility exports from `src/core/utils.js` through main API and `graphjs/utils` subpath.
- Declarative plugin command support via `plugin.commands` in plugin host.

## [0.0.1] - 2026-04-14

### Added

- Initial GraphJS zero-dependency core package.
- Core graph engine with line-series rendering on canvas.
- Plugin lifecycle host and hook API.
- Global plugin registry and per-instance plugin configuration.
- Public exports for graph core and hook registry.
- Base package metadata and MIT license.
