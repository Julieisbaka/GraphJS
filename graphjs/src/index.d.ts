export type Point = { x: number; y: number };

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

export type PluginApi = {
  readonly id: string;
  /** @deprecated Use `getPluginState(api.id)` instead. Will be removed in a future release. */
  readonly state: Record<string, unknown>;
  getPluginState(pluginId?: string): Record<string, unknown> | undefined;
  setState(partialState: Record<string, unknown>): void;
  registerHook(hookName: string): void;
  registerCommand(
    commandName: string,
    handler: (payload?: unknown, graph?: Graph) => unknown,
    metadata?: Record<string, unknown>
  ): string;
  unregisterCommand(commandName: string): void;
  listCommands(): Array<{ name: string; pluginId: string | null; metadata: Record<string, unknown> }>;
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
    | Record<
        string,
        | ((payload: unknown, graph: Graph, options: Record<string, unknown>, api: PluginApi) => unknown)
        | {
            handler: (
              payload: unknown,
              graph: Graph,
              options: Record<string, unknown>,
              api: PluginApi
            ) => unknown;
            metadata?: Record<string, unknown>;
          }
      >
    | ((plugin: GraphPlugin, options: Record<string, unknown>, api: PluginApi) => Record<string, unknown>);
  hooks?: Record<
    string,
    (graph: Graph, context: Record<string, unknown>, options: Record<string, unknown>, api: PluginApi) => unknown
  >;
};

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

export class Graph {
  static registry: Registry;
  static registerPlugin(plugin: GraphPlugin): void;
  static unregisterPlugin(pluginId: string): void;

  constructor(canvasTarget: string | HTMLCanvasElement, options?: GraphOptions);

  setOptions(options: GraphOptions): this;
  getOptions(): GraphOptions;
  setDomain(domain: DomainOverride): this;
  clearDomain(): this;
  getDomain(): DomainOverride;

  setData(series: Series[]): this;
  addSeries(series: Series): this;
  clear(): this;
  resize(width: number, height: number): this;
  render(args?: { force?: boolean }): this;
  destroy(): void;

  registerCommand(
    commandName: string,
    handler: (payload?: unknown, graph?: Graph) => unknown,
    metadata?: Record<string, unknown>,
    pluginId?: string | null
  ): string;
  unregisterCommand(commandName: string): void;
  clearPluginCommands(pluginId: string): void;
  listCommands(): Array<{ name: string; pluginId: string | null; metadata: Record<string, unknown> }>;
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
export function getDataBounds(seriesList: Array<{ points: Point[] }>): {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
};

export const DEFAULT_OPTIONS: Readonly<GraphOptions>;
export function validateDomain(domain: DomainOverride): void;
export function validateGraphOptions(options: GraphOptions): void;
export function validatePluginContract(plugin: GraphPlugin): void;
