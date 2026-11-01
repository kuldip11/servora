export const validateCategoryName = (name: string): string | undefined => {
  const trimmed = name.trim();
  if (!trimmed) return "Category name is required";
  if (trimmed.length > 100)
    return "Category name must be 100 characters or fewer";
  return undefined;
};
