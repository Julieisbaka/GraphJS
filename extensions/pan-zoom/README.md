# @julieisbaka/graphjs-extension-pan-zoom

First-party GraphJS extension that enables wheel zoom, click-drag panning,
hover guides, nearest-point highlighting, and tooltips.

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

- `enabled` — master switch for both features.
- `panEnabled` — independently enable wheel zoom and drag panning.
- `tooltipEnabled` — independently enable cursor guides and tooltips.
- `zoomStep`, `minZoomStep`, `maxZoomStep`
- `minSpanX`, `minSpanY`
- `guideColor`, `guideWidth`, `guideDash`
- `pointRadius`, `hitRadius`
- `tooltipBg`, `tooltipColor`, `tooltipFont`
- `formatter({ series, point })`

The runtime command `pan-zoom.set` accepts the same option names, including
`panEnabled`, `tooltipEnabled`, and `hitRadius`. The existing
`pan-zoom.resetView` command is unchanged.

The standalone `@julieisbaka/graphjs-extension-tooltip-cursor` package remains
available for compatibility. New installations should use this package when
both interactions are needed.
