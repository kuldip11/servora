import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h=vi.hoisted(()=>({invalidate:vi.fn(),success:vi.fn(),error:vi.fn(),create:vi.fn(),remove:vi.fn()}));
let inventory:any[]|undefined=[]; let subs:any[]|undefined=[]; let pending=false;
vi.mock('@pos/ui',()=>({
 Button:({children,loading:_l,...p}:any)=><button {...p}>{children}</button>,
 Card:({children}:any)=><div>{children}</div>,
 Input:({label,...p}:any)=><label>{label}<input aria-label={label} {...p}/></label>,
 Select:({label,options=[],...p}:any)=><label>{label}<select aria-label={label} {...p}>{options.map((o:any)=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>,
}));
vi.mock('@/features/inventory/hooks/useInventoryItems',()=>({useInventoryItems:()=>({data: inventory===undefined?undefined:{items:inventory}})}));
vi.mock('@/features/menu/hooks/useSubRecipes',()=>({useSubRecipes:()=>({data:subs}),subRecipeQueryKey:()=>['subrecipes']}));
vi.mock('@/features/menu/services/menu-sub-recipes.service',()=>({menuSubRecipesService:{create:h.create,remove:h.remove}}));
vi.mock('@/shared/lib/notify',()=>({notifyError:h.error,notifySuccess:h.success}));
vi.mock('@tanstack/react-query',()=>({
 useQueryClient:()=>({invalidateQueries:h.invalidate}),
 useMutation:(cfg:any)=>({isPending:pending,mutate:(arg?:any)=>Promise.resolve().then(()=>cfg.mutationFn(arg)).then(v=>cfg.onSuccess?.(v)).catch(e=>cfg.onError?.(e))}),
}));
import { SubRecipeManager } from '../SubRecipeManager';

describe('SubRecipeManager coverage',()=>{
 beforeEach(()=>{vi.clearAllMocks();pending=false;inventory=[{id:'i1',name:'Flour',unit:'KG'},{id:'i2',name:'Milk',unit:'L'}];subs=[{id:'s1',name:'Sauce',yieldQuantity:2,yieldUnit:'L',yieldPercent:80},{id:'s2',name:'Dough',yieldQuantity:1,yieldUnit:'KG',yieldPercent:null}];h.create.mockResolvedValue({});h.remove.mockResolvedValue({});});
 it('covers listing deletion and full inventory ingredient create/edit/remove',async()=>{
  render(<SubRecipeManager/>); expect(screen.getByText(/80% yield/)).toBeTruthy(); fireEvent.click(screen.getByLabelText('Delete Sauce')); await waitFor(()=>expect(h.remove).toHaveBeenCalledWith('s1'));
  fireEvent.click(screen.getByRole('button',{name:/New sub-recipe/}));
  fireEvent.change(screen.getByLabelText('Name'),{target:{value:' Component '}}); fireEvent.change(screen.getByLabelText('Batch yield'),{target:{value:'3'}}); fireEvent.change(screen.getByLabelText('Yield unit'),{target:{value:'LITERS'}}); fireEvent.change(screen.getByLabelText('Yield % (optional)'),{target:{value:'75'}});
  fireEvent.click(screen.getByRole('button',{name:'Add ingredient'}));
  let selects=screen.getAllByRole('combobox');
  fireEvent.change(selects[2],{target:{value:'i2'}}); fireEvent.change(screen.getByLabelText('Sub-recipe ingredient quantity 1'),{target:{value:'2.5'}}); fireEvent.change(selects[3],{target:{value:'ML'}});
  fireEvent.click(screen.getByRole('button',{name:'Create component'})); await waitFor(()=>expect(h.create).toHaveBeenCalled());
  expect(h.create.mock.calls[0][0]).toMatchObject({name:'Component',yieldQuantity:3,yieldUnit:'LITERS',yieldPercent:75,ingredients:[{inventoryItemId:'i2',quantity:2.5,unit:'ML'}]}); expect(h.success).toHaveBeenCalledWith('Sub-recipe created');
 });
 it('covers sub-recipe source selection and ingredient removal/validation',async()=>{
  render(<SubRecipeManager/>); fireEvent.click(screen.getByRole('button',{name:/New sub-recipe/})); fireEvent.click(screen.getByRole('button',{name:'Create component'})); expect(h.error).toHaveBeenCalledWith(undefined,expect.stringContaining('Name, positive yield'));
  fireEvent.click(screen.getByRole('button',{name:'Add ingredient'})); let selects=screen.getAllByRole('combobox'); fireEvent.change(selects[1],{target:{value:'sub'}}); selects=screen.getAllByRole('combobox'); fireEvent.change(selects[2],{target:{value:'s2'}}); fireEvent.click(screen.getAllByRole('button').find((b)=>b.querySelector('svg') && !/New sub-recipe/.test(b.textContent||''))!);
 });
 it('falls back to a sub recipe when inventory is empty and reports when neither exists',()=>{
  inventory=[]; render(<SubRecipeManager/>); fireEvent.click(screen.getByRole('button',{name:/New sub-recipe/})); fireEvent.click(screen.getByRole('button',{name:'Add ingredient'})); expect(screen.getByLabelText('Sub-recipe ingredient quantity 1')).toBeTruthy();
 });
 it('reports missing ingredient sources and mutation errors',async()=>{
  inventory=[];subs=[];h.create.mockRejectedValueOnce(new Error('create'));h.remove.mockRejectedValueOnce(new Error('delete')); render(<SubRecipeManager/>); fireEvent.click(screen.getByRole('button',{name:/New sub-recipe/})); fireEvent.click(screen.getByRole('button',{name:'Add ingredient'})); expect(h.error).toHaveBeenCalledWith(undefined,expect.stringContaining('Add raw inventory'));
  // render a second instance with a removable row to exercise remove error
  subs=[{id:'s1',name:'Sauce',yieldQuantity:1,yieldUnit:'KG',yieldPercent:null}]; const second=render(<SubRecipeManager/>); fireEvent.click(second.getByLabelText('Delete Sauce')); await waitFor(()=>expect(h.error).toHaveBeenCalledWith(expect.any(Error),'Could not delete sub-recipe'));
 });
});
