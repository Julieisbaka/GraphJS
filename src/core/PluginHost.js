import { deepMerge, freeze } from "./utils.js";
import { validatePluginContract } from "./validation.js";
import { ErrorBoundary } from "./ErrorBoundary.js";

/**
 * Returns the numeric sort priority of a plugin.
 *
 * @param {{priority?: number}} plugin - Plugin definition.
 * @returns {number}
 */
function getPluginPriority(plugin) {
  return Number.isFinite(plugin.priority) ? plugin.priority : 0;
}

/**
 * Normalizes the supported plugin entry shapes into a consistent internal record.
 *
 * @param {string|{id?: string, plugin?: object, options?: Record<string, unknown>}|null|undefined} entry - Raw plugin entry.
 * @returns {{id: string, plugin?: object, options: Record<string, unknown>}|null}
 */
function normalizePluginConfig(entry) {
  if (!entry) {
    return null;
  }

  if (typeof entry === "string") {
    return { id: entry, options: {} };
  }

  if (entry.plugin && typeof entry.plugin === "object") {
    return {
      id: entry.plugin.id,
      plugin: entry.plugin,
      options: entry.options || {}
    };
  }

  if (typeof entry === "object" && entry.id) {
    return { id: entry.id, plugin: entry, options: {} };
  }

  throw new Error("Invalid plugin declaration.");
}

/**
 * Resolves the command map for a plugin, including function-based lazy command factories.
 *
 * @param {object} plugin - Plugin definition.
 * @param {Record<string, unknown>} options - Resolved plugin options.
 * @param {object} api - Plugin API object.
 * @returns {Record<string, unknown>}
 */
function normalizeCommandMap(plugin, options, api) {
  if (!plugin.commands) {
    return {};
  }

  if (typeof plugin.commands === "function") {
    const commands = plugin.commands(plugin, options, api);
    return commands && typeof commands === "object" ? commands : {};
  }

  return typeof plugin.commands === "object" ? plugin.commands : {};
}

/**
 * Orders plugins using before/after dependencies with priority as a tie-breaker.
 *
 * @param {Array<{plugin: {id: string, before?: string[], after?: string[], priority?: number}}>} records - Plugin records.
 * @returns {Array<{plugin: {id: string, before?: string[], after?: string[], priority?: number}}>} Ordered plugin records.
 */
function orderPlugins(records) {
  const byId = new Map(records.map((r) => [r.plugin.id, r]));
  const indegree = new Map();
  const outgoing = new Map();

  for (const record of records) {
    indegree.set(record.plugin.id, 0);
    outgoing.set(record.plugin.id, new Set());
  }

  for (const record of records) {
    const before = Array.isArray(record.plugin.before) ? record.plugin.before.filter((id) => typeof id === "string") : [];
    const after = Array.isArray(record.plugin.after) ? record.plugin.after.filter((id) => typeof id === "string") : [];

    for (const depId of before) {
      if (!byId.has(depId)) {
        continue;
      }
      if (!outgoing.get(record.plugin.id).has(depId)) {
        outgoing.get(record.plugin.id).add(depId);
        indegree.set(depId, (indegree.get(depId) || 0) + 1);
      }
    }

    for (const depId of after) {
      if (!byId.has(depId)) {
        continue;
      }
      if (!outgoing.get(depId).has(record.plugin.id)) {
        outgoing.get(depId).add(record.plugin.id);
        indegree.set(record.plugin.id, (indegree.get(record.plugin.id) || 0) + 1);
      }
    }
  }

  const ready = records
    .filter((r) => indegree.get(r.plugin.id) === 0)
    .sort((a, b) => getPluginPriority(b.plugin) - getPluginPriority(a.plugin));
  const ordered = [];

  while (ready.length) {
    const next = ready.shift();
    ordered.push(next);

    for (const neighbor of outgoing.get(next.plugin.id)) {
      indegree.set(neighbor, indegree.get(neighbor) - 1);
      if (indegree.get(neighbor) === 0) {
        ready.push(byId.get(neighbor));
        ready.sort((a, b) => getPluginPriority(b.plugin) - getPluginPriority(a.plugin));
      }
    }
  }

  if (ordered.length !== records.length) {
    return records.sort((a, b) => getPluginPriority(b.plugin) - getPluginPriority(a.plugin));
  }

  return ordered;
}

