import { DEFAULT_OPTIONS } from "./defaults.js";
import { Registry } from "./Registry.js";
import { PluginHost } from "./PluginHost.js";
import { HookRegistry } from "./hooks.js";
import {
  clamp,
  decimatePointsStride,
  deepFreeze,
  deepMerge,
  getDataBounds,
  getDevicePixelRatio,
  normalizeSeriesData,
  resolveCanvas
} from "./utils.js";
import { validateDomain, validateGraphOptions } from "./validation.js";

function drawLineSeries(ctx, plot, series, xScale, yScale) {
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

function makeStaticLayerKey(options, plot, bounds) {
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

export class Graph {
  static registry = new Registry();

  static registerPlugin(plugin) {
    Graph.registry.registerPlugin(plugin);
  }

  static unregisterPlugin(pluginId) {
    Graph.registry.unregisterPlugin(pluginId);
  }

  constructor(canvasTarget, options = {}) {
    this.canvas = resolveCanvas(canvasTarget);
    this.ctx = this.canvas.getContext("2d");
    if (!this.ctx) {
      throw new Error("Could not acquire a 2D context from canvas.");
    }

    this.options = deepMerge(DEFAULT_OPTIONS, options);
    validateGraphOptions(this.options);

    this.data = [];
    this.hooks = new HookRegistry();
    this.plugins = new PluginHost(this, Graph.registry, this.hooks);
    this.commands = new Map();

    this._dirty = {
      data: true,
      options: true,
      size: true,
      render: true
    };
    this._staticLayer = {
      canvas: null,
      ctx: null,
      key: null
    };

    this._destroyed = false;

    this.plugins.configure(this.options.plugins || []);
    this.plugins.call("beforeInit", { options: this.options });
    this.resize(this.options.width, this.options.height);
    this.plugins.call("afterInit", { options: this.options });
  }

  setOptions(nextOptions = {}) {
    this.options = deepMerge(this.options, nextOptions);
    validateGraphOptions(this.options);

    if (Array.isArray(nextOptions.plugins)) {
      this.plugins.configure(nextOptions.plugins);
    }

    this._dirty.options = true;
    this._dirty.render = true;
    return this;
  }

  getOptions() {
    return deepMerge({}, this.options);
  }

  setDomain(domain = null) {
    validateDomain(domain);
    this.options = deepMerge(this.options, { domain });
    this._dirty.options = true;
    this._dirty.render = true;
    return this;
  }

  clearDomain() {
    return this.setDomain(null);
  }

  getDomain() {
    return this.options.domain;
  }

  registerCommand(commandName, handler, metadata = {}, pluginId = null) {
    if (typeof commandName !== "string" || !commandName.trim()) {
      throw new Error("Command name must be a non-empty string.");
    }
    if (typeof handler !== "function") {
      throw new Error(`Command handler for ${commandName} must be a function.`);
    }

    const normalizedName = pluginId && !commandName.includes(".")
      ? `${pluginId}.${commandName}`
      : commandName;

    this.commands.set(normalizedName, {
      name: normalizedName,
      pluginId,
      metadata: { ...metadata },
      handler
    });

    return normalizedName;
  }

  unregisterCommand(commandName) {
    this.commands.delete(commandName);
  }

  clearPluginCommands(pluginId) {
    for (const [name, entry] of this.commands.entries()) {
      if (entry.pluginId === pluginId) {
        this.commands.delete(name);
      }
    }
  }

  listCommands() {
    return [...this.commands.values()].map((entry) => ({
      name: entry.name,
      pluginId: entry.pluginId,
      metadata: entry.metadata
    }));
  }

  executeCommand(commandName, payload = undefined) {
    const entry = this.commands.get(commandName);
    if (!entry) {
      throw new Error(`Unknown command: ${commandName}`);
    }
    return entry.handler(payload, this);
  }

  setData(nextData = []) {
    const payload = { nextData };
    if (this.plugins.call("beforeSetData", payload) === false) {
      return this;
    }

    const normalized = normalizeSeriesData(payload.nextData);
    this.data = this.options.immutableInputs ? deepFreeze(normalized) : normalized;

    this._dirty.data = true;
    this._dirty.render = true;
    this.plugins.call("afterSetData", { data: this.data });
    return this;
  }

  addSeries(series) {
    this.setData([...this.data, series]);
    return this;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    return this;
  }

  resize(width, height) {
    if (this.plugins.call("beforeResize", { width, height }) === false) {
      return this;
    }

    const dpr = getDevicePixelRatio();
    const safeW = Math.max(1, Math.floor(width));
    const safeH = Math.max(1, Math.floor(height));

    this.canvas.width = Math.floor(safeW * dpr);
    this.canvas.height = Math.floor(safeH * dpr);
    this.canvas.style.width = `${safeW}px`;
    this.canvas.style.height = `${safeH}px`;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.options.width = safeW;
    this.options.height = safeH;

    this._dirty.size = true;
    this._dirty.render = true;

    this.plugins.call("afterResize", { width: safeW, height: safeH, dpr });
    return this;
  }

  _createBufferCanvas(width, height, dpr) {
    const useOffscreen =
      this.options.scalability.useOffscreenCanvas && typeof OffscreenCanvas !== "undefined";

    const w = Math.max(1, Math.floor(width * dpr));
    const h = Math.max(1, Math.floor(height * dpr));

    if (useOffscreen) {
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { canvas, ctx };
    }

    if (typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { canvas, ctx };
    }

    return { canvas: null, ctx: null };
  }

  _resolveBounds(dataBounds) {
    const domain = this.options.domain;
    if (!domain) {
      return { ...dataBounds };
    }

    const resolved = { ...dataBounds };
    if (Number.isFinite(domain.xMin)) {
      resolved.xMin = domain.xMin;
    }
    if (Number.isFinite(domain.xMax)) {
      resolved.xMax = domain.xMax;
    }
    if (Number.isFinite(domain.yMin)) {
      resolved.yMin = domain.yMin;
    }
    if (Number.isFinite(domain.yMax)) {
      resolved.yMax = domain.yMax;
    }

    validateDomain(resolved);
    return resolved;
  }

  _getRenderableSeries(series) {
    const sampling = this.options.sampling;
    if (!sampling.enabled || !Array.isArray(series.points) || series.points.length <= sampling.maxPoints) {
      return series;
    }

    if (sampling.method === "stride") {
      return {
        ...series,
        points: decimatePointsStride(series.points, sampling.maxPoints)
      };
    }

    return series;
  }

  _computeLayout() {
    const { width, height, padding } = this.options;
    return {
      left: padding.left,
      top: padding.top,
      right: width - padding.right,
      bottom: height - padding.bottom,
      width: Math.max(1, width - padding.left - padding.right),
      height: Math.max(1, height - padding.top - padding.bottom)
    };
  }

  _drawBackdrop() {
    const { width, height, background } = this.options;
    this.ctx.save();
    this.ctx.fillStyle = background;
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.restore();
  }

  _drawGrid(plot, bounds) {
    const { grid, axes } = this.options;
    const ctx = this.ctx;

    if (grid.show) {
      ctx.save();
      ctx.strokeStyle = grid.color;
      ctx.lineWidth = grid.lineWidth;

      for (let i = 0; i <= grid.xTicks; i += 1) {
        const t = i / Math.max(1, grid.xTicks);
        const x = plot.left + t * plot.width;
        ctx.beginPath();
        ctx.moveTo(x, plot.top);
        ctx.lineTo(x, plot.bottom);
        ctx.stroke();
      }

      for (let i = 0; i <= grid.yTicks; i += 1) {
        const t = i / Math.max(1, grid.yTicks);
        const y = plot.bottom - t * plot.height;
        ctx.beginPath();
        ctx.moveTo(plot.left, y);
        ctx.lineTo(plot.right, y);
        ctx.stroke();
      }

      ctx.restore();
    }

    if (axes.show) {
      ctx.save();
      ctx.strokeStyle = axes.color;
      ctx.lineWidth = axes.lineWidth;

      const x0 = clamp(0, bounds.xMin, bounds.xMax);
      const y0 = clamp(0, bounds.yMin, bounds.yMax);
      const x = plot.left + ((x0 - bounds.xMin) / (bounds.xMax - bounds.xMin)) * plot.width;
      const y = plot.bottom - ((y0 - bounds.yMin) / (bounds.yMax - bounds.yMin)) * plot.height;

      ctx.beginPath();
      ctx.moveTo(plot.left, y);
      ctx.lineTo(plot.right, y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x, plot.top);
      ctx.lineTo(x, plot.bottom);
      ctx.stroke();

      ctx.restore();
    }
  }

  _drawStaticLayer(plot, bounds) {
    const dpr = getDevicePixelRatio();
    const key = makeStaticLayerKey(this.options, plot, bounds);
    const shouldCache = this.options.scalability.layerCaching;

    if (!shouldCache) {
      this._drawBackdrop();
      this._drawGrid(plot, bounds);
      return;
    }

    if (!this._staticLayer.canvas || this._staticLayer.key !== key || this._dirty.options || this._dirty.size || this._dirty.data) {
      const layer = this._createBufferCanvas(this.options.width, this.options.height, dpr);
      this._staticLayer.canvas = layer.canvas;
      this._staticLayer.ctx = layer.ctx;
      this._staticLayer.key = key;

      if (layer.ctx) {
        const prevCtx = this.ctx;
        this.ctx = layer.ctx;
        this._drawBackdrop();
        this._drawGrid(plot, bounds);
        this.ctx = prevCtx;
      }
    }

    if (this._staticLayer.canvas) {
      this.ctx.drawImage(this._staticLayer.canvas, 0, 0, this.options.width, this.options.height);
      return;
    }

    this._drawBackdrop();
    this._drawGrid(plot, bounds);
  }

  render({ force = false } = {}) {
    if (this._destroyed) {
      throw new Error("Cannot render a destroyed graph instance.");
    }

    if (
      this.options.scalability.dirtyRender &&
      !force &&
      !this._dirty.data &&
      !this._dirty.options &&
      !this._dirty.size &&
      !this._dirty.render
    ) {
      return this;
    }

    const layout = this._computeLayout();
    const payload = { layout };

    if (this.plugins.call("beforeLayout", payload) === false) {
      return this;
    }

    const plot = payload.layout;
    const rawBounds = getDataBounds(this.data.filter((s) => s.visible));
    const bounds = this._resolveBounds(rawBounds);

    const xScale = (value) =>
      plot.left + ((value - bounds.xMin) / (bounds.xMax - bounds.xMin)) * plot.width;
    const yScale = (value) =>
      plot.bottom - ((value - bounds.yMin) / (bounds.yMax - bounds.yMin)) * plot.height;

    this.plugins.call("afterLayout", { layout: plot, bounds });
    if (this.plugins.call("beforeRender", { layout: plot, bounds }) === false) {
      return this;
    }

    this._drawStaticLayer(plot, bounds);

    for (const series of this.data) {
      if (!series.visible) {
        continue;
      }

      const renderSeries = this._getRenderableSeries(series);

      const seriesPayload = { series: renderSeries, layout: plot, bounds, xScale, yScale };
      if (this.plugins.call("beforeDrawSeries", seriesPayload) === false) {
        continue;
      }

      if (renderSeries.type === "line") {
        drawLineSeries(this.ctx, plot, renderSeries, xScale, yScale);
      }

      this.plugins.call("afterDrawSeries", seriesPayload);
    }

    this.plugins.call("afterRender", { layout: plot, bounds });

    this._dirty.data = false;
    this._dirty.options = false;
    this._dirty.size = false;
    this._dirty.render = false;

    return this;
  }

  destroy() {
    if (this._destroyed) {
      return;
    }

    this.plugins.call("beforeDestroy", {});
    this.clear();
    this.commands.clear();
    this._destroyed = true;
    this.plugins.call("afterDestroy", {});
  }
}