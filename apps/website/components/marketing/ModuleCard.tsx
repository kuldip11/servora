import Link from "next/link";
import type { Module } from "@/content/modules";
export function ModuleCard({ module }: { module: Module }) {
  return (
    <Link className="module-entry" href={`/product/${module.slug}`}>
      <h2>{module.name}</h2>
      <p>{module.description}</p>
      <span>Explore {module.name.toLowerCase()}</span>
    </Link>
  );
}
