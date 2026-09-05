import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { saveMutate, resetMutate } = vi.hoisted(() => ({ saveMutate: vi.fn(), resetMutate: vi.fn() }));
let branches: any[] | undefined;
let overrides: any[] | undefined;
let loading = false;

vi.mock('@/features/branches/hooks/useBranches', () => ({ useBranches: () => ({ data: branches }) }));
vi.mock('@/features/menu/hooks/useMenuItemBranchOverrides', () => ({ useMenuItemBranchOverrides: () => ({ data: overrides, isLoading: loading }) }));
vi.mock('@/features/menu/hooks/useSaveBranchOverride', () => ({ useSaveBranchOverride: () => ({ mutate: saveMutate, isPending: false }) }));
vi.mock('@/features/menu/hooks/useResetBranchOverride', () => ({ useResetBranchOverride: () => ({ mutate: resetMutate }) }));

import { BranchOverridesPanel } from '../BranchOverridesPanel';

describe('BranchOverridesPanel coverage', () => {
 beforeEach(() => { vi.clearAllMocks(); loading=false; branches=[{id:'b1',name:'Main'},{id:'b2',name:'Second'}]; overrides=[{branchId:'b1',price:150,taxRate:5,prepTimeMinutes:10,status:'INACTIVE',isHidden:true,availabilityReason:'x'}]; saveMutate.mockImplementation((_a:any, opts:any)=>opts?.onSuccess?.()); });
 it('covers loading and empty', () => { loading=true; const a=render(<BranchOverridesPanel itemId="i" basePrice={100} baseTaxRate={10} basePrepTimeMinutes={null}/>); expect(screen.getByText('Loading branches…')).toBeTruthy(); a.unmount(); loading=false; branches=[]; render(<BranchOverridesPanel itemId="i" basePrice={100} baseTaxRate={10} basePrepTimeMinutes={5}/>); expect(screen.getByText('No branches set up yet.')).toBeTruthy(); });
 it('covers override reset/edit fields/save and default branch cancel', () => {
  render(<BranchOverridesPanel itemId="i" basePrice={100} baseTaxRate={10} basePrepTimeMinutes={5}/>);
  expect(screen.getByText('Hidden')).toBeTruthy(); expect(screen.getByText('₹100')).toBeTruthy();
  fireEvent.click(screen.getByTitle('Reset to default')); expect(resetMutate).toHaveBeenCalledWith('b1');
  fireEvent.click(screen.getAllByText('Edit')[0]);
  fireEvent.change(screen.getByLabelText('Branch price override'),{target:{value:'175'}});
  fireEvent.change(screen.getByLabelText('Branch tax rate override'),{target:{value:'12'}});
  fireEvent.change(screen.getByLabelText('Branch prep time override (minutes)'),{target:{value:'20'}});
  const selects=screen.getAllByRole('combobox'); fireEvent.change(selects[0],{target:{value:'ACTIVE'}});
  fireEvent.click(screen.getByLabelText('Hide at this branch'));
  fireEvent.change(screen.getByLabelText('Branch override reason'),{target:{value:'reason'}});
  fireEvent.click(screen.getByRole('button',{name:'Save'}));
  expect(saveMutate).toHaveBeenCalled();
  fireEvent.click(screen.getAllByText('Edit')[1]); fireEvent.click(screen.getByRole('button',{name:'Cancel'}));
 });
});
