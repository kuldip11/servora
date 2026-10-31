import { Outlet } from "@tanstack/react-router";
import { Suspense, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LoginPage, getToken, logout, restoreSession } from "@/features/auth";
import { clearWaiterQueries } from "@/shared/lib/query-lifecycle";

export const AuthBoundary = () => {
  const queryClient = useQueryClient();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(() =>
    getToken() ? true : null,
  );

  useEffect(() => {
    if (isLoggedIn !== null) return;

    let isActive = true;

    restoreSession()
      .then(() => {
        if (isActive) setIsLoggedIn(true);
      })
      .catch(async () => {
        await clearWaiterQueries(queryClient);
        logout();
        if (isActive) setIsLoggedIn(false);
      });

    return () => {
      isActive = false;
    };
  }, [isLoggedIn, queryClient]);

  if (isLoggedIn === null) {
    return (
      <div className="flex min-h-screen items-center justify-center text-text-secondary">
        Restoring session…
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <Suspense fallback={<div role="status">Loading sign in…</div>}>
        <LoginPage onLogin={() => setIsLoggedIn(true)} />
      </Suspense>
    );
  }

  return <Outlet />;
};
