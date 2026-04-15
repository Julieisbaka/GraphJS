import test from "node:test";
import assert from "node:assert/strict";

import { PluginHost } from "../src/core/PluginHost.js";
import { Registry } from "../src/core/Registry.js";
import { HookRegistry } from "../src/core/hooks.js";

function createGraphStub() {
  const commands = new Map();
  const graph = {
    options: {
      pluginErrorBoundary: {
        enabled: true,
        onError: null
      }
    },
    data: [],
    clearPluginCommandsCalls: [],
    registerCommand(commandName, handler, metadata = {}, pluginId = null) {
      const normalizedName = pluginId && !commandName.includes(".")
        ? `${pluginId}.${commandName}`
        : commandName;

      commands.set(normalizedName, {
        name: normalizedName,
        pluginId,
        metadata,
        handler
      });

      return normalizedName;
    },
    unregisterCommand(commandName) {
      commands.delete(commandName);
    },
    clearPluginCommands(pluginId) {
      this.clearPluginCommandsCalls.push(pluginId);
      for (const [name, entry] of commands.entries()) {
        if (entry.pluginId === pluginId) {
          commands.delete(name);
        }
      }
    },
    listCommands() {
      return [...commands.values()].map((entry) => ({
        name: entry.name,
        pluginId: entry.pluginId,
        metadata: entry.metadata
      }));
    },
    executeCommand(commandName, payload = undefined) {
      const command = commands.get(commandName);
      if (!command) {
        throw new Error(`Unknown command: ${commandName}`);
      }
      return command.handler(payload, this);
    }
  };

  return graph;
}

test("PluginHost orders plugins and injects hook context metadata", () => {
  const registry = new Registry();
  const hooks = new HookRegistry();
  const graph = createGraphStub();
  const host = new PluginHost(graph, registry, hooks);

  const order = [];

  registry.registerPlugin({
    id: "a",
    after: ["b"],
    hooks: {
      beforeRender(_graph, context) {
        order.push(`a:${context.hookName}`);
      }
    }
  });

  registry.registerPlugin({
    id: "b",
    hooks: {
      beforeRender(_graph, context) {
        order.push(`b:${context.hookName}`);
      }
    }
  });

  host.configure(["a", "b"]);
  host.call("beforeRender", {
    layout: { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 },
    bounds: { xMin: 0, xMax: 10, yMin: 0, yMax: 10 }
  });

  assert.deepEqual(order, [
    "b:beforeRender",
    "a:beforeRender"
  ]);
});

test("PluginHost registers declarative commands and preserves metadata", () => {
  const registry = new Registry();
  const hooks = new HookRegistry();
  const graph = createGraphStub();
  const host = new PluginHost(graph, registry, hooks);

  registry.registerPlugin({
    id: "cmd-plugin",
    commands: {
      ping(payload) {
        return { ok: true, payload };
      },
      withMeta: {
        handler(payload) {
          return { payload, typed: true };
        },
        metadata: {
          description: "Command with custom metadata",
          argsExample: { value: 1 }
        }
      }
    }
  });

  host.configure(["cmd-plugin"]);

  const commands = graph.listCommands();
  const ping = commands.find((c) => c.name === "cmd-plugin.ping");
  const withMeta = commands.find((c) => c.name === "cmd-plugin.withMeta");

  assert.ok(ping);
  assert.equal(ping.metadata.description, "Declarative command from plugin cmd-plugin");

  assert.ok(withMeta);
  assert.equal(withMeta.metadata.description, "Command with custom metadata");

  const result = graph.executeCommand("cmd-plugin.ping", 123);
  assert.deepEqual(result, { ok: true, payload: 123 });
});

test("PluginHost clears plugin commands when plugin is removed and respects capability gating", () => {
  const registry = new Registry();
  const hooks = new HookRegistry();
  const graph = createGraphStub();
  const host = new PluginHost(graph, registry, hooks);

  let guardedHookCallCount = 0;

  registry.registerPlugin({
    id: "gated-plugin",
    capabilities: {
      needsBounds: true
    },
    commands: {
      ping(payload) {
        return payload;
      }
    },
    hooks: {
      beforeRender() {
        guardedHookCallCount += 1;
      }
    }
  });

  host.configure(["gated-plugin"]);

  host.call("beforeRender", { layout: { left: 0, top: 0, right: 10, bottom: 10, width: 10, height: 10 } });
  assert.equal(guardedHookCallCount, 0);

  host.call("beforeRender", {
    layout: { left: 0, top: 0, right: 10, bottom: 10, width: 10, height: 10 },
    bounds: { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }
  });
  assert.equal(guardedHookCallCount, 1);

  host.configure([]);
  assert.deepEqual(graph.clearPluginCommandsCalls, ["gated-plugin"]);
  assert.equal(graph.listCommands().length, 0);
});

test("PluginHost error boundary swallows plugin hook errors when enabled and calls onError", () => {
  const registry = new Registry();
  const hooks = new HookRegistry();
  const graph = createGraphStub();

  let onErrorCalls = 0;
  graph.options.pluginErrorBoundary = {
    enabled: true,
    onError(args) {
      onErrorCalls += 1;
      assert.equal(args.pluginId, "faulty-plugin");
      assert.equal(args.phase, "hook:beforeRender");
      assert.ok(args.error instanceof Error);
    }
  };

  const host = new PluginHost(graph, registry, hooks);

  registry.registerPlugin({
    id: "faulty-plugin",
    hooks: {
      beforeRender() {
        throw new Error("boom");
      }
    }
  });

  host.configure(["faulty-plugin"]);

  assert.doesNotThrow(() => {
    host.call("beforeRender", {
      layout: { left: 0, top: 0, right: 1, bottom: 1, width: 1, height: 1 },
      bounds: { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }
    });
  });

  assert.equal(onErrorCalls, 1);
});

test("PluginHost error boundary rethrows plugin hook errors when disabled", () => {
  const registry = new Registry();
  const hooks = new HookRegistry();
  const graph = createGraphStub();

  graph.options.pluginErrorBoundary = {
    enabled: false,
    onError: null
  };

  const host = new PluginHost(graph, registry, hooks);

  registry.registerPlugin({
    id: "faulty-plugin",
    hooks: {
      beforeRender() {
        throw new Error("explode");
      }
    }
  });

  host.configure(["faulty-plugin"]);

  assert.throws(
    () => {
      host.call("beforeRender", {
        layout: { left: 0, top: 0, right: 1, bottom: 1, width: 1, height: 1 },
        bounds: { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }
      });
    },
    /explode/
  );
});
