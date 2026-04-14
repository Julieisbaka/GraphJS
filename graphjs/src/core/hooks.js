export const BUILTIN_HOOKS = Object.freeze([
  "beforeInit",
  "afterInit",
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

export class HookRegistry {
  constructor(initialHooks = BUILTIN_HOOKS) {
    this._hooks = new Set(initialHooks);
  }

  register(hookName) {
    if (typeof hookName !== "string" || !hookName.trim()) {
      throw new Error("Hook name must be a non-empty string.");
    }
    this._hooks.add(hookName);
  }

  has(hookName) {
    return this._hooks.has(hookName);
  }

  list() {
    return [...this._hooks];
  }
}