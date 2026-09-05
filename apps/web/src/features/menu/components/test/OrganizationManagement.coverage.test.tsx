import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  has: vi.fn(), invalidate: vi.fn(), success: vi.fn(), error: vi.fn(),
  org: { list:vi.fn(), tenants:vi.fn(), menus:vi.fn(), loyaltyTiers:vi.fn(), createMenu:vi.fn(), updateMenu:vi.fn(), removeMenu:vi.fn(), createLoyaltyTier:vi.fn(), removeLoyaltyTier:vi.fn() },
  menu: { listPriceRulesFor:vi.fn(), createPriceRule:vi.fn(), removePriceRule:vi.fn() },
}));
let data:any = {};
vi.mock('@pos/ui',()=>({ Button:({children,loading:_l,...p}:any)=><button {...p}>{children}</button>, Input:({label,...p}:any)=><label>{label}<input aria-label={label} {...p}/></label> }));
vi.mock('@/shared/auth/permissions',()=>({usePermissions:()=>({has:h.has})}));
vi.mock('@/shared/lib/api-client',()=>({apiClient:{}}));
vi.mock('@/shared/lib/query-client',()=>({queryClient:{invalidateQueries:h.invalidate}}));
vi.mock('@/shared/lib/notify',()=>({notifySuccess:h.success,notifyError:h.error}));
vi.mock('@pos/api-client',()=>({createOrganizationsApi:()=>h.org,createMenuApi:()=>h.menu}));
vi.mock('@tanstack/react-query',()=>({
 useQuery:({queryKey}:any)=>({data: data[JSON.stringify(queryKey)]}),
 useMutation:(cfg:any)=>({isPending:false,mutate:(arg?:any)=>Promise.resolve().then(()=>cfg.mutationFn(arg)).then(v=>cfg.onSuccess?.(v)).catch(e=>cfg.onError?.(e))}),
}));
import { OrganizationManagementSection } from '../OrganizationManagementSection';

