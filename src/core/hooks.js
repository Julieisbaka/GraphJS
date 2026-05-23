import { freeze } from "./utils.js";

/**
 * Built-in lifecycle hook names supported by the core graph pipeline.
 *
 * @type {readonly string[]}
 */
export const BUILTIN_HOOKS = freeze([
  "beforeInit",
  "afterInit",
  "onStateChange",
  "onPluginEvent",
  "beforeSetData",
  "afterSetData",
  "beforeLayout",
  "afterLayout",
  "beforeRender",
  "beforeDrawSeries",
  "afterDrawSeries",
  "afterRender",
  "beforeResize",
  "afterResize",
  "beforeDestroy",
  "afterDestroy"
]);

/**
 * Tracks the set of currently registered hook names.
 */
export class HookRegistry {
  /**
   * Creates a hook registry with the provided initial hook names.
   *
   * @param {Iterable<string>} [initialHooks=BUILTIN_HOOKS] - Initial hooks to register.
   */
  constructor(initialHooks = BUILTIN_HOOKS) {
    this._hooks = new Set(initialHooks);
  }

  /**
   * Registers a hook name so plugins can emit or subscribe to it.
   *
   * @param {string} hookName - Hook name to add.
   * @returns {void}
   */
  register(hookName) {
    if (typeof __DEV__ === "undefined" || __DEV__) {
      if (typeof hookName !== "string" || !hookName.trim()) {
        throw new Error("Hook name must be a non-empty string.");
      }
    }
    this._hooks.add(hookName);
  }

  /**
   * Returns whether a hook name is currently registered.
   *
   * @param {string} hookName - Hook name to check.
   * @returns {boolean}
   */
  has(hookName) {
    return this._hooks.has(hookName);
  }

  /**
   * Lists all registered hook names.
   *
   * @returns {string[]}
   */
  list() {
    return [...this._hooks];
  }
}