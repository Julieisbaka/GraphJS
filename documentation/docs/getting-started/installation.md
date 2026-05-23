# Installation

## Supported Runtime

- Node.js: `>=22` (from package engines)
- Browser: Canvas 2D-capable environment

## Install Core Package

```bash
npm install @julieisbaka/graphjs
```

## Install First-party Plugins

Install only what you need:

```bash
npm install @julieisbaka/graphjs-extension-crosshair
npm install @julieisbaka/graphjs-extension-legend
npm install @julieisbaka/graphjs-extension-pan-zoom
npm install @julieisbaka/graphjs-extension-sampling
npm install @julieisbaka/graphjs-extension-time-scale
npm install @julieisbaka/graphjs-extension-tooltip-cursor
npm install @julieisbaka/graphjs-extension-watermark
```

## Verify Installation

```js
import { Graph } from "@julieisbaka/graphjs";

const graph = new Graph("#graph", { width: 800, height: 400 });
graph.setData([{ id: "demo", points: [{ x: 0, y: 1 }, { x: 1, y: 2 }] }]).render();
```

If the graph renders and no import errors occur, installation succeeded.

## Versioning and Compatibility

- GraphJS follows semver.
- For plugin packages, keep major versions aligned with core for safest interoperability.
- If using lockfiles across monorepos, run a dependency dedupe pass after upgrades.

## Recommended Setup

- Use ESM imports in app code.
- Keep plugin configuration instance-local where possible.
- Enable `pluginErrorBoundary` in production unless you explicitly want plugin errors to throw.
