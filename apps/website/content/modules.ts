import { products } from "./product";
export type Module = {
  slug: string;
  name: string;
  eyebrow: string;
  description: string;
  capabilities: string[];
  capabilityDescriptions: string[];
  workflow: string[];
  roles: string[];
  related: string[];
};
export const modules: Module[] = products.map((p) => ({
  slug: p.slug,
  name: p.name,
  eyebrow: "",
  description: p.intro,
  capabilities: p.features.map((f) => f.title),
  capabilityDescriptions: p.features.map((f) => f.body),
  workflow: p.steps,
  roles: [p.audience],
  related: p.related,
}));
export const moduleBySlug = Object.fromEntries(
  modules.map((module) => [module.slug, module]),
);
