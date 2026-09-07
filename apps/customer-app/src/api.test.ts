import { describe, expect, it } from "vitest";
import * as api from "./api";
describe("api barrel",()=>{it("exports customer API surfaces",()=>{expect(typeof api.createCustomerSession).toBe("function");expect(typeof api.getCustomerMenu).toBe("function");expect(typeof api.createCustomerOrder).toBe("function");expect(typeof api.createCustomerRequest).toBe("function");});});
