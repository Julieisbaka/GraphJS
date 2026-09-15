import test from "node:test";
import assert from "node:assert/strict";

import {
  adaptiveDateTimeFormat,
  formatTimestamp,
  getTickCount,
  selectNonOverlapping,
  timeScalePlugin
} from "../extensions/time-scale/index.js";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function createHarness(options = {}) {
  const calls = [];
  const commands = new Map();
  const graph = {
    ctx: {
      save() { calls.push(["save"]); },
      restore() { calls.push(["restore"]); },
      beginPath() { calls.push(["beginPath"]); },
      moveTo(...args) { calls.push(["moveTo", ...args]); },
      lineTo(...args) { calls.push(["lineTo", ...args]); },
      stroke() { calls.push(["stroke"]); },
      fillText(...args) { calls.push(["fillText", ...args]); },
      measureText(text) { return { width: String(text).length * 10 }; }
    }
  };
  const api = {
    registerCommand(name, handler) { commands.set(name, handler); return `time-scale.${name}`; },
    requestRender() { calls.push(["render"]); }
  };
  const resolved = { ...timeScalePlugin.defaults, ...options };
  timeScalePlugin.install(graph, resolved, api);
  return { graph, api, options: resolved, calls, commands };
}

test("time scale derives adaptive formats from the visible range", () => {
  assert.deepEqual(adaptiveDateTimeFormat(30 * 1000), { minute: "2-digit", second: "2-digit" });
  assert.equal(adaptiveDateTimeFormat(2 * HOUR).hour, "2-digit");
  assert.deepEqual(adaptiveDateTimeFormat(400 * DAY), { year: "numeric" });
});

test("time scale computes automatic tick density from plot width", () => {
  assert.equal(getTickCount({ ticks: "auto", maxTicks: 12, minLabelSpacing: 50 }, 100), 2);
  assert.equal(getTickCount({ ticks: "auto", maxTicks: 12, minLabelSpacing: 50 }, 700), 12);
  assert.equal(getTickCount({ ticks: 6, maxTicks: 12, minLabelSpacing: 50 }, 100), 6);
});

test("time scale honors UTC and named timezone formatting", () => {
  const value = Date.UTC(2024, 0, 1, 12, 0, 0);
  const utc = formatTimestamp(value, "en-US", { hour: "numeric", hour12: false }, "UTC", 60 * 60 * 1000);
  const losAngeles = formatTimestamp(value, "en-US", { hour: "numeric", hour12: false }, "America/Los_Angeles", 60 * 60 * 1000);
  assert.notEqual(utc, losAngeles);
});

test("time scale suppresses overlapping labels while preserving endpoints", () => {
  const labels = [0, 25, 50, 75, 100].map((x, index) => ({ x, text: `long-label-${index}`, width: 60 }));
  const selected = selectNonOverlapping(labels, 0);
  assert.equal(selected[0].x, 0);
  assert.equal(selected.at(-1).x, 100);
  assert.ok(selected.length < labels.length);
});

test("time scale renders adaptive labels and updates options through its command", () => {
  const h = createHarness({ ticks: "auto", minLabelSpacing: 20 });
  timeScalePlugin.hooks.afterRender(h.graph, {
    layout: { left: 0, right: 120, width: 120, top: 0, bottom: 80, height: 80 },
    bounds: { xMin: 0, xMax: 86_400_000, yMin: 0, yMax: 1 }
  }, h.options);

  const fillCalls = h.calls.filter(([name]) => name === "fillText");
  assert.ok(fillCalls.length >= 2);

  const result = h.commands.get("set")({ ticks: "auto", timeZone: "UTC", minLabelSpacing: 30 });
  assert.equal(result.timeZone, "UTC");
  assert.equal(h.options.minLabelSpacing, 30);
  assert.equal(h.calls.at(-1)[0], "render");
});

