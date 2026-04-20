import test from "node:test";
import assert from "node:assert/strict";

import {
  isPlainObject,
  deepMerge,
  clamp,
  resolveCanvas,
  getDevicePixelRatio,
  normalizeSeriesData,
  getDataBounds,
  deepFreeze,
  decimatePointsStride,
  makeLinearScale,
  invertLinearScale,
  clampBounds,
  applyDomainOverride,
  filterVisibleSeries
} from "../src/core/utils.js";

test("isPlainObject: true only for plain object literals", () => {
  assert.equal(isPlainObject({}), true);
  assert.equal(isPlainObject({ a: 1 }), true);
  assert.equal(isPlainObject([]), false);
  assert.equal(isPlainObject(null), false);
  assert.equal(isPlainObject(undefined), false);
  assert.equal(isPlainObject("s"), false);
  assert.equal(isPlainObject(42), false);
  assert.equal(isPlainObject(new Date()), false);
});

test("deepMerge: returns shallow copy when no source", () => {
  const target = { a: 1, b: { c: 2 } };
  const out = deepMerge(target);
  assert.deepEqual(out, target);
  assert.notStrictEqual(out, target);
});

test("deepMerge: nested objects are merged recursively, primitives override", () => {
  const target = { a: 1, nested: { x: 1, y: 2 } };
  const source = { a: 10, nested: { y: 99, z: 3 } };
  const out = deepMerge(target, source);
  assert.deepEqual(out, { a: 10, nested: { x: 1, y: 99, z: 3 } });
});

test("deepMerge: arrays are copied (sliced), not merged", () => {
  const target = { list: [1, 2, 3] };
  const source = { list: [9, 8] };
  const out = deepMerge(target, source);
  assert.deepEqual(out.list, [9, 8]);
  assert.notStrictEqual(out.list, source.list);
});

test("deepMerge: source object replaces non-object target value", () => {
  const out = deepMerge({ a: 1 }, { a: { b: 2 } });
  assert.deepEqual(out, { a: { b: 2 } });
});

test("deepMerge: defaults work with no arguments", () => {
  assert.deepEqual(deepMerge(), {});
});

test("clamp: returns value within bounds, otherwise the bound", () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-1, 0, 10), 0);
  assert.equal(clamp(11, 0, 10), 10);
  assert.equal(clamp(0, 0, 0), 0);
});

test("resolveCanvas: throws on empty target", () => {
  assert.throws(() => resolveCanvas(undefined), /canvas target is required/);
  assert.throws(() => resolveCanvas(""), /canvas target is required/);
  assert.throws(() => resolveCanvas(null), /canvas target is required/);
});

test("resolveCanvas: returns the element when a canvas object is passed", () => {
  const canvas = { tag: "canvas" };
  assert.strictEqual(resolveCanvas(canvas), canvas);
});

