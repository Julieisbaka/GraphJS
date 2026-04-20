import test from "node:test";
import assert from "node:assert/strict";

import { PluginHost } from "../src/core/PluginHost.js";
import { Registry } from "../src/core/Registry.js";
import { HookRegistry } from "../src/core/hooks.js";

function createGraphStub(extra = {}) {
  const commands = new Map();
  return {
    options: { pluginErrorBoundary: { enabled: true, onError: null } },
    data: [],
    renderCalls: 0,
    render() { this.renderCalls += 1; },
    getOptions() { return this.options; },
    setOptions(o) { this.options = { ...this.options, ...o }; },
    getDomain() { return this.options.domain ?? null; },
    setDomain(d) { this.options.domain = d; },
    registerCommand(name, handler, metadata = {}, pluginId = null) {
      const normalized = pluginId && !name.includes(".") ? `${pluginId}.${name}` : name;
      commands.set(normalized, { name: normalized, pluginId, metadata, handler });
      return normalized;
    },
    unregisterCommand(name) { commands.delete(name); },
    clearPluginCommands(pluginId) {
      for (const [n, e] of commands.entries()) if (e.pluginId === pluginId) commands.delete(n);
    },
    listCommands() {
      return [...commands.values()].map(({ handler, ...rest }) => rest);
    },
    executeCommand(name, payload) {
      return commands.get(name).handler(payload, this);
    },
    ...extra
  };
}

// ---------------------------------------------------------------------------
// normalizePluginConfig (covered indirectly via configure)
// ---------------------------------------------------------------------------

test("PluginHost.configure: accepts object-with-id entry shape", () => {
  const registry = new Registry();
  const hooks = new HookRegistry();
  const graph = createGraphStub();
  const host = new PluginHost(graph, registry, hooks);

  let installed = false;
  // Direct object with `id` — no separate `plugin` key.
  host.configure([{ id: "inline", install() { installed = true; } }]);
  assert.equal(installed, true);
});

test("PluginHost.configure: accepts {plugin, options} shape and merges defaults", () => {
  const registry = new Registry();
  const hooks = new HookRegistry();
  const graph = createGraphStub();
  const host = new PluginHost(graph, registry, hooks);

  let received = null;
  host.configure([
    {
      plugin: {
        id: "with-defaults",
        defaults: { foo: 1, nested: { a: 1, b: 2 } },
        install(_g, options) { received = options; }
      },
      options: { nested: { b: 99 } }
    }
  ]);
  assert.deepEqual(received, { foo: 1, nested: { a: 1, b: 99 } });
});

test("PluginHost.configure: throws when entry has neither id nor plugin", () => {
  const registry = new Registry();
  const hooks = new HookRegistry();
  const graph = createGraphStub();
  const host = new PluginHost(graph, registry, hooks);

  assert.throws(() => host.configure([{ random: true }]), /Invalid plugin declaration/);
});

test("PluginHost.configure: throws Unknown plugin when id is not in registry", () => {
  const registry = new Registry();
  const hooks = new HookRegistry();
  const graph = createGraphStub();
  const host = new PluginHost(graph, registry, hooks);

  assert.throws(() => host.configure(["never-registered"]), /Unknown plugin: never-registered/);
});

test("PluginHost.configure: skips falsy entries and tolerates empty input", () => {
  const registry = new Registry();
  const hooks = new HookRegistry();
  const graph = createGraphStub();
  const host = new PluginHost(graph, registry, hooks);

  assert.doesNotThrow(() => host.configure([null, undefined]));
  assert.equal(host.plugins.length, 0);
});

// ---------------------------------------------------------------------------
// Plugin ordering (priority + before/after)
// ---------------------------------------------------------------------------

test("PluginHost.configure: orders plugins by priority when no before/after deps", () => {
  const registry = new Registry();
  const hooks = new HookRegistry();
  const graph = createGraphStub();
  const host = new PluginHost(graph, registry, hooks);

  const order = [];
  host.configure([
    { id: "low", priority: 1, install() { order.push("low"); } },
    { id: "high", priority: 100, install() { order.push("high"); } },
    { id: "mid", priority: 50, install() { order.push("mid"); } }
  ]);
  assert.deepEqual(order, ["high", "mid", "low"]);
});

