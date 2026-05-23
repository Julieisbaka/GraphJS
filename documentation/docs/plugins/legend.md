# Legend Plugin

## Package

- Workspace source: `extensions/legend`
- Plugin id: `legend`

## Description

Draws a configurable legend box for visible series after graph rendering.

## Default Options

```js
{
  enabled: true,
  position: "top-right",
  background: "rgba(255,255,255,0.9)",
  borderColor: "#cbd5e1",
  borderWidth: 1,
  textColor: "#0f172a",
  font: "12px Segoe UI, sans-serif",
  itemSpacing: 8,
  markerSize: 10,
  padding: 10,
  maxItems: 20
}
```

## Commands

### `legend.set`

- Description: Toggle legend and change anchor position.
- Parameters:
  - `enabled?: boolean`
  - `position?: string` (`top-right`, `top-left`, `bottom-left`, `bottom-right`)
- Output: `{ enabled, position }`
- Version added: Initial line (<= 0.2.4)
- Deprecated: No
- Removal: No

## Hook Interactions

- `afterRender`: measures labels, computes box geometry, draws markers and series labels.

## Use Cases

- Multi-series identity mapping.
- Printable/embedded chart annotations.

## Best Practices

- Set `maxItems` to avoid oversized legends on dense dashboards.
- Ensure sufficient contrast for `textColor` and `background`.

## Internal Changes Over Time

Source: `extensions/legend/CHANGELOG.md`

- `0.0.3` (2026-04-15): `legend.set` switched from direct `graph.render()` to `api.requestRender()`.
- `0.0.1` (2026-04-14): Initial legend runtime released with styled box rendering and placement options.

Packaging and publish metadata updates in later versions (`0.0.4` and newer) do not modify runtime legend behavior.
