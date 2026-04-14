# graphjs-extension-time-scale

First-party GraphJS extension for rendering time-formatted x-axis labels.

## Usage

```js
import { Graph } from "../../src/index.js";
import { timeScalePlugin } from "./index.js";

const graph = new Graph("#graph", {
  plugins: [{ plugin: timeScalePlugin, options: { ticks: 6 } }]
});
```

## Notes

- Expects x-values to be timestamps (milliseconds since Unix epoch).
- You can provide a custom `formatter(value)`.