/**
 * Coordinates plugin installation, hook dispatch, and command registration for a graph instance.
 */
export class PluginHost {
  /**
   * Creates a plugin host bound to a graph instance.
   *
   * @param {import("./Graph.js").Graph} graph - Owning graph instance.
   * @param {import("./Registry.js").Registry} registry - Global plugin registry.
   * @param {import("./hooks.js").HookRegistry} hookRegistry - Hook registry used by the graph.
   */
  constructor(graph, registry, hookRegistry) {
    this.graph = graph;
    this.registry = registry;
    this.hookRegistry = hookRegistry;
    this.plugins = [];
    this.pluginStates = new Map();
    this._errorBoundary = new ErrorBoundary(graph.options?.pluginErrorBoundary ?? {});
  }

  /**
   * Reconfigures the plugin error boundary at runtime.
   *
   * @param {{enabled?: boolean, onError?: Function | null}} settings - Partial error boundary settings.
   * @returns {void}
   */
  configureErrorBoundary(settings) {
    this._errorBoundary.configure(settings);
  }

  /**
   * Routes a plugin error through the configured error boundary.
   *
   * @param {{id: string}} plugin - Plugin definition.
   * @param {string} phase - Phase label.
   * @param {unknown} error - Original thrown value.
   * @param {Record<string, unknown>} [context={}] - Extra context for diagnostics.
   * @returns {void}
   */
  _handlePluginError(plugin, phase, error, context = {}) {
    this._errorBoundary.handle(plugin.id, phase, error, context);
  }

  /**
   * Returns whether a plugin should run for the current hook dispatch.
   *
   * @param {{capabilities?: {hooks?: string[], needsLayout?: boolean, needsBounds?: boolean, needsData?: boolean}}} plugin - Plugin definition.
   * @param {string} hookName - Hook currently being dispatched.
   * @param {Record<string, unknown>} context - Hook context.
   * @returns {boolean}
   */
  _pluginCanRunForHook(plugin, hookName, context) {
    const capabilities = plugin.capabilities || {};

    if (Array.isArray(capabilities.hooks) && !capabilities.hooks.includes(hookName)) {
      return false;
    }
    if (capabilities.needsLayout && !context.layout) {
      return false;
    }
    if (capabilities.needsBounds && !context.bounds) {
      return false;
    }
    if (capabilities.needsData && (!this.graph.data || this.graph.data.length === 0)) {
      return false;
    }

    return true;
  }

  /**
   * Configures the active plugin list for the graph instance.
   *
   * @param {Array<string|object>} [pluginEntries=[]] - Plugin declarations to activate.
   * @returns {void}
   */
  configure(pluginEntries = []) {
    const parsedEntries = pluginEntries
      .map(normalizePluginConfig)
      .filter(Boolean);

    const incomingIds = new Set(parsedEntries.map((entry) => entry.id));

    const seenIds = new Set();
    const normalized = parsedEntries
      .map((entry) => {
        const registeredPlugin = this.registry.getPlugin(entry.id);
        if (entry.plugin && registeredPlugin && registeredPlugin !== entry.plugin) {
          throw new Error(`Plugin id '${entry.id}' conflicts with a globally registered plugin.`);
        }

        const plugin = entry.plugin || registeredPlugin;
        if (!plugin) {
          throw new Error(`Unknown plugin: ${entry.id}`);
        }

        if (seenIds.has(plugin.id)) {
          throw new Error(`Duplicate plugin id in graph configuration: ${plugin.id}`);
        }
        seenIds.add(plugin.id);

        if (typeof __DEV__ === "undefined" || __DEV__) validatePluginContract(plugin);

        const options = deepMerge(plugin.defaults || {}, entry.options || {});
        return { plugin, options };
      });

    // Plugins capture options and resources in install() closures. Tear down
    // the current configuration before reinstalling it so reconfiguration
    // cannot duplicate listeners or leave stale commands behind.
    if (this.plugins.length > 0) {
      this.call("beforeDestroy", {});
    }
    for (const { plugin } of this.plugins) {
      this.graph.clearPluginCommands(plugin.id);
      if (!incomingIds.has(plugin.id)) {
        this.pluginStates.delete(plugin.id);
      }
    }

    this.plugins = normalized.some((r) => r.plugin.before?.length || r.plugin.after?.length)
      ? orderPlugins(normalized)
      : normalized.sort((a, b) => getPluginPriority(b.plugin) - getPluginPriority(a.plugin));

    for (const { plugin, options } of this.plugins) {
      if (!this.pluginStates.has(plugin.id)) {
        this.pluginStates.set(plugin.id, {});
      }
      const api = this.getPluginApi(plugin.id);

      if (typeof plugin.install === "function") {
        try {
          plugin.install(this.graph, options, api);
        } catch (error) {
          this._handlePluginError(plugin, "install", error, { options });
        }
      }

      const commandMap = normalizeCommandMap(plugin, options, api);
      for (const [commandName, commandDef] of Object.entries(commandMap)) {
        try {
          if (typeof commandDef === "function") {
            api.registerCommand(
              commandName,
              (payload) => commandDef(payload, this.graph, options, api),
              {
                description: `Declarative command from plugin ${plugin.id}`
              }
            );
            continue;
          }

          if (commandDef && typeof commandDef.handler === "function") {
            api.registerCommand(
              commandName,
              (payload) => commandDef.handler(payload, this.graph, options, api),
              commandDef.metadata || {}
            );
          }
        } catch (error) {
          this._handlePluginError(plugin, "registerCommand", error, { commandName });
        }
      }
    }
  }

