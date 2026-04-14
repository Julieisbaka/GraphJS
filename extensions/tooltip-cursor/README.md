# graphjs-extension-tooltip-cursor

First-party GraphJS extension that adds hover tooltips and cursor guide lines.

## Usage

```js
import { Graph } from "../../graphjs/src/index.js";
import { tooltipCursorPlugin } from "./index.js";

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
