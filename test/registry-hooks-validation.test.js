import test from "node:test";
import assert from "node:assert/strict";

import { Registry } from "../src/core/Registry.js";
import { HookRegistry, BUILTIN_HOOKS } from "../src/core/hooks.js";
import {
  validateDomain,
  validateGraphOptions,
  validatePluginContract
} from "../src/core/validation.js";
import { DEFAULT_OPTIONS } from "../src/core/defaults.js";
import { deepMerge } from "../src/core/utils.js";

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

test("Registry: register/get/list/unregister round-trip", () => {
  const reg = new Registry();
  const a = { id: "a" };
  const b = { id: "b" };

  reg.registerPlugin(a);
  reg.registerPlugin(b);

  assert.strictEqual(reg.getPlugin("a"), a);
  assert.strictEqual(reg.getPlugin("b"), b);
  assert.equal(reg.getPlugin("missing"), undefined);

  const list = reg.listPlugins();
  assert.equal(list.length, 2);
  assert.ok(list.includes(a));
  assert.ok(list.includes(b));

  reg.unregisterPlugin("a");
  assert.equal(reg.getPlugin("a"), undefined);
  assert.equal(reg.listPlugins().length, 1);
});

test("Registry: registerPlugin throws on invalid arguments in dev", () => {
  const reg = new Registry();
  assert.throws(() => reg.registerPlugin(null), /Plugin must be an object/);
  assert.throws(() => reg.registerPlugin("nope"), /Plugin must be an object/);
  assert.throws(() => reg.registerPlugin({}), /string id/);
  assert.throws(() => reg.registerPlugin({ id: 123 }), /string id/);
});

test("Registry: unregisterPlugin is a no-op for unknown ids", () => {
  const reg = new Registry();
  assert.doesNotThrow(() => reg.unregisterPlugin("never-registered"));
});

test("Registry: rejects registering a different plugin object under an existing id", () => {
  const reg = new Registry();
  const a1 = { id: "dup" };
  const a2 = { id: "dup" };

  reg.registerPlugin(a1);
  assert.throws(
    () => reg.registerPlugin(a2),
    /already registered/
  );
});

// ---------------------------------------------------------------------------
// HookRegistry
// ---------------------------------------------------------------------------

test("HookRegistry: built-in hooks are available by default", () => {
  const hooks = new HookRegistry();
  for (const name of BUILTIN_HOOKS) {
    assert.equal(hooks.has(name), true, `expected built-in hook ${name}`);
  }
  assert.equal(hooks.has("custom-hook"), false);
});

test("HookRegistry: register adds new hook names and list reflects them", () => {
  const hooks = new HookRegistry([]);
  assert.equal(hooks.list().length, 0);
  hooks.register("custom");
  assert.equal(hooks.has("custom"), true);
  assert.deepEqual(hooks.list(), ["custom"]);
});

test("HookRegistry: register validates hook name", () => {
  const hooks = new HookRegistry();
  assert.throws(() => hooks.register(""), /non-empty string/);
  assert.throws(() => hooks.register("   "), /non-empty string/);
  assert.throws(() => hooks.register(42), /non-empty string/);
  assert.throws(() => hooks.register(null), /non-empty string/);
});

// ---------------------------------------------------------------------------
// validateDomain
// ---------------------------------------------------------------------------

test("validateDomain: null and undefined are accepted", () => {
  assert.doesNotThrow(() => validateDomain(null));
  assert.doesNotThrow(() => validateDomain(undefined));
});

test("validateDomain: rejects non-object types", () => {
  assert.throws(() => validateDomain(42), /expected object or null/);
  assert.throws(() => validateDomain("nope"), /expected object or null/);
});

test("validateDomain: rejects non-finite values per axis", () => {
  assert.throws(() => validateDomain({ xMax: Number.POSITIVE_INFINITY }), /finite number/);
  assert.throws(() => validateDomain({ yMin: "0" }), /finite number/);
});

// ---------------------------------------------------------------------------
// validateGraphOptions
// ---------------------------------------------------------------------------

function makeOptions(overrides = {}) {
  return deepMerge(DEFAULT_OPTIONS, overrides);
}

test("validateGraphOptions: accepts default options", () => {
  assert.doesNotThrow(() => validateGraphOptions(makeOptions()));
});

test("validateGraphOptions: width and height must be positive numbers", () => {
  assert.throws(() => validateGraphOptions(makeOptions({ width: 0 })), /width: expected positive/);
  assert.throws(() => validateGraphOptions(makeOptions({ height: -10 })), /height: expected positive/);
});

test("validateGraphOptions: padding values must be non-negative numbers", () => {
  assert.throws(
    () => validateGraphOptions(makeOptions({ padding: { top: -1, right: 0, bottom: 0, left: 0 } })),
    /padding\.top/
  );
});

test("validateGraphOptions: sampling.maxPoints must be integer >= 2", () => {
  assert.throws(
    () => validateGraphOptions(makeOptions({ sampling: { enabled: false, maxPoints: 1, method: "stride" } })),
    /maxPoints/
  );
});

test("validateGraphOptions: sampling.method must be a non-empty trimmed string", () => {
  assert.throws(
    () => validateGraphOptions(makeOptions({ sampling: { enabled: false, maxPoints: 100, method: "  stride  " } })),
    /no surrounding whitespace/
  );
  assert.throws(
    () => validateGraphOptions(makeOptions({ sampling: { enabled: false, maxPoints: 100, method: "" } })),
    /sampling\.method/
  );
});

test("validateGraphOptions: series defaults are validated when present", () => {
  assert.throws(
    () => validateGraphOptions(makeOptions({ series: { type: "" } })),
    /series\.type/
  );
  assert.throws(
    () => validateGraphOptions(makeOptions({ series: { color: "" } })),
    /series\.color/
  );
  assert.throws(
    () => validateGraphOptions(makeOptions({ series: { lineWidth: 0 } })),
    /series\.lineWidth/
  );
  assert.throws(
    () => validateGraphOptions(makeOptions({ series: { pointRadius: -1 } })),
    /series\.pointRadius/
  );
});

test("validateGraphOptions: pluginErrorBoundary.onError must be a function when provided", () => {
  assert.throws(
    () => validateGraphOptions(makeOptions({ pluginErrorBoundary: { enabled: true, onError: "not-a-fn" } })),
    /onError: expected function/
  );
});

// ---------------------------------------------------------------------------
// validatePluginContract
// ---------------------------------------------------------------------------

test("validatePluginContract: requires an object with a non-empty string id", () => {
  assert.throws(() => validatePluginContract(null), /Plugin must be an object/);
  assert.throws(() => validatePluginContract({}), /plugin\.id/);
  assert.throws(() => validatePluginContract({ id: "   " }), /plugin\.id/);
});

test("validatePluginContract: before/after must be arrays when provided", () => {
  assert.throws(
    () => validatePluginContract({ id: "p", before: "not-array" }),
    /before expected array/
  );
  assert.throws(
    () => validatePluginContract({ id: "p", after: 42 }),
    /after expected array/
  );
  assert.doesNotThrow(() => validatePluginContract({ id: "p", before: [], after: [] }));
});

test("validatePluginContract: capabilities and capabilities.hooks shape", () => {
  assert.throws(
    () => validatePluginContract({ id: "p", capabilities: "nope" }),
    /capabilities expected object/
  );
  assert.throws(
    () => validatePluginContract({ id: "p", capabilities: { hooks: "nope" } }),
    /capabilities\.hooks expected array/
  );
  assert.doesNotThrow(() =>
    validatePluginContract({ id: "p", capabilities: { hooks: ["beforeRender"] } })
  );
});
