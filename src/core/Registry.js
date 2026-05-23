/**
 * Stores globally registered GraphJS plugins keyed by their ids.
 */
export class Registry {
  /**
   * Creates an empty plugin registry.
   */
  constructor() {
    this._plugins = new Map();
  }

  /**
   * Registers a plugin definition by id.
   *
   * @param {{id: string}} plugin - Plugin definition to register.
   * @returns {void}
   */
  registerPlugin(plugin) {
    if (typeof __DEV__ === "undefined" || __DEV__) {
      if (!plugin || typeof plugin !== "object") {
        throw new Error("Plugin must be an object.");
      }
      if (!plugin.id || typeof plugin.id !== "string") {
        throw new Error("Plugin must provide a string id.");
      }
    }

    const existing = this._plugins.get(plugin.id);
    if (existing && existing !== plugin) {
      throw new Error(`Plugin id '${plugin.id}' is already registered.`);
    }
    this._plugins.set(plugin.id, plugin);
  }

  /**
   * Removes a previously registered plugin by id.
   *
   * @param {string} pluginId - Plugin id to remove.
   * @returns {void}
   */
  unregisterPlugin(pluginId) {
    this._plugins.delete(pluginId);
  }

  /**
   * Looks up a plugin by id.
   *
   * @param {string} pluginId - Plugin id to resolve.
   * @returns {unknown}
   */
  getPlugin(pluginId) {
    return this._plugins.get(pluginId);
  }

  /**
   * Lists all registered plugin definitions.
   *
   * @returns {unknown[]}
   */
  listPlugins() {
    return [...this._plugins.values()];
  }
}