test("resolveCanvas: queries the document when given a selector", () => {
  const fakeNode = { isFake: true };
  const previousDoc = globalThis.document;
  globalThis.document = {
    querySelector(selector) {
      return selector === "#chart" ? fakeNode : null;
    }
  };
  try {
    assert.strictEqual(resolveCanvas("#chart"), fakeNode);
    assert.throws(() => resolveCanvas("#missing"), /Could not find canvas with selector: #missing/);
  } finally {
    globalThis.document = previousDoc;
  }
});

test("getDevicePixelRatio: returns 1 in non-browser environments", () => {
  // Node test runner has no `window`; ensure default is 1.
  const previousWindow = globalThis.window;
  // eslint-disable-next-line no-undef
  delete globalThis.window;
  try {
    assert.equal(getDevicePixelRatio(), 1);
  } finally {
    if (previousWindow !== undefined) globalThis.window = previousWindow;
  }
});

test("getDevicePixelRatio: returns window.devicePixelRatio when present", () => {
  const previousWindow = globalThis.window;
  globalThis.window = { devicePixelRatio: 2.5 };
  try {
    assert.equal(getDevicePixelRatio(), 2.5);
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
});

test("getDevicePixelRatio: falls back to 1 when devicePixelRatio is falsy", () => {
  const previousWindow = globalThis.window;
  globalThis.window = { devicePixelRatio: 0 };
  try {
    assert.equal(getDevicePixelRatio(), 1);
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
});

test("normalizeSeriesData: throws when input is not an array", () => {
  assert.throws(() => normalizeSeriesData(null), /Data must be an array/);
  assert.throws(() => normalizeSeriesData({}), /Data must be an array/);
  assert.throws(() => normalizeSeriesData("nope"), /Data must be an array/);
});

test("normalizeSeriesData: tolerates null entries and missing points", () => {
  const out = normalizeSeriesData([null, {}, { points: null }]);
  assert.equal(out.length, 3);
  for (const s of out) {
    assert.deepEqual(s.points, []);
    assert.equal(s.visible, true);
  }
  assert.equal(out[0].id, "series_0");
  assert.equal(out[1].id, "series_1");
});

test("normalizeSeriesData: converts point coordinates to numbers", () => {
  const [series] = normalizeSeriesData([{ points: [{ x: "1", y: "2.5" }] }]);
  assert.deepEqual(series.points, [{ x: 1, y: 2.5 }]);
});

test("normalizeSeriesData: respects explicit visible:false", () => {
  const [series] = normalizeSeriesData([{ visible: false, points: [] }]);
  assert.equal(series.visible, false);
});

test("getDataBounds: skips non-finite points", () => {
  const bounds = getDataBounds([
    { points: [{ x: 0, y: 0 }, { x: Number.NaN, y: 1 }, { x: 5, y: 7 }] }
  ]);
  assert.deepEqual(bounds, { xMin: 0, xMax: 5, yMin: 0, yMax: 7 });
});

test("getDataBounds: empty input returns 0..1 default", () => {
  assert.deepEqual(getDataBounds([]), { xMin: 0, xMax: 1, yMin: 0, yMax: 1 });
  assert.deepEqual(
    getDataBounds([{ points: [] }]),
    { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }
  );
});

test("getDataBounds: collapses single-point spans by adding 1", () => {
  const bounds = getDataBounds([{ points: [{ x: 3, y: 4 }] }]);
  assert.deepEqual(bounds, { xMin: 3, xMax: 4, yMin: 4, yMax: 5 });
});

test("deepFreeze: returns primitives unchanged", () => {
  assert.equal(deepFreeze(42), 42);
  assert.equal(deepFreeze("s"), "s");
  assert.equal(deepFreeze(null), null);
  assert.equal(deepFreeze(undefined), undefined);
});

test("deepFreeze: freezes nested objects and arrays", () => {
  const obj = { a: { b: { c: 1 } }, list: [{ d: 2 }] };
  const frozen = deepFreeze(obj);
  assert.ok(Object.isFrozen(frozen));
  assert.ok(Object.isFrozen(frozen.a));
  assert.ok(Object.isFrozen(frozen.a.b));
  assert.ok(Object.isFrozen(frozen.list));
  assert.ok(Object.isFrozen(frozen.list[0]));
});

test("deepFreeze: stops recursing into already-frozen sub-objects", () => {
  const inner = Object.freeze({ a: 1 });
  const outer = { inner };
  deepFreeze(outer);
  assert.ok(Object.isFrozen(outer));
});

test("decimatePointsStride: returns input when not an array", () => {
  assert.equal(decimatePointsStride(null, 5), null);
  assert.equal(decimatePointsStride(undefined, 5), undefined);
});

test("decimatePointsStride: handles maxPoints <= 0 with stride fallback", () => {
  const points = [1, 2, 3, 4, 5];
  const out = decimatePointsStride(points, 0);
  // With maxPoints=0, every point fails the strict <= check, so sampling kicks in
  // but stride uses Math.max(1, maxPoints) → stride of 5 → only the first index.
  assert.equal(Array.isArray(out), true);
  assert.equal(out[out.length - 1], 5, "last point preserved");
});

test("makeLinearScale: maps domain endpoints to range endpoints", () => {
  const scale = makeLinearScale(0, 10, 0, 100);
  assert.equal(scale(0), 0);
  assert.equal(scale(10), 100);
  assert.equal(scale(5), 50);
});

test("invertLinearScale: round-trips with makeLinearScale", () => {
  const scale = makeLinearScale(-5, 5, 0, 200);
  const value = 1.25;
  const px = scale(value);
  assert.ok(Math.abs(invertLinearScale(px, -5, 5, 0, 200) - value) < 1e-9);
});

test("clampBounds: keeps view inside full bounds", () => {
  const full = { xMin: 0, xMax: 100, yMin: 0, yMax: 100 };
  // Try to push view past the right edge; span is 20.
  const view = { xMin: 95, xMax: 115, yMin: -5, yMax: 15 };
  const clamped = clampBounds(view, full);
  assert.deepEqual(clamped, { xMin: 80, xMax: 100, yMin: 0, yMax: 20 });
});

test("clampBounds: when view span equals full span, snaps offset to 0", () => {
  const full = { xMin: 0, xMax: 10, yMin: 0, yMax: 10 };
  const view = { xMin: 5, xMax: 15, yMin: 5, yMax: 15 };
  const clamped = clampBounds(view, full);
  assert.deepEqual(clamped, full);
});

test("applyDomainOverride: returns shallow copy when domain is null", () => {
  const data = { xMin: 0, xMax: 10, yMin: 0, yMax: 10 };
  const out = applyDomainOverride(data, null);
  assert.deepEqual(out, data);
  assert.notStrictEqual(out, data);
});

test("applyDomainOverride: only finite override values are applied", () => {
  const data = { xMin: 0, xMax: 10, yMin: 0, yMax: 10 };
  const out = applyDomainOverride(data, {
    xMin: 1,
    xMax: Number.NaN,
    yMin: undefined,
    yMax: 99
  });
  assert.deepEqual(out, { xMin: 1, xMax: 10, yMin: 0, yMax: 99 });
});

test("applyDomainOverride: applies all four finite override values", () => {
  const data = { xMin: 0, xMax: 10, yMin: 0, yMax: 10 };
  const out = applyDomainOverride(data, { xMin: 1, xMax: 9, yMin: 2, yMax: 8 });
  assert.deepEqual(out, { xMin: 1, xMax: 9, yMin: 2, yMax: 8 });
});

test("filterVisibleSeries: returns only visible:true entries", () => {
  const out = filterVisibleSeries([
    { visible: true, id: "a" },
    { visible: false, id: "b" },
    { visible: true, id: "c" }
  ]);
  assert.deepEqual(out.map((s) => s.id), ["a", "c"]);
});
