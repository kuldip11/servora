import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@pos/ui";
import { extractApiError } from "@pos/api-client";
import { login, fetchMemberships, fetchMe } from "@/features/auth/api/login";
import { saveTokens, saveProfile, clearTokens } from "@/features/auth/storage";
import {
  clearWaiterQueries,
  replaceWaiterContext,
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
  selectMembership: (membershipId: string) => void;
  selectBranchForMembership: (branchId: string) => void;
  isLoading: boolean;
  resetToCredentials: () => void;
}

export const useLogin = (onLogin: () => void): UseLoginResult => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"credentials" | "membership" | "branch">(
    "credentials",
  );
  const [memberships, setMemberships] = useState<AvailableMembership[]>([]);
  const [activeMembership, setActiveMembership] =
    useState<AvailableMembership | null>(null);
  const [branches, setBranches] = useState<AvailableMembership["branches"]>([]);

  const activate = async (membership: AvailableMembership) => {
    setActiveMembership(membership);
    const activeBranches = membership.branches.filter(
      (branch) => branch.isActive !== false,
    );
    if (!activeBranches.length) {
      throw new Error("No active branch is assigned to this waiter account.");
    }
    if (activeBranches.length === 1) {
      await replaceWaiterContext(
        queryClient,
        membership.tenant.id,
        activeBranches[0]!.id,
      );
      const activeUser = await fetchMe();
      saveProfile(activeUser);
      onLogin();
      return;
    }
    await replaceWaiterContext(queryClient, membership.tenant.id, null);
    setBranches(activeBranches);
    setStep("branch");
  };

  const mutation = useMutation({
    mutationFn: async (creds: CredentialsForm) => {
      const result = await login(creds.email, creds.password);
      saveTokens(result.accessToken);
      saveProfile(result.user);
      const list = await fetchMemberships();
      if (!list.length)
        throw new Error("No business membership is assigned to this account.");
      setMemberships(list);
      if (list.length === 1) await activate(list[0]!);
      else setStep("membership");
    },
    onError: (err: unknown) => {
      const clearPromise = clearWaiterQueries(queryClient).then(clearTokens);
      toast({ title: extractApiError(err), tone: "danger" });
      return clearPromise;
    },
  });

  return {
    step,
    memberships,
    branches,
    submitCredentials: (creds) => mutation.mutate(creds),
    selectMembership: (id) => {
      const m = memberships.find((item) => item.membershipId === id);
      if (m)
        void activate(m).catch((err: unknown) =>
          toast({ title: extractApiError(err), tone: "danger" }),
        );
    },
    selectBranchForMembership: (id) => {
      if (!activeMembership) return;
      void replaceWaiterContext(queryClient, activeMembership.tenant.id, id)
        .then(() => fetchMe())
        .then((activeUser) => {
          saveProfile(activeUser);
          onLogin();
        })
        .catch((err: unknown) =>
          toast({ title: extractApiError(err), tone: "danger" }),
        );
    },
    isLoading: mutation.isPending,
    resetToCredentials: () => {
      setStep("credentials");
      setActiveMembership(null);
      setBranches([]);
      void clearWaiterQueries(queryClient).then(clearTokens);
    },
  };
};
