import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { Link, useRouter } from "@tanstack/react-router";
import { authService } from "@/features/auth/services/auth.service";
import { useAuthStore } from "@/store/auth";
import { clearPersistedContext } from "@/shared/auth/active-context";
import { toast } from "@pos/ui";

export const UserMenu = () => {
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const signOut = async () => {
    try {
      await queryClient.cancelQueries();
      await authService.logout();
    } finally {
      await queryClient.cancelQueries();
      queryClient.clear();
      clearPersistedContext();
      logout();
      toast({ title: "Logged out successfully", tone: "success" });
      router.navigate({ to: "/login" });
    }
  };
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-2.5 hover:bg-surface-secondary"
      >
        <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-primary-surface text-xs font-semibold text-primary">
          {user?.profileImageUrl ? (
            <img
              src={user.profileImageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`
          )}
        </span>
        <span className="hidden max-w-32 truncate text-sm font-medium sm:block">
          {user?.displayName ||
            `${user?.firstName ?? ""} ${user?.lastName ?? ""}`}
        </span>
        <ChevronDown className="h-4 w-4 text-text-secondary" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-52 rounded-xl border border-border bg-surface p-2 shadow-elevated"
        >
          <Link
            to="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-secondary"
          >
            <UserRound className="h-4 w-4" />
            My profile
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger-surface"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
};
