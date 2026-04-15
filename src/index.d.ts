export type Point = { x: number; y: number };

export type DataBounds = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
};

export type PlotLayout = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type Series = {
  id?: string;
  type?: "line" | string;
  color?: string;
  lineWidth?: number;
  pointRadius?: number;
  visible?: boolean;
  points: Point[];
};

export type DomainOverride = {
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
} | null;

export type SamplingOptions = {
  enabled: boolean;
  maxPoints: number;
  method: "stride";
};

export type ScalabilityOptions = {
  dirtyRender: boolean;
  layerCaching: boolean;
  useOffscreenCanvas: boolean;
};

export type PluginErrorBoundaryOptions = {
  enabled: boolean;
  onError?: ((args: {
    pluginId: string;
    phase: string;
    error: unknown;
    context: Record<string, unknown>;
  }) => void) | null;
};

export type GraphOptions = {
  width?: number;
  height?: number;
  background?: string;
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
  immutableInputs?: boolean;
  domain?: DomainOverride;
  sampling?: Partial<SamplingOptions>;
  scalability?: Partial<ScalabilityOptions>;
  pluginErrorBoundary?: Partial<PluginErrorBoundaryOptions>;
  axes?: { show?: boolean; color?: string; lineWidth?: number };
  grid?: { show?: boolean; color?: string; lineWidth?: number; xTicks?: number; yTicks?: number };
  plugins?: Array<string | GraphPlugin | { plugin: GraphPlugin; options?: Record<string, unknown> }>;
};

export type PluginCapabilityFlags = {
  hooks?: string[];
  needsLayout?: boolean;
  needsBounds?: boolean;
  needsData?: boolean;
};

export type GraphCommandMetadata = {
  description?: string;
  argsExample?: unknown;
  [key: string]: unknown;
};

export type GraphCommandEntry = {
  name: string;
  pluginId: string | null;
  metadata: GraphCommandMetadata;
};

export type GraphCommandHandler = (payload?: unknown, graph?: Graph) => unknown;

export type PluginCommandHandler = (
  payload: unknown,
  graph: Graph,
  options: Record<string, unknown>,
  api: PluginApi
) => unknown;

export type PluginCommandDefinition =
  | PluginCommandHandler
  | {
      handler: PluginCommandHandler;
      metadata?: GraphCommandMetadata;
    };

export type PluginCommandMap = Record<string, PluginCommandDefinition>;

export type HookContextBase = {
  hookName: BuiltinHookName | string;
  contextVersion: number;
};

export type BeforeInitHookContext = HookContextBase & {
  hookName: "beforeInit";
  options: GraphOptions;
};

export type AfterInitHookContext = HookContextBase & {
  hookName: "afterInit";
  options: GraphOptions;
};

export type BeforeSetDataHookContext = HookContextBase & {
  hookName: "beforeSetData";
  nextData: unknown;
};

export type AfterSetDataHookContext = HookContextBase & {
  hookName: "afterSetData";
  data: Series[];
};

export type BeforeLayoutHookContext = HookContextBase & {
  hookName: "beforeLayout";
  layout: PlotLayout;
};

export type AfterLayoutHookContext = HookContextBase & {
  hookName: "afterLayout";
  layout: PlotLayout;
  bounds: DataBounds;
};

export type BeforeRenderHookContext = HookContextBase & {
  hookName: "beforeRender";
  layout: PlotLayout;
  bounds: DataBounds;
};

export type BeforeDrawSeriesHookContext = HookContextBase & {
  hookName: "beforeDrawSeries";
  series: Series;
  layout: PlotLayout;
  bounds: DataBounds;
  xScale: (value: number) => number;
  yScale: (value: number) => number;
};

export type AfterDrawSeriesHookContext = HookContextBase & {
  hookName: "afterDrawSeries";
  series: Series;
  layout: PlotLayout;
  bounds: DataBounds;
  xScale: (value: number) => number;
  yScale: (value: number) => number;
};

export type AfterRenderHookContext = HookContextBase & {
  hookName: "afterRender";
  layout: PlotLayout;
  bounds: DataBounds;
};

export type BeforeResizeHookContext = HookContextBase & {
  hookName: "beforeResize";
  width: number;
  height: number;
};

export type AfterResizeHookContext = HookContextBase & {
  hookName: "afterResize";
  width: number;
  height: number;
  dpr: number;
};

export type BeforeDestroyHookContext = HookContextBase & {
  hookName: "beforeDestroy";
};

export type AfterDestroyHookContext = HookContextBase & {
  hookName: "afterDestroy";
};

export type BuiltinHookContextMap = {
  beforeInit: BeforeInitHookContext;
  afterInit: AfterInitHookContext;
  beforeSetData: BeforeSetDataHookContext;
  afterSetData: AfterSetDataHookContext;
  beforeLayout: BeforeLayoutHookContext;
  afterLayout: AfterLayoutHookContext;
  beforeRender: BeforeRenderHookContext;
  beforeDrawSeries: BeforeDrawSeriesHookContext;
  afterDrawSeries: AfterDrawSeriesHookContext;
  afterRender: AfterRenderHookContext;
  beforeResize: BeforeResizeHookContext;
  afterResize: AfterResizeHookContext;
  beforeDestroy: BeforeDestroyHookContext;
  afterDestroy: AfterDestroyHookContext;
};

