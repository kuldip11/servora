import { useEffect } from "react";
import {
  resolveFrontendTelemetryEndpoint,
  startFrontendTelemetry,
  type FrontendTelemetryOptions,
} from "@pos/observability";

export const FrontendTelemetry = () => {
  useEffect(() => {
    const options: FrontendTelemetryOptions = {
      app: "servora-web",
      sampleRate: import.meta.env.PROD ? 0.25 : 1,
      endpoint: resolveFrontendTelemetryEndpoint(
        import.meta.env.VITE_API_URL as string | undefined,
        import.meta.env.VITE_FRONTEND_TELEMETRY_URL as string | undefined,
      ),
      ...(import.meta.env.DEV
        ? { onEvent: (event) => console.debug("[telemetry]", event) }
        : {}),
    };
    return startFrontendTelemetry(options);
  }, []);

  return null;
};
