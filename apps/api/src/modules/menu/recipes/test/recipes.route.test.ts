vi.mock("elysia", async (importOriginal) => {
  const actual = await importOriginal<typeof import("elysia")>();
  class FakeElysia { routes: Array<{method:string;path:string;handler: ((ctx:any)=>unknown) | undefined}> = []; constructor(_o:unknown={}){} use(_p:unknown){return this;} get(path:string,handler: ((ctx:any)=>unknown) | undefined){this.routes.push({method:"GET",path,handler});return this;} post(path:string,handler: ((ctx:any)=>unknown) | undefined){this.routes.push({method:"POST",path,handler});return this;} }
  return { ...actual, Elysia: FakeElysia };
});
const mocks=vi.hoisted(()=>({getItemRecipe:vi.fn().mockResolvedValue({ok:true}),setItemRecipe:vi.fn().mockResolvedValue({ok:true})}));
vi.mock("@/core/auth",()=>({requireAuthPlugin:()=>({})}));
vi.mock("../recipes.controller",()=>({recipesController:mocks}));
import {describe,expect,it,vi} from "vitest";
import {menuRecipesRouter} from "../recipes.route";
describe("recipes routes",()=>{it("executes both handlers",async()=>{const routes=(menuRecipesRouter as any).routes;const auth={tenantId:"t1"};const body={ingredients:[{inventoryItemId:"inv1"}]};await routes.find((r:any)=>r.method==="GET").handler({auth,params:{id:"i1"}});await routes.find((r:any)=>r.method==="POST").handler({auth,params:{id:"i1"},body});expect(mocks.getItemRecipe).toHaveBeenCalledWith(auth,"i1");expect(mocks.setItemRecipe).toHaveBeenCalledWith(auth,"i1",body.ingredients);});});
