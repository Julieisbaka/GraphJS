# graphjs-extension-pan-zoom

First-party GraphJS extension that enables wheel zoom and click-drag panning.

## Usage

```js
import { Graph } from "../../graphjs/src/index.js";
import { panZoomPlugin } from "./index.js";

const graph = new Graph("#graph", {
  plugins: [{ plugin: panZoomPlugin }]
});
```

## Options

- `enabled`
- `zoomStep`
- `minSpanX`, `minSpanY`
