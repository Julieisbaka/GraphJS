import { clamp, makeLinearScale } from "./utils.js";

export function drawLineSeries(ctx, plot, series, xScale, yScale) {
  const points = series.points;
  if (!points.length) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = series.color;
  ctx.lineWidth = series.lineWidth;
  ctx.beginPath();

  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    const x = xScale(p.x);
    const y = yScale(p.y);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();

  if (series.pointRadius > 0) {
    ctx.fillStyle = series.color;
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(xScale(p.x), yScale(p.y), series.pointRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

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

export function computeLayout(options) {
  const { width, height, padding } = options;
  return {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
    width: Math.max(1, width - padding.left - padding.right),
    height: Math.max(1, height - padding.top - padding.bottom)
  };
}

export function createBufferCanvas(options, width, height, dpr) {
  const useOffscreen = options.scalability.useOffscreenCanvas && typeof OffscreenCanvas !== "undefined";

  const w = Math.max(1, Math.floor(width * dpr));
  const h = Math.max(1, Math.floor(height * dpr));

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

export function drawBackdrop(ctx, options) {
  const { width, height, background } = options;
  ctx.save();
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

export function drawGrid(ctx, options, plot, bounds) {
  const { grid, axes } = options;

  if (grid.show) {
    ctx.save();
    ctx.strokeStyle = grid.color;
    ctx.lineWidth = grid.lineWidth;

    ctx.beginPath();
    for (let i = 0; i <= grid.xTicks; i += 1) {
      const x = plot.left + (i / Math.max(1, grid.xTicks)) * plot.width;
      ctx.moveTo(x, plot.top);
      ctx.lineTo(x, plot.bottom);
    }
    for (let i = 0; i <= grid.yTicks; i += 1) {
      const y = plot.bottom - (i / Math.max(1, grid.yTicks)) * plot.height;
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
