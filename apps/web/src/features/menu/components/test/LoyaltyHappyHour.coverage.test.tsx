import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invalidateQueries, api, customers } = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  api: { createLoyaltyTier: vi.fn(), removeLoyaltyTier: vi.fn(), listLoyaltyTiers: vi.fn(), createHappyHourRule: vi.fn() },
  customers: { list: vi.fn(), create: vi.fn(), assignTier: vi.fn() },
}));
let queryData: unknown[] = [];

vi.mock('@pos/ui', () => ({
  Button: ({ children, loading: _loading, ...props }: any) => <button {...props}>{children}</button>,
  Input: ({ label, ...props }: any) => <label>{label}<input aria-label={label} {...props} /></label>,
  Select: ({ label, options = [], ...props }: any) => <label>{label}<select aria-label={props['aria-label'] ?? label} {...props}>{options.map((o:any)=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>,
}));
vi.mock('@pos/api-client', () => ({
  createMenuApi: () => api,
  createCustomersApi: () => customers,
}));
vi.mock('@/shared/lib/api-client', () => ({ apiClient: {} }));
vi.mock('@/features/menu/hooks/useMenuCategories', () => ({ useMenuCategories: () => ({ data: [{ id:'cat1', name:'Food' }] }) }));
vi.mock('@/features/menu/hooks/useMenus', () => ({ useMenus: () => ({ data: [{ id:'menu1', name:'Dinner' }] }) }));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries }),
  useQuery: ({ queryKey }: any) => ({ data: queryKey[1] === 'tiers' ? queryData[0] : queryData[1] }),
  useMutation: (config: any) => ({
    isPending: false,
    mutate: (arg?: any) => {
      Promise.resolve().then(() => config.mutationFn(arg)).then((v) => config.onSuccess?.(v)).catch((e) => config.onError?.(e));
    },
  }),
}));

import { LoyaltySection } from '../LoyaltySection';
import { HappyHourSection } from '../HappyHourSection';

describe('loyalty and happy-hour coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryData = [[
      { id:'t1', name:'Gold', discountPercent:10, discountFixed:null },
      { id:'t2', name:'VIP', discountPercent:null, discountFixed:50 },
    ], [
      { id:'c1', name:'A', phone:'123', email:null, loyaltyTierId:'t1' },
      { id:'c2', name:'B', phone:null, email:'b@x.test', loyaltyTierId:null },
      { id:'c3', name:'C', phone:null, email:null, loyaltyTierId:null },
    ]];
    api.createLoyaltyTier.mockResolvedValue({});
    api.removeLoyaltyTier.mockResolvedValue({});
    customers.create.mockResolvedValue({});
    customers.assignTier.mockResolvedValue({});
    api.createHappyHourRule.mockResolvedValue([{}, {}]);
  });

  it('covers loyalty create, fixed discounts, customers, assignment and deletion', async () => {
    render(<LoyaltySection />);
    expect(screen.getByText('10% off')).toBeTruthy();
    expect(screen.getByText('50 off')).toBeTruthy();
    expect(screen.getByText('No contact')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Tier name'), { target:{ value:'Silver' } });
    fireEvent.change(screen.getByLabelText('Discount'), { target:{ value:'FIXED' } });
    fireEvent.change(screen.getByLabelText('Amount'), { target:{ value:'25' } });
    fireEvent.click(screen.getByRole('button', { name:'Add tier' }));

    fireEvent.change(screen.getByLabelText('Name'), { target:{ value:'New Customer' } });
    fireEvent.change(screen.getByLabelText('Phone'), { target:{ value:'999' } });
    fireEvent.change(screen.getByLabelText('Email'), { target:{ value:'n@x.test' } });
    fireEvent.change(screen.getByLabelText('Loyalty tier'), { target:{ value:'t2' } });
    fireEvent.click(screen.getByRole('button', { name:'Add customer' }));

    fireEvent.change(screen.getByLabelText('Loyalty tier for A'), { target:{ value:'' } });
    fireEvent.click(screen.getAllByRole('button', { name:'Delete' })[0]);

    await waitFor(() => expect(api.createLoyaltyTier).toHaveBeenCalled());
    expect(api.createLoyaltyTier.mock.calls[0][0]).toMatchObject({ name:'Silver', discountFixed:25 });
    await waitFor(() => expect(customers.create).toHaveBeenCalled());
    expect(customers.assignTier).toHaveBeenCalledWith('c1', null);
    expect(api.removeLoyaltyTier).toHaveBeenCalledWith('t1');
  });

  it('covers percentage loyalty create with optional customer fields omitted', async () => {
    queryData = [[], []];
    render(<LoyaltySection />);
    fireEvent.change(screen.getByLabelText('Tier name'), { target:{ value:'Basic' } });
    fireEvent.click(screen.getByRole('button', { name:'Add tier' }));
    fireEvent.change(screen.getByLabelText('Name'), { target:{ value:'Only Name' } });
    fireEvent.click(screen.getByRole('button', { name:'Add customer' }));
    await waitFor(() => expect(api.createLoyaltyTier).toHaveBeenCalled());
    expect(api.createLoyaltyTier.mock.calls[0][0]).toMatchObject({ discountPercent:5 });
    await waitFor(() => expect(customers.create).toHaveBeenCalledWith({ name:'Only Name' }));
  });

  it('covers happy-hour category/menu success and API/fallback errors', async () => {
    const { unmount } = render(<HappyHourSection />);
    fireEvent.change(screen.getByLabelText('Category'), { target:{ value:'cat1' } });
    fireEvent.change(screen.getByLabelText('Start date (optional)'), { target:{ value:'2026-09-01' } });
    fireEvent.change(screen.getByLabelText('End date (optional)'), { target:{ value:'2026-09-30' } });
    fireEvent.click(screen.getByRole('button', { name:'Create happy hour' }));
    await waitFor(() => expect(screen.getByText('Created 2 price rules.')).toBeTruthy());
    expect(api.createHappyHourRule.mock.calls[0][0]).toMatchObject({ categoryId:'cat1', startDate:'2026-09-01', endDate:'2026-09-30' });
    unmount();

    api.createHappyHourRule.mockResolvedValueOnce([{}]);
    render(<HappyHourSection />);
    fireEvent.change(screen.getByLabelText('Scope'), { target:{ value:'MENU' } });
    fireEvent.change(screen.getByLabelText('Menu'), { target:{ value:'menu1' } });
    fireEvent.click(screen.getByRole('button', { name:'Create happy hour' }));
    await waitFor(() => expect(screen.getByText('Created 1 price rule.')).toBeTruthy());
  });

  it('covers happy-hour API error message and fallback error', async () => {
    api.createHappyHourRule.mockRejectedValueOnce({ response:{ data:{ error:{ message:'Bad range' } } } });
    const { unmount } = render(<HappyHourSection />);
    fireEvent.change(screen.getByLabelText('Category'), { target:{ value:'cat1' } });
    fireEvent.click(screen.getByRole('button', { name:'Create happy hour' }));
    await waitFor(() => expect(screen.getByText('Bad range')).toBeTruthy());
    unmount();

    api.createHappyHourRule.mockRejectedValueOnce(new Error('x'));
    render(<HappyHourSection />);
    fireEvent.change(screen.getByLabelText('Category'), { target:{ value:'cat1' } });
    fireEvent.click(screen.getByRole('button', { name:'Create happy hour' }));
    await waitFor(() => expect(screen.getByText('Could not create happy-hour rules')).toBeTruthy());
  });
});
