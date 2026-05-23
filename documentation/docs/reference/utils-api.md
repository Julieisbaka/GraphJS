# Utilities API Reference

Import utilities from:

```js
import { ... } from "@julieisbaka/graphjs/utils";
```

## Functions

| Function | Parameters | Output | Added | Deprecated | Removal | Description | Interactions | Use Cases | Best Practices |
|---|---|---|---|---|---|---|---|---|---|
| `isPlainObject(value)` | unknown value | boolean | Initial line (<= 0.2.4) | No | No | Checks object literal shape | Used by merge internals | Guarding config merges | Avoid for class-instance semantic checks |
| `deepMerge(target?, source?)` | two objects | merged object | Initial line (<= 0.2.4) | No | No | Deep merge with array replacement | Used heavily in options/plugin defaults | Option composition | Pass plain objects only |
| `deepFreeze(value)` | any value | deeply frozen value | Initial line (<= 0.2.4) | No | No | Recursively freezes object graph | Used when `immutableInputs` enabled | Debugging accidental mutations | Use in dev/testing, not hot paths |
| `clamp(value, min, max)` | numbers | number | Initial line (<= 0.2.4) | No | No | Bounds a scalar | Axis/grid and plugin math | Coordinate clamping | Ensure min <= max |
| `decimatePointsStride(points, maxPoints)` | array, integer | decimated array | Initial line (<= 0.2.4) | No | No | Uniform stride downsampling preserving final point | Default `stride` sampler | Large dataset rendering | Use algorithmic samplers for shape fidelity |
| `resolveCanvas(target)` | selector or element | canvas element | Initial line (<= 0.2.4) | No | No | Resolves graph target canvas | Graph constructor | DOM binding | Prefer element refs in component frameworks |
| `getDevicePixelRatio()` | none | number | Initial line (<= 0.2.4) | No | No | Reads browser DPR fallback 1 | Resize and buffer creation | Crisp canvas rendering | Recompute on resize when needed |
| `normalizeSeriesData(rawData, seriesDefaults?)` | user series list, defaults | normalized series[] | Initial line (<= 0.2.4) | No | No | Enforces series shape and point coercion | `setData` pipeline | Input sanitation | Validate upstream where possible |
| `getDataBounds(seriesList)` | series list | `{xMin,xMax,yMin,yMax}` | Initial line (<= 0.2.4) | No | No | Computes finite bounds with defaults and zero-span guard | Render scale computation | Auto domain derivation | Filter hidden series before expensive work |
| `makeLinearScale(domainMin, domainMax, rangeMin, rangeMax)` | 4 numbers | scaling function | Initial line (<= 0.2.4) | No | No | Domain-to-range mapping | Rendering and axes | Coordinate conversion | Avoid zero-span domain |
| `invertLinearScale(px, domainMin, domainMax, rangeMin, rangeMax)` | pixel and ranges | domain value | Initial line (<= 0.2.4) | No | No | Inverse linear mapping | Interaction plugins | Pointer-to-domain conversion | Keep ranges consistent with forward scale |
| `clampBounds(view, full)` | view bounds, full bounds | clamped bounds | Initial line (<= 0.2.4) | No | No | Clamps viewport while preserving span | Pan/zoom logic | Prevent out-of-data panning | Validate spans are positive |
| `applyDomainOverride(dataBounds, domain)` | bounds and optional domain | resolved bounds | Initial line (<= 0.2.4) | No | No | Applies finite override fields over computed bounds | Graph bounds resolution | Partial domain overrides | Validate resulting domain order |
| `filterVisibleSeries(seriesList)` | series list | visible-only array | Initial line (<= 0.2.4) | No | No | Removes hidden series | Bounds and render loops | Visibility control | Ensure `visible` defaults are explicit |
| `drawLineSeries(ctx, plot, series, xScale, yScale)` | render primitives | void | Initial line (<= 0.2.4) | No | No | Default line renderer with optional point circles | Registered as built-in `line` renderer | Core and custom render paths | Avoid expensive per-point styling branches |

## Behavioral Notes and Changes

- Utility exports were moved to dedicated subpath usage (breaking change in `0.3.0`).
- `makeLinearScale` ratio precomputation was optimized in `0.3.1`.
- Production build can eliminate some dev-only utility behavior via compile-time flags.
