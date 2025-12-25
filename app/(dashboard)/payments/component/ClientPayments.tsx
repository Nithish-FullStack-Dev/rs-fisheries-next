// app/(dashboard)/payments/component/ClientPayments.tsx
"use client";

import { useState } from "react";
import { CardCustom } from "@/components/ui/card-custom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/helpers/Field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

type PaymentMode = "cash" | "ac" | "upi" | "cheque";

interface ClientWithDue {
  id: string;
  clientName: string;
  totalBilled: number; // grandTotal = full amount client owes
  totalPaid: number;
  totalDue: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export function ClientPayments() {
  const queryClient = useQueryClient();

  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [reference, setReference] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: clients = [], isLoading: loadingClients } = useQuery<
    ClientWithDue[]
  >({
    queryKey: ["clients-with-due"],
    queryFn: async () => {
      const [loadRes, payRes] = await Promise.all([
        axios.get("/api/client-loading"),
        axios.get("/api/payments/client"),
      ]);

      const loadings = loadRes.data?.data || [];
      const payments = payRes.data?.data || [];

      const clientMap = new Map<string, ClientWithDue>();

      // ✅ CORRECT: Use grandTotal = full bill amount client owes
      loadings.forEach((load: any) => {
        const id = load.id;
        const name = load.clientName?.trim();
        if (!id || !name) return;

        const billed = Number(load.grandTotal || 0); // ← THIS IS CORRECT

        if (!clientMap.has(id)) {
          clientMap.set(id, {
            id,
            clientName: name,
            totalBilled: billed,
            totalPaid: 0,
            totalDue: billed,
          });
        } else {
          // If same client has multiple loadings, add up
          clientMap.get(id)!.totalBilled += billed;
          clientMap.get(id)!.totalDue += billed;
        }
      });

      // Subtract payments
      payments.forEach((p: any) => {
        const clientId = p.clientId;
        if (!clientId || !clientMap.has(clientId)) return;

        const client = clientMap.get(clientId)!;
        client.totalPaid += Number(p.amount || 0);
        client.totalDue = Math.max(0, client.totalBilled - client.totalPaid);
      });

      // Return only clients with pending due
      return Array.from(clientMap.values())
        .filter((c) => c.totalDue > 0)
        .sort((a, b) => a.clientName.localeCompare(b.clientName));
    },
    staleTime: 1000 * 30,
  });

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const handleClientChange = (id: string) => {
    setSelectedClientId(id);
    const client = clients.find((c) => c.id === id);
    setClientName(client?.clientName || "");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleSave = async () => {
    if (!selectedClientId || !date || amount <= 0) {
      toast.error("Please fill all required fields");
      return;
    }

    if (selectedClient && amount > selectedClient.totalDue) {
      if (
        !confirm(
          `Amount exceeds due ${formatCurrency(
            selectedClient.totalDue
          )}. Continue?`
        )
      ) {
        return;
      }
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("clientId", selectedClientId);
    formData.append("clientName", clientName);
    formData.append("date", date);
    formData.append("amount", amount.toString());
    formData.append("paymentMode", paymentMode.toUpperCase());
    if (reference) formData.append("reference", reference);
    if (image) formData.append("image", image);

    try {
      const res = await fetch("/api/payments/client", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save payment");
      }

      toast.success("Payment recorded successfully!");

      setSelectedClientId("");
      setClientName("");
      setDate("");
      setAmount(0);
      setPaymentMode("cash");
      setReference("");
      setImage(null);

      queryClient.invalidateQueries({ queryKey: ["clients-with-due"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showReference = paymentMode !== "cash";

  return (
    <CardCustom
      title="Client Payments"
      actions={
        <Button
          size="sm"
          onClick={handleSave}
          disabled={
            isSubmitting || loadingClients || !selectedClientId || amount <= 0
          }
          className="bg-[#139BC3] text-white hover:bg-[#1088AA]"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSubmitting ? "Saving..." : "Save Payment"}
        </Button>
      }
    >
      <div className="space-y-7">
        {/* Client + Date */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-base font-medium text-slate-700">
                Client Name <span className="text-rose-600">*</span>
              </Label>

              <Select
                value={selectedClientId}
                onValueChange={handleClientChange}
                disabled={loadingClients}
              >
                <SelectTrigger className="h-11 border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-[#139BC3]/30">
                  <SelectValue
                    placeholder={
                      loadingClients ? "Loading..." : "Select a client"
                    }
                  />
                </SelectTrigger>

                <SelectContent className="border-slate-200">
                  {clients.length === 0 ? (
                    <div className="px-6 py-4 text-center text-slate-500">
                      No pending payments
                    </div>
                  ) : (
                    clients.map((client) => (
                      <SelectItem
                        key={client.id}
                        value={client.id}
                        className="py-3"
                      >
                        <div className="flex justify-between items-center gap-3 w-full">
                          <span className="font-medium text-slate-800">
                            {client.clientName}
                          </span>
                          <span className="text-sm font-semibold text-[#139BC3]">
                            {formatCurrency(client.totalDue)}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {selectedClient && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-600">
                    Total Due Amount
                  </p>
                  <p className="mt-1 text-2xl font-bold text-emerald-600">
                    {formatCurrency(selectedClient.totalDue)}
                  </p>
                </div>
              )}
            </div>

            <Field label="Payment Date *">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="h-11 border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
              />
            </Field>
          </div>
        </div>

        {/* Amount */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
          <Field label="Amount Received (₹) *">
            <Input
              type="number"
              value={amount || ""}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              placeholder="Enter amount"
              min="1"
              required
              className="h-12 border-slate-200 bg-white shadow-sm text-3xl font-bold focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
            />
          </Field>
        </div>

        {/* Payment Mode */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-3">
          <Label className="text-slate-700">Payment Mode</Label>

          <div className="flex flex-wrap gap-2">
            {(["cash", "ac", "upi", "cheque"] as PaymentMode[]).map((mode) => {
              const selected = paymentMode === mode;
              return (
                <Badge
                  key={mode}
                  onClick={() => setPaymentMode(mode)}
                  className={[
                    "cursor-pointer select-none px-4 py-2 rounded-full border transition shadow-sm",
                    selected
                      ? "bg-[#139BC3] text-white border-[#139BC3] hover:bg-[#1088AA]"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {mode === "cash" && "Cash"}
                  {mode === "ac" && "A/C Transfer"}
                  {mode === "upi" && "UPI / PhonePe"}
                  {mode === "cheque" && "Cheque"}
                </Badge>
              );
            })}
          </div>

          {/* Reference */}
          {showReference && (
            <Field
              label={
                paymentMode === "ac"
                  ? "Bank Reference / UTR No."
                  : paymentMode === "upi"
                  ? "UPI Transaction ID"
                  : "Cheque Number"
              }
            >
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Enter reference number"
                className="h-11 border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#139BC3]/30"
              />
            </Field>
          )}
        </div>

        {/* Upload */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
          <Field label="Upload Proof (Optional)">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="h-11 border-slate-200 bg-white shadow-sm flex-1 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-slate-700 hover:file:bg-slate-200"
              />
              {image && (
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {image.name}
                </Badge>
              )}
            </div>
          </Field>
        </div>
      </div>
    </CardCustom>
  );
}
