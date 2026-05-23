# Time-Scale Plugin

## Package

- Workspace source: `extensions/time-scale`
- Plugin id: `time-scale`

## Description

Renders formatted time labels across the x-axis and supports runtime config updates.

## Default Options

```js
{
  enabled: true,
  ticks: 5,
  locale: "en-US",
  dateTimeFormat: { month: "short", day: "2-digit" },
  color: "#475569",
  font: "11px Segoe UI, sans-serif",
  formatter: null,
  showAxisLine: false,
  axisLineColor: "#94a3b8",
  axisLineWidth: 1
}
```

## Commands

### `time-scale.set`

- Description: Set tick count, locale, and enable state.
- Parameters:
  - `ticks?: number` (minimum 2)
  - `enabled?: boolean`
  - `locale?: string`
- Output: `{ ticks, enabled, locale }`
- Added: Initial line (<= 0.2.4)
- Deprecated: No
- Removal: No

## Hook Interactions

- `afterRender`: computes tick labels from `bounds.xMin/xMax` and draws labels beneath plot area.

## Interactions

- Uses custom `formatter` when provided.
- Falls back to `Intl.DateTimeFormat` and catches formatter errors.

## Use Cases

- Time-indexed signals and historical trend views.
- Locale-sensitive dashboard labeling.

## Best Practices

- Keep formatter pure and exception-safe.
- Match `ticks` to available plot width to prevent label overlap.

## Internal Changes Over Time

Source: `extensions/time-scale/CHANGELOG.md`

- `0.0.3` (2026-04-15): `time-scale.set` switched from direct `graph.render()` to `api.requestRender()`.
- `0.0.1` (2026-04-14): Initial runtime released with locale-aware x-axis time formatting and configurable formatter/ticks.

Versions `0.0.4` and newer are package/publish metadata changes and do not alter runtime plugin logic.