test("PluginHost.configure: cyclic before/after falls back to priority order", () => {
  const registry = new Registry();
  const hooks = new HookRegistry();
  const graph = createGraphStub();
  const host = new PluginHost(graph, registry, hooks);

  // a after b, b after a → cycle
  const order = [];
  host.configure([
    { id: "a", after: ["b"], priority: 1, install() { order.push("a"); } },
    { id: "b", after: ["a"], priority: 5, install() { order.push("b"); } }
  ]);
  // No assertion of exact order matters — just that configure didn't hang and
  // both plugins installed in priority order.
  assert.equal(order.length, 2);
  assert.equal(order[0], "b");
});

test("PluginHost.configure: before:[knownId] forces the current plugin to run first", () => {
  const registry = new Registry();
  const hooks = new HookRegistry();
  const graph = createGraphStub();
  const host = new PluginHost(graph, registry, hooks);

  const order = [];
  // Without the `before:["b"]` directive, equal priority would order by array order.
  // With it, "a" must precede "b" (a's hooks run before b's).
  host.configure([
    { id: "b", hooks: { beforeRender() { order.push("b"); } } },
    { id: "a", before: ["b"], hooks: { beforeRender() { order.push("a"); } } }
  ]);

  host.call("beforeRender", { layout: {}, bounds: {} });
  assert.deepEqual(order, ["a", "b"]);
});

test("PluginHost.configure: ignores after:[unknownId] references", () => {
  const registry = new Registry();
  const hooks = new HookRegistry();
  const graph = createGraphStub();
  const host = new PluginHost(graph, registry, hooks);

  const order = [];
  assert.doesNotThrow(() =>
    host.configure([
      { id: "a", after: ["does-not-exist"], install() { order.push("a"); } },
      { id: "b", install() { order.push("b"); } }
    ])
  );
  assert.equal(order.length, 2);
});

test("PluginHost.configure: duplicate before/after entries are deduped", () => {
  const registry = new Registry();
  const hooks = new HookRegistry();
  const graph = createGraphStub();
  const host = new PluginHost(graph, registry, hooks);

  // Listing the same dep twice should not double-increment the indegree counter
  // (covers the `if (!outgoing.get(...).has(...))` guard).
  const order = [];
  host.configure([
    { id: "a", before: ["b", "b"], hooks: { beforeRender() { order.push("a"); } } },
    { id: "b", after: ["a", "a"], hooks: { beforeRender() { order.push("b"); } } }
  ]);
  host.call("beforeRender", { layout: {}, bounds: {} });
  assert.deepEqual(order, ["a", "b"]);
});

// ---------------------------------------------------------------------------
// Capability gating
// ---------------------------------------------------------------------------

test("PluginHost.call: capabilities.hooks gates which hooks are invoked", () => {
  const registry = new Registry();
  const hooks = new HookRegistry();
  const graph = createGraphStub();
  const host = new PluginHost(graph, registry, hooks);

  const calls = [];
  host.configure([
    {
      id: "p",
      capabilities: { hooks: ["beforeRender"] },
      hooks: {
        beforeRender() { calls.push("beforeRender"); },
        afterRender() { calls.push("afterRender"); }
      }
    }
  ]);

  host.call("beforeRender", { layout: {}, bounds: {} });
  host.call("afterRender", { layout: {}, bounds: {} });
  assert.deepEqual(calls, ["beforeRender"]);
});

test("PluginHost.call: needsLayout / needsData gate plugin execution", () => {
  const registry = new Registry();
  const hooks = new HookRegistry();
  const graph = createGraphStub();
  const host = new PluginHost(graph, registry, hooks);

  let layoutCalls = 0;
  let dataCalls = 0;
  host.configure([
    { id: "needsLayout", capabilities: { needsLayout: true }, hooks: { beforeRender() { layoutCalls += 1; } } },
    { id: "needsData", capabilities: { needsData: true }, hooks: { beforeRender() { dataCalls += 1; } } }
  ]);

  // No layout, no data → both gated off
  host.call("beforeRender", {});
  assert.equal(layoutCalls, 0);
  assert.equal(dataCalls, 0);

  // Provide layout but still no data
  host.call("beforeRender", { layout: { left: 0 } });
  assert.equal(layoutCalls, 1);
  assert.equal(dataCalls, 0);

  // Provide data
  graph.data = [{ points: [] }];
  host.call("beforeRender", { layout: { left: 0 } });
  assert.equal(layoutCalls, 2);
  assert.equal(dataCalls, 1);
});

