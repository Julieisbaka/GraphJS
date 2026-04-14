# GraphJS

GraphJS is a **zero-dependency**, lightweight JavaScript graphing core built for plugin-first extension.

See `CHANGELOG.md` for release history.

## Goals

- Tiny core, no external runtime dependencies
- Clean graph lifecycle and rendering pipeline
- Comprehensive plugin hooks for first-party and third-party extensions
- Simple line-series baseline to build on

## Install

Copy this folder into your project, or publish and install from npm later.

A simple runnable demo is available at workspace root: `./demo.html`.

## Quick Start

```js
import { Graph } from "./src/index.js";

const graph = new Graph("#graph", {
  width: 800,
  height: 420,
  plugins: []
});

graph
  .setData([
    {
      id: "revenue",
      type: "line",
      color: "#2563eb",
      pointRadius: 3,
      points: [
        { x: 0, y: 12 },
        { x: 1, y: 16 },
        { x: 2, y: 11 },
        { x: 3, y: 19 }
      ]
    }
  ])
  .render();
```

## Plugin System

Plugins can be registered globally or passed per graph instance.

### Global plugin registration

```js
import { Graph } from "./src/index.js";

Graph.registerPlugin(myPlugin);

const graph = new Graph("#graph", {
  plugins: ["myPlugin"]
});
```

### Instance plugin registration

```js
const graph = new Graph("#graph", {
  plugins: [
    {
      plugin: myPlugin,
      options: { /* plugin config */ }
    }
  ]
});
```

### Plugin shape

```js
const myPlugin = {
  id: "myPlugin",
  priority: 10,
  before: ["someOtherPlugin"],
  after: ["basePlugin"],
  capabilities: {
    hooks: ["beforeRender", "afterRender"],
    needsLayout: true,
    needsBounds: true
  },
  defaults: {
    enabled: true
  },
  install(graph, options, api) {
    // setup work
    // api.state / api.setState / api.registerHook / api.registerCommand
  },
  commands: {
    // declarative command support (optional)
    ping(payload, graph, options, api) {
      return { ok: true, payload };
    }
  },
  hooks: {
    beforeRender(graph, ctx, options, api) {
      // return false to cancel this phase
      // ctx.contextVersion provides hook-context versioning
    }
  }
};
```

### Built-in lifecycle hooks

- `beforeInit`, `afterInit`
- `beforeSetData`, `afterSetData`
- `beforeLayout`, `afterLayout`
- `beforeRender`, `beforeDrawSeries`, `afterDrawSeries`, `afterRender`
- `beforeResize`, `afterResize`
- `beforeDestroy`, `afterDestroy`

Any hook can return `false` to cancel the current stage.

### Plugin maturity features

- Dependency-aware plugin ordering via `before` / `after`
- Optional capability flags (`hooks`, `needsLayout`, `needsBounds`, `needsData`) for optimized hook dispatch
- Hook context versioning (`context.contextVersion`)
- Optional plugin error boundary (`pluginErrorBoundary`) for sandboxed plugin failures

## Core API

- `new Graph(canvasOrSelector, options)`
- `graph.setOptions(options)`
- `graph.setDomain(domain)`
- `graph.clearDomain()`
- `graph.getDomain()`
- `graph.setData(series[])`
- `graph.addSeries(series)`
- `graph.resize(width, height)`
- `graph.render({ force?: boolean })`
- `graph.clear()`
- `graph.destroy()`
- `graph.registerCommand(name, handler, metadata?, pluginId?)`
- `graph.executeCommand(name, payload?)`
- `graph.listCommands()`

### Notable core options

- `immutableInputs` (boolean): freeze normalized data for safer consumption
- `domain` (`{ xMin, xMax, yMin, yMax } | null`): override data-derived bounds
- `sampling`: `{ enabled, maxPoints, method: "stride" }`
- `scalability`: `{ dirtyRender, layerCaching, useOffscreenCanvas }`
- `pluginErrorBoundary`: `{ enabled, onError }`

## Utility exports

GraphJS publicly exports helpers from `src/core/utils.js`:

- `isPlainObject`
- `deepMerge`
- `deepFreeze`
- `clamp`
- `decimatePointsStride`
- `resolveCanvas`
- `getDevicePixelRatio`
- `normalizeSeriesData`
- `getDataBounds`

Import either from the main package entry or the `graphjs/utils` subpath.

## Typed API support

GraphJS ships TypeScript declaration files (`src/index.d.ts`) for the core API,
plugin contract, command system, options, and utility exports.

## Extension roadmap

GraphJS core is intentionally minimal. Planned first-party extensions can live separately:

- Legends
- Tooltips / cursors
- Pan & zoom
- Time scales
- Additional series types (bar, area, scatter)

## First-party extensions (workspace-level)

First-party extensions are intentionally separated from package source and live at:

- `../extensions/`

This keeps the core package lightweight while still providing official plugin modules.
