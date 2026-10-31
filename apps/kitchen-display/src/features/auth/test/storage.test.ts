import { beforeEach, describe, expect, it } from "vitest";
import {
  clearTokens,
  getToken,
  logout,
  saveContext,
  saveTokens,
} from "@/shared/auth/storage";
import { STORAGE_KEYS } from "@/shared/constants/storage-keys";

describe("storage", () => {
  beforeEach(() => sessionStorage.clear());

  it("saves and clears tokens", () => {
    saveTokens("a");
    expect(getToken()).toBe("a");
    clearTokens();
    expect(getToken()).toBeNull();
  });

  it("saves context and logout clears all", () => {
    saveContext("t", "b");
    expect(sessionStorage.getItem(STORAGE_KEYS.tenant)).toBe("t");
    expect(sessionStorage.getItem(STORAGE_KEYS.branch)).toBe("b");
    saveContext("t", null);
    expect(sessionStorage.getItem(STORAGE_KEYS.branch)).toBeNull();
    logout();
    expect(sessionStorage.length).toBe(0);
  });
});
