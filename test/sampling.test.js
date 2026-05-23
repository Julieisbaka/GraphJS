import test from "node:test";
import assert from "node:assert/strict";

import { lttb, m4, rdp, ltd, ltob, sma } from "../extensions/sampling/index.js";
import { triangleArea, splitBuckets } from "../extensions/sampling/common.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate `n` points along y = sin(x). */
function sinPoints(n) {
  return Array.from({ length: n }, (_, i) => ({
    x: i,
    y: Math.sin(i / 10)
  }));
}

/** Generate `n` evenly spaced points on a straight line. */
function linePoints(n) {
  return Array.from({ length: n }, (_, i) => ({ x: i, y: i }));
}

// ---------------------------------------------------------------------------
// common helpers
// ---------------------------------------------------------------------------

test("triangleArea – known triangle", () => {
  const a = { x: 0, y: 0 }, b = { x: 4, y: 0 }, c = { x: 0, y: 3 };
  assert.equal(triangleArea(a, b, c), 6);
});

test("triangleArea – collinear points returns 0", () => {
  assert.equal(triangleArea({ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }), 0);
});

test("splitBuckets – produces correct count and coverage", () => {
  const pts = linePoints(10);
  const buckets = splitBuckets(pts, 3);
  assert.equal(buckets.length, 3);
  const total = buckets.reduce((s, b) => s + b.length, 0);
  assert.equal(total, 10);
});

test("splitBuckets – more buckets than points yields empty tails", () => {
  const pts = linePoints(2);
  const buckets = splitBuckets(pts, 5);
  assert.equal(buckets.length, 5);
});

// ---------------------------------------------------------------------------
// LTTB
// ---------------------------------------------------------------------------

test("lttb – returns maxPoints when input is larger", () => {
  const pts = sinPoints(200);
  const out = lttb(pts, 50);
  assert.equal(out.length, 50);
});

test("lttb – always retains first and last point", () => {
  const pts = sinPoints(100);
  const out = lttb(pts, 20);
  assert.deepEqual(out[0], pts[0]);
  assert.deepEqual(out[out.length - 1], pts[pts.length - 1]);
});

test("lttb – returns copy when maxPoints >= length", () => {
  const pts = sinPoints(10);
  const out = lttb(pts, 10);
  assert.equal(out.length, 10);
  assert.notEqual(out, pts);
});

test("lttb – returns copy when maxPoints < 3", () => {
  const pts = sinPoints(50);
  assert.equal(lttb(pts, 2).length, 50);
});

// ---------------------------------------------------------------------------
// M4
// ---------------------------------------------------------------------------

test("m4 – output length <= maxPoints", () => {
  const pts = sinPoints(200);
  const out = m4(pts, 40);
  assert.ok(out.length <= 40, `expected <= 40, got ${out.length}`);
});

test("m4 – preserves at least min and max y within a spike", () => {
  // Flat series with a spike in the middle
  const pts = Array.from({ length: 100 }, (_, i) => ({ x: i, y: i === 50 ? 100 : 0 }));
  const out = m4(pts, 40);
  assert.ok(out.some((p) => p.y === 100), "spike must be retained");
});

test("m4 – returns copy when maxPoints >= length", () => {
  const pts = sinPoints(5);
  const out = m4(pts, 10);
  assert.equal(out.length, 5);
});

// ---------------------------------------------------------------------------
// RDP
// ---------------------------------------------------------------------------

test("rdp – output length <= maxPoints", () => {
  const pts = sinPoints(300);
  const out = rdp(pts, 60);
  assert.ok(out.length <= 60, `expected <= 60, got ${out.length}`);
});

test("rdp – collinear fallback stays within maxPoints", () => {
  const pts = linePoints(100);
  const out = rdp(pts, 20);
  assert.ok(out.length <= 20, `expected <= 20, got ${out.length}`);
});

test("rdp – retains first and last point", () => {
  const pts = sinPoints(100);
  const out = rdp(pts, 30);
  assert.deepEqual(out[0], pts[0]);
  assert.deepEqual(out[out.length - 1], pts[pts.length - 1]);
});

test("rdp – returns copy when maxPoints >= length", () => {
  const pts = sinPoints(5);
  assert.equal(rdp(pts, 10).length, 5);
});

// ---------------------------------------------------------------------------
// LTD
// ---------------------------------------------------------------------------

test("ltd – returns maxPoints when input is larger", () => {
  const pts = sinPoints(200);
  const out = ltd(pts, 50);
  assert.equal(out.length, 50);
});

test("ltd – always retains first and last point", () => {
  const pts = sinPoints(100);
  const out = ltd(pts, 20);
  assert.deepEqual(out[0], pts[0]);
  assert.deepEqual(out[out.length - 1], pts[pts.length - 1]);
});

test("ltd – returns copy when maxPoints >= length", () => {
  const pts = sinPoints(10);
  assert.equal(ltd(pts, 10).length, 10);
});

// ---------------------------------------------------------------------------
// LTOB
// ---------------------------------------------------------------------------

test("ltob – returns maxPoints when input is larger", () => {
  const pts = sinPoints(200);
  const out = ltob(pts, 50);
  assert.equal(out.length, 50);
});

test("ltob – always retains first and last point", () => {
  const pts = sinPoints(100);
  const out = ltob(pts, 20);
  assert.deepEqual(out[0], pts[0]);
  assert.deepEqual(out[out.length - 1], pts[pts.length - 1]);
});

test("ltob – returns copy when maxPoints >= length", () => {
  const pts = sinPoints(10);
  assert.equal(ltob(pts, 10).length, 10);
});

// ---------------------------------------------------------------------------
// SMA
// ---------------------------------------------------------------------------

test("sma – output length equals ceil(n / window)", () => {
  const pts = sinPoints(100);
  const out = sma(pts, 20);
  assert.equal(out.length, 20);
});

test("sma – output length <= maxPoints for varying sizes", () => {
  for (const max of [10, 33, 50, 99]) {
    const out = sma(sinPoints(100), max);
    assert.ok(out.length <= max, `maxPoints=${max} got ${out.length}`);
  }
});

test("sma – returns copy when maxPoints >= length", () => {
  const pts = sinPoints(5);
  const out = sma(pts, 10);
  assert.equal(out.length, 5);
});

test("sma – averaged x is midpoint of first window", () => {
  const pts = [
    { x: 0, y: 0 }, { x: 2, y: 4 }, { x: 4, y: 8 },
    { x: 6, y: 12 }, { x: 8, y: 16 }
  ];
  // maxPoints=2, window=3 → first bucket [0,2,4] avg x=2, y=4
  const out = sma(pts, 2);
  assert.ok(out.length <= 2);
  assert.equal(out[0].x, 2);
  assert.equal(out[0].y, 4);
});

// ---------------------------------------------------------------------------
// samplingPlugin install
// ---------------------------------------------------------------------------

test("samplingPlugin.install registers all samplers on Graph", () => {
  const registered = new Map();
  const graphStub = {
    constructor: {
      registerSampler(name, fn) {
        registered.set(name, fn);
      }
    }
  };

  const { samplingPlugin } = await import("../extensions/sampling/index.js");
  samplingPlugin.install(graphStub);

  for (const name of ["lttb", "m4", "rdp", "ltd", "ltob", "sma"]) {
    assert.ok(registered.has(name), `sampler '${name}' should be registered`);
    assert.equal(typeof registered.get(name), "function");
  }
});
