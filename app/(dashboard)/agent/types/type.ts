import * as z from "zod";

// --- Regex Patterns ---
const PHONE_REGEX = /^[6-9]\d{9}$/;

// --- Zod Schema ---
export const agentSchema = z.object({
  name: z.string().min(1, "Agent name is required"),
  phone: z
    .string()
    .min(1, "Phone is required")
    .regex(PHONE_REGEX, "Invalid phone number (10 digits starting with 6-9)"),
  address: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type AgentFormValues = z.infer<typeof agentSchema>;

export interface Agent extends AgentFormValues {
  id: string;
  createdAt: string;
  updatedAt?: string;
}
