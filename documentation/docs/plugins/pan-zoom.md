# Pan-Zoom Plugin

## Package

- Workspace source: `extensions/pan-zoom`
- Plugin id: `pan-zoom`

## Description

Adds wheel zooming, drag panning, viewport state management, and runtime commands.

## Default Options

```js
{
  enabled: true,
  zoomStep: 0.12,
  minZoomStep: 0.01,
  maxZoomStep: 0.8,
  minSpanX: 0.0001,
  minSpanY: 0.0001
}
```

## Commands

### `pan-zoom.resetView`

- Description: Clear current view and reset to full bounds.
- Parameters: none
- Output: `{ reset: true }`
- Added: Initial line (<= 0.2.4)
- Deprecated: No
- Removal: No

### `pan-zoom.set`

- Description: Update plugin enable state and zoom step.
- Parameters:
  - `enabled?: boolean`
  - `zoomStep?: number`
- Output: `{ enabled, zoomStep }`
- Added: Initial line (<= 0.2.4)
- Deprecated: No
- Removal: No

## Hook Interactions

- `afterLayout`: stores layout/bounds and initializes view state.
- `beforeRender`: writes current viewport into render bounds.
- `beforeSetData`: resets view for incoming dataset.
- `beforeDestroy`: removes mouse/wheel listeners.

## Interactions

- Uses plugin state as single source of truth for viewport.
- Clamps viewport against full data bounds.
- Emits state changes through `api.setState`.

## Use Cases

- Exploratory analytics with dense datasets.
- Interactive dashboards requiring viewport persistence.

## Best Practices

- Keep `zoomStep` conservative (for example 0.05-0.2).
- Preserve reset control in your UI via `pan-zoom.resetView`.
- Cleanup listeners on teardown is required for framework integrations.

## Internal Changes Over Time

Source: `extensions/pan-zoom/CHANGELOG.md`

- `0.0.8` (2026-04-20): Fixed runtime `ReferenceError` by restoring missing `clamp` import used by `pan-zoom.set`.
- `0.0.7` (2026-04-15): Replaced direct `graph.render()` calls in commands and pointer handlers with `api.requestRender()`.
- `0.0.6` (2026-04-15): Updated `clampBounds` usage to consume the public `@julieisbaka/graphjs/utils` path instead of repo-local internals.
- `0.0.5` (2026-04-15): Replaced duplicated wheel/drag clamp logic with shared `clampBounds`, removing local helper duplication.
- `0.0.4` (2026-04-15): Added configurable `minZoomStep` and `maxZoomStep` options.
- `0.0.3` (2026-04-15): Migrated deprecated `api.state` access to `api.getPluginState()`.
- `0.0.1` (2026-04-14): Initial runtime released with wheel zoom, drag pan, and view-to-bounds mapping.

Versions `0.0.9` and newer are primarily package/publish metadata updates.
