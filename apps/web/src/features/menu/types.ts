export interface ActiveMenuSummary {
  id: string;
  name: string;
  organizationId?: string | null;
  memberships: Array<{ menuItemId: string }>;
}
