import type { WaiterCombo } from "@/features/menu/combo";

type ComboStripProps = {
  combos: WaiterCombo[];
  onOpenCombo: (combo: WaiterCombo) => void;
};

export const ComboStrip = ({ combos, onOpenCombo }: ComboStripProps) => {
  if (combos.length === 0) return null;

  return (
    <section className="border-b border-border bg-surface px-4 py-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-disabled">
        Combos
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {combos.map((combo) => (
          <button
            key={combo.id}
            type="button"
            onClick={() => onOpenCombo(combo)}
            className="min-w-48 rounded-xl border border-border bg-surface-secondary p-3 text-left"
          >
            <span className="block text-sm font-semibold text-text-primary">
              {combo.name}
            </span>
            <span className="mt-1 block text-xs text-text-secondary">
              {combo.pricePolicy === "FIXED"
                ? `₹${Number(combo.fixedPrice ?? 0).toFixed(2)}`
                : `${Number(combo.percentOff ?? 0)}% off components`}{" "}
              · customize
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};