export type BuiltinHookName = keyof BuiltinHookContextMap;

export type GraphHookContext = BuiltinHookContextMap[BuiltinHookName] | (HookContextBase & Record<string, unknown>);

export type GraphHookHandler<TContext extends GraphHookContext = GraphHookContext> = (
  graph: Graph,
  context: TContext,
  options: Record<string, unknown>,
  api: PluginApi
) => unknown;

export type GraphPluginHooks = Partial<{
  [K in BuiltinHookName]: GraphHookHandler<BuiltinHookContextMap[K]>;
}> & Record<string, GraphHookHandler>;

export type PluginApi = {
  readonly id: string;
  getPluginState(pluginId?: string): Record<string, unknown> | undefined;
  setState(partialState: Record<string, unknown>): void;
  registerHook(hookName: string): void;
  registerCommand(
    commandName: string,
    handler: GraphCommandHandler,
    metadata?: GraphCommandMetadata
  ): string;
  unregisterCommand(commandName: string): void;
  listCommands(): GraphCommandEntry[];
  executeCommand(commandName: string, payload?: unknown): unknown;
};

export type GraphPlugin = {
  id: string;
  priority?: number;
  defaults?: Record<string, unknown>;
  before?: string[];
  after?: string[];
  capabilities?: PluginCapabilityFlags;
  install?: (graph: Graph, options: Record<string, unknown>, api: PluginApi) => void;
  commands?:
    | PluginCommandMap
    | ((plugin: GraphPlugin, options: Record<string, unknown>, api: PluginApi) => PluginCommandMap);
  hooks?: GraphPluginHooks;
};

export type GraphSeriesRenderer = (
  ctx: CanvasRenderingContext2D,
  plot: PlotLayout,
  series: Series,
  xScale: (value: number) => number,
  yScale: (value: number) => number
) => void;

export type BoundsStrategy = (dataBounds: DataBounds, options: GraphOptions) => DataBounds;

export class Registry {
  registerPlugin(plugin: GraphPlugin): void;
  unregisterPlugin(pluginId: string): void;
  getPlugin(pluginId: string): GraphPlugin | undefined;
  listPlugins(): GraphPlugin[];
}

export class HookRegistry {
  register(hookName: string): void;
  has(hookName: string): boolean;
  list(): string[];
}

export const BUILTIN_HOOKS: readonly string[];

export class ErrorBoundary {
  enabled: boolean;
  onError: ((args: { pluginId: string; phase: string; error: unknown; context: Record<string, unknown> }) => void) | null;
  constructor(settings?: Partial<PluginErrorBoundaryOptions>);
  handle(pluginId: string, phase: string, error: unknown, context?: Record<string, unknown>): void;
}

export class Graph {
  static registry: Registry;
  static renderers: Map<string, GraphSeriesRenderer>;
  static registerPlugin(plugin: GraphPlugin): void;
  static unregisterPlugin(pluginId: string): void;
  static registerRenderer(type: string, renderer: GraphSeriesRenderer): void;

  constructor(canvasTarget: string | HTMLCanvasElement, options?: GraphOptions);

  setOptions(options: GraphOptions): this;
  getOptions(): GraphOptions;
  setDomain(domain: DomainOverride): this;
  clearDomain(): this;
  getDomain(): DomainOverride;
  setBoundsStrategy(fn: BoundsStrategy | null): this;

  setData(series: Series[]): this;
  addSeries(series: Series): this;
  clear(): this;
  resize(width: number, height: number): this;
  render(args?: { force?: boolean }): this;
  destroy(): void;

  registerCommand(
    commandName: string,
    handler: GraphCommandHandler,
    metadata?: GraphCommandMetadata,
    pluginId?: string | null
  ): string;
  unregisterCommand(commandName: string): void;
  clearPluginCommands(pluginId: string): void;
  listCommands(): GraphCommandEntry[];
  executeCommand(commandName: string, payload?: unknown): unknown;
}

export function isPlainObject(value: unknown): boolean;
export function deepMerge<T extends Record<string, unknown>, U extends Record<string, unknown>>(target?: T, source?: U): T & U;
export function deepFreeze<T>(value: T): Readonly<T>;
export function clamp(value: number, min: number, max: number): number;
export function decimatePointsStride<T>(points: T[], maxPoints: number): T[];
export function resolveCanvas(target: string | HTMLCanvasElement): HTMLCanvasElement;
export function getDevicePixelRatio(): number;
export function normalizeSeriesData(rawData: Array<Partial<Series>>): Series[];
export function getDataBounds(seriesList: Array<{ points: Point[] }>): DataBounds;
export function drawLineSeries(
  ctx: CanvasRenderingContext2D,
  plot: PlotLayout,
  series: Series,
  xScale: (value: number) => number,
  yScale: (value: number) => number
): void;

export const DEFAULT_OPTIONS: Readonly<GraphOptions>;
export function validateDomain(domain: DomainOverride): void;
export function validateGraphOptions(options: GraphOptions): void;
export function validatePluginContract(plugin: GraphPlugin): void;
