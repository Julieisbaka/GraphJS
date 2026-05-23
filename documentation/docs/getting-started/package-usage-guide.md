# Package Usage Guide

## Core Import Patterns

```js
import { Graph } from "@julieisbaka/graphjs";
```

Utilities are imported from the dedicated subpath:

```js
import { makeLinearScale, getDataBounds } from "@julieisbaka/graphjs/utils";
```

## Minimal Graph

```js
const graph = new Graph("#graph", {
  width: 900,
  height: 420,
  plugins: []
});

graph
  .setData([
    {
      id: "series-1",
      type: "line",
      points: [
        { x: 0, y: 10 },
        { x: 1, y: 14 },
        { x: 2, y: 8 }
      ]
    }
  ])
  .render();
```

## Plugin Registration Modes

### Global registration

```js
Graph.registerPlugin(myPlugin);
const graph = new Graph("#graph", { plugins: ["myPlugin"] });
```

### Instance-local plugin object

```js
const graph = new Graph("#graph", {
  plugins: [{ plugin: myPlugin, options: { enabled: true } }]
});
```

## Commands

GraphJS includes a command bus for core and plugin commands.

```js
graph.registerCommand("app.export", () => {
  return { ok: true };
});

const result = graph.executeCommand("app.export");
```

Plugin commands registered through plugin APIs are namespaced as needed (for example `legend.set`).

## Domain and Bounds

- Use `setDomain(...)` for explicit viewport control.
- Use `setBoundsStrategy(...)` for full custom bounds logic.
- Use `setDomain({})` to clear an override.

## Performance Usage

- Use `sampling.enabled` and `sampling.maxPoints` on large datasets.
- Keep `scalability.layerCaching` enabled unless dynamic backgrounds require full redraws.
- Use `render({ force: true })` only when necessary.

## Upgrade-safe Practices

- Avoid mutating GraphJS internals directly.
- Prefer exposed APIs over touching plugin host internals.
- Keep plugin hook handlers resilient and side-effect scoped.
