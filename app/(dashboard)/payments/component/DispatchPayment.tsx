// app/(dashboard)/payments/component/DispatchPayment.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { CardCustom } from "@/components/ui/card-custom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Package, Truck, Snowflake, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PRIMARY = "#139BC3";

type LoadingItem = {
  id: string;
  totalPrice?: number | null;
};

type ClientLoading = {
  id: string;
  clientName?: string | null;
  billNo?: string | null;
  totalPrice?: number | null;
  items?: LoadingItem[];
  vehicleId?: string | null;
  vehicleNo?: string | null;
};

type DispatchCharge = {
  id: string;
  type: "ICE_COOLING" | "TRANSPORT" | "OTHER";
  label?: string | null;
  amount: number;
  notes?: string | null;
  createdAt: string;
  sourceRecordId: string;
};

type PackingAmount = {
  id: string;
  totalAmount: number;
};

const currency = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

function safeNum(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const isNumericInput = (value: string) => /^\d*\.?\d*$/.test(value);

export const DispatchPayment = () => {
  const queryClient = useQueryClient();

  const [sourceRecordId, setSourceRecordId] = useState<string>("");

  // Inputs
  const [iceAmount, setIceAmount] = useState<string>("");
  const [transportAmount, setTransportAmount] = useState<string>("");
  const [otherLabel, setOtherLabel] = useState<string>("");
  const [otherAmount, setOtherAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const resetForm = () => {
    setIceAmount("");
    setTransportAmount("");
    setOtherLabel("");
    setOtherAmount("");
    setNotes("");
  };

  /**
   * Loadings (Client only)
   * - also filters out loadings that already have at least 1 dispatch charge
   */
  const { data: loadings = [], isLoading: loadingLoadings } = useQuery({
    queryKey: ["dispatch-pending-loadings"],
    queryFn: async () =>
      axios
        .get("/api/client-loading?stage=DISPATCH_PENDING")
        .then((res) => res.data?.data || []),
  });

  const selectedLoading = useMemo(() => {
    return loadings.find((l: ClientLoading) => l.id === sourceRecordId) || null;
  }, [loadings, sourceRecordId]);

  const hasVehicle = useMemo(() => {
    if (!selectedLoading) return false;
    return Boolean(
      (selectedLoading.vehicleId && selectedLoading.vehicleId.trim()) ||
        (selectedLoading.vehicleNo && selectedLoading.vehicleNo.trim())
    );
  }, [selectedLoading]);

  const { data: dispatchCharges = [] } = useQuery<DispatchCharge[]>({
    queryKey: ["dispatch-charges", sourceRecordId],
    queryFn: () =>
      axios
        .get(`/api/payments/dispatch?sourceRecordId=${sourceRecordId}`)
        .then((res) => (res.data?.data || []) as DispatchCharge[]),
    enabled: !!sourceRecordId,
  });

  const { data: packingAmounts = [] } = useQuery<PackingAmount[]>({
    queryKey: ["packing-amounts", sourceRecordId],
    queryFn: () =>
      axios
        .get(`/api/payments/packing-amount?sourceRecordId=${sourceRecordId}`)
        .then((res) => (res.data?.data || []) as PackingAmount[]),
    enabled: !!sourceRecordId,
  });

  const totalDispatchCharges = useMemo(() => {
    return dispatchCharges.reduce((sum, c) => sum + safeNum(c.amount), 0);
  }, [dispatchCharges]);

  const totalPackingAmount = useMemo(() => {
    return packingAmounts.reduce((sum, p) => sum + safeNum(p.totalAmount), 0);
  }, [packingAmounts]);

  const itemsTotalPrice = useMemo(() => {
    const items = selectedLoading?.items || [];
    return items.reduce(
      (s: number, it: LoadingItem) => s + safeNum(it.totalPrice),
      0
    );
  }, [selectedLoading]);

  const baseAmount = useMemo(() => {
    const apiTotalPrice = safeNum(selectedLoading?.totalPrice);
    return apiTotalPrice > 0 ? apiTotalPrice : itemsTotalPrice;
  }, [selectedLoading, itemsTotalPrice]);

  const netAmount = baseAmount + totalDispatchCharges + totalPackingAmount;

  const canSubmit = totalPackingAmount > 0;

  const mutation = useMutation({
    mutationFn: (payload: {
      sourceRecordId: string;
      type: "ICE_COOLING" | "TRANSPORT" | "OTHER";
      amount: number;
      label?: string;
      notes?: string | null;
    }) => axios.post("/api/payments/dispatch", payload),
  });

  const handleSaveAll = async () => {
    if (!sourceRecordId) return toast.error("Select a loading");

    if (!canSubmit) {
      toast.error("Cannot save dispatch charges", {
        description: "At least one packing amount must be recorded first.",
      });
      return;
    }

    const charges: Array<{
      sourceRecordId: string;
      type: "ICE_COOLING" | "TRANSPORT" | "OTHER";
      amount: number;
      label?: string;
      notes?: string | null;
    }> = [];

    if (iceAmount) {
      charges.push({
        sourceRecordId,
        type: "ICE_COOLING",
        amount: safeNum(iceAmount),
        notes: notes.trim() || null,
      });
    }

    // ✅ Only allow TRANSPORT if vehicle exists
    if (transportAmount) {
      if (!hasVehicle) {
        toast.error("Transport charge not allowed", {
          description: "Vehicle not assigned for this loading.",
        });
        return;
      }
      charges.push({
        sourceRecordId,
        type: "TRANSPORT",
        amount: safeNum(transportAmount),
        notes: notes.trim() || null,
      });
    }

    if (otherAmount || otherLabel.trim()) {
      if (!otherLabel.trim()) return toast.error("Other label required");
      if (!otherAmount) return toast.error("Other amount required");
      charges.push({
        sourceRecordId,
        type: "OTHER",
        label: otherLabel.trim(),
        amount: safeNum(otherAmount),
        notes: notes.trim() || null,
      });
    }

    if (charges.length === 0) return toast.error("Enter at least one charge");

    try {
      await Promise.all(charges.map((c) => mutation.mutateAsync(c)));

      toast.success(`${charges.length} charge(s) added!`);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["dispatch-charges", sourceRecordId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["packing-amounts", sourceRecordId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["dispatch-pending-loadings"],
        }),
      ]);

      resetForm();
      setSourceRecordId("");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to add charge");
    }
  };

  const displayLoadingAmount = (l: ClientLoading) => {
    const apiTotalPrice = safeNum(l.totalPrice);
    if (apiTotalPrice > 0) return apiTotalPrice;

    const items = l.items || [];
    return items.reduce((s, it) => s + safeNum(it.totalPrice), 0);
  };

  return (
    <CardCustom
      title="Dispatch Charges Management"
      actions={
        <Button
          onClick={() => {
            setSourceRecordId("");
            resetForm();
          }}
          variant="outline"
          className="border-slate-300"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Clear All
        </Button>
      }
    >
      <div className="space-y-8 py-6">
        {/* Loading Selector */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <Label className="text-lg font-medium text-slate-800">
            Select Client Loading
          </Label>

          <Select
            value={sourceRecordId}
            onValueChange={setSourceRecordId}
            disabled={loadingLoadings}
          >
            <SelectTrigger className="mt-3 h-12 text-base">
              <SelectValue
                placeholder={
                  loadingLoadings ? "Loading records..." : "Choose a loading"
                }
              />
            </SelectTrigger>

            <SelectContent>
              {loadings.map((l: ClientLoading) => (
                <SelectItem key={l.id} value={l.id}>
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium">{l.clientName || "-"}</span>
                    <div className="flex items-center gap-3 ml-4">
                      <Badge variant="secondary">#{l.billNo}</Badge>
                      <span className="font-bold" style={{ color: PRIMARY }}>
                        {currency(displayLoadingAmount(l))}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Totals Dashboard */}
        {selectedLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center">
              <p className="text-sm text-slate-600">Total Price (Fish)</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {currency(baseAmount)}
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
              <p className="text-sm text-amber-700">Dispatch Charges</p>
              <p className="text-2xl font-bold text-amber-600 mt-2">
                {currency(totalDispatchCharges)}
              </p>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 text-center">
              <p className="text-sm text-indigo-700">Ice</p>
              <p className="text-2xl font-bold text-indigo-600 mt-2">
                {currency(totalPackingAmount)}
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 text-center">
              <p className="text-sm font-medium text-emerald-800">
                Net Receivable from Client
              </p>
              <p className="text-3xl font-bold text-emerald-600 mt-2">
                {currency(netAmount)}
              </p>
            </div>
          </div>
        )}

        {/* Add Charges UI */}
        {sourceRecordId && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-xl font-semibold text-slate-800 mb-6">
              Add Dispatch Charges
            </h3>

            {!canSubmit && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">
                    Packing amount required
                  </p>
                  <p className="text-sm text-yellow-700">
                    Please record at least one packing amount before adding
                    dispatch charges.
                  </p>
                </div>
              </div>
            )}

            <div
              className={`grid grid-cols-1 md:grid-cols-3 gap-8 ${
                hasVehicle ? "lg:grid-cols-3" : "lg:grid-cols-2"
              }`}
            >
              {/* Ice */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Snowflake className="w-6 h-6 text-cyan-600" />
                  <Label className="text-lg font-medium">Ice Packing</Label>
                </div>
                <Input
                  type="text"
                  placeholder="Enter amount"
                  value={iceAmount}
                  onChange={(e) =>
                    isNumericInput(e.target.value) &&
                    setIceAmount(e.target.value)
                  }
                  className="h-12 text-lg font-mono"
                />
              </div>

              {/* ✅ Transport only if vehicle exists */}
              {hasVehicle && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Truck className="w-6 h-6 text-orange-600" />
                    <Label className="text-lg font-medium">Transport</Label>
                  </div>
                  <Input
                    type="text"
                    placeholder="Enter amount"
                    value={transportAmount}
                    onChange={(e) =>
                      isNumericInput(e.target.value) &&
                      setTransportAmount(e.target.value)
                    }
                    className="h-12 text-lg font-mono"
                  />
                  <p className="text-xs text-slate-500">
                    Vehicle:{" "}
                    <span className="font-medium">
                      {selectedLoading?.vehicleNo || selectedLoading?.vehicleId}
                    </span>
                  </p>
                </div>
              )}

              {/* Other */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Package className="w-6 h-6 text-purple-600" />
                  <Label className="text-lg font-medium">Other Charge</Label>
                </div>
                <Input
                  placeholder="Label (e.g. Hamali, Toll)"
                  value={otherLabel}
                  onChange={(e) => setOtherLabel(e.target.value)}
                  className="h-12"
                />
                <Input
                  type="text"
                  placeholder="Enter amount"
                  value={otherAmount}
                  onChange={(e) =>
                    isNumericInput(e.target.value) &&
                    setOtherAmount(e.target.value)
                  }
                  className="h-12 text-lg font-mono mt-3"
                />
              </div>
            </div>

            <div className="mt-6">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="Shared notes for all charges"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-2"
              />
            </div>

            <div className="mt-8 flex justify-end">
              <Button
                size="lg"
                onClick={handleSaveAll}
                disabled={mutation.isPending || !canSubmit}
                className={`text-lg px-8 ${
                  canSubmit
                    ? "bg-[#139BC3] hover:bg-[#1088AA]"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                {mutation.isPending ? "Saving..." : "Save All Charges"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </CardCustom>
  );
};
