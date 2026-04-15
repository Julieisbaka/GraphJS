# Changelog

All notable changes to this project will be documented in this file.

## [0.2.3] - 2026-04-15

### Fixed

- `decimatePointsStride` no longer overshoots `maxPoints`. Previously the last data point was appended unconditionally, producing an output up to `maxPoints + 1` elements long. The last strided element is now replaced with the actual last point when they differ, so the output length is always at most `maxPoints`.

### Optimized

- `drawGrid` now issues a single `ctx.stroke()` for all vertical lines and a single `ctx.stroke()` for all horizontal lines, replacing one draw call per tick line. The axis zero-crossing position now uses `makeLinearScale` consistently with the rest of the render pipeline instead of duplicated inline scale math. Both axis lines are batched into a single path and stroke.
- `_drawStaticLayer` no longer calls `JSON.stringify` via `makeStaticLayerKey` on frames where dirty flags already mandate regeneration. The key is now computed inside the regeneration block (skipped by short-circuit) and only evaluated on clean frames to detect silent option mutations.

### Tests

- Fixed `await import()` inside non-async test callbacks (`normalizeSeriesData` and `ErrorBoundary` tests) — replaced with static imports at the top of the file.
- Added three `decimatePointsStride` unit tests: output length never exceeds `maxPoints`, last input point is always preserved, and input is returned unchanged when already within budget.

## [0.2.2] - 2026-04-15

### Changed

- Removed `deepFreeze`, `clamp`, `isPlainObject`, and `deepMerge` from the main `graphjs` package entry point. These are internal utilities that were previously public, preventing tree-shakers from dropping them when only `Graph` was imported. They remain available via `graphjs/utils` for consumers that need them.

## [0.2.1] - 2026-04-15

### Fixed

- `createBufferCanvas` now guards against `getContext("2d")` returning `null` (which browsers may do when the canvas limit is exceeded or hardware acceleration is unavailable). Both the `OffscreenCanvas` and `document.createElement` paths return `{ canvas: null, ctx: null }` instead of throwing a `TypeError` on `setTransform`.
- `validateGraphOptions` now rejects `options.sampling.method` values that contain leading or trailing whitespace, preventing hard-to-debug mismatches against the sampler registry where `"stride"` and `" stride"` would silently diverge.
- `validateGraphOptions` now validates `options.series` when present: must be a plain object, and each field (`type`, `color`, `lineWidth`, `pointRadius`) is individually type-checked so invalid values are caught at configuration time rather than silently ignored during render.
- `Graph.registerSampler` now stores the sampler under the trimmed name. `_getRenderableSeries` also trims `sampling.method` before the registry lookup so a method value with incidental whitespace can still resolve correctly.
- `ErrorBoundary.configure` now performs a partial update — only fields that are explicitly present in the settings object are applied. Previously, omitting `enabled` would reset it to `true` even if the boundary had been intentionally disabled.
- `Graph.setOptions` now applies `pluginErrorBoundary` reconfiguration **before** calling `plugins.configure(...)`. This means any errors thrown during plugin install or reconfigure are handled by the updated boundary settings rather than the stale ones.
- `PluginHost` exposes a `configureErrorBoundary(settings)` helper so `Graph.setOptions` no longer reaches into `this.plugins._errorBoundary` directly.

### Tests

- Added focused unit tests in `test/graph-core.test.js` covering: registered sampler selection, unknown sampler method falling back gracefully, sampler name trimming on registration, `options.series` defaults applied via `normalizeSeriesData`, per-series values taking precedence over defaults, and `ErrorBoundary.configure` partial-update behaviour.

## [0.2.0] - 2026-04-15

### 0.2 overall (since 0.1.x)

- **Plugin architecture matured**: plugin APIs were cleaned up (deprecated state getter and flat hooks removed), error handling was extracted into a standalone `ErrorBoundary`, and live error-boundary reconfiguration is now supported.
- **Extensibility increased**: custom series rendering and data sampling now use registries (`Graph.renderers` and `Graph.samplers`) so extensions can add capabilities without patching core internals.
- **Bounds and domain behavior hardened**: domain updates now replace prior state predictably, bounds resolution is strategy-driven, and related helpers were extracted to reusable utilities.
- **Core utility surface expanded**: new scale and bounds helpers (`makeLinearScale`, `invertLinearScale`, `clampBounds`, `applyDomainOverride`, `filterVisibleSeries`) are exported for reuse across core and extensions.
- **Configuration ergonomics improved**: per-graph series defaults are now configurable via `options.series`, and package runtime expectations are explicit with Node `>=22` engines metadata.

### Added

- `options.series` — configurable series defaults (`type`, `color`, `lineWidth`, `pointRadius`). Values are applied when a series does not specify them, replacing hardcoded fallbacks in `normalizeSeriesData`.
- `Graph.registerSampler(name, fn)` — static sampler registry matching the renderer registry pattern. The built-in `"stride"` sampler is pre-registered. Custom samplers receive `(points, maxPoints)` and return a decimated point array.
- `Graph.samplers` — public `Map<string, GraphSeriesSampler>` exposing the sampler registry.
- `"engines": { "node": ">=22" }` in `package.json`.

### Changed

- `options.sampling.method` now accepts any registered sampler name, not only `"stride"`. Validation checks that the value is a non-empty string; an unknown method at render time falls back to returning the series unchanged.
- `normalizeSeriesData(rawData, seriesDefaults?)` now accepts an optional second argument for per-graph series defaults. `Graph.setData` passes `options.series` automatically.

### Fixed

- `graph.setOptions({ pluginErrorBoundary: ... })` now updates the live `ErrorBoundary` instance immediately. Previously the boundary was constructed once at init and never updated.
- `ErrorBoundary` gains a `configure(settings)` method for live reconfiguration.

## [0.1.8] - 2026-04-15

### Added

- `makeLinearScale(domainMin, domainMax, rangeMin, rangeMax)` — returns a linear scale function. Used internally for `xScale`/`yScale` in `render()` and available to extension authors writing custom renderers.
- `invertLinearScale(px, domainMin, domainMax, rangeMin, rangeMax)` — inverts a linear scale from pixel back to domain value.
- `clampBounds(view, full)` — clamps a viewport `DataBounds` within a full `DataBounds` while preserving the viewport span.
- `applyDomainOverride(dataBounds, domain)` — applies a partial domain override onto data bounds. Extracted from `Graph._resolveBounds` and now a public utility.
- `filterVisibleSeries(seriesList)` — filters a series list to visible-only entries. Used internally in `render()`.

### Changed

- `Graph._resolveBounds` now delegates to `applyDomainOverride` internally.
- `render()` now uses `makeLinearScale` and `filterVisibleSeries` internally, reducing inline code.

## [0.1.7] - 2026-04-15

### Fixed

- `graph.setDomain()` now replaces the stored domain object instead of deep-merging with the previous one. Calling `setDomain({ xMin: 10, xMax: 20 })` after a full domain no longer retains stale `yMin`/`yMax` values from the prior call.
- `graph.setOptions({ domain: ... })` now also replaces the stored domain rather than merging with the previous one, consistent with `setDomain()`.

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
