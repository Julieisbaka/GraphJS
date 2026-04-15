# GraphJS

GraphJS is a **zero-dependency**, lightweight JavaScript graphing core built for plugin-first extension.

See `CHANGELOG.md` for release history.

## Goals

- Tiny core, no external runtime dependencies
- Clean graph lifecycle and rendering pipeline
- Comprehensive plugin hooks for first-party and third-party extensions
- Simple line-series baseline to build on

## Install

Copy this folder into your project or download from releases.

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
    // api.getPluginState / api.setState / api.registerHook / api.registerCommand
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
- Optional plugin error boundary (`pluginErrorBoundary`) — live-reconfigurable via `graph.setOptions({ pluginErrorBoundary: ... })`

## Core API

### Instance methods

- `new Graph(canvasOrSelector, options)`
- `graph.setOptions(options)`
- `graph.getOptions()`
- `graph.setDomain(domain)`
- `graph.clearDomain()`
- `graph.getDomain()`
- `graph.setBoundsStrategy(fn)`
- `graph.setData(series[])`
- `graph.addSeries(series)`
- `graph.resize(width, height)`
- `graph.render({ force?: boolean })`
- `graph.clear()`
- `graph.destroy()`
- `graph.registerCommand(name, handler, metadata?, pluginId?)`
- `graph.unregisterCommand(name)`
- `graph.executeCommand(name, payload?)`
- `graph.listCommands()`

### Static methods and registries

- `Graph.registerPlugin(plugin)` — add a plugin to the global registry
- `Graph.unregisterPlugin(pluginId)` — remove a plugin from the global registry
- `Graph.registerRenderer(type, fn)` — register a custom series renderer (e.g. `"bar"`, `"scatter"`)
- `Graph.renderers` — `Map<string, fn>` of all registered renderers
- `Graph.registerSampler(name, fn)` — register a custom data sampler
- `Graph.samplers` — `Map<string, fn>` of all registered samplers

### Notable core options

- `immutableInputs` (boolean): freeze normalized data for safer consumption
- `domain` (`{ xMin, xMax, yMin, yMax } | null`): override data-derived bounds
- `series`: `{ type, color, lineWidth, pointRadius }` — per-graph series defaults applied when a series omits those fields
- `sampling`: `{ enabled, maxPoints, method }` — `method` is the name of any registered sampler (built-in: `"stride"`)
- `scalability`: `{ dirtyRender, layerCaching, useOffscreenCanvas }`
- `pluginErrorBoundary`: `{ enabled, onError }` — can be updated live via `graph.setOptions({ pluginErrorBoundary: ... })`

## Utility exports

GraphJS exports helpers for use in extensions and custom renderers.

Available from the main entry (`graphjs`):

- `decimatePointsStride`
- `resolveCanvas`
- `getDevicePixelRatio`
- `normalizeSeriesData`
- `getDataBounds`

Also available via the `graphjs/utils` subpath (not in the main entry):

- `makeLinearScale`
- `invertLinearScale`
- `clampBounds`
- `applyDomainOverride`
- `filterVisibleSeries`
- `isPlainObject`
- `deepMerge`
- `deepFreeze`
- `clamp`

## Typed API support

GraphJS ships TypeScript declaration files (`src/index.d.ts`) for the core API,
plugin contract, command system, options, and utility exports.

## First-party extensions

First-party extensions live at `extensions/` in this workspace:

- `extensions/crosshair`
- `extensions/legend`
- `extensions/pan-zoom`
- `extensions/time-scale`
- `extensions/tooltip-cursor`
- `extensions/watermark`

Each extension is a standalone package with its own `package.json` and can be used independently.
