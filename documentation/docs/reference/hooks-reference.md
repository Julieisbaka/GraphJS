# Hook Reference

This page documents all built-in lifecycle hooks and custom hook behavior.

## Built-in Hooks

| Hook | Stage | Context Fields | Return Behavior | Added | Changes | Best Use |
|---|---|---|---|---|---|---|
| `beforeInit` | Graph constructor setup | `options` | `false` cancels phase | Initial line (<= 0.2.4) | None | Last chance to alter startup flow. |
| `afterInit` | End of constructor setup | `options` | ignored unless false semantics used by caller | Initial line (<= 0.2.4) | None | Post-init instrumentation. |
| `onStateChange` | Plugin state updates | `pluginId`, `previousState`, `nextState`, `partialState` | cancellable | `0.5.0` | Newly introduced for plugin coordination | Observe state transitions. |
| `onPluginEvent` | Plugin custom event bus | `pluginId`, `eventName`, `eventContext` | cancellable | `0.5.0` | Newly introduced for plugin coordination | Cross-plugin communication. |
| `beforeSetData` | Prior to data normalization | `nextData` | `false` aborts data update | Initial line (<= 0.2.4) | None | Validation or preprocessing. |
| `afterSetData` | After data stored | `data` | non-blocking | Initial line (<= 0.2.4) | None | Analytics and side effects. |
| `beforeLayout` | Before layout computation | mutable `layout?` override slot | `false` aborts render | Initial line (<= 0.2.4) | Context now supports layout override (`0.3.2`) | Custom layout injection. |
| `afterLayout` | After layout and bounds resolved | `layout`, `bounds` | non-blocking | Initial line (<= 0.2.4) | None | Capture layout for interaction plugins. |
| `beforeRender` | Before drawing static/dynamic layers | `layout`, `bounds` | `false` aborts render | Initial line (<= 0.2.4) | None | Bounds rewrite, guard rendering. |
| `beforeDrawSeries` | Per visible series, before renderer | `series`, `layout`, `bounds`, scales | `false` skips that series | Initial line (<= 0.2.4) | None | Per-series overlays/filtering. |
| `afterDrawSeries` | Per visible series, after renderer | `series`, `layout`, `bounds`, scales | non-blocking | Initial line (<= 0.2.4) | None | Per-series annotation. |
| `afterRender` | End of frame render | `layout`, `bounds` | non-blocking | Initial line (<= 0.2.4) | None | UI overlays and labels. |
| `beforeResize` | Before canvas resize | `width`, `height` | `false` cancels resize | Initial line (<= 0.2.4) | None | Clamp or reject dimensions. |
| `afterResize` | After resize and DPR transform | `width`, `height`, `dpr` | non-blocking | Initial line (<= 0.2.4) | None | Responsive sync with host UI. |
| `beforeDestroy` | Before teardown | none | non-blocking | Initial line (<= 0.2.4) | None | Remove listeners/resources. |
| `afterDestroy` | End of teardown | none | non-blocking | Initial line (<= 0.2.4) | None | Post-destroy metrics/logging. |

## Hook Context Versioning

- The TypeScript hook context model exposes `contextVersion` for interoperability.
- Runtime behavior focuses on provided context fields; avoid assuming undocumented context properties.

## Custom Hooks

Custom hooks can be registered at runtime:

```js
api.registerHook("myCustomHook");
api.emit("myCustomHook", { foo: 1 });
```

Metadata:
- Added: Initial line (<= 0.2.4)
- Deprecated: No
- Removal: No

## Interactions

- Hook dispatch order follows plugin ordering resolution (`before`/`after` graph, then priority tie-break).
- Capability flags can prevent hook invocation when required context/data is absent.
- Error boundary behavior affects hook failures (swallow vs throw).

## Best Practices

- Keep hook logic deterministic and lightweight.
- Avoid mutating shared context objects unless hook contract expects it (for example `beforeLayout` override and bounds rewriting in `beforeRender`).
- Return `false` only when cancellation is intentional and documented.
- Always clean up event listeners in `beforeDestroy`.