  /**
   * Creates the plugin API exposed to install hooks, command handlers, and lifecycle callbacks.
   *
   * @param {string} pluginId - Id of the plugin receiving the API.
   * @returns {object}
   */
  getPluginApi(pluginId) {
    const host = this;
    return freeze({
      id: pluginId,
      getPluginState(id = pluginId) {
        return host.pluginStates.get(id);
      },
      setState(partialState) {
        const current = host.pluginStates.get(pluginId) || {};
        const nextState = { ...current, ...partialState };
        host.pluginStates.set(pluginId, nextState);
        host.call("onStateChange", {
          pluginId,
          previousState: current,
          nextState,
          partialState
        });
      },
      registerHook(hookName) {
        host.hookRegistry.register(hookName);
      },
      registerCommand(commandName, handler, metadata = {}) {
        return host.graph.registerCommand(commandName, handler, metadata, pluginId);
      },
      unregisterCommand(commandName) {
        host.graph.unregisterCommand(commandName);
      },
      listCommands() {
        return host.graph.listCommands();
      },
      executeCommand(commandName, payload) {
        return host.graph.executeCommand(commandName, payload);
      },
      requestRender() {
        host.graph.render({ force: true });
      },
      emit(hookName, context = {}) {
        if (hookName !== "onPluginEvent") {
          host.call("onPluginEvent", {
            pluginId,
            eventName: hookName,
            eventContext: context
          });
        }
        return host.call(hookName, context);
      },
      getOptions() {
        return host.graph.getOptions();
      },
      setOptions(opts) {
        host.graph.setOptions(opts);
      },
      getDomain() {
        return host.graph.getDomain();
      },
      setDomain(domain) {
        host.graph.setDomain(domain);
      },
      getPlugin(id) {
        return host.registry.getPlugin(id);
      },
      listPlugins() {
        return host.registry.listPlugins();
      }
    });
  }

  /**
   * Dispatches a hook to all configured plugins that can handle it.
   *
   * @param {string} hookName - Hook name to dispatch.
   * @param {Record<string, unknown>} [context={}] - Hook context payload.
   * @returns {boolean} False when a plugin cancels the phase; otherwise true.
   */
  call(hookName, context = {}) {
    if (!this.hookRegistry.has(hookName)) {
      return true;
    }

    context.hookName = hookName;

    for (const { plugin, options } of this.plugins) {
      if (!this._pluginCanRunForHook(plugin, hookName, context)) {
        continue;
      }

      const method = plugin.hooks && plugin.hooks[hookName];

      if (typeof method !== "function") {
        continue;
      }

      let result = true;
      try {
        result = method.call(plugin, this.graph, context, options, this.getPluginApi(plugin.id));
      } catch (error) {
        this._handlePluginError(plugin, `hook:${hookName}`, error, context);
        continue;
      }

      if (result === false) {
        return false;
      }
    }

    return true;
  }
}