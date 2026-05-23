# Plugin Development Guide

This guide documents how to build, test, and maintain GraphJS plugins.

## Plugin Contract

A plugin is an object with at minimum:

```js
const plugin = {
  id: "my-plugin",
  install(graph, options, api) {},
  hooks: {
    afterRender(graph, context, options, api) {}
  }
};
```

## Contract Fields

| Field | Type | Required | Description | Version Added |
|---|---|---|---|---|
| `id` | string | Yes | Unique plugin identifier | Initial line (<= 0.2.4) |
| `priority` | number | No | Sort weight when dependency graph allows | Initial line (<= 0.2.4) |
| `before` | string[] | No | Must run before listed plugin ids | Initial line (<= 0.2.4) |
| `after` | string[] | No | Must run after listed plugin ids | Initial line (<= 0.2.4) |
| `defaults` | object | No | Option defaults merged with instance options | Initial line (<= 0.2.4) |
| `capabilities` | object | No | Dispatch optimization flags | Initial line (<= 0.2.4) |
| `install` | function | No | Setup step, called at configure time | Initial line (<= 0.2.4) |
| `commands` | object\|function | No | Declarative command map / factory | Initial line (<= 0.2.4) |
| `hooks` | object | No | Hook handlers keyed by hook name | Initial line (<= 0.2.4) |

## Plugin API Surface

`api` methods exposed to plugins:

| API | Parameters | Output | Added | Deprecated | Removed |
|---|---|---|---|---|---|
| `api.id` | none | plugin id string | Initial line (<= 0.2.4) | No | No |
| `getPluginState(pluginId?)` | optional plugin id | plugin state object or `undefined` | Initial line (<= 0.2.4) | No | No |
| `setState(partialState)` | object | void | Initial line (<= 0.2.4) | No | No |
| `registerHook(hookName)` | non-empty string | void | Initial line (<= 0.2.4) | No | No |
| `registerCommand(name, handler, metadata?)` | command name, handler, metadata | normalized command name | Initial line (<= 0.2.4) | No | No |
| `unregisterCommand(name)` | command name | void | Initial line (<= 0.2.4) | No | No |
| `listCommands()` | none | command descriptors | Added by `0.2.8` | No | No |
| `executeCommand(name, payload?)` | command name, payload | handler result | Added by `0.2.8` | No | No |
| `requestRender()` | none | void | Added by `0.2.8` | No | No |
| `emit(hookName, context?)` | hook name, context object | boolean dispatch result | Added by `0.2.8` | No | No |
| `getOptions()` | none | graph options clone | Added by `0.2.8` | No | No |
| `setOptions(options)` | partial/full graph options | void | Added by `0.2.8` | No | No |
| `getDomain()` | none | current domain override | Added by `0.2.8` | No | No |
| `setDomain(domain)` | domain override | void | Added by `0.2.8` | No | No |
| `getPlugin(pluginId)` | plugin id | plugin object or `undefined` | Added by `0.2.8` | No | No |
| `listPlugins()` | none | globally registered plugin list | Added by `0.5.0` | No | No |

## Hook Development Model

- Use `before*` hooks to inspect/cancel a phase.
- Use `after*` hooks for drawing/metrics/event emission.
- Return `false` in cancellable hooks to stop the current stage.
- Use `capabilities` to reduce unnecessary hook calls.

## Interactions and Lifecycle

1. `install` runs during plugin host configure.
2. Commands are registered after install.
3. Hooks are called in sorted plugin order.
4. `beforeDestroy` should remove all listeners/resources.
5. `onStateChange` and `onPluginEvent` can coordinate plugin-to-plugin behavior.

## Use Cases

- Add overlays (crosshair, tooltip, legends).
- Add viewport behavior (pan/zoom).
- Add data shaping (sampling strategies).
- Add domain-specific rendering or controls.

## Best Practices

- Keep plugin `id` stable.
- Do not mutate foreign plugin state.
- Namespace command names clearly.
- Guard expensive code paths with capability checks and option flags.
- Cleanup listeners in `beforeDestroy`.
- Use `pluginErrorBoundary` in production.

## Changes and Compatibility Notes

- `onStateChange` and `onPluginEvent` were added in `0.5.0`.
- Runtime plugin id collision checks are enforced in both dev and production as of `0.5.1`.
- Plugin command/list interaction APIs were expanded in `0.2.8`.
