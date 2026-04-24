# Changelog

All notable changes to this project will be documented in this file.

## [0.3.4] - 2026-04-24

### Fixed

- **`setData` dead-code elimination is now fully handled by esbuild alone.** The previous operand order `this.options.immutableInputs && (typeof __DEV__ === "undefined" || __DEV__)` caused esbuild to emit a comma expression `(this.options.immutableInputs, normalized)` in the production build — because esbuild could not short-circuit past `this.options.immutableInputs` without evaluating it (property accesses may have side effects). The comma expression was only removed downstream by terser's `pure_getters=true` unsafe option. Swapping to `(typeof __DEV__ === "undefined" || __DEV__) && this.options.immutableInputs` lets esbuild short-circuit immediately on the `false` literal it substitutes for `__DEV__`, eliminating both the `deepFreeze` call and the `immutableInputs` property access without relying on terser.

## [0.3.3] - 2026-04-23

### Fixed

- **Dead-code elimination now works correctly for `__DEV__`-guarded blocks.** The previous pattern used a local `const IS_DEV = typeof __DEV__ !== "undefined" ? __DEV__ : true;` in every module (`Graph.js`, `PluginHost.js`, `hooks.js`, `Registry.js`). Although esbuild could theoretically constant-fold this after replacing `__DEV__` with `false`, the intermediate local variable prevented reliable elimination in practice, leaving validation logic, error strings, and `deepFreeze` in the production bundle and causing the minified size to remain at ~18.6 kb. All local `IS_DEV` declarations have been removed; each file now uses `typeof __DEV__`-guarded checks directly, which esbuild folds to `false` and completely eliminates.
- **`utils.js` sets `globalThis.__DEV__ = true` as a fallback for unbundled environments.** A one-time guard (`if (typeof __DEV__ === "undefined" && typeof globalThis.__DEV__ === "undefined") { globalThis.__DEV__ = true; }`) provides a default development value for code that reads `globalThis.__DEV__` explicitly (e.g. `freeze`). Note: assigning `globalThis.__DEV__` does not create a bare `__DEV__` identifier binding in ES modules, so all per-module guards use explicit `typeof __DEV__` checks rather than relying on this fallback for bare references.
- **All `__DEV__` guards use safe `typeof` checks.** Validation guards in `Graph.js`, `PluginHost.js`, and `hooks.js` use `typeof __DEV__ === "undefined" || __DEV__` (dev-by-default: validations run when `__DEV__` is absent) so they never throw `ReferenceError` in unbundled Node.js environments. In production builds esbuild folds `typeof false === "undefined" || false` → `false` and dead-code-eliminates the entire validation block.
- **`freeze` helper uses `globalThis.__DEV__` as a fallback.** `export const freeze = (typeof __DEV__ !== "undefined" ? __DEV__ : globalThis.__DEV__) ? Object.freeze : v => v;` — resolves to `Object.freeze` in development/test (where `globalThis.__DEV__` is set to `true` by the fallback) and to an identity function in production (where esbuild folds the expression to `false`).
- **`Registry.js` guard uses `typeof __DEV__ === "undefined" || __DEV__`** to avoid a `ReferenceError` when `Registry` is imported in isolation (without `utils.js`).

### Optimized

- **Build script:** added `--pure:Object.freeze` to the esbuild invocation so esbuild treats every `Object.freeze(...)` call as side-effect-free and removes them when the result is unused.
- **Build script:** increased terser compression to `passes=3` (from `passes=2`) and added `unsafe=true` and `--mangle` flags for additional expression-level simplifications and property name shortening.

## [0.3.2] - 2026-04-23

### Changed

- `Graph.render()`: `beforeLayout` hook now fires **before** `_computeLayout()` is called, matching its name's intent. Plugins can inspect or cancel the layout phase before any computation occurs. A plugin may also supply a custom layout by setting `payload.layout` in the hook — when present, `_computeLayout()` is skipped entirely, allowing plugins (e.g. bar charts, pie charts) to take over layout without the core needing to know.
- `BeforeLayoutHookContext` (`src/index.d.ts`): `layout` is now typed as optional (`layout?: PlotLayout`) since the hook fires before layout computation.

## [0.3.1] - 2026-04-23

### Optimized

