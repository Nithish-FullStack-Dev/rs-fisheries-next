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

export interface AgentLoadingRecord {
  id: string;
  billNo: string;
  date: string;
  grandTotal: number;
  tripStatus: string;
  vehicle?: {
    vehicleNumber?: string;
  };
  vehicleNo?: string;
  totalTrays: number;
  totalKgs: number;
  items: {
    varietyCode: string;
    noTrays: number;
    loose: number;
    totalKgs: number;
  }[];
}

export interface AgentPaymentRecord {
  id: string;
  source: "agent";
  sourceRecordId: string;
  date: string;
  amount: number;
  paymentMode?: string;
  vendorInvoice?: {
    invoiceNo: string;
    totalAmount: number;
    isFinalized: boolean;
  }[];
}

export interface Agent extends AgentFormValues {
  id: string;
  createdAt: string;
  updatedAt?: string;
  agentLoadings?: AgentLoadingRecord[];
  payments?: AgentPaymentRecord[];
}
