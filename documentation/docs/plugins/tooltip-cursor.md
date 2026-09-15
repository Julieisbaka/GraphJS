# Tooltip Cursor Plugin (Compatibility)

## Package

- Workspace source: `extensions/tooltip-cursor`
- Plugin id: `tooltip-cursor`

## Description

Tooltip cursor behavior is now included in the `pan-zoom` plugin. The
standalone package and `tooltip-cursor` plugin remain supported for existing
applications; new applications can use `panZoomPlugin` from the pan-zoom
package and set `tooltipEnabled: true`.

## Default Options

```js
{
  enabled: true,
  guideColor: "rgba(15, 23, 42, 0.35)",
  guideWidth: 1,
  guideDash: [4, 4],
  pointRadius: 4,
  hitRadius: 24,
  tooltipBg: "rgba(15, 23, 42, 0.92)",
  tooltipColor: "#f8fafc",
  tooltipFont: "12px Segoe UI, sans-serif",
  formatter: ({ series, point }) => `${series.id}: (${point.x}, ${point.y})`
}
```

## Commands

### `tooltip-cursor.set`

- Description: Toggle plugin and adjust hit radius.
- Parameters:
  - `enabled?: boolean`
  - `hitRadius?: number`
- Output: `{ enabled, hitRadius }`
- Added: Initial line (<= 0.2.4)
- Deprecated: No
- Removal: No

## Hook Interactions

- `afterRender`: computes nearest visible point and draws guides, marker, and tooltip box.
- `beforeDestroy`: unregisters pointer listeners.

## Interactions

- Maintains pointer and nearest-point state via plugin state.
- Requires `layout` and `bounds` context from render lifecycle.

## Use Cases

- Data-point inspection on dense plots.
- Accessibility overlays with custom tooltip formatters.

## Best Practices

- Keep `formatter` fast and exception-safe.
- Use larger `hitRadius` on touch-enabled or high-DPI interfaces.

## Internal Changes Over Time

Source: `extensions/tooltip-cursor/CHANGELOG.md`

- `0.0.4` (2026-04-15): Moved command and pointer-handler redraws to `api.requestRender()`.
- `0.0.3` (2026-04-14): Replaced deprecated `api.state` access with `api.getPluginState()` in render/cleanup hooks.
- `0.0.1` (2026-04-14): Initial runtime released with hover guides, nearest-point lookup, and tooltip rendering.

Versions `0.0.5` and newer mainly contain package metadata and publishing adjustments.
