import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  return {
    queryResult: { current: {} as any }, has: vi.fn(), invalidate: vi.fn(),
    authMemberships: vi.fn(), activate: vi.fn(), success: vi.fn(), error: vi.fn(),
    organizations: vi.fn(), franchises: vi.fn(), createOrganization: vi.fn(), updateOrganization: vi.fn(), archiveOrganization: vi.fn(),
    createFranchise: vi.fn(), updateFranchise: vi.fn(), archiveFranchise: vi.fn(), createBranch: vi.fn(), updateBranch: vi.fn(), archiveBranch: vi.fn(),
    capturedQueryFn: null as null | (() => Promise<any>),
  };
});

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidate }),
  useQuery: (options: any) => { mocks.capturedQueryFn = options.queryFn; return mocks.queryResult.current; },
  useMutation: (options: any) => ({ isPending: false, mutate: async (value?: any) => { try { const result = await options.mutationFn(value); await options.onSuccess?.(result); } catch (error) { options.onError?.(error); } } }),
}));
vi.mock("@/shared/auth/permissions", () => ({ usePermissions: () => ({ has: mocks.has }) }));
vi.mock("@/features/business/services/business.service", () => ({ businessService: {
  organizations: mocks.organizations, franchises: mocks.franchises, createOrganization: mocks.createOrganization,
  updateOrganization: mocks.updateOrganization, archiveOrganization: mocks.archiveOrganization, createFranchise: mocks.createFranchise,
  updateFranchise: mocks.updateFranchise, archiveFranchise: mocks.archiveFranchise, createBranch: mocks.createBranch,
  updateBranch: mocks.updateBranch, archiveBranch: mocks.archiveBranch,
} }));
vi.mock("@/features/auth/services/auth.service", () => ({ authService: { memberships: mocks.authMemberships } }));
vi.mock("@/shared/auth/active-context", () => ({ activateMembershipContext: mocks.activate }));
vi.mock("@/shared/lib/notify", () => ({ notifySuccess: mocks.success, notifyError: mocks.error }));
vi.mock("@hookform/resolvers/zod", () => ({ zodResolver: () => undefined }));
vi.mock("@pos/validation", () => ({ businessBranchFormSchema: {}, franchiseBusinessFormSchema: {}, organizationBusinessFormSchema: {} }));
vi.mock("lucide-react", () => ({ Building2: () => null, CheckCircle2: () => null, ChevronRight: () => null, GitBranch: () => null, MapPin: () => null, Pencil: () => null, Plus: () => null, Store: () => null }));
vi.mock("@pos/ui", () => ({
  Button: ({ children, loading: _loading, ...props }: any) => <button {...props}>{children}</button>,
  Card: ({ children }: React.PropsWithChildren) => <section>{children}</section>,
  Input: React.forwardRef<HTMLInputElement, any>(({ label, error, ...props }, ref) => <label>{label}<input ref={ref} aria-label={label} {...props}/>{error ? <span>{error}</span> : null}</label>),
  Modal: ({ open, title, children, onClose }: any) => open ? <div role="dialog"><h2>{title}</h2><button onClick={onClose}>modal-x</button>{children}</div> : null,
  Page: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
  PageHeader: ({ title, description, actions }: any) => <header><h1>{title}</h1><p>{description}</p>{actions}</header>,
  Spinner: () => <div>spinner</div>,
}));

import { useAuthStore } from "@/store/auth";
import { BusinessPage } from "../BusinessPage";

const organization = {
  id: "o1", name: "Org One", businessType: "RESTAURANT_GROUP", country: "IN", timezone: "Asia/Kolkata", currency: "INR",
  primaryContactName: "Owner", businessEmail: "owner@example.com", businessPhone: "999", city: "Pune", stateProvince: "MH",
} as any;
const franchise = {
  id: "t1", organizationId: "o1", name: "Brand", displayName: "Brand One", businessModel: "RESTAURANT", cuisineTypes: ["Indian"],
  defaultCurrency: "INR", defaultTimezone: "Asia/Kolkata", isActive: true,
} as any;
const branch = {
  id: "b1", name: "Central", code: "CTR", isActive: true, address: "Main St", city: "Pune", stateProvince: "MH", phone: "123",
  timezone: "Asia/Kolkata", tablesEnabled: true, addressLine1: "Main St", dineInEnabled: true, takeawayEnabled: true, deliveryEnabled: true,
  onlineEnabled: true, customerQrEnabled: true, kdsEnabled: true, waiterAppEnabled: true,
} as any;
const memberships = [{ membershipId: "m1", tenant: franchise, branches: [branch] }] as any;
const user = { roles: [{ name: "OWNER" }] } as any;

