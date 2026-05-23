# Core API Reference

This page covers exported classes and APIs from the core package entry.

## Exported Symbols

- `Graph`
- `Registry`
- `HookRegistry`
- `BUILTIN_HOOKS`
- `DEFAULT_OPTIONS`
- `validateDomain`
- `validateGraphOptions`
- `validatePluginContract`

## Graph Class

### Constructor

`new Graph(canvasTarget, options?)`

- Description: Creates a graph instance bound to a canvas element or selector.
- Parameters:
  - `canvasTarget`: `string | HTMLCanvasElement`
  - `options`: `GraphOptions` (optional)
- Output: `Graph` instance
- Added: Initial line (<= 0.2.4)
- Deprecated: No
- Removal: No
- Interactions: Configures plugin host and triggers init hooks.
- Use cases: Primary entry point for rendering.
- Best practices: Initialize after DOM mount; validate plugin list at startup.

### Instance Methods

| Method | Parameters | Output | Added | Deprecated | Removal | Notes |
|---|---|---|---|---|---|---|
| `setOptions(options)` | partial/full options | `this` | Initial line (<= 0.2.4) | No | No | Reconfigures plugins when `options.plugins` is provided. |
| `getOptions()` | none | defensive options clone | Initial line (<= 0.2.4) | No | No | Safe read of active options. |
| `setDomain(domain)` | domain override or null | `this` | Initial line (<= 0.2.4) | No | No | Empty domain object normalizes to null. |
| `clearDomain()` | none | `this` | Initial line (<= 0.2.4) | Yes (`0.4.9`) | Not scheduled | Use `setDomain({})` instead. |
| `getDomain()` | none | domain override | Initial line (<= 0.2.4) | No | No | Read active override. |
| `setBoundsStrategy(fn)` | function or null | `this` | Initial line (<= 0.2.4) | No | No | Overrides default domain resolution pipeline. |
| `setData(series[])` | series array | `this` | Initial line (<= 0.2.4) | No | No | Runs `beforeSetData` and `afterSetData` hooks. |
| `addSeries(series)` | series object | `this` | Initial line (<= 0.2.4) | No | No | Convenience wrapper over `setData`. |
| `getSeriesById(seriesId)` | series id string | series or `undefined` | `0.5.0` | No | No | Lookup helper for active graph data. |
| `clear()` | none | `this` | Initial line (<= 0.2.4) | No | No | Clears canvas only. |
| `resize(width, height)` | numeric width/height | `this` | Initial line (<= 0.2.4) | No | No | Emits resize hooks and updates DPR transforms. |
| `render({ force? })` | optional force flag | `this` | Initial line (<= 0.2.4) | No | No | Main render pipeline with hooks and renderers. |
| `destroy()` | none | `void` | Initial line (<= 0.2.4) | No | No | Calls destroy hooks and clears commands. |
| `registerCommand(name, handler, metadata?, pluginId?)` | command descriptors | normalized command name | Initial line (<= 0.2.4) | No | No | Namespaces command using `pluginId` when appropriate. |
| `unregisterCommand(name)` | command name | `void` | Initial line (<= 0.2.4) | No | No | Removes command by exact key. |
| `clearPluginCommands(pluginId)` | plugin id | `void` | Initial line (<= 0.2.4) | No | No | Removes all commands from one plugin owner. |
| `listCommands()` | none | command metadata entries | Initial line (<= 0.2.4) | No | No | Exposes names and metadata only, not handlers. |
| `executeCommand(name, payload?)` | command name and payload | unknown | Initial line (<= 0.2.4) | No | No | Throws for unknown command names. |

### Static Methods

| Method | Parameters | Output | Added | Deprecated | Removal | Notes |
|---|---|---|---|---|---|---|
| `Graph.registerPlugin(plugin)` | plugin object | `void` | Initial line (<= 0.2.4) | No | No | Adds plugin to global registry. |
| `Graph.unregisterPlugin(pluginId)` | plugin id | `void` | Initial line (<= 0.2.4) | No | No | Removes global plugin. |
| `Graph.listPlugins()` | none | plugin list | `0.5.0` | No | No | Reads from global registry. |
| `Graph.registerRenderer(type, fn)` | renderer type, fn | `void` | Initial line (<= 0.2.4) | No | No | Renderer key is trimmed as of `0.5.1`. |
| `Graph.unregisterRenderer(type)` | renderer type | `void` | `0.5.0` | No | No | Renderer key is trimmed as of `0.5.1`. |
| `Graph.registerSampler(name, fn)` | sampler name, fn | `void` | Initial line (<= 0.2.4) | No | No | Adds sampling strategy to global sampler map. |
| `Graph.unregisterSampler(name)` | sampler name | `void` | `0.5.0` | No | No | Removes registered sampler. |

### Static Collections

| Symbol | Type | Description |
|---|---|---|
| `Graph.registry` | `Registry` | Global plugin registry singleton. |
| `Graph.renderers` | `Map<string, GraphSeriesRenderer>` | Registered renderers by series type. |
| `Graph.samplers` | `Map<string, GraphSeriesSampler>` | Registered samplers by method name. |

## Registry Class

| API | Parameters | Output | Added | Deprecated | Removal | Description |
|---|---|---|---|---|---|---|
| `new Registry()` | none | Registry instance | Initial line (<= 0.2.4) | No | No | Creates plugin map. |
| `registerPlugin(plugin)` | plugin object with id | void | Initial line (<= 0.2.4) | No | No | Enforces id collision protection (runtime-enforced in `0.5.1`). |
| `unregisterPlugin(pluginId)` | plugin id | void | Initial line (<= 0.2.4) | No | No | Removes plugin id mapping. |
| `getPlugin(pluginId)` | plugin id | plugin or undefined | Initial line (<= 0.2.4) | No | No | Lookup helper. |
| `listPlugins()` | none | array | Initial line (<= 0.2.4) | No | No | Returns registered plugin values. |

## HookRegistry Class

| API | Parameters | Output | Added | Deprecated | Removal | Description |
|---|---|---|---|---|---|---|
| `new HookRegistry(initialHooks?)` | iterable hook names | HookRegistry instance | Initial line (<= 0.2.4) | No | No | Seeds with built-ins by default. |
| `register(hookName)` | hook name string | void | Initial line (<= 0.2.4) | No | No | Adds hook key to registry. |
| `has(hookName)` | hook name string | boolean | Initial line (<= 0.2.4) | No | No | Hook existence query. |
| `list()` | none | string[] | Initial line (<= 0.2.4) | No | No | Lists registered hooks. |

## BUILTIN_HOOKS

- Type: `readonly string[]`
- Added: Initial line (<= 0.2.4)
- Deprecated: No
- Removal: No
- Description: Canonical lifecycle hook names known to core runtime.
- Interactions: Used by plugin dispatch and hook registry initialization.

## DEFAULT_OPTIONS

- Type: `Readonly<GraphOptions>`
- Added: Initial line (<= 0.2.4)
- Deprecated: No
- Removal: No
- Description: Base option object merged into all graph instances.
- Interactions: Merged by constructor and `setOptions`.
- Best practices: Treat as immutable baseline.

## Known Changes

- `clearDomain()` deprecated in `0.4.9`.
- `onStateChange` and `onPluginEvent` hook ecosystem added in `0.5.0`.
- `registerRenderer`/`unregisterRenderer` trim behavior normalized in `0.5.1`.
- Plugin id collision checks enforced as a runtime boundary in `0.5.1`.
