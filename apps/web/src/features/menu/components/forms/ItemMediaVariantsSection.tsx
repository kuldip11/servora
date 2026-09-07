import { Button } from "@pos/ui";
import { X } from "lucide-react";
type Variant = { id?: string; clientKey?: string; name: string; price: string };
export const ItemMediaVariantsSection = ({
  imageUrls,
  newImageUrl,
  variants,
  onNewImageUrl,
  onAddImage,
  onRemoveImage,
  onVariantChange,
  onRemoveVariant,
  onAddVariant,
}: {
  imageUrls: string[];
  newImageUrl: string;
  variants: Variant[];
  onNewImageUrl: (v: string) => void;
  onAddImage: () => void;
  onRemoveImage: (i: number) => void;
  onVariantChange: (i: number, patch: Partial<Variant>) => void;
  onRemoveVariant: (i: number) => void;
  onAddVariant: () => void;
}) => {
  return (
    <>
      <div>
        <label
          htmlFor="item-image-url"
          className="text-sm font-medium text-text-primary mb-1.5 block"
        >
          Images
        </label>
        {imageUrls.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {imageUrls.map((url, i) => (
              <div key={url} className="relative">
                <img
                  src={url}
                  alt=""
                  className="w-16 h-16 rounded-md object-cover border border-border"
                />
                <button
                  type="button"
                  onClick={() => onRemoveImage(i)}
                  aria-label={`Remove image ${i + 1}`}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-surface rounded-full border border-border flex items-center justify-center text-text-disabled hover:text-danger"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            id="item-image-url"
            placeholder="Paste an image URL…"
            value={newImageUrl}
            onChange={(e) => onNewImageUrl(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onAddImage}
          >
            Add
          </Button>
        </div>
        <p className="text-xs text-text-disabled mt-1">
          Paste links to already-hosted images — there's no upload/storage set
          up in this environment yet.
        </p>
      </div>
      <div role="group" aria-labelledby="item-variants-label">
        <span
          id="item-variants-label"
          className="text-sm font-medium text-text-primary mb-1.5 block"
        >
          Variants (e.g. Half / Full, Small / Medium / Large)
        </span>
        <p className="text-xs text-text-disabled -mt-1 mb-2">
          Each variant's price is the full, standalone price for the item when
          that variant is picked. If an item has variants, its base price is
          only shown as a fallback.
        </p>
        <div className="space-y-2">
          {variants.map((v, i) => (
            <div
              key={v.id ?? v.clientKey ?? `${v.name}:${v.price}`}
              className="flex items-center gap-2"
            >
              <input
                placeholder="Variant name (e.g. Half)"
                value={v.name}
                onChange={(e) => onVariantChange(i, { name: e.target.value })}
                aria-label={`Variant ${i + 1} name`}
                className="flex-1 px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="number"
                placeholder="₹0"
                step="0.01"
                min="0"
                value={v.price}
                onChange={(e) => onVariantChange(i, { price: e.target.value })}
                aria-label={`Variant ${i + 1} price`}
                className="w-24 px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => onRemoveVariant(i)}
                aria-label={`Remove variant ${i + 1}`}
                className="p-1.5 text-text-disabled hover:text-danger"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onAddVariant}
          className="mt-2 text-xs font-medium text-primary hover:text-primary-hover"
        >
          + Add variant
        </button>
      </div>
    </>
  );
};
