import { beforeEach, describe, expect, it } from "vitest";
import {
  getTerminalStationId,
  getVoidAlertsEnabled,
  setTerminalStationId,
  setVoidAlertsEnabled,
} from "../terminal-storage";
import {
  KDS_STATION_STORAGE_KEY,
  KDS_VOID_ALERT_STORAGE_KEY,
} from "../constants";

describe("terminal storage", () => {
  beforeEach(() => localStorage.clear());

  it("sets, reads and clears the selected station", () => {
    expect(getTerminalStationId()).toBeUndefined();
    setTerminalStationId("station-1");
    expect(localStorage.getItem(KDS_STATION_STORAGE_KEY)).toBe("station-1");
    expect(getTerminalStationId()).toBe("station-1");
    setTerminalStationId();
    expect(getTerminalStationId()).toBeUndefined();
  });

  it("defaults void alerts on and persists both boolean values", () => {
    expect(getVoidAlertsEnabled()).toBe(true);
    setVoidAlertsEnabled(false);
    expect(localStorage.getItem(KDS_VOID_ALERT_STORAGE_KEY)).toBe("false");
    expect(getVoidAlertsEnabled()).toBe(false);
    setVoidAlertsEnabled(true);
    expect(getVoidAlertsEnabled()).toBe(true);
  });
});