const seed=()=>{
 const ms=[{organizationId:'o1',organization:{id:'o1',name:'Org One'}},{organizationId:'',organization:{id:'o2',name:'Org Two'}}];
 data={
  '["organizations"]':ms,
  '["organizations","o1","tenants"]':[{id:'t1',name:'Tenant'}],
  '["organizations","o1","menus"]':[
   {id:'m1',name:'Pub',status:'PUBLISHED',isDefault:true,organizationItems:[{id:'x',itemSku:'SKU1',categoryName:null}]},
   {id:'m2',name:'Draft',status:'DRAFT',isDefault:false,organizationItems:[]},
  ],
  '["organizations","o1","price-rules"]':[
   {id:'r1',menuItemSku:'SKU1',price:12,isPerCover:false},{id:'r2',menuItemSku:null,price:1,isPerCover:true}
  ],
  '["organizations","o1","loyalty-tiers"]':[
   {id:'l1',name:'Gold',discountPercent:10,discountFixed:null},{id:'l2',name:'Fixed',discountPercent:null,discountFixed:20}
  ],
  '["organizations","o2","tenants"]':[], '["organizations","o2","menus"]':[], '["organizations","o2","price-rules"]':[], '["organizations","o2","loyalty-tiers"]':[],
 };
};
describe('OrganizationManagementSection coverage',()=>{
 beforeEach(()=>{vi.clearAllMocks();h.has.mockReturnValue(true); seed(); Object.values(h.org).forEach((f:any)=>f.mockResolvedValue?.({})); Object.values(h.menu).forEach((f:any)=>f.mockResolvedValue?.({})); h.org.createMenu.mockResolvedValue({}); h.org.updateMenu.mockResolvedValue({}); h.org.removeMenu.mockResolvedValue({}); h.org.createLoyaltyTier.mockResolvedValue({}); h.org.removeLoyaltyTier.mockResolvedValue({}); h.menu.createPriceRule.mockResolvedValue({}); h.menu.removePriceRule.mockResolvedValue({});});
 it('covers permission and missing membership guards',()=>{ h.has.mockReturnValue(false); const a=render(<OrganizationManagementSection/>); expect(screen.getByText(/need the organization:manage/)).toBeTruthy(); a.unmount(); h.has.mockReturnValue(true); data['["organizations"]']=[]; render(<OrganizationManagementSection/>); expect(screen.getByText(/not linked/)).toBeTruthy(); });
 it('covers populated organization CRUD and selectors',async()=>{
  render(<OrganizationManagementSection/>);
  expect(screen.getByText(/Org One · 1 member/)).toBeTruthy(); expect(screen.getAllByText(/SKU1/).length).toBeGreaterThan(0); expect(screen.getByText(/No SKUs/)).toBeTruthy(); expect(screen.getByText('10% off',{exact:false})).toBeTruthy(); expect(screen.getByText('₹20.00 off',{exact:false})).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Menu name'),{target:{value:' New Menu '}}); fireEvent.change(screen.getByPlaceholderText('PIZZA-MARGHERITA, DRINK-COLA'),{target:{value:' A, B\n C '}}); fireEvent.click(screen.getByLabelText('Default')); fireEvent.click(screen.getByLabelText('Publish now')); fireEvent.click(screen.getByRole('button',{name:'Create organization menu'}));
  fireEvent.click(screen.getByRole('button',{name:'Draft'})); fireEvent.click(screen.getByRole('button',{name:'Publish'})); fireEvent.click(screen.getAllByRole('button',{name:'Delete'})[0]);
  fireEvent.change(screen.getByLabelText('Menu item SKU'),{target:{value:' S1 '}}); fireEvent.change(screen.getByLabelText('Price'),{target:{value:'99'}}); fireEvent.click(screen.getByRole('button',{name:'Create organization price'})); fireEvent.click(screen.getAllByRole('button',{name:'Remove'})[0]);
  fireEvent.change(screen.getByLabelText('Tier name'),{target:{value:' Tier '}}); fireEvent.click(screen.getByRole('button',{name:'Create tier'})); fireEvent.change(screen.getByText('Discount type').querySelector('select')!,{target:{value:'FIXED'}}); fireEvent.change(screen.getByLabelText('Amount'),{target:{value:'15'}}); fireEvent.click(screen.getByRole('button',{name:'Create tier'})); fireEvent.click(screen.getAllByRole('button',{name:'Remove'})[1]);
  await waitFor(()=>expect(h.org.createMenu).toHaveBeenCalled());
  expect(h.org.createMenu.mock.calls[0][1]).toMatchObject({name:'New Menu',status:'PUBLISHED',isDefault:false,items:[{itemSku:'A',sortOrder:0},{itemSku:'B',sortOrder:1},{itemSku:'C',sortOrder:2}]});
  expect(h.org.updateMenu).toHaveBeenCalledTimes(2); expect(h.menu.createPriceRule).toHaveBeenCalled(); await waitFor(()=>expect(h.org.createLoyaltyTier).toHaveBeenCalledTimes(2));
  fireEvent.change(screen.getAllByRole('combobox')[0],{target:{value:'o2'}}); expect(screen.getByText(/Org Two · 0 member/)).toBeTruthy();
 });
 it('covers mutation errors',async()=>{ h.org.createMenu.mockRejectedValueOnce(new Error('m')); h.menu.createPriceRule.mockRejectedValueOnce(new Error('r')); h.org.createLoyaltyTier.mockRejectedValueOnce(new Error('l')); h.org.removeLoyaltyTier.mockRejectedValueOnce(new Error('d')); render(<OrganizationManagementSection/>); fireEvent.change(screen.getByLabelText('Menu name'),{target:{value:'X'}});fireEvent.change(screen.getByPlaceholderText('PIZZA-MARGHERITA, DRINK-COLA'),{target:{value:'S'}});fireEvent.click(screen.getByRole('button',{name:'Create organization menu'})); fireEvent.change(screen.getByLabelText('Menu item SKU'),{target:{value:'S'}});fireEvent.change(screen.getByLabelText('Price'),{target:{value:'1'}});fireEvent.click(screen.getByRole('button',{name:'Create organization price'})); fireEvent.change(screen.getByLabelText('Tier name'),{target:{value:'T'}});fireEvent.click(screen.getByRole('button',{name:'Create tier'}));fireEvent.click(screen.getAllByRole('button',{name:'Remove'})[1]); await waitFor(()=>expect(h.error).toHaveBeenCalledTimes(4)); });
});
