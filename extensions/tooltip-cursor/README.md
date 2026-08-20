# @julieisbaka/graphjs-extension-tooltip-cursor

Compatibility package for the tooltip and cursor behavior now included in
`@julieisbaka/graphjs-extension-pan-zoom`.

## Install

```bash
npm install @julieisbaka/graphjs @julieisbaka/graphjs-extension-tooltip-cursor
```

## Usage

```js
import { Graph } from "@julieisbaka/graphjs";
import { tooltipCursorPlugin } from "@julieisbaka/graphjs-extension-tooltip-cursor";

const graph = new Graph("#graph", {
  plugins: [{ plugin: tooltipCursorPlugin }]
});
```

## Options

- `enabled`
- `guideColor`, `guideWidth`, `guideDash`
- `pointRadius`, `hitRadius`
- `tooltipBg`, `tooltipColor`, `tooltipFont`
- `formatter({ series, point })`

For new applications, prefer the pan-zoom package to combine panning, zooming,
and tooltip cursor interactions. This package remains available so existing
`tooltipCursorPlugin` imports and the `tooltip-cursor.set` command continue to
work.
