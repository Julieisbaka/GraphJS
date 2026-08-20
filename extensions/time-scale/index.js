const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const YEAR = 365 * DAY;

function adaptiveDateTimeFormat(range) {
  if (range < MINUTE) {
    return { minute: "2-digit", second: "2-digit" };
  }
  if (range < HOUR) {
    return { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false };
  }
  if (range < DAY) {
    return { hour: "2-digit", minute: "2-digit", hour12: false };
  }
  if (range < 30 * DAY) {
    return { month: "short", day: "numeric" };
  }
  if (range < YEAR) {
    return { month: "short", year: "numeric" };
  }
  return { year: "numeric" };
}

function formatTimestamp(value, locale, dateTimeFormat, timeZone, range) {
  const format = {
    ...(dateTimeFormat || adaptiveDateTimeFormat(range))
  };
  if (timeZone) format.timeZone = timeZone === "UTC" ? "UTC" : timeZone;
  return new Intl.DateTimeFormat(locale, format).format(new Date(value));
}

function getTickCount(options, width) {
  if (Number.isFinite(options.ticks)) {
    return Math.max(2, Math.floor(options.ticks));
  }
  const spacing = Math.max(24, Number(options.minLabelSpacing) || 72);
  const maxTicks = Number.isFinite(options.maxTicks) ? Math.max(2, Math.floor(options.maxTicks)) : 12;
  return Math.max(2, Math.min(maxTicks, Math.floor(width / spacing)));
}

function selectNonOverlapping(labels, minSpacing) {
  if (labels.length <= 2) return labels;
  const selected = [labels[0]];
  for (let i = 1; i < labels.length - 1; i += 1) {
    const previous = selected[selected.length - 1];
    const candidate = labels[i];
    const required = (previous.width + candidate.width) / 2 + minSpacing;
    if (candidate.x - previous.x >= required) selected.push(candidate);
  }

  const last = labels[labels.length - 1];
  while (selected.length > 1) {
    const previous = selected[selected.length - 1];
    if (last.x - previous.x >= (previous.width + last.width) / 2 + minSpacing) break;
    selected.pop();
  }
  selected.push(last);
  return selected;
}

/**
 * First-party time-scale extension for GraphJS.
 *
 * Renders adaptive, timezone-aware time labels along the x-axis and exposes
 * `time-scale.set` for runtime option updates.
 */
export const timeScalePlugin = {
  id: "time-scale",
  priority: -2,
  defaults: {
    enabled: true,
    ticks: "auto",
    maxTicks: 12,
    minLabelSpacing: 18,
    locale: "en-US",
    timeZone: undefined,
    dateTimeFormat: null,
    color: "#475569",
    font: "11px Segoe UI, sans-serif",
    formatter: null,
    showAxisLine: false,
    axisLineColor: "#94a3b8",
    axisLineWidth: 1
  },
  install(graph, options, api) {
    api.registerCommand(
      "set",
      (payload = {}) => {
        if (Number.isFinite(payload.ticks)) {
          options.ticks = Math.max(2, Math.floor(payload.ticks));
        } else if (payload.ticks === "auto") {
          options.ticks = "auto";
        }
        if (Number.isFinite(payload.maxTicks)) {
          options.maxTicks = Math.max(2, Math.floor(payload.maxTicks));
        }
        if (Number.isFinite(payload.minLabelSpacing)) {
          options.minLabelSpacing = Math.max(0, payload.minLabelSpacing);
        }
        if (typeof payload.enabled === "boolean") options.enabled = payload.enabled;
        if (typeof payload.locale === "string") options.locale = payload.locale;
        if (typeof payload.timeZone === "string" || payload.timeZone === null) options.timeZone = payload.timeZone || undefined;
        if (payload.dateTimeFormat && typeof payload.dateTimeFormat === "object") {
          options.dateTimeFormat = { ...payload.dateTimeFormat };
        }
        api.requestRender();
        return {
          ticks: options.ticks,
          maxTicks: options.maxTicks,
          minLabelSpacing: options.minLabelSpacing,
          enabled: options.enabled,
          locale: options.locale,
          timeZone: options.timeZone
        };
      },
      {
        description: "Set time-scale density, timezone, locale, and enabled state",
        argsExample: { ticks: "auto", timeZone: "UTC", enabled: true }
      }
    );
  },
  hooks: {
    afterRender(graph, context, options) {
      if (!options.enabled) return;

      const { layout, bounds } = context;
      const range = bounds.xMax - bounds.xMin;
      if (range <= 0 || !layout) return;

      const ticks = getTickCount(options, layout.width);
      const ctx = graph.ctx;
      const formatter = typeof options.formatter === "function"
        ? options.formatter
        : (value) => formatTimestamp(value, options.locale, options.dateTimeFormat, options.timeZone, range);

      ctx.save();
      ctx.font = options.font;
      ctx.fillStyle = options.color;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      if (options.showAxisLine) {
        ctx.strokeStyle = options.axisLineColor;
        ctx.lineWidth = options.axisLineWidth;
        ctx.beginPath();
        ctx.moveTo(layout.left, layout.bottom);
        ctx.lineTo(layout.right, layout.bottom);
        ctx.stroke();
      }

      const labels = [];
      for (let i = 0; i <= ticks; i += 1) {
        const t = i / ticks;
        const x = layout.left + t * layout.width;
        const value = bounds.xMin + range * t;
        let text = "invalid-time";
        try {
          text = String(formatter(value, { range, timeZone: options.timeZone, index: i, count: ticks + 1 }));
        } catch {
          text = "invalid-time";
        }
        labels.push({ x, text, width: ctx.measureText(text).width });
      }

      for (const label of selectNonOverlapping(labels, Math.max(0, options.minLabelSpacing))) {
        ctx.fillText(label.text, label.x, layout.bottom + 6);
      }
      ctx.restore();
    }
  }
};

export { adaptiveDateTimeFormat, formatTimestamp, getTickCount, selectNonOverlapping };
