# graphjs-extension-legend

First-party GraphJS extension that renders a simple legend panel from visible series.

## Usage

```js
import { Graph } from "../../src/index.js";
import { legendPlugin } from "./index.js";

const graph = new Graph("#graph", {
  plugins: [{ plugin: legendPlugin, options: { position: "top-right" } }]
});
```

## Options

- `enabled` (boolean)
- `position` (`top-right` | `top-left` | `bottom-right` | `bottom-left`)
- `background`, `borderColor`, `borderWidth`
- `textColor`, `font`
- `itemSpacing`, `markerSize`, `padding`, `maxItems`
