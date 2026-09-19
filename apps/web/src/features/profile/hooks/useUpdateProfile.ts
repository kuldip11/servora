import { useMutation } from "@tanstack/react-query";
import { authService } from "@/features/auth/services/auth.service";
import { useAuthStore } from "@/store/auth";
import { notifySuccess } from "@/shared/lib/notify";

export const useUpdateProfile = () => {
  const setContext = useAuthStore((state) => state.setContext);

  return useMutation({
    mutationFn: authService.updateProfile,
    onSuccess: (updated) => {
      const state = useAuthStore.getState();
      setContext({
        membershipId: state.membershipId,
        franchiseId: state.franchiseId,
        branchId: state.branchId,
        user: updated,
      });
      notifySuccess("Profile updated");
    },
  });
};
