# Crosshair Plugin

## Package

- Workspace source: `extensions/crosshair`
- Plugin id: `crosshair`

## Description

Renders optional vertical and horizontal crosshair guide lines on top of rendered content.

## Default Options

```js
{
  color: "rgba(15, 23, 42, 0.35)",
  lineWidth: 1,
  x: null,
  y: null,
  enabled: true
}
```

## Commands

### `crosshair.set`

- Description: Set crosshair coordinates and enabled state.
- Parameters:
  - `x?: number`
  - `y?: number`
  - `enabled?: boolean`
- Output: `{ x, y, enabled }`
- Version added: Initial line (<= 0.2.4)
- Deprecated: No
- Removal: No

## Hook Interactions

- `afterRender`: draws vertical/horizontal guides if enabled and coordinates are finite.

## Use Cases

- Cursor guides for precision inspection.
- Linked-graph position indicators.

## Best Practices

- Drive updates through command dispatch from pointer handlers.
- Keep line styling subtle to avoid overpowering chart content.

## Internal Changes Over Time

Source: `extensions/crosshair/CHANGELOG.md`

- `0.0.3` (2026-04-15): Internal render request flow moved from direct `graph.render()` calls to `api.requestRender()` in the `set` command.
- `0.0.1` (2026-04-14): Initial runtime implementation released with configurable `x`/`y` guide lines.

Packaging and release metadata changes in later versions (`0.0.4` and newer) do not change crosshair runtime behavior.
