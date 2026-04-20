import type { DataBounds, DomainOverride, PlotLayout, Point, Series, SeriesDefaults } from "./index.d.ts";

export function isPlainObject(value: unknown): boolean;
export function deepMerge<T extends Record<string, unknown>, U extends Record<string, unknown>>(target?: T, source?: U): T & U;
export function deepFreeze<T>(value: T): Readonly<T>;
export function clamp(value: number, min: number, max: number): number;
export function decimatePointsStride<T>(points: T[], maxPoints: number): T[];
export function resolveCanvas(target: string | HTMLCanvasElement): HTMLCanvasElement;
export function getDevicePixelRatio(): number;
export function normalizeSeriesData(rawData: Array<Partial<Series>>, seriesDefaults?: Partial<SeriesDefaults>): Series[];
export function getDataBounds(seriesList: Array<{ points: Point[] }>): DataBounds;
export function makeLinearScale(domainMin: number, domainMax: number, rangeMin: number, rangeMax: number): (value: number) => number;
export function invertLinearScale(px: number, domainMin: number, domainMax: number, rangeMin: number, rangeMax: number): number;
export function clampBounds(view: DataBounds, full: DataBounds): DataBounds;
export function applyDomainOverride(dataBounds: DataBounds, domain: DomainOverride): DataBounds;
export function filterVisibleSeries<T extends { visible: boolean }>(seriesList: T[]): T[];
export function drawLineSeries(
  ctx: CanvasRenderingContext2D,
  plot: PlotLayout,
  series: Series,
  xScale: (value: number) => number,
  yScale: (value: number) => number
): void;
