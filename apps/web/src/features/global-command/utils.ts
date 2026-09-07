export const normalizeSearchText = (value: string) =>
  value.trim().toLowerCase();

export const matchesGlobalSearch = (
  query: string,
  values: Array<string | null | undefined>,
): boolean => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  return values.some((value) => value?.toLowerCase().includes(normalizedQuery));
};
