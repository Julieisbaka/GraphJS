import { deepMerge } from "./utils.js";
import { validatePluginContract } from "./validation.js";
import { ErrorBoundary } from "./ErrorBoundary.js";

const HOOK_CONTEXT_VERSION = 1;

function getPluginPriority(plugin) {
  return Number.isFinite(plugin.priority) ? plugin.priority : 0;
}

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

export class PluginHost {
  constructor(graph, registry, hookRegistry) {
    this.graph = graph;
    this.registry = registry;
    this.hookRegistry = hookRegistry;
    this.plugins = [];
    this.pluginStates = new Map();
    this._errorBoundary = new ErrorBoundary(graph.options?.pluginErrorBoundary ?? {});
  }

  configureErrorBoundary(settings) {
    this._errorBoundary.configure(settings);
  }

  _handlePluginError(plugin, phase, error, context = {}) {
    this._errorBoundary.handle(plugin.id, phase, error, context);
  }

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

  configure(pluginEntries = []) {
    const incomingIds = new Set(
      pluginEntries
        .map(normalizePluginConfig)
        .filter(Boolean)
        .map((entry) => entry.id)
    );

    for (const existingPluginId of this.pluginStates.keys()) {
      if (!incomingIds.has(existingPluginId)) {
        this.graph.clearPluginCommands(existingPluginId);
      }
    }

    const normalized = pluginEntries
      .map(normalizePluginConfig)
      .filter(Boolean)
      .map((entry) => {
        const plugin = entry.plugin || this.registry.getPlugin(entry.id);
        if (!plugin) {
          throw new Error(`Unknown plugin: ${entry.id}`);
        }

        validatePluginContract(plugin);

        const options = deepMerge(plugin.defaults || {}, entry.options || {});
        return { plugin, options };
      });

    this.plugins = orderPlugins(normalized);

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

  getPluginApi(pluginId) {
    const host = this;
    return Object.freeze({
      id: pluginId,
      getPluginState(id = pluginId) {
        return host.pluginStates.get(id);
      },
      setState(partialState) {
        const current = host.pluginStates.get(pluginId) || {};
        host.pluginStates.set(pluginId, { ...current, ...partialState });
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
      }
    });
  }

  call(hookName, context = {}) {
    if (!this.hookRegistry.has(hookName)) {
      return true;
    }

    const hookContext = {
      ...context,
      hookName,
      contextVersion: HOOK_CONTEXT_VERSION
    };

    for (const { plugin, options } of this.plugins) {
      if (!this._pluginCanRunForHook(plugin, hookName, hookContext)) {
        continue;
      }

      const method = plugin.hooks && plugin.hooks[hookName];

      if (typeof method !== "function") {
        continue;
      }

      let result = true;
      try {
        result = method.call(plugin, this.graph, hookContext, options, this.getPluginApi(plugin.id));
      } catch (error) {
        this._handlePluginError(plugin, `hook:${hookName}`, error, hookContext);
        continue;
      }

      if (result === false) {
        return false;
      }
    }

    return true;
  }
}