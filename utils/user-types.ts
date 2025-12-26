import { z } from "zod";

export const UserValidationSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length >= 6,
      "Password must be at least 6 characters"
    ),
  name: z.string().optional(),
  role: z.enum([
    "admin",
    "finance",
    "clerk",
    "documentation",
    "sales",
    "partner",
    "seniorExecutive",
    "juniorExecutive",
    "executive",
    "supervisor",
    "others",
  ]),
});

export type UserFormValues = z.infer<typeof UserValidationSchema>;

export interface User {
  id: string;
  email: string;
  name?: string | null;
  role:
    | "admin"
    | "finance"
    | "clerk"
    | "documentation"
    | "sales"
    | "partner"
    | "seniorExecutive"
    | "juniorExecutive"
    | "executive"
    | "supervisor"
    | "others";
  createdAt: string;
}
