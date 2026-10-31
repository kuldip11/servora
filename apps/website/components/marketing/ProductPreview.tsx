import { ProductSurface } from "@/components/site/ProductSurface";
export function ProductPreview({ label }: { label: string }) {
  return (
    <figure aria-label={`${label} illustrative product view`}>
      <ProductSurface kind="management" />
    </figure>
  );
}
