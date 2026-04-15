export const DEFAULT_OPTIONS = Object.freeze({
  width: 640,
  height: 360,
  background: "#ffffff",
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
});