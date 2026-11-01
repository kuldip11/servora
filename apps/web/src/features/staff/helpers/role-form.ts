export const validateRoleForm = (input: {
  name: string;
  description: string;
}): Record<string, string> => {
  const errors: Record<string, string> = {};
  const name = input.name.trim();
  if (!name) errors.name = "Role name is required";
  else if (name.length > 80)
    errors.name = "Role name must be 80 characters or fewer";
  if (input.description.length > 500)
    errors.description = "Description must be 500 characters or fewer";
  return errors;
};
