import { z } from "zod";

export const editStaffFormSchema = z
  .object({
    firstName: z.string().trim().min(1).max(50),
    lastName: z.string().trim().min(1).max(50),
    roleId: z.string().uuid(),
    branchIds: z.array(z.string().uuid()),
    branchRequired: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.branchRequired && values.branchIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["branchIds"],
        message: "Select a branch for this role.",
      });
    }
  });

export type EditStaffFormValues = z.infer<typeof editStaffFormSchema>;
