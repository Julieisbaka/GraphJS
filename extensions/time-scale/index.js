/**
 * Formats timestamp values using Intl.DateTimeFormat.
 *
 * @param {number} value - Timestamp in milliseconds.
 * @param {string} locale - Locale string.
 * @param {Intl.DateTimeFormatOptions} options - Date/time format options.
 * @returns {string} Formatted label string.
 */
function defaultFormatter(value, locale, options) {
  return new Intl.DateTimeFormat(locale, options).format(new Date(value));
}

/**
 * First-party time-scale extension for GraphJS.
 *
 * Renders formatted time labels along the x-axis and exposes
 * a command (`time-scale.set`) for runtime option updates.
 */
export const timeScalePlugin = {
  id: "time-scale",
  priority: -2,
  defaults: {
    enabled: true,
    ticks: 5,
    locale: "en-US",
    dateTimeFormat: {
      month: "short",
      day: "2-digit"
    },
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
        }
        if (typeof payload.enabled === "boolean") {
          options.enabled = payload.enabled;
        }
        if (typeof payload.locale === "string") {
          options.locale = payload.locale;
        }
        graph.render();
        return { ticks: options.ticks, enabled: options.enabled, locale: options.locale };
      },
      {
        description: "Set time-scale ticks, locale, and enabled state",
        argsExample: { ticks: 6, locale: "en-US", enabled: true }
      }
    );
  },
  hooks: {
    afterRender(graph, context, options) {
      if (!options.enabled) {
        return;
      }

      const { layout, bounds } = context;
      const ticks = Math.max(2, Math.floor(options.ticks));
      const range = bounds.xMax - bounds.xMin;
      if (range <= 0) {
        return;
      }

      const ctx = graph.ctx;
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

      const formatter =
        typeof options.formatter === "function"
          ? options.formatter
          : (value) => defaultFormatter(value, options.locale, options.dateTimeFormat);

      for (let i = 0; i <= ticks; i += 1) {
        const t = i / ticks;
        const x = layout.left + t * layout.width;
        const value = bounds.xMin + range * t;
        let label = "invalid-time";
        try {
          label = formatter(value);
        } catch {
          label = "invalid-time";
        }
        ctx.fillText(label, x, layout.bottom + 6);
      }

      ctx.restore();
    }
  }
};
