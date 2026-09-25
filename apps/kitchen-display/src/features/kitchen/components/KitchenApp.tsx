import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  KitchenLogin,
  getToken,
  logout,
  logoutSession,
  restoreSession,
} from "@/features/auth";
import { KitchenBoard } from "@/features/kitchen/pages/KitchenBoard";
import { clearKitchenQueries } from "@/shared/lib/query-lifecycle";
import { getKitchenQueryScope } from "@/shared/lib/query-scope";

export const KitchenApp = () => {
  const queryClient = useQueryClient();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(() =>
    getToken() ? true : null,
  );
  const [contextRevision, setContextRevision] = useState(0);

  useEffect(() => {
    if (loggedIn !== null) return;
    let isActive = true;
    restoreSession()
      .then(() => {
        if (isActive) setLoggedIn(true);
      })
      .catch(async () => {
        await clearKitchenQueries(queryClient);
        logout();
        if (isActive) setLoggedIn(false);
      });
    return () => {
      isActive = false;
    };
  }, [loggedIn, queryClient]);

  async function handleLogout() {
    try {
      await logoutSession();
    } finally {
      await clearKitchenQueries(queryClient);
      logout();
      setLoggedIn(false);
      setContextRevision((value) => value + 1);
    }
  }

  if (loggedIn === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-text-secondary">
        Restoring session…
      </div>
    );
  }
  if (!loggedIn)
    return (
      <KitchenLogin
        onLogin={() => {
          setContextRevision((value) => value + 1);
          setLoggedIn(true);
        }}
      />
    );
  const [tenantId, branchId] = getKitchenQueryScope();
  return (
    <KitchenBoard
      key={`${tenantId ?? "no-tenant"}:${branchId ?? "no-branch"}:${contextRevision}`}
      onLogout={() => void handleLogout()}
    />
  );
};
