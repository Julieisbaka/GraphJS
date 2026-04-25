/**
 * Encapsulates plugin error handling behaviour.
 *
 * When `enabled` is `true` (the default), errors are swallowed after invoking
 * the optional `onError` callback and logging to the console — keeping the
 * graph alive when a single plugin misbehaves.
 *
 * When `enabled` is `false`, errors are rethrown immediately so the caller
 * receives them directly.
 *
 * @example
 * const boundary = new ErrorBoundary({ enabled: true, onError: ({ pluginId, error }) => report(error) });
 * boundary.handle("my-plugin", "install", err);
 */
export class ErrorBoundary {
  /**
   * Creates a new plugin error boundary configuration wrapper.
   *
   * @param {{enabled?: boolean, onError?: ((args: {pluginId: string, phase: string, error: unknown, context: Record<string, unknown>}) => void) | null}} [settings={}]
   */
  constructor(settings = {}) {
    this.enabled = settings.enabled !== false;
    this.onError = settings.onError ?? null;
  }

  /**
   * Applies a partial update to the current boundary settings.
   *
   * @param {{enabled?: boolean, onError?: ((args: {pluginId: string, phase: string, error: unknown, context: Record<string, unknown>}) => void) | null}} [settings={}]
   * @returns {void}
   */
  configure(settings = {}) {
    if ("enabled" in settings) {
      this.enabled = settings.enabled !== false;
    }
    if ("onError" in settings) {
      this.onError = settings.onError ?? null;
    }
  }

  /**
   * Handles a plugin error using the configured boundary behavior.
   *
   * @param {string} pluginId - Plugin identifier.
   * @param {string} phase - Lifecycle phase that raised the error.
   * @param {unknown} error - Original thrown value.
   * @param {Record<string, unknown>} [context={}] - Additional contextual data for diagnostics.
   * @returns {void}
   */
  handle(pluginId, phase, error, context = {}) {
    if (!this.enabled) {
      throw error;
    }

    if (typeof this.onError === "function") {
      try {
        this.onError({ pluginId, phase, error, context });
      } catch {
        // no-op: avoid recursive error loops in error handlers
      }
    }

    // eslint-disable-next-line no-console
    console.error(`[GraphJS] Plugin error (${pluginId} @ ${phase})`, error);
  }
}
