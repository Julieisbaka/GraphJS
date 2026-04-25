import { clamp, makeLinearScale } from "./utils.js";

const M = Math;
const TAU = M.PI * 2;

/**
 * Renders a single line series onto a 2D canvas context.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context to draw into.
 * @param {import("../index.d.ts").PlotLayout} plot - Plot rectangle.
 * @param {import("../index.d.ts").Series} series - Series to render.
 * @param {(value: number) => number} xScale - Maps x domain values to pixels.
 * @param {(value: number) => number} yScale - Maps y domain values to pixels.
 * @returns {void}
 */
export function drawLineSeries(ctx, plot, series, xScale, yScale) {
  const points = series.points;
  if (!points.length) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = series.color;
  ctx.lineWidth = series.lineWidth;
  ctx.beginPath();

  // Alias hot-path methods so the minifier can shorten them to single chars
  const moveTo = (x, y) => ctx.moveTo(x, y);
  const lineTo = (x, y) => ctx.lineTo(x, y);

  // First point: moveTo; remaining: lineTo — avoids a conditional inside the loop
  moveTo(xScale(points[0].x), yScale(points[0].y));
  for (let i = 1; i < points.length; i += 1) {
    const p = points[i];
    lineTo(xScale(p.x), yScale(p.y));
  }

  ctx.stroke();

  if (series.pointRadius > 0) {
    ctx.fillStyle = series.color;
    const r = series.pointRadius;
    // Arrow closures capture ctx and r; minifier renames them to single chars,
    // saving ~28 bytes per loop iteration vs repeating the method name each call.
    const beginPath = () => ctx.beginPath();
    const arc = (x, y) => ctx.arc(x, y, r, 0, TAU);
    const fill = () => ctx.fill();
    for (const p of points) {
      beginPath();
      arc(xScale(p.x), yScale(p.y));
      fill();
    }
  }

  ctx.restore();
}

/**
 * Creates a stable cache key for the static graph layer.
 *
 * @param {import("../index.d.ts").GraphOptions} options - Current graph options.
 * @param {import("../index.d.ts").PlotLayout} plot - Current plot layout.
 * @param {import("../index.d.ts").DataBounds} bounds - Current resolved bounds.
 * @returns {string}
 */
export function makeStaticLayerKey(options, plot, bounds) {
  return JSON.stringify({
    width: options.width,
    height: options.height,
    background: options.background,
    grid: options.grid,
    axes: options.axes,
    plot,
    bounds
  });
}

/**
 * Computes the plot rectangle from width, height, and padding.
 *
 * @param {import("../index.d.ts").GraphOptions} options - Graph options containing dimensions and padding.
 * @returns {import("../index.d.ts").PlotLayout}
 */
export function computeLayout(options) {
  const { width, height, padding } = options;
  return {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
    width: M.max(1, width - padding.left - padding.right),
    height: M.max(1, height - padding.top - padding.bottom)
  };
}

/**
 * Creates an offscreen or in-memory canvas buffer for the static layer cache.
 *
 * @param {import("../index.d.ts").GraphOptions} options - Graph options containing scalability settings.
 * @param {number} width - CSS width in pixels.
 * @param {number} height - CSS height in pixels.
 * @param {number} dpr - Device pixel ratio.
 * @returns {{canvas: OffscreenCanvas|HTMLCanvasElement|null, ctx: CanvasRenderingContext2D|null}}
 */
export function createBufferCanvas(options, width, height, dpr) {
  const useOffscreen = options.scalability.useOffscreenCanvas && typeof OffscreenCanvas !== "undefined";

  const w = M.max(1, M.floor(width * dpr));
  const h = M.max(1, M.floor(height * dpr));

  if (useOffscreen) {
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return { canvas: null, ctx: null };
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { canvas, ctx };
  }

  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return { canvas: null, ctx: null };
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { canvas, ctx };
  }

  return { canvas: null, ctx: null };
}

/**
 * Paints the graph background.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context to draw into.
 * @param {import("../index.d.ts").GraphOptions} options - Graph options containing width, height, and background.
 * @returns {void}
 */
export function drawBackdrop(ctx, options) {
  const { width, height, background } = options;
  ctx.save();
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/**
 * Draws grid lines and axes for the current plot.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context to draw into.
 * @param {import("../index.d.ts").GraphOptions} options - Graph options containing axis and grid settings.
 * @param {import("../index.d.ts").PlotLayout} plot - Plot rectangle.
 * @param {import("../index.d.ts").DataBounds} bounds - Resolved graph bounds.
 * @returns {void}
 */
export function drawGrid(ctx, options, plot, bounds) {
  const { grid, axes } = options;

  if (grid.show) {
    ctx.save();
    ctx.strokeStyle = grid.color;
    ctx.lineWidth = grid.lineWidth;

    const safeXTicks = M.max(1, grid.xTicks);
    const safeYTicks = M.max(1, grid.yTicks);

    ctx.beginPath();
    for (let i = 0; i <= grid.xTicks; i += 1) {
      const x = plot.left + (i / safeXTicks) * plot.width;
      ctx.moveTo(x, plot.top);
      ctx.lineTo(x, plot.bottom);
    }
    for (let i = 0; i <= grid.yTicks; i += 1) {
      const y = plot.bottom - (i / safeYTicks) * plot.height;
      ctx.moveTo(plot.left, y);
      ctx.lineTo(plot.right, y);
    }
    ctx.stroke();

    ctx.restore();
  }

  if (axes.show) {
    ctx.save();
    ctx.strokeStyle = axes.color;
    ctx.lineWidth = axes.lineWidth;

    const xScale = makeLinearScale(bounds.xMin, bounds.xMax, plot.left, plot.right);
    const yScale = makeLinearScale(bounds.yMin, bounds.yMax, plot.bottom, plot.top);
    const x = xScale(clamp(0, bounds.xMin, bounds.xMax));
    const y = yScale(clamp(0, bounds.yMin, bounds.yMax));

    ctx.beginPath();
    ctx.moveTo(plot.left, y);
    ctx.lineTo(plot.right, y);
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.bottom);
    ctx.stroke();

    ctx.restore();
  }
}
