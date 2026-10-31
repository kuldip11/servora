import { z } from "zod";
import { loginSchema } from "@pos/validation";
import type {
  AuthUserDto as User,
  AvailableMembershipDto as AvailableMembership,
} from "@pos/api-client";

export const credentialsSchema = loginSchema;
export type CredentialsForm = z.infer<typeof credentialsSchema>;
export type Branch = AvailableMembership["branches"][number];
export type { AvailableMembership };

export interface LoginResult {
  accessToken: string;
  user: User;
}
