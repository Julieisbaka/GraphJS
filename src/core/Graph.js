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

// Bitmask flags for this._dirty — collapsed to a single integer so esbuild/terser
// can reduce all checks and resets to bitwise operations instead of property accesses.
const DIRTY_DATA = 1;
const DIRTY_OPTIONS = 2;
const DIRTY_SIZE = 4;
const DIRTY_RENDER = 8;
const DIRTY_ALL = 15;

export { drawLineSeries } from "./rendering.js";

/**
 * Core GraphJS canvas graph implementation.
 */
export class Graph {
  static registry = new Registry();
  static renderers = new Map();
  static samplers = new Map();

  /**
   * Registers a plugin globally for all graph instances.
   *
   * @param {import("../index.d.ts").GraphPlugin} plugin - Plugin definition to register.
   * @returns {void}
   */
  static registerPlugin(plugin) {
    Graph.registry.registerPlugin(plugin);
  }

  /**
   * Removes a globally registered plugin by id.
   *
   * @param {string} pluginId - Plugin id to remove.
   * @returns {void}
   */
  static unregisterPlugin(pluginId) {
    Graph.registry.unregisterPlugin(pluginId);
  }

  /**
   * Registers a renderer function for a series type.
   *
   * @param {string} type - Series type key.
   * @param {import("../index.d.ts").GraphSeriesRenderer} fn - Renderer implementation.
   * @returns {void}
   */
  static registerRenderer(type, fn) {
    if (typeof type !== "string" || !type.trim()) {
      throw new Error("Renderer type must be a non-empty string.");
    }
    if (typeof fn !== "function") {
      throw new Error(`Renderer for '${type}' must be a function.`);
    }
    Graph.renderers.set(type, fn);
  }

  /**
   * Registers a point sampling strategy by name.
   *
   * @param {string} name - Sampler name.
   * @param {import("../index.d.ts").GraphSeriesSampler} fn - Sampling implementation.
   * @returns {void}
   */
  static registerSampler(name, fn) {
    if (typeof name !== "string" || !name.trim()) {
      throw new Error("Sampler name must be a non-empty string.");
    }
    if (typeof fn !== "function") {
      throw new Error(`Sampler '${name}' must be a function.`);
    }
    Graph.samplers.set(name.trim(), fn);
  }

