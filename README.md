# GraphJS

GraphJS is a **zero-dependency**, lightweight JavaScript graphing core built for plugin-first extension.

See `CHANGELOG.md` for release history.

## Documentation

Comprehensive documentation now lives in `documentation/docs/`.

- Documentation landing: `documentation/README.md`
- Hub: `documentation/docs/README.md`
- Installation: `documentation/docs/getting-started/installation.md`
- Package usage: `documentation/docs/getting-started/package-usage-guide.md`
- Plugin development: `documentation/docs/guides/plugin-development-guide.md`
- Troubleshooting: `documentation/docs/guides/troubleshooting.md`
- Core API reference: `documentation/docs/reference/core-api.md`
- Hook reference: `documentation/docs/reference/hooks-reference.md`
- Utilities API reference: `documentation/docs/reference/utils-api.md`
- Validation API reference: `documentation/docs/reference/validation-reference.md`
- Default options reference: `documentation/docs/reference/default-options.md`
- Default options JSON Schema: `documentation/docs/reference/default-options.schema.json`
- First-party plugin docs: `documentation/docs/plugins/`

Each first-party plugin page includes an internal evolution timeline derived from that plugin package's own changelog (`extensions/*/CHANGELOG.md`).

## Goals

- Tiny core, no external runtime dependencies
- Clean graph lifecycle and rendering pipeline
- Comprehensive plugin hooks for first-party and third-party extensions
- Simple line-series baseline to build on

## Install

Install from npm:

```bash
npm install @julieisbaka/graphjs
```

## Development

- Run the test suite with `npm test`. The test script uses a small Node launcher that discovers `test/*.test.js` files and forwards them to Node's test runner, avoiding shell glob differences and the Node 22 CI issue where `node --test test` can be treated like a missing module path.
- Run `npm run build` to produce a non-bundled ESM `dist/` output. GraphJS intentionally does not ship a pre-bundled runtime build so application developers can bundle and optimize the library in their own project pipeline.

## Publishing

- The release workflow creates GitHub releases and uploads built package assets when package metadata changes on `main`.
- npm publishing is manual and is not performed by `.github/workflows/release.yml`.
- Manual publish example: `npm publish --provenance --access public`
- `--access public` is recommended for scoped packages, and each package version must be unique before publishing.

## Quick Start

```js
import { Graph } from "@julieisbaka/graphjs";

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
import { Graph } from "@julieisbaka/graphjs";

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
    }
  }
};
```

### Built-in lifecycle hooks

- `beforeInit`, `afterInit`
- `onStateChange`, `onPluginEvent`
- `beforeSetData`, `afterSetData`
- `beforeLayout`, `afterLayout`
- `beforeRender`, `beforeDrawSeries`, `afterDrawSeries`, `afterRender`
- `beforeResize`, `afterResize`
- `beforeDestroy`, `afterDestroy`

Any hook can return `false` to cancel the current stage.

### Plugin maturity features

- Dependency-aware plugin ordering via `before` / `after`
- Optional capability flags (`hooks`, `needsLayout`, `needsBounds`, `needsData`) for optimized hook dispatch
- Optional plugin error boundary (`pluginErrorBoundary`) — live-reconfigurable via `graph.setOptions({ pluginErrorBoundary: ... })`
- Plugin identity hardening: local inline plugins cannot use an id that conflicts with an already-registered global plugin id.
- Plugin id collision checks are a runtime security boundary and are enforced in both development and production builds.

## Core API

### Instance methods

- `new Graph(canvasOrSelector, options)`
- `graph.setOptions(options)`
- `graph.getOptions()`
- `graph.setDomain(domain)` (pass `{}` to clear domain override)
- `graph.clearDomain()` (deprecated, kept for backwards compatibility)
- `graph.getDomain()`
- `graph.setBoundsStrategy(fn)`
- `graph.setData(series[])`
- `graph.addSeries(series)`
- `graph.getSeriesById(seriesId)`
- `graph.resize(width, height)`
- `graph.render({ force?: boolean })`
- `graph.clear()`
- `graph.destroy()`
- `graph.registerCommand(name, handler, metadata?, pluginId?)`
- `graph.unregisterCommand(name)`
- `graph.executeCommand(name, payload?)`
- `graph.listCommands()`

`graph.clearDomain()` is deprecated and kept for backwards compatibility. Prefer `graph.setDomain({})` to clear the active domain override.

### Static methods and registries

- `Graph.registerPlugin(plugin)` — add a plugin to the global registry
- `Graph.unregisterPlugin(pluginId)` — remove a plugin from the global registry
- `Graph.listPlugins()` — list all globally registered plugins
- `Graph.registerRenderer(type, fn)` — register a custom series renderer (e.g. `"bar"`, `"scatter"`)
- `Graph.unregisterRenderer(type)` — unregister a custom series renderer
- `Graph.renderers` — `Map<string, fn>` of all registered renderers

Renderer `type` keys are normalized with `trim()` during registration and unregistration.

- `Graph.registerSampler(name, fn)` — register a custom data sampler
- `Graph.unregisterSampler(name)` — unregister a custom data sampler
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

All utility functions are available exclusively via the `@julieisbaka/graphjs/utils` subpath:

- `decimatePointsStride`
- `resolveCanvas`
- `getDevicePixelRatio`
- `normalizeSeriesData`
- `getDataBounds`
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

GraphJS ships TypeScript declaration files for the core API, plugin contract,
command system, and options (`src/index.d.ts`). Utility function types are
declared separately in `src/utils.d.ts` and are exposed via the `@julieisbaka/graphjs/utils`
subpath entry.

## First-party extensions

First-party extensions live at `extensions/` in this workspace and are published separately on npm:

- `@julieisbaka/graphjs-extension-crosshair`
- `@julieisbaka/graphjs-extension-legend`
- `@julieisbaka/graphjs-extension-pan-zoom`
- `@julieisbaka/graphjs-extension-time-scale`
- `@julieisbaka/graphjs-extension-tooltip-cursor` (compatibility package; tooltip cursor is included in pan-zoom)
- `@julieisbaka/graphjs-extension-watermark`
- `@julieisbaka/graphjs-extension-sampling`

Each extension is a standalone package with its own `package.json` and can be used independently.
