import { createHash } from "node:crypto";
import type { DemoPreset } from "./types";

export const DEMO_EMAIL = "demo@servora.local";
export const DEMO_PASSWORD = process.env["DEMO_PASSWORD"] ?? "ServoraDemo@2026";
export const DEMO_ORG_NAME = "Servora Demo Group";

export const uuidFor = (key: string): string => {
  const hex = createHash("sha256")
    .update(`servora-demo:${key}`)
    .digest("hex")
    .slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};

export const seededNumber = (key: string): number => {
  const value = createHash("sha256").update(key).digest().readUInt32BE(0);
  return value / 0x100000000;
};

export const pick = <T>(items: readonly T[], key: string): T =>
  items[Math.floor(seededNumber(key) * items.length)]!;
export const money = (value: number): string => value.toFixed(2);
export const qty = (value: number): string => value.toFixed(3);

export const parsePreset = (argv: string[]): DemoPreset => {
  const args = argv.filter((arg) => arg !== "--");
  let raw = "small";
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg.startsWith("--preset=")) raw = arg.slice(9);
    else if (arg === "--preset") raw = args[++i] ?? "";
    else if (arg.startsWith("--as-of=")) continue;
    else throw new Error(`Unknown demo argument: ${arg}`);
  }
  if (raw !== "small" && raw !== "demo")
    throw new Error(`Unknown demo preset: ${raw}. Expected small or demo.`);
  return raw;
};

export async function insertBatches<T>(
  rows: T[],
  batchSize: number,
  insert: (batch: T[]) => Promise<unknown>,
): Promise<void> {
  for (let i = 0; i < rows.length; i += batchSize)
    await insert(rows.slice(i, i + batchSize));
}

export const parseReferenceTime = (argv: string[]): Date => {
  const option = argv.find((arg) => arg.startsWith("--as-of="));
  if (option === undefined) return new Date();
  const raw = option.slice(8);
  if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(raw))
    throw new Error("--as-of must be an ISO timestamp with a timezone");
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime()))
    throw new Error("Invalid --as-of timestamp");
  return date;
};
export const assertDemoEnvironment = () => {
  if (process.env["NODE_ENV"] === "production")
    throw new Error("Demo seed/reset is disabled in production");
};
