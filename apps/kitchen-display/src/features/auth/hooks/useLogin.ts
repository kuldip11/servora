import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@pos/ui";
import { extractApiError } from "@pos/api-client";
import { login, fetchMemberships } from "@/features/auth/api/login";
import { saveTokens, clearTokens } from "@/features/auth/storage";
import {
  clearKitchenQueries,
  replaceKitchenContext,
} from "@/shared/lib/query-lifecycle";
import type {
  AvailableMembership,
  CredentialsForm,
} from "@/features/auth/types";
interface UseLoginResult {
  step: "credentials" | "membership" | "branch";
  memberships: AvailableMembership[];
  branches: AvailableMembership["branches"];
  submitCredentials: (creds: CredentialsForm) => void;
  selectMembership: (id: string) => void;
  selectBranchForMembership: (id: string) => void;
  isLoading: boolean;
  resetToCredentials: () => void;
}
export const useLogin = (onLogin: () => void): UseLoginResult => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"credentials" | "membership" | "branch">(
    "credentials",
  );
  const [memberships, setMemberships] = useState<AvailableMembership[]>([]);
  const [branches, setBranches] = useState<AvailableMembership["branches"]>([]);
  const [activeMembership, setActiveMembership] =
    useState<AvailableMembership | null>(null);
  const activate = async (m: AvailableMembership) => {
    setActiveMembership(m);
    const activeBranches = m.branches.filter(
      (branch) => branch.isActive !== false,
    );
    if (!activeBranches.length) {
      throw new Error("No active branch is assigned to this kitchen account.");
    }
    if (activeBranches.length === 1) {
      await replaceKitchenContext(
        queryClient,
        m.tenant.id,
        activeBranches[0]!.id,
      );
      onLogin();
      return;
    }
    await replaceKitchenContext(queryClient, m.tenant.id, null);
    setBranches(activeBranches);
    setStep("branch");
  };
  const mutation = useMutation({
    mutationFn: async (creds: CredentialsForm) => {
      const result = await login(creds.email, creds.password);
      saveTokens(result.accessToken);
      const list = await fetchMemberships();
      if (!list.length)
        throw new Error("No business membership is assigned to this account.");
      setMemberships(list);
      if (list.length === 1) await activate(list[0]!);
      else setStep("membership");
    },
    onError: (err: unknown) => {
      const clearPromise = clearKitchenQueries(queryClient).then(clearTokens);
      toast({ title: extractApiError(err), tone: "danger" });
      return clearPromise;
    },
  });
  return {
    step,
    memberships,
    branches,
    submitCredentials: (c) => mutation.mutate(c),
    selectMembership: (id) => {
      const m = memberships.find((x) => x.membershipId === id);
      if (m)
        void activate(m).catch((e: unknown) =>
          toast({ title: extractApiError(e), tone: "danger" }),
        );
    },
    selectBranchForMembership: (id) => {
      if (!activeMembership) return;
      void replaceKitchenContext(queryClient, activeMembership.tenant.id, id)
        .then(onLogin)
        .catch((err: unknown) =>
          toast({ title: extractApiError(err), tone: "danger" }),
        );
    },
    isLoading: mutation.isPending,
    resetToCredentials: () => {
      setStep("credentials");
      setActiveMembership(null);
      setBranches([]);
      void clearKitchenQueries(queryClient).then(clearTokens);
    },
  };
};
