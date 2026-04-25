# @julieisbaka/graphjs-extension-tooltip-cursor

First-party GraphJS extension that adds hover tooltips and cursor guide lines.

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