  /**
   * Creates a graph instance bound to a canvas target.
   *
   * @param {string|HTMLCanvasElement} canvasTarget - Canvas selector or element.
   * @param {import("../index.d.ts").GraphOptions} [options={}] - Initial graph options.
   */
  constructor(canvasTarget, options = {}) {
    this.canvas = resolveCanvas(canvasTarget);
    this.ctx = this.canvas.getContext("2d");
    if (!this.ctx) {
      throw new Error("Could not acquire a 2D context from canvas.");
    }

    this.options = deepMerge(DEFAULT_OPTIONS, options);
    if (typeof __DEV__ === "undefined" || __DEV__) validateGraphOptions(this.options);

    this.data = [];
    this.hooks = new HookRegistry();
    this.plugins = new PluginHost(this, Graph.registry, this.hooks);
    this.commands = new Map();

    this._dirty = DIRTY_ALL;
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

  /**
   * Applies a partial options update to the graph.
   *
   * @param {import("../index.d.ts").GraphOptions} [nextOptions={}] - Partial options override.
   * @returns {this}
   */
  setOptions(nextOptions = {}) {
    this.options = deepMerge(this.options, nextOptions);
    if ("domain" in nextOptions) {
      this.options.domain = nextOptions.domain ?? null;
    }
    if (typeof __DEV__ === "undefined" || __DEV__) validateGraphOptions(this.options);

    if ("pluginErrorBoundary" in nextOptions) {
      this.plugins.configureErrorBoundary(this.options.pluginErrorBoundary);
    }

    if (Array.isArray(nextOptions.plugins)) {
      this.plugins.configure(nextOptions.plugins);
    }

    this._dirty |= DIRTY_OPTIONS | DIRTY_RENDER;
    return this;
  }

  /**
   * Returns a defensive copy of the current graph options.
   *
   * @returns {import("../index.d.ts").GraphOptions}
   */
  getOptions() {
    return deepMerge({}, this.options);
  }

  /**
   * Overrides the bounds resolution strategy used during rendering.
   *
   * @param {import("../index.d.ts").BoundsStrategy|null} fn - Custom bounds strategy or null to restore default behavior.
   * @returns {this}
   */
  setBoundsStrategy(fn) {
    if (fn !== null && typeof fn !== "function") {
      throw new Error("setBoundsStrategy requires a function or null.");
    }
    this._boundsStrategy = fn;
    return this;
  }

  /**
   * Sets an explicit domain override.
   *
   * @param {import("../index.d.ts").DomainOverride} [domain=null] - Domain override to apply.
   * @returns {this}
   */
  setDomain(domain = null) {
    if (typeof __DEV__ === "undefined" || __DEV__) validateDomain(domain);
    const isEmptyDomainObject = domain
      && typeof domain === "object"
      && !Number.isFinite(domain.xMin)
      && !Number.isFinite(domain.xMax)
      && !Number.isFinite(domain.yMin)
      && !Number.isFinite(domain.yMax);
    this.options.domain = isEmptyDomainObject ? null : domain;
    this._dirty |= DIRTY_OPTIONS | DIRTY_RENDER;
    return this;
  }

  /**
   * Clears any active domain override.
   *
   * @deprecated Use setDomain({}) to clear the active domain override.
   *
   * @returns {this}
   */
  clearDomain() {
    return this.setDomain(null);
  }

  /**
   * Returns the current domain override.
   *
   * @returns {import("../index.d.ts").DomainOverride}
   */
  getDomain() {
    return this.options.domain;
  }

  /**
   * Registers an executable graph command.
   *
   * @param {string} commandName - Command name.
   * @param {(payload?: unknown, graph?: Graph) => unknown} handler - Command handler.
   * @param {Record<string, unknown>} [metadata={}] - Optional command metadata.
   * @param {string|null} [pluginId=null] - Owning plugin id, used for namespacing.
   * @returns {string} Normalized command name.
   */
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

  /**
   * Unregisters a command by name.
   *
   * @param {string} commandName - Command to remove.
   * @returns {void}
   */
  unregisterCommand(commandName) {
    this.commands.delete(commandName);
  }

  /**
   * Removes all commands registered by a specific plugin.
   *
   * @param {string} pluginId - Plugin id whose commands should be removed.
   * @returns {void}
   */
  clearPluginCommands(pluginId) {
    for (const [name, entry] of this.commands.entries()) {
      if (entry.pluginId === pluginId) {
        this.commands.delete(name);
      }
    }
  }

  /**
   * Lists registered commands without exposing their handlers.
   *
   * @returns {{name: string, pluginId: string|null, metadata: Record<string, unknown>}[]}
   */
  listCommands() {
    return [...this.commands.values()].map((entry) => ({
      name: entry.name,
      pluginId: entry.pluginId,
      metadata: entry.metadata
    }));
  }

  /**
   * Executes a registered command.
   *
   * @param {string} commandName - Command name to execute.
   * @param {unknown} [payload=undefined] - Optional payload passed to the handler.
   * @returns {unknown}
   */
  executeCommand(commandName, payload = undefined) {
    const entry = this.commands.get(commandName);
    if (!entry) {
      throw new Error(`Unknown command: ${commandName}`);
    }
    return entry.handler(payload, this);
  }

  /**
   * Replaces the graph data set.
   *
   * @param {import("../index.d.ts").Series[]} [nextData=[]] - Next series collection.
   * @returns {this}
   */
  setData(nextData = []) {
    const payload = { nextData };
    if (this.plugins.call("beforeSetData", payload) === false) {
      return this;
    }

    const normalized = normalizeSeriesData(payload.nextData, this.options.series || {});
    this.data = (typeof __DEV__ === "undefined" || __DEV__) && this.options.immutableInputs ? deepFreeze(normalized) : normalized;

    this._dirty |= DIRTY_DATA | DIRTY_RENDER;
    this.plugins.call("afterSetData", { data: this.data });
    return this;
  }

  /**
   * Appends a single series to the current data set.
   *
   * @param {import("../index.d.ts").Series} series - Series to add.
   * @returns {this}
   */
  addSeries(series) {
    this.setData([...this.data, series]);
    return this;
  }

  /**
   * Clears the target canvas immediately.
   *
   * @returns {this}
   */
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    return this;
  }

