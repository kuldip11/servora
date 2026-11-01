export type WebVitalName = "CLS" | "INP" | "LCP" | "TTFB";

export interface WebVitalMetric {
  name: WebVitalName;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  navigationType?: string;
}

export interface FrontendTelemetryEvent {
  type:
    "web-vital" | "error" | "unhandled-rejection" | "react-error" | "ui-error";
  app: string;
  timestamp: string;
  metric?: WebVitalMetric;
  message?: string;
  route?: string;
  componentStack?: string;
  code?: string;
  status?: number;
  requestId?: string;
  operation?: string;
  unknownFields?: string[];
}

export interface FrontendUiErrorDetail {
  message?: string;
  code?: string;
  status?: number;
  requestId?: string;
  operation?: string;
  unknownFields?: string[];
}

export const reportFrontendUiError = (detail: FrontendUiErrorDetail) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<FrontendUiErrorDetail>("servora:ui-error", { detail }),
  );
};

export interface FrontendTelemetryOptions {
  app: string;
  endpoint?: string;
  sampleRate?: number;
  onEvent?: (event: FrontendTelemetryEvent) => void;
}

const ratingFor = (
  name: WebVitalName,
  value: number,
): WebVitalMetric["rating"] => {
  const thresholds: Record<WebVitalName, readonly [number, number]> = {
    CLS: [0.1, 0.25],
    INP: [200, 500],
    LCP: [2500, 4000],
    TTFB: [800, 1800],
  };
  const [good, poor] = thresholds[name];
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
};

const emit = (
  event: FrontendTelemetryEvent,
  options: FrontendTelemetryOptions,
) => {
  options.onEvent?.(event);
  if (!options.endpoint) return;
  const payload = JSON.stringify(event);
  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      options.endpoint,
      new Blob([payload], { type: "application/json" }),
    );
    return;
  }
  void fetch(options.endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
};

const metricEvent = (
  app: string,
  name: WebVitalName,
  value: number,
): FrontendTelemetryEvent => ({
  type: "web-vital",
  app,
  timestamp: new Date().toISOString(),
  route: window.location.pathname,
  metric: {
    name,
    value: Number(value.toFixed(name === "CLS" ? 3 : 1)),
    rating: ratingFor(name, value),
    ...(performance.getEntriesByType("navigation")[0]?.entryType
      ? {
          navigationType:
            performance.getEntriesByType("navigation")[0]!.entryType,
        }
      : {}),
  },
});

export const startFrontendTelemetry = (options: FrontendTelemetryOptions) => {
  if (
    typeof window === "undefined" ||
    typeof PerformanceObserver === "undefined"
  ) {
    return () => undefined;
  }
  const sampleRate = options.sampleRate ?? 1;
  if (Math.random() > sampleRate) return () => undefined;

  const observers: PerformanceObserver[] = [];
  let clsValue = 0;

  const observe = (
    type: string,
    callback: (entry: PerformanceEntry) => void,
  ) => {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(callback);
      });
      observer.observe({ type, buffered: true });
      observers.push(observer);
    } catch {
      // Browsers may not support every performance entry type.
    }
  };

  observe("largest-contentful-paint", (entry) => {
    emit(metricEvent(options.app, "LCP", entry.startTime), options);
  });

  observe("layout-shift", (entry) => {
    const shift = entry as PerformanceEntry & {
      value?: number;
      hadRecentInput?: boolean;
    };
    if (!shift.hadRecentInput && typeof shift.value === "number")
      clsValue += shift.value;
  });

  observe("event", (entry) => {
    const interaction = entry as PerformanceEntry & {
      duration?: number;
      interactionId?: number;
    };
    if (!interaction.interactionId || typeof interaction.duration !== "number")
      return;
    emit(metricEvent(options.app, "INP", interaction.duration), options);
  });

  const navigation = performance.getEntriesByType("navigation")[0] as
    PerformanceNavigationTiming | undefined;
  if (navigation) {
    emit(metricEvent(options.app, "TTFB", navigation.responseStart), options);
  }

  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      emit(metricEvent(options.app, "CLS", clsValue), options);
    }
  };
  const onError = (event: ErrorEvent) => {
    emit(
      {
        type: "error",
        app: options.app,
        timestamp: new Date().toISOString(),
        route: window.location.pathname,
        message: event.message,
      },
      options,
    );
  };
  const onReactError = (event: Event) => {
    const detail = (
      event as CustomEvent<{
        message?: string;
        componentStack?: string;
      }>
    ).detail;
    emit(
      {
        type: "react-error",
        app: options.app,
        timestamp: new Date().toISOString(),
        route: window.location.pathname,
        message: detail?.message || "React render error",
        ...(detail?.componentStack
          ? { componentStack: detail.componentStack }
          : {}),
      },
      options,
    );
  };

  const onUiError = (event: Event) => {
    const detail = (event as CustomEvent<FrontendUiErrorDetail>).detail;
    emit(
      {
        type: "ui-error",
        app: options.app,
        timestamp: new Date().toISOString(),
        route: window.location.pathname,
        ...(detail?.message ? { message: detail.message } : {}),
        ...(detail?.code ? { code: detail.code } : {}),
        ...(detail?.status ? { status: detail.status } : {}),
        ...(detail?.requestId ? { requestId: detail.requestId } : {}),
        ...(detail?.operation ? { operation: detail.operation } : {}),
        ...(detail?.unknownFields?.length
          ? { unknownFields: [...new Set(detail.unknownFields)].slice(0, 32) }
          : {}),
      },
      options,
    );
  };

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    const message =
      event.reason instanceof Error
        ? event.reason.message
        : String(event.reason);
    emit(
      {
        type: "unhandled-rejection",
        app: options.app,
        timestamp: new Date().toISOString(),
        route: window.location.pathname,
        message,
      },
      options,
    );
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onUnhandledRejection);
  window.addEventListener("servora:react-error", onReactError);
  window.addEventListener("servora:ui-error", onUiError);

  return () => {
    observers.forEach((observer) => observer.disconnect());
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onUnhandledRejection);
    window.removeEventListener("servora:react-error", onReactError);
    window.removeEventListener("servora:ui-error", onUiError);
  };
};

export const resolveFrontendTelemetryEndpoint = (
  apiBaseUrl?: string,
  override?: string,
): string => {
  if (override?.trim()) return override.trim();
  const base = (apiBaseUrl?.trim() || "/api").replace(/\/$/, "");
  return base.endsWith("/api")
    ? `${base}/telemetry/frontend`
    : `${base}/api/telemetry/frontend`;
};
