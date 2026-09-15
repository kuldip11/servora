export const normalizeOrigin = (value: string) => value.replace(/\/$/, "");

export const isValidProductionOrigin = (value: string) => {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.hostname.endsWith(".example") &&
      url.hostname !== "example.com"
    );
  } catch {
    return false;
  }
};

export const assertCanonicalPath = (path: string) => {
  if (!path.startsWith("/")) {
    throw new Error(`Canonical path must start with '/': ${path}`);
  }
  return path;
};
