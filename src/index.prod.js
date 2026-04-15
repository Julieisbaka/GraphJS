// Production entry point — validation omitted for bundle size.
// Use src/index.js (the default entry) during development for full runtime checks.
export { Graph } from "./core/Graph.js";
export { Registry } from "./core/Registry.js";
export { HookRegistry, BUILTIN_HOOKS } from "./core/hooks.js";
export { DEFAULT_OPTIONS } from "./core/defaults.js";
export {
	decimatePointsStride,
	resolveCanvas,
	getDevicePixelRatio,
	normalizeSeriesData,
	getDataBounds
} from "./core/utils.js";