describe("BusinessPage coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.has.mockReturnValue(true);
    useAuthStore.setState({
      memberships,
      membershipId: "m1",
      franchiseId: "t1",
      branchId: "b1",
      user,
      accessToken: "token",
      isAuthenticated: true,
    });
    mocks.authMemberships.mockResolvedValue(memberships);
    mocks.queryResult.current = { data: { organizations: [organization], franchises: [franchise] }, isLoading: false };
    mocks.organizations.mockResolvedValue([organization]);
    mocks.franchises.mockResolvedValue([franchise]);
    mocks.createOrganization.mockResolvedValue({ organization, membershipId: "m1" });
    mocks.updateOrganization.mockResolvedValue(organization);
    mocks.archiveOrganization.mockResolvedValue({});
    mocks.createFranchise.mockResolvedValue({ membershipId: "m1", tenant: franchise });
    mocks.updateFranchise.mockResolvedValue(franchise);
    mocks.archiveFranchise.mockResolvedValue({});
    mocks.createBranch.mockResolvedValue(branch);
    mocks.updateBranch.mockResolvedValue(branch);
    mocks.archiveBranch.mockResolvedValue({});
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  it("renders loading and executes the hierarchy query function including franchise failure fallback", async () => {
    mocks.queryResult.current = { data: undefined, isLoading: true };
    render(<BusinessPage />);
    expect(screen.getByText("spinner")).toBeTruthy();
    expect(mocks.capturedQueryFn).toBeTypeOf("function");
    mocks.franchises.mockRejectedValueOnce(new Error("hidden"));
    expect(await mocks.capturedQueryFn!()).toEqual({ organizations: [organization], franchises: [] });
  });

  it("covers owner onboarding and organization creation", async () => {
    mocks.queryResult.current = { data: { organizations: [], franchises: [] }, isLoading: false };
    useAuthStore.setState({ memberships: [], membershipId: null, franchiseId: null, branchId: null, user });
    mocks.authMemberships.mockResolvedValue([]);
    render(<BusinessPage />);
    expect(screen.getByText("Set up your business")).toBeTruthy();
    expect(screen.getByText("Required next")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Create business/ }));
    expect(screen.getByRole("heading", { name: "Add business" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Organization / Business name"), { target: { value: "New Org" } });
    fireEvent.submit(screen.getByText("Save business").closest("form")!);
    await waitFor(() => expect(mocks.createOrganization).toHaveBeenCalledWith(expect.objectContaining({ name: "New Org" })));
    expect(mocks.success).toHaveBeenCalledWith("Organization created");
    expect(mocks.authMemberships).toHaveBeenCalled();
    expect(mocks.invalidate).toHaveBeenCalled();
  });

  it("navigates hierarchy and covers create/edit/archive franchise and branch flows", async () => {
    render(<BusinessPage />);
    expect(screen.getByText("Business")).toBeTruthy();
    expect(screen.getAllByText("Org One").length).toBeGreaterThan(0);
    expect(screen.getByText("Pune, MH, IN")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Brand One" }));
    expect(screen.getByText("Franchise")).toBeTruthy();
    expect(screen.getByText("Indian")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Add branch/ }));
    expect(screen.getByRole("heading", { name: "Create Branch" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Branch name"), { target: { value: "North" } });
    fireEvent.submit(screen.getByText("Save Branch").closest("form")!);
    await waitFor(() => expect(mocks.createBranch).toHaveBeenCalledWith(expect.objectContaining({ name: "North", currency: "INR" })));
    expect(mocks.success).toHaveBeenCalledWith("Branch created");

    fireEvent.click(screen.getByRole("button", { name: "Brand One" }));
    fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
    expect(screen.getByRole("heading", { name: "Edit Franchise" })).toBeTruthy();
    fireEvent.submit(screen.getByText("Save Franchise").closest("form")!);
    await waitFor(() => expect(mocks.updateFranchise).toHaveBeenCalledWith("t1", expect.any(Object)));

    fireEvent.click(screen.getByRole("button", { name: "Brand One" }));
    fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    await waitFor(() => expect(mocks.archiveFranchise).toHaveBeenCalledWith("t1"));

    fireEvent.click(screen.getByRole("button", { name: "Central" }));
    expect(screen.getByText("Branch")).toBeTruthy();
    expect(screen.getByText("CTR")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
    expect(screen.getByRole("heading", { name: "Edit Branch" })).toBeTruthy();
    fireEvent.submit(screen.getByText("Save Branch").closest("form")!);
    await waitFor(() => expect(mocks.updateBranch).toHaveBeenCalledWith("b1", expect.objectContaining({ currency: "INR" })));

    fireEvent.click(screen.getByRole("button", { name: "Central" }));
    fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(mocks.archiveBranch).toHaveBeenCalledWith("b1"));

    fireEvent.click(screen.getByRole("button", { name: "Org One" }));
    fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
    expect(screen.getByRole("heading", { name: "Edit business" })).toBeTruthy();
    fireEvent.submit(screen.getByText("Save business").closest("form")!);
    await waitFor(() => expect(mocks.updateOrganization).toHaveBeenCalledWith("o1", expect.any(Object)));

    fireEvent.click(screen.getByRole("button", { name: "Org One" }));
    fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    await waitFor(() => expect(mocks.archiveOrganization).toHaveBeenCalledWith("o1"));
  });

  it("covers franchise onboarding creation and activation", async () => {
    mocks.queryResult.current = { data: { organizations: [organization], franchises: [] }, isLoading: false };
    useAuthStore.setState({ memberships: [], membershipId: null, franchiseId: null, branchId: null, user });
    render(<BusinessPage />);
    expect(screen.getByText("Create Franchise")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Create Franchise/ }));
    fireEvent.change(screen.getByLabelText("Franchise / Brand name"), { target: { value: "Brand" } });
    fireEvent.submit(screen.getByText("Save Franchise").closest("form")!);
    await waitFor(() => expect(mocks.createFranchise).toHaveBeenCalledWith("o1", expect.objectContaining({ name: "Brand" })));
    expect(mocks.activate).toHaveBeenCalled();
    expect(mocks.success).toHaveBeenCalledWith("Franchise created");
  });
});
