import { beforeEach, describe, expect, it, vi } from "vitest";
const { configs, api } = vi.hoisted(() => ({ configs: [] as any[], api: { searchCustomers:vi.fn(), fetchCategories:vi.fn(), fetchMyBranch:vi.fn(), fetchTables:vi.fn() } }));
vi.mock("@tanstack/react-query",()=>({useQuery:(c:any)=>{configs.push(c); return c;}}));
vi.mock("@/features/menu/api/customers",()=>({searchCustomers:api.searchCustomers}));
vi.mock("@/features/menu/api/menu",()=>({fetchCategories:api.fetchCategories}));
vi.mock("@/features/menu/api/branch",()=>({fetchMyBranch:api.fetchMyBranch}));
vi.mock("@/features/menu/api/tables",()=>({fetchTables:api.fetchTables}));
import { useCustomerSearch } from "../useCustomerSearch";
import { useMenuCategories } from "../useMenuCategories";
import { useMyBranch } from "../useMyBranch";
import { useTables } from "../useTables";
beforeEach(()=>{configs.length=0; vi.clearAllMocks();});
describe("menu query hooks",()=>{
 it("covers query configuration and query functions",async()=>{
  useCustomerSearch("a"); expect(configs.at(-1).enabled).toBe(false); await configs.at(-1).queryFn();
  useCustomerSearch("ab"); expect(configs.at(-1).enabled).toBe(true); await configs.at(-1).queryFn();
  useMenuCategories(); await configs.at(-1).queryFn();
  useMyBranch(); await configs.at(-1).queryFn();
  useTables(false); expect(configs.at(-1).enabled).toBe(false); await configs.at(-1).queryFn();
  useTables(true); expect(configs.at(-1).refetchInterval).toBe(20000);
 });
});
