import { DEFAULT_OPTIONS } from "./defaults.js";
import { Registry } from "./Registry.js";
import { PluginHost } from "./PluginHost.js";
import { HookRegistry } from "./hooks.js";
import {
  computeLayout,
  createBufferCanvas,
  drawBackdrop,
  drawGrid,
  drawLineSeries,
  makeStaticLayerKey
} from "./rendering.js";
import {
  applyDomainOverride,
  decimatePointsStride,
  deepFreeze,
  deepMerge,
  filterVisibleSeries,
  getDataBounds,
  getDevicePixelRatio,
  makeLinearScale,
  normalizeSeriesData,
  resolveCanvas
} from "./utils.js";
import { validateDomain, validateGraphOptions } from "./validation.js";

export { drawLineSeries } from "./rendering.js";

export class Graph {
  static registry = new Registry();
  static renderers = new Map();
  static samplers = new Map();

  static registerPlugin(plugin) {
    Graph.registry.registerPlugin(plugin);
  }

  static unregisterPlugin(pluginId) {
    Graph.registry.unregisterPlugin(pluginId);
  }

  static registerRenderer(type, fn) {
    if (typeof type !== "string" || !type.trim()) {
      throw new Error("Renderer type must be a non-empty string.");
    }
    if (typeof fn !== "function") {
      throw new Error(`Renderer for '${type}' must be a function.`);
    }
    Graph.renderers.set(type, fn);
  }

  static registerSampler(name, fn) {
    if (typeof name !== "string" || !name.trim()) {
      throw new Error("Sampler name must be a non-empty string.");
    }
    if (typeof fn !== "function") {
      throw new Error(`Sampler '${name}' must be a function.`);
    }
    Graph.samplers.set(name.trim(), fn);
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
    this._boundsStrategy = null;

    this.plugins.configure(this.options.plugins || []);
    this.plugins.call("beforeInit", { options: this.options });
    this.resize(this.options.width, this.options.height);
    this.plugins.call("afterInit", { options: this.options });
  }

  setOptions(nextOptions = {}) {
    this.options = deepMerge(this.options, nextOptions);
    if ("domain" in nextOptions) {
      this.options.domain = nextOptions.domain ?? null;
    }
    validateGraphOptions(this.options);

    if ("pluginErrorBoundary" in nextOptions) {
      this.plugins.configureErrorBoundary(this.options.pluginErrorBoundary);
    }

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

  setBoundsStrategy(fn) {
    if (fn !== null && typeof fn !== "function") {
      throw new Error("setBoundsStrategy requires a function or null.");
    }
    this._boundsStrategy = fn;
    return this;
  }

  setDomain(domain = null) {
    validateDomain(domain);
    this.options.domain = domain;
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

    const normalized = normalizeSeriesData(payload.nextData, this.options.series || {});
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
    return createBufferCanvas(this.options, width, height, dpr);
  }

  _resolveBounds(dataBounds) {
    if (this._boundsStrategy) {
      return this._boundsStrategy(dataBounds, this.options);
    }
    const resolved = applyDomainOverride(dataBounds, this.options.domain);
    validateDomain(resolved);
    return resolved;
  }

  _getRenderableSeries(series) {
    const sampling = this.options.sampling;
    if (!sampling.enabled || !Array.isArray(series.points) || series.points.length <= sampling.maxPoints) {
      return series;
    }

    const sampler = Graph.samplers.get(sampling.method.trim());
    if (sampler) {
      return { ...series, points: sampler(series.points, sampling.maxPoints) };
    }
    return series;
  }

  _computeLayout() {
    return computeLayout(this.options);
  }

  _drawBackdrop() {
    drawBackdrop(this.ctx, this.options);
  }

  _drawGrid(plot, bounds) {
    drawGrid(this.ctx, this.options, plot, bounds);
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
    const rawBounds = getDataBounds(filterVisibleSeries(this.data));
    const bounds = this._resolveBounds(rawBounds);

    const xScale = makeLinearScale(bounds.xMin, bounds.xMax, plot.left, plot.right);
    const yScale = makeLinearScale(bounds.yMin, bounds.yMax, plot.bottom, plot.top);

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

      if (Graph.renderers.has(renderSeries.type)) {
        Graph.renderers.get(renderSeries.type)(this.ctx, plot, renderSeries, xScale, yScale);
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

Graph.registerRenderer("line", drawLineSeries);
Graph.registerSampler("stride", decimatePointsStride);