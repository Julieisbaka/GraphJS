export class Registry {
  constructor() {
    this._plugins = new Map();
  }

  registerPlugin(plugin) {
    if (typeof __DEV__ === "undefined" || __DEV__) {
      if (!plugin || typeof plugin !== "object") {
        throw new Error("Plugin must be an object.");
      }
      if (!plugin.id || typeof plugin.id !== "string") {
        throw new Error("Plugin must provide a string id.");
      }
    }
    this._plugins.set(plugin.id, plugin);
  }

  unregisterPlugin(pluginId) {
    this._plugins.delete(pluginId);
  }

  getPlugin(pluginId) {
    return this._plugins.get(pluginId);
  }

  listPlugins() {
    return [...this._plugins.values()];
  }
}