// ---------------------------------------------------------------------------
// Hook short-circuiting
// ---------------------------------------------------------------------------

test("PluginHost.call: a plugin returning false halts further plugins", () => {
  const registry = new Registry();
  const hooks = new HookRegistry();
  const graph = createGraphStub();
  const host = new PluginHost(graph, registry, hooks);

  const calls = [];
  host.configure([
    { id: "first", priority: 100, hooks: { beforeRender() { calls.push("first"); return false; } } },
    { id: "second", priority: 1, hooks: { beforeRender() { calls.push("second"); } } }
  ]);

  const result = host.call("beforeRender", { layout: {}, bounds: {} });
  assert.equal(result, false);
  assert.deepEqual(calls, ["first"]);
});

test("PluginHost.call: returns true when hookName is not registered", () => {
  const registry = new Registry();
  const hooks = new HookRegistry();
  const graph = createGraphStub();
  const host = new PluginHost(graph, registry, hooks);

  let called = false;
  host.configure([{ id: "x", hooks: { unknownHook() { called = true; } } }]);
  assert.equal(host.call("unknownHook"), true);
  assert.equal(called, false);
});

test("PluginHost.call: skips plugins whose hook is not a function", () => {
  const registry = new Registry();
  const hooks = new HookRegistry();
  const graph = createGraphStub();
  const host = new PluginHost(graph, registry, hooks);

  host.configure([{ id: "x", hooks: { beforeRender: "not-a-function" } }]);
  assert.doesNotThrow(() => host.call("beforeRender", { layout: {}, bounds: {} }));
});

// ---------------------------------------------------------------------------
// Errors during install / registerCommand
// ---------------------------------------------------------------------------

test("PluginHost.configure: install errors are routed through error boundary", () => {
  const registry = new Registry();
  const hooks = new HookRegistry();
  const graph = createGraphStub();
  let captured = null;
  graph.options.pluginErrorBoundary = {
    enabled: true,
    onError(args) { captured = args; }
  };
  const host = new PluginHost(graph, registry, hooks);

  assert.doesNotThrow(() =>
    host.configure([{ id: "boom", install() { throw new Error("install failed"); } }])
  );
  assert.equal(captured.pluginId, "boom");
  assert.equal(captured.phase, "install");
  assert.match(captured.error.message, /install failed/);
});

test("PluginHost.configure: command-registration errors are routed through error boundary", () => {
  const registry = new Registry();
  const hooks = new HookRegistry();
  const graph = createGraphStub();
  let captured = null;
  graph.options.pluginErrorBoundary = {
    enabled: true,
    onError(args) { captured = args; }
  };
  // Make registerCommand fail.
  graph.registerCommand = () => { throw new Error("reg fail"); };

  const host = new PluginHost(graph, registry, hooks);
  assert.doesNotThrow(() =>
    host.configure([{ id: "p", commands: { ping() { return 1; } } }])
  );
  assert.equal(captured.pluginId, "p");
  assert.equal(captured.phase, "registerCommand");
});

// ---------------------------------------------------------------------------
// Commands as a function
// ---------------------------------------------------------------------------

test("PluginHost.configure: commands declared as a function are evaluated with (plugin, options, api)", () => {
  const registry = new Registry();
  const hooks = new HookRegistry();
  const graph = createGraphStub();
  const host = new PluginHost(graph, registry, hooks);

  let receivedApi = null;
  host.configure([
    {
      id: "fn-commands",
      commands(_plugin, _options, api) {
        receivedApi = api;
        return { greet: () => "hi" };
      }
    }
  ]);
  assert.ok(receivedApi);
  assert.equal(receivedApi.id, "fn-commands");
  assert.equal(graph.executeCommand("fn-commands.greet"), "hi");
});

test("PluginHost.configure: commands function returning non-object yields no commands", () => {
  const registry = new Registry();
  const hooks = new HookRegistry();
  const graph = createGraphStub();
  const host = new PluginHost(graph, registry, hooks);
  host.configure([{ id: "no-commands", commands() { return null; } }]);
  assert.equal(graph.listCommands().length, 0);
});

