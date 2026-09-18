export const PUBLIC_INDEX_POLICY = {
  index: true,
  follow: true,
} as const;

export const PRIVATE_APP_POLICY = {
  index: false,
  follow: false,
  noarchive: true,
  nosnippet: true,
} as const;

export const PRIVATE_APP_ROBOTS_CONTENT = "noindex,nofollow,noarchive,nosnippet";
export const PRIVATE_APP_X_ROBOTS_TAG = "noindex, nofollow, noarchive, nosnippet";