- `makeLinearScale`: precomputes `ratio = rangeSpan / domainSpan` once at scale-creation time, replacing a floating-point division with a multiplication on every call. Reduces per-point cost during `drawLineSeries` and `drawGrid`.
- `drawGrid`: hoists `Math.max(1, grid.xTicks)` and `Math.max(1, grid.yTicks)` out of their respective loops, eliminating redundant `Math.max` calls on every tick iteration.
- `_drawStaticLayer`: eliminates a second `makeStaticLayerKey` (`JSON.stringify`) call when a key mismatch triggers layer regeneration. The key is now computed once and reused inside the regeneration block.
- `drawLineSeries`: caches `Math.PI * 2` as a module-level `TAU` constant, avoiding the multiplication on every point arc draw.
- Production build (`dist/graphjs.min.js`): added `--mangle-props=^_` so esbuild renames all `_`-prefixed private properties and methods (e.g. `_dirty`, `_staticLayer`, `_errorBoundary`) to single-character identifiers, and `--legal-comments=none` to strip embedded comment blocks. Combined saving: ~680 bytes (~3.5%) over the previous minified output.
- Production build: fixed dead-code elimination for `IS_DEV`-guarded blocks. The previous `const IS_DEV = true;` declarations in each module shadowed the `--define:IS_DEV=false` build flag, leaving all validation code (`validateGraphOptions`, `validateDomain`, `validatePluginContract`, `deepFreeze`) in the bundle. Replaced with `const IS_DEV = typeof __DEV__ !== "undefined" ? __DEV__ : true;` and switched the build flag to `--define:__DEV__=false`. esbuild now correctly folds `IS_DEV` to `false` and eliminates all guarded code paths.
- Production build: added `--pure:Object.freeze` flag, allowing esbuild to treat `Object.freeze` calls as side-effect-free.
- `getDataBounds` (`utils.js`): replaced `Number.POSITIVE_INFINITY` / `Number.NEGATIVE_INFINITY` with the shorter built-in `Infinity` / `-Infinity`.
- Combined additional savings from the above: ~327 bytes, bringing the total minified bundle reduction to ~1,007 bytes (~5.3%) versus the v0.3.0 release.
- Production build: added terser (second-pass compressor) after esbuild, piping esbuild's output through `terser --compress passes=2,pure_getters=true --module --ecma 2020`. Terser applies additional expression-level simplifications that esbuild's single-pass minifier does not perform.
- Production build: removed `Object.freeze` calls at runtime in production. A `freeze` helper exported from `utils.js` resolves to `Object.freeze` in development and to an identity function (`v => v`) in production (eliminated as dead code by esbuild). Used in `defaults.js` (`DEFAULT_OPTIONS`), `hooks.js` (`BUILTIN_HOOKS`), and `PluginHost.js` (`getPluginApi`).
- `rendering.js`, `utils.js`: introduced module-level `const M = Math;` alias and replaced all `Math.*` calls with `M.*`, allowing the minifier to shorten the `Math` global reference to a single-character identifier.
- Production build: added `--tree-shaking=true` to esbuild flags.
- Combined bundle size reduction: 19,152 → 14,557 bytes (−4,595 bytes, −24.0%) versus the v0.3.0 release.
- `drawLineSeries` canvas context aliasing: arrow-function closures (`beginPath`, `arc`, `fill`, `moveTo`, `lineTo`) capture `ctx` by reference, allowing the minifier to rename them to single-character identifiers and saving ~25 bytes per loop iteration on series with many points. Also restructured the main path loop to place the `moveTo` call before the loop, eliminating a branch check (`i === 0`) on every iteration.
- `Graph._dirty` refactored from a plain object with four boolean properties to a single integer bitmask (`DIRTY_DATA=1`, `DIRTY_OPTIONS=2`, `DIRTY_SIZE=4`, `DIRTY_RENDER=8`). Replaces ~19 property accesses (`this._dirty.data = true`, etc.) with bitwise operations (`this._dirty |= 1`), and the four-condition render-skip check becomes `!this._dirty`. Saves ~100 bytes in the minified bundle.
- `defaults.js`: `background` default changed from `"#ffffff"` to `"#fff"` (3 bytes shorter, same colour).
- `Graph.js` `resize()`: replaced template literals `` `${safeW}px` `` and `` `${safeH}px` `` with `safeW+"px"` and `safeH+"px"`.
- Combined bundle size reduction: 19,152 → 14,379 bytes (−4,773 bytes, −24.9%) versus the v0.3.0 release.

## [0.3.0] - 2026-04-20

### Changed

- Removed all utility functions (`decimatePointsStride`, `resolveCanvas`, `getDevicePixelRatio`, `normalizeSeriesData`, `getDataBounds`) from the main `graphjs` package entry point. These are now exclusively accessible via the `graphjs/utils` subpath, consistent with the other internal utilities (`makeLinearScale`, `invertLinearScale`, `clampBounds`, `applyDomainOverride`, `filterVisibleSeries`, `isPlainObject`, `deepMerge`, `deepFreeze`, `clamp`). Consumers importing utilities from the main entry must update their imports to use `graphjs/utils`.
- Added dedicated `src/utils.d.ts` TypeScript declarations for the `graphjs/utils` subpath. The `./utils` export map entry now points to this file for types instead of the main `src/index.d.ts`.