// ---------------------------------------------------------------------------
// Plugin API surface
// ---------------------------------------------------------------------------

test("PluginHost.getPluginApi: setState and getPluginState round-trip per plugin", () => {
  const registry = new Registry();
  const hooks = new HookRegistry();
  const graph = createGraphStub();
  const host = new PluginHost(graph, registry, hooks);
  host.configure([
    { id: "a" },
    { id: "b" }
  ]);

  const apiA = host.getPluginApi("a");
  const apiB = host.getPluginApi("b");

  apiA.setState({ value: 1 });
  apiB.setState({ value: 2 });

  assert.deepEqual(apiA.getPluginState(), { value: 1 });
  assert.deepEqual(apiB.getPluginState(), { value: 2 });
  // cross-plugin lookup
  assert.deepEqual(apiA.getPluginState("b"), { value: 2 });
});

test("PluginHost.getPluginApi: registerCommand attaches plugin id and unregisterCommand removes it", () => {
  const registry = new Registry();
  const hooks = new HookRegistry();
  const graph = createGraphStub();
  const host = new PluginHost(graph, registry, hooks);
  host.configure([{ id: "p" }]);

  const api = host.getPluginApi("p");
  const name = api.registerCommand("ping", () => "pong");
  assert.equal(name, "p.ping");
  assert.equal(graph.executeCommand("p.ping"), "pong");

  api.unregisterCommand("p.ping");
  assert.equal(graph.listCommands().length, 0);
});

test("PluginHost.getPluginApi: registerHook adds a hook to the registry", () => {
  const registry = new Registry();
  const hooks = new HookRegistry();
  const graph = createGraphStub();
  const host = new PluginHost(graph, registry, hooks);
  host.configure([{ id: "p" }]);

  const api = host.getPluginApi("p");
  assert.equal(hooks.has("custom-hook"), false);
  api.registerHook("custom-hook");
  assert.equal(hooks.has("custom-hook"), true);
});

test("PluginHost.getPluginApi: requestRender, getOptions/setOptions, getDomain/setDomain, emit, getPlugin", () => {
  const registry = new Registry();
  const hooks = new HookRegistry();
  const graph = createGraphStub();
  const host = new PluginHost(graph, registry, hooks);
  registry.registerPlugin({ id: "registered" });
  host.configure([{ id: "p" }]);

  const api = host.getPluginApi("p");
  api.requestRender();
  assert.equal(graph.renderCalls, 1);

  api.setOptions({ background: "#abc" });
  assert.equal(api.getOptions().background, "#abc");

  api.setDomain({ xMin: 0, xMax: 1 });
  assert.deepEqual(api.getDomain(), { xMin: 0, xMax: 1 });

  // emit just delegates to host.call
  assert.equal(api.emit("never-registered-hook"), true);

  const found = api.getPlugin("registered");
  assert.equal(found.id, "registered");
});

test("PluginHost.configure: clears commands for plugins removed on reconfigure", () => {
  const registry = new Registry();
  const hooks = new HookRegistry();
  const graph = createGraphStub();
  const host = new PluginHost(graph, registry, hooks);

  host.configure([
    { id: "keep", commands: { a: () => 1 } },
    { id: "remove", commands: { b: () => 2 } }
  ]);
  assert.equal(graph.listCommands().length, 2);

  host.configure([{ id: "keep", commands: { a: () => 1 } }]);
  // Only the kept plugin's commands remain.
  const names = graph.listCommands().map((c) => c.name).sort();
  assert.deepEqual(names, ["keep.a"]);
});

// ---------------------------------------------------------------------------
// Error boundary configure
// ---------------------------------------------------------------------------

test("PluginHost.configureErrorBoundary: forwards settings to internal boundary", () => {
  const registry = new Registry();
  const hooks = new HookRegistry();
  const graph = createGraphStub();
  const host = new PluginHost(graph, registry, hooks);

  let captured = null;
  host.configureErrorBoundary({
    enabled: true,
    onError(args) { captured = args; }
  });
  host.configure([
    { id: "boom", hooks: { beforeRender() { throw new Error("x"); } } }
  ]);
  host.call("beforeRender", { layout: {}, bounds: {} });
  assert.equal(captured.pluginId, "boom");
});
