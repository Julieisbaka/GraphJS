# Default Options Reference

Source: `DEFAULT_OPTIONS` in core defaults.

<p>
  <a href="./default-options.schema.json" download>
    <button type="button">Download JSON Schema</button>
  </a>
</p>

Schema file: `documentation/docs/reference/default-options.schema.json`

## Full Default Object

```js
{
  width: 640,
  height: 360,
  background: "#fff",
  padding: { top: 24, right: 24, bottom: 32, left: 40 },
  immutableInputs: false,
  domain: null,
  series: {
    type: "line",
    color: "#3b82f6",
    lineWidth: 2,
    pointRadius: 0
  },
  sampling: {
    enabled: false,
    maxPoints: 1200,
    method: "stride"
  },
  scalability: {
    dirtyRender: false,
    layerCaching: true,
    useOffscreenCanvas: true
  },
  pluginErrorBoundary: {
    enabled: true,
    onError: null
  },
  axes: {
    show: true,
    color: "#94a3b8",
    lineWidth: 1
  },
  grid: {
    show: true,
    color: "#e2e8f0",
    lineWidth: 1,
    xTicks: 5,
    yTicks: 5
  },
  plugins: []
}
```

## Option Groups

| Group | Description | Interactions | Best Practices |
|---|---|---|---|
| Canvas sizing (`width`, `height`, `padding`) | Controls drawable area and plot rectangle | Affects layout, scales, and grid rendering | Keep aspect ratio consistent with data readability |
| Visual foundation (`background`, `axes`, `grid`) | Draws static layer visuals | Combined with layer cache key generation | Keep static options stable for cache reuse |
| Data and domain (`domain`, `series`) | Controls bounds and series defaults | Impacts normalization and scale mapping | Use `setDomain({})` to clear explicit overrides |
| Performance (`sampling`, `scalability`) | Controls decimation and render invalidation | Interacts with samplers and dirty flags | Tune per dataset size and update frequency |
| Safety (`immutableInputs`, `pluginErrorBoundary`) | Mutation and plugin-failure behavior | Impacts dev diagnostics and resilience | Enable boundary in production |
| Extensibility (`plugins`) | Configures plugin stack | Triggers plugin host configure/sort/install | Use explicit plugin ordering only when required |

## Version Metadata

- Added: Initial line (<= 0.2.4)
- Deprecated fields: none
- Removal schedule: none
- Notable changes:
  - `background` default shortened to `#fff` during optimization cycle (`0.3.1`).
