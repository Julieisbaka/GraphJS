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
  plugins: [{ plugin: timeScalePlugin, options: { ticks: "auto", timeZone: "UTC" } }]
});
```

## Notes

- Expects x-values to be timestamps (milliseconds since Unix epoch).
- `ticks: "auto"` derives density from plot width; numeric ticks remain supported.
- `minLabelSpacing` controls overlap avoidance and `maxTicks` caps automatic density.
- `timeZone` accepts `"UTC"` or an IANA timezone such as `"America/New_York"`.
- Formatting adapts from seconds through years. Explicit `dateTimeFormat` or a custom `formatter(value)` takes precedence.
