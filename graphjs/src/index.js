export { Graph } from "./core/Graph.js";
export { Registry } from "./core/Registry.js";
export { HookRegistry, BUILTIN_HOOKS } from "./core/hooks.js";
export { DEFAULT_OPTIONS } from "./core/defaults.js";
export { validateDomain, validateGraphOptions, validatePluginContract } from "./core/validation.js";
export {
	isPlainObject,
	deepMerge,
	deepFreeze,
	clamp,
	decimatePointsStride,
	resolveCanvas,
	getDevicePixelRatio,
	normalizeSeriesData,
	getDataBounds
} from "./core/utils.js";