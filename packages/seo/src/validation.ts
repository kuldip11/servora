export const normalizeOrigin = (value: string) => value.replace(/\/$/, "");

export const isValidProductionOrigin = (value: string) => {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash &&
      !/(^|\.)(example\.(com|org|net)|localhost|[^.]+\.example)$/.test(
        url.hostname,
      ) &&
      !url.hostname.endsWith(".example") &&
      !url.hostname.endsWith(".test") &&
      !url.hostname.endsWith(".invalid") &&
      url.hostname.includes(".") &&
      !/^(127\.|0\.|\[?::1\]?)/.test(url.hostname)
    );
  } catch {
    return false;
  }
};

export const assertCanonicalPath = (path: string) => {
  if (!path.startsWith("/") || path.startsWith("//") || /[\\?#\s]/.test(path)) {
    throw new Error(
      `Canonical path must be a local pathname without query or fragment: ${path}`,
    );
  }
  return path;
};
