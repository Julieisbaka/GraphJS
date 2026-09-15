import test from "node:test";
import assert from "node:assert/strict";

import { watermarkPlugin } from "../extensions/watermark/index.js";

function createHarness() {
  const calls = [];
  const commands = new Map();
  const graph = {
    options: { width: 200, height: 100 },
    ctx: {
      save() { calls.push(["save"]); },
      restore() { calls.push(["restore"]); },
      fillText(...args) { calls.push(["fillText", ...args]); }
    }
  };
  const api = {
    getOptions() { return graph.options; },
    registerCommand(name, handler) { commands.set(name, handler); return `watermark.${name}`; },
    requestRender() { calls.push(["render"]); }
  };
  const options = { ...watermarkPlugin.defaults };
  watermarkPlugin.install(graph, options, api);
  return { graph, api, options, calls, commands };
}

test("watermark afterRender draws using graph dimensions and plugin api", () => {
  const h = createHarness();

  assert.doesNotThrow(() => watermarkPlugin.hooks.afterRender(h.graph, {}, h.options, h.api));
  assert.deepEqual(h.calls, [
    ["save"],
    ["fillText", "graphjs", 188, 88],
    ["restore"]
  ]);
});

test("watermark afterRender skips drawing when disabled", () => {
  const h = createHarness();
  h.options.enabled = false;

  watermarkPlugin.hooks.afterRender(h.graph, {}, h.options, h.api);
  assert.deepEqual(h.calls, []);
});

test("watermark.setText updates text and enabled state", () => {
  const h = createHarness();
  const setText = h.commands.get("setText");

  const result = setText({ text: "staging", enabled: false });
  assert.deepEqual(result, { text: "staging", enabled: false });
  assert.deepEqual(h.calls, [["render"]]);
});
