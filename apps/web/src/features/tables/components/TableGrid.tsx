import { useEffect, useRef, useState } from "react";
import { Edit2, MapPin, QrCode, Table2, Trash2, Users } from "lucide-react";
import { Button, Card, Grid, IconButton, Select, StatusBadge } from "@pos/ui";
import {
  TABLE_STATUS_CARD_BORDER,
  TABLE_STATUS_OPTIONS,
  TABLE_STATUS_TONES,
} from "@/features/tables/constants";
import type { RestaurantTable } from "@/features/tables/types";

export function TableGrid({
  tables,
  onEdit,
  onDelete,
  onStatusChange,
  onShowQr,
  onTransfer,
  onMerge,
}: {
  tables: RestaurantTable[];
  onEdit: (table: RestaurantTable) => void;
  onDelete: (id: string, name: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onShowQr: (table: RestaurantTable) => void;
  onTransfer?: ((table: RestaurantTable) => void) | undefined;
  onMerge?: ((table: RestaurantTable) => void) | undefined;
}) {
  const [visibleCount, setVisibleCount] = useState(32);
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => setVisibleCount(32), [tables]);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || visibleCount >= tables.length) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting)
          setVisibleCount((current) => Math.min(tables.length, current + 32));
      },
      { rootMargin: "320px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [tables.length, visibleCount]);
  const visibleTables = tables.slice(0, visibleCount);
  return (
    <>
      <Grid columns={{ base: 2, sm: 3, lg: 4 }} gap="md">
        {visibleTables.map((table) => (
          <Card
            key={table.id}
            className={`border-2 flex flex-col gap-3 ${TABLE_STATUS_CARD_BORDER[table.status]}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-surface-secondary flex items-center justify-center">
                  <Table2 className="w-4.5 h-4.5 text-text-secondary" />
                </div>
                <div>
                  <p className="font-semibold text-text-primary">
                    {table.name}
                  </p>
                  <p className="text-xs text-text-secondary flex items-center gap-1">
                    <Users className="w-3 h-3" /> {table.capacity}
                    {table.section && (
                      <>
                        <span className="mx-0.5">·</span>
                        <MapPin className="w-3 h-3" /> {table.section}
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <IconButton
                  icon={QrCode}
                  size="sm"
                  aria-label="Show table QR code"
                  title="Show table QR code"
                  onClick={() => onShowQr(table)}
                />
                <IconButton
                  icon={Edit2}
                  size="sm"
                  aria-label="Edit table"
                  title="Edit table"
                  onClick={() => onEdit(table)}
                />
                <IconButton
                  icon={Trash2}
                  size="sm"
                  aria-label={
                    table.status === "OCCUPIED"
                      ? "Has an active order"
                      : "Remove table"
                  }
                  title={
                    table.status === "OCCUPIED"
                      ? "Has an active order"
                      : "Remove table"
                  }
                  disabled={table.status === "OCCUPIED"}
                  onClick={() => onDelete(table.id, table.name)}
                />
              </div>
            </div>

            <StatusBadge
              tone={TABLE_STATUS_TONES[table.status]}
              label={
                table.status.charAt(0) + table.status.slice(1).toLowerCase()
              }
              className="w-fit"
            />

            <Select
              options={TABLE_STATUS_OPTIONS}
              value={table.status}
              onChange={(e) => onStatusChange(table.id, e.target.value)}
              disabled={table.status === "OCCUPIED"}
              className="text-xs py-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {table.status === "OCCUPIED" && (
              <div className="space-y-2 -mt-1">
                <p className="text-[11px] text-text-disabled">
                  Has an active order — frees up automatically once it's closed.
                </p>
                {onTransfer && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onTransfer(table)}
                  >
                    Transfer
                  </Button>
                )}
                {onMerge && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onMerge(table)}
                  >
                    Merge
                  </Button>
                )}
              </div>
            )}
          </Card>
        ))}
      </Grid>
      {visibleCount < tables.length && (
        <div
          ref={sentinelRef}
          className="py-5 text-center text-xs text-text-secondary"
        >
          Loading more tables…
        </div>
      )}
    </>
  );
}
