import { freeze } from "./utils.js";

/**
 * Default GraphJS configuration applied to every graph instance before user overrides.
 *
 * @type {Readonly<import("../index.d.ts").GraphOptions>}
 */
export const DEFAULT_OPTIONS = freeze({
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
    method: "stride",
    viewport: true,
    pointsPerPixel: 2
  },
  scalability: {
    dirtyRender: false,
    layerCaching: true,
    useOffscreenCanvas: true
  },
  sorting: {
    enabled: false
  },
  autoResize: false,
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