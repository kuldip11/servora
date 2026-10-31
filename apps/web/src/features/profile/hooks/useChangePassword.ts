import { useMutation } from "@tanstack/react-query";
import { authService } from "@/shared/auth/auth.service";
import { notifySuccess } from "@/shared/lib/notify";

export const useChangePassword = () =>
  useMutation({
    mutationFn: authService.changePassword,
    onSuccess: () => notifySuccess("Password changed"),
  });