  /**
   * Resizes the graph canvas and updates internal dimensions.
   *
   * @param {number} width - CSS width in pixels.
   * @param {number} height - CSS height in pixels.
   * @returns {this}
   */
  resize(width, height) {
    if (this.plugins.call("beforeResize", { width, height }) === false) {
      return this;
    }

    const dpr = getDevicePixelRatio();
    const safeW = Math.max(1, Math.floor(width));
    const safeH = Math.max(1, Math.floor(height));

    this.canvas.width = Math.floor(safeW * dpr);
    this.canvas.height = Math.floor(safeH * dpr);
    this.canvas.style.width = safeW + "px";
    this.canvas.style.height = safeH + "px";

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.options.width = safeW;
    this.options.height = safeH;

    this._dirty |= DIRTY_SIZE | DIRTY_RENDER;

    this.plugins.call("afterResize", { width: safeW, height: safeH, dpr });
    return this;
  }

  /**
   * Resolves final render bounds using the current strategy and domain override.
   *
   * @param {import("../index.d.ts").DataBounds} dataBounds - Bounds computed from series data.
   * @returns {import("../index.d.ts").DataBounds}
   */
  _resolveBounds(dataBounds) {
    if (this._boundsStrategy) {
      return this._boundsStrategy(dataBounds, this.options);
    }
    const resolved = applyDomainOverride(dataBounds, this.options.domain);
    if (typeof __DEV__ === "undefined" || __DEV__) validateDomain(resolved);
    return resolved;
  }

  /**
   * Applies the active sampling strategy to a series when needed.
   *
   * @param {import("../index.d.ts").Series} series - Series to inspect.
   * @returns {import("../index.d.ts").Series}
   */
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

  /**
   * Computes the current plot layout rectangle.
   *
   * @returns {import("../index.d.ts").PlotLayout}
   */
  _computeLayout() {
    return computeLayout(this.options);
  }

  /**
   * Draws the canvas background layer.
   *
   * @returns {void}
   */
  _drawBackdrop() {
    drawBackdrop(this.ctx, this.options);
  }

  /**
   * Draws the axes and grid layer.
   *
   * @param {import("../index.d.ts").PlotLayout} plot - Plot rectangle.
   * @param {import("../index.d.ts").DataBounds} bounds - Resolved bounds.
   * @returns {void}
   */
  _drawGrid(plot, bounds) {
    drawGrid(this.ctx, this.options, plot, bounds);
  }

  /**
   * Draws or reuses the cached static layer containing the backdrop and axes/grid.
   *
   * @param {import("../index.d.ts").PlotLayout} plot - Plot rectangle.
   * @param {import("../index.d.ts").DataBounds} bounds - Resolved bounds.
   * @returns {void}
   */
  _drawStaticLayer(plot, bounds) {
    const dpr = getDevicePixelRatio();
    const shouldCache = this.options.scalability.layerCaching;

    if (!shouldCache) {
      this._drawBackdrop();
      this._drawGrid(plot, bounds);
      return;
    }

    // Skip JSON.stringify on frames where dirty flags already mandate regeneration;
    // only compute the key on clean frames to catch silent option mutations.
    const dirtyRegen = !this._staticLayer.canvas || !!(this._dirty & (DIRTY_OPTIONS | DIRTY_SIZE | DIRTY_DATA));
    const currentKey = dirtyRegen ? null : makeStaticLayerKey(this.options, plot, bounds);
    if (dirtyRegen || currentKey !== this._staticLayer.key) {
      const key = currentKey ?? makeStaticLayerKey(this.options, plot, bounds);
      const layer = createBufferCanvas(this.options, this.options.width, this.options.height, dpr);
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

  /**
   * Renders the current graph state to the canvas.
   *
   * @param {{force?: boolean}} [args={}] - Render options.
   * @returns {this}
   */
  render({ force = false } = {}) {
    if (this._destroyed) {
      throw new Error("Cannot render a destroyed graph instance.");
    }

    if (
      this.options.scalability.dirtyRender &&
      !force &&
      !this._dirty
    ) {
      return this;
    }

    const payload = {};
    if (this.plugins.call("beforeLayout", payload) === false) {
      return this;
    }

    const layout = payload.layout ?? this._computeLayout();
    const plot = layout;
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

    this._dirty = 0;

    return this;
  }

  /**
   * Destroys the graph instance and clears plugin state.
   *
   * @returns {void}
   */
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