## [0.2.8] - 2026-04-15

### Added

- `api.requestRender()` — requests a render from within a plugin without holding a direct reference to the graph object. Equivalent to `graph.render()` but expressed through the plugin API surface, keeping plugin code decoupled and allowing the host to batch calls in the future.
- `api.emit(hookName, context)` — allows a plugin to fire a hook on the graph's hook system. Plugins can now trigger custom hooks registered via `api.registerHook()` and have other plugins respond to them without coupling directly to the graph.
- `api.getOptions()` / `api.setOptions(opts)` — read and write graph options through the plugin API. Replaces the pattern of closing over the `graph` argument passed to `install`.
- `api.getDomain()` / `api.setDomain(domain)` — read and write the current domain through the plugin API. Particularly useful for plugins that modify the visible range in pointer event handlers.
- `api.getPlugin(id)` — look up another registered plugin object by id. Enables explicit plugin-to-plugin coordination without importing `Registry` directly.

## [0.2.7] - 2026-04-15

### Changed

- `immutableInputs` mode (`options.immutableInputs: true`) is now stripped from the production bundle. The `deepFreeze` call is guarded by `IS_DEV`, so esbuild's dead-code elimination removes both the call site and the entire `deepFreeze` function from `dist/graphjs.min.js`. Behaviour in development builds is unchanged.
- `Registry.registerPlugin` validation ("Plugin must be an object" / "Plugin must provide a string id") is now guarded by `IS_DEV` and absent from the production bundle.
- `HookRegistry.register` validation ("Hook name must be a non-empty string") is now guarded by `IS_DEV` and absent from the production bundle.
- Removed the `_createBufferCanvas` wrapper method on `Graph`. The single internal call site now calls `createBufferCanvas` directly, eliminating a trivial one-line delegation.

## [0.2.6] - 2026-04-15

### Added

- `src/index.prod.js` — production entry point. Combined with compile-time dead-code elimination (see Changed), the minified build now fully excludes `validation.js`.

### Changed

- All `validateGraphOptions`, `validateDomain`, and `validatePluginContract` calls are now guarded by `IS_DEV`, a top-level constant defaulting to `true`. The production build passes `--define:IS_DEV=false` to esbuild, which folds `if (false)` blocks as dead code and drops the now-unreferenced imports — so `validation.js` is completely absent from `dist/graphjs.min.js`. A `process.env.NODE_ENV` approach was tried first but failed due to shell quoting issues in PowerShell npm scripts; the plain boolean define is cross-platform and quoting-free.

## [0.2.5] - 2026-04-15

### Changed

- Validation error messages shortened throughout `validation.js`. The `"options."` prefix and verbose phrasing (`"must be a"`, `"is required"`) have been replaced with a concise `"key: expected type."` format. Existing test assertions updated to match.
- `PluginHost.call` no longer adds `contextVersion` to the hook context object. The `HOOK_CONTEXT_VERSION` constant has been removed. This eliminates a non-compressible string key from every hook dispatch.
- `getPluginApi` no longer exposes `listCommands` or `executeCommand` on the plugin API object. These graph-level operations are accessible directly on the `graph` argument passed to every hook and install function.
- `PluginHost.configure` now skips the full Kahn topological sort when no plugin in the incoming list declares `before` or `after`. In that case (the common path), plugins are sorted by `priority` only with a simple `.sort()` call, avoiding all the `Map`/`Set` allocations in `orderPlugins`.

## [0.2.4] - 2026-04-15

### Added

- `src/index.prod.js` — production entry point that excludes all validation code. The minified build (`dist/graphjs.min.js`) now bundles from this entry, removing ~2–3 KB of error-message strings that are only useful during development. The full validation entry (`src/index.js`) is unchanged.

### Changed

- Validation error messages shortened throughout `validation.js`. The `"options."` prefix and verbose phrasing (`"must be a"`, `"is required"`) have been replaced with a concise `"key: expected type."` format. Existing test assertions updated to match.
- `PluginHost.call` no longer adds `contextVersion` to the hook context object. The `HOOK_CONTEXT_VERSION` constant has been removed. This eliminates a non-compressible string key from every hook dispatch.
- `getPluginApi` no longer exposes `listCommands` or `executeCommand` on the plugin API object. These graph-level operations are accessible directly on the `graph` argument passed to every hook and install function.
- `PluginHost.configure` now skips the full Kahn topological sort when no plugin in the incoming list declares `before` or `after`. In that case (the common path), plugins are sorted by `priority` only with a simple `.sort()` call, avoiding all the `Map`/`Set` allocations in `orderPlugins`.

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
