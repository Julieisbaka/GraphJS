# @julieisbaka/graphjs-extension-pan-zoom

First-party GraphJS extension that enables wheel zoom and click-drag panning.

## Install

```bash
npm install @julieisbaka/graphjs @julieisbaka/graphjs-extension-pan-zoom
```

## Usage

```js
import { Graph } from "@julieisbaka/graphjs";
import { panZoomPlugin } from "@julieisbaka/graphjs-extension-pan-zoom";

const graph = new Graph("#graph", {
  plugins: [{ plugin: panZoomPlugin }]
});
```

## Options

- `enabled`
- `zoomStep`
- `minSpanX`, `minSpanY`
