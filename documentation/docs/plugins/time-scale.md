# Time-Scale Plugin

## Package

- Workspace source: `extensions/time-scale`
- Plugin id: `time-scale`

## Description

Renders adaptive, timezone-aware time labels across the x-axis and supports runtime config updates.

Automatic labels choose an appropriate date/time format from the visible range
and suppress labels that would overlap. Use `timeZone: "UTC"` or an IANA timezone
identifier for deterministic output.

## Default Options

```js
{
  enabled: true,
  ticks: "auto",
  maxTicks: 12,
  minLabelSpacing: 18,
  locale: "en-US",
  timeZone: undefined,
  dateTimeFormat: null,
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

- Description: Set tick density, locale, timezone, and enable state.
- Parameters:
  - `ticks?: number | "auto"` (minimum 2 when numeric)
  - `maxTicks?: number`
  - `minLabelSpacing?: number`
  - `enabled?: boolean`
  - `locale?: string`
  - `timeZone?: string | null`
  - `dateTimeFormat?: Intl.DateTimeFormatOptions`
- Output: `{ ticks, maxTicks, minLabelSpacing, enabled, locale, timeZone }`
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
- Prefer `ticks: "auto"` and tune `minLabelSpacing` for responsive layouts.

## Internal Changes Over Time

Source: `extensions/time-scale/CHANGELOG.md`

- `0.1.0` (2026-08-20): Added automatic density, timezone support, adaptive formatting, and overlap avoidance.
- `0.0.3` (2026-04-15): `time-scale.set` switched from direct `graph.render()` to `api.requestRender()`.
- `0.0.1` (2026-04-14): Initial runtime released with locale-aware x-axis time formatting and configurable formatter/ticks.

Versions `0.0.4` through `0.0.8` are package/publish metadata changes.
