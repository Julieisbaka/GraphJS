# Watermark Plugin

## Package

- Workspace source: `extensions/watermark`
- Plugin id: `watermark`

## Description

Draws configurable text watermark on top of rendered graph output.

## Default Options

```js
{
  text: "graphjs",
  color: "rgba(15, 23, 42, 0.35)",
  font: "12px Segoe UI, sans-serif",
  offsetX: 12,
  offsetY: 12,
  enabled: true
}
```

## Commands

### `watermark.setText`

- Description: Set watermark text and enabled state.
- Parameters:
  - `text?: string`
  - `enabled?: boolean`
- Output: `{ text, enabled }`
- Added: Initial line (<= 0.2.4)
- Deprecated: No
- Removal: No

## Hook Interactions

- `afterRender`: draws watermark at bottom-right corner with configured offsets.

## Interactions

- Reads graph dimensions to place text reliably.
- Can be layered with legend/time-scale plugins due to post-render draw timing.

## Use Cases

- Branding and environment labels (for example QA, staging).
- Render provenance marks in exports.

## Best Practices

- Use low-alpha colors to avoid data occlusion.
- Keep text short for smaller chart footprints.
- Consider dynamic text updates through command calls.

## Internal Changes Over Time

Source: `extensions/watermark/CHANGELOG.md`

- `0.0.3` (2026-04-15): `watermark.setText` switched from direct `graph.render()` to `api.requestRender()`.
- `0.0.3` (2026-04-15): `afterRender` dimension reads migrated from direct `graph.options` access to `api.getOptions()`.
- `0.0.1` (2026-04-14): Initial runtime released with configurable watermark text/style/offsets.

Versions `0.0.4` and newer are package/publish metadata updates and do not change watermark runtime behavior.
