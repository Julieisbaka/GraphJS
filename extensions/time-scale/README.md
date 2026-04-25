# @julieisbaka/graphjs-extension-time-scale

First-party GraphJS extension for rendering time-formatted x-axis labels.

## Install

```bash
npm install @julieisbaka/graphjs @julieisbaka/graphjs-extension-time-scale
```

## Usage

```js
import { Graph } from "@julieisbaka/graphjs";
import { timeScalePlugin } from "@julieisbaka/graphjs-extension-time-scale";

const graph = new Graph("#graph", {
  plugins: [{ plugin: timeScalePlugin, options: { ticks: 6 } }]
});
```

## Notes

- Expects x-values to be timestamps (milliseconds since Unix epoch).
- You can provide a custom `formatter(value)`.
