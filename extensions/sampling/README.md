# @julieisbaka/graphjs-extension-sampling

First-party GraphJS extension that registers six data-reduction samplers: **LTTB**, **M4**, **RDP**, **LTD**, **LTOB**, and **SMA**.

## Install

```bash
npm install @julieisbaka/graphjs @julieisbaka/graphjs-extension-sampling
```

## Usage

```js
import { Graph } from "@julieisbaka/graphjs";
import { samplingPlugin } from "@julieisbaka/graphjs-extension-sampling";

const graph = new Graph("#graph", {
  plugins: [{ plugin: samplingPlugin }],
  sampling: { enabled: true, maxPoints: 500, method: "lttb" }
});
```

Sampling is viewport-aware by default. Points outside the visible x-range are
excluded before sampling, with boundary-nearest points retained. The target is
limited by `maxPoints` and adapts to plot width using `pointsPerPixel`.
Set `sampling.viewport: false` to sample the complete series.

Order-dependent samplers require points sorted by ascending `x`; duplicate x
values are valid. The core passes an optional third sampler context containing
the current bounds, layout, scales, visible range, and target.

## Samplers

| Name   | Description |
|--------|-------------|
| `lttb` | Largest-Triangle-Three-Buckets — selects the point in each bucket that forms the largest triangle with its neighbours. Best general-purpose visual fidelity. |
| `m4`   | MinMax — preserves the first, last, min-y, and max-y of each bucket. Guarantees spikes and dips are never lost. |
| `rdp`  | Ramer–Douglas–Peucker — removes points within a perpendicular-distance tolerance. Best for smooth/geometric series. |
| `ltd`  | Largest-Triangle-Dynamic — adaptive variant of LTTB that recalculates bucket sizes at each step for non-uniform data. |
| `ltob` | Largest-Triangle-One-Bucket — simpler/faster LTTB variant using the first point of the next bucket as the triangle anchor. |
| `sma`  | Simple Moving Average — replaces each window of points with its mean. Smooths noise at the cost of peak precision. |

## Common helpers subpackage

Shared code used by multiple samplers is also exported via the `./common` subpackage for composing custom samplers:

```js
import { triangleArea, splitBuckets } from "@julieisbaka/graphjs-extension-sampling/common";
```

- **`triangleArea(a, b, c)`** — area of the triangle formed by three `{x, y}` points.
- **`splitBuckets(points, n)`** — splits a point array into `n` equal-sized contiguous buckets.
