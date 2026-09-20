import { useEffect, useState } from "react";

export const ConnectivityBanner = ({
  disconnectedMessage = "You’re offline. Changes may not sync until the connection returns.",
  restoredMessage = "Connection restored. Servora is syncing the latest data.",
  restoredDurationMs = 3000,
}: {
  disconnectedMessage?: string;
  restoredMessage?: string;
  restoredDurationMs?: number;
}) => {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    let restoreTimer: ReturnType<typeof setTimeout> | undefined;
    const handleOffline = () => {
      if (restoreTimer) clearTimeout(restoreTimer);
      setRestored(false);
      setOnline(false);
    };
    const handleOnline = () => {
      setOnline(true);
      setRestored(true);
      if (restoreTimer) clearTimeout(restoreTimer);
      restoreTimer = setTimeout(() => setRestored(false), restoredDurationMs);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      if (restoreTimer) clearTimeout(restoreTimer);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [restoredDurationMs]);

  if (online && !restored) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        online
          ? "fixed inset-x-0 top-0 z-[100] bg-success px-4 py-2 text-center text-sm font-medium text-white shadow-sm"
          : "fixed inset-x-0 top-0 z-[100] bg-warning px-4 py-2 text-center text-sm font-medium text-black shadow-sm"
      }
    >
      {online ? restoredMessage : disconnectedMessage}
    </div>
  );
};
