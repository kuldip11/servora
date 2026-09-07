import { Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LoginPage, getToken, logout, restoreSession } from "@/features/auth";

export const AuthBoundary = () => {
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
      .catch(() => {
        logout();
        if (isActive) setIsLoggedIn(false);
      });

    return () => {
      isActive = false;
    };
  }, [isLoggedIn]);

  if (isLoggedIn === null) {
    return (
      <div className="flex min-h-screen items-center justify-center text-text-secondary">
        Restoring session…
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={() => setIsLoggedIn(true)} />;
  }

  return <Outlet />;
};
