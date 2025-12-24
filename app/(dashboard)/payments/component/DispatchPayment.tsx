// app\(dashboard)\payments\component\DispatchPayment.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { CardCustom } from "@/components/ui/card-custom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Package, Truck, Snowflake, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SourceType = "CLIENT" | "FORMER" | "AGENT";

const PRIMARY = "#139BC3";

const currency = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export const DispatchPayment = () => {
  const queryClient = useQueryClient();

  const [sourceType, setSourceType] = useState<SourceType>("CLIENT");
  const [sourceRecordId, setSourceRecordId] = useState("");

  // Inputs
  const [iceAmount, setIceAmount] = useState("");
  const [transportAmount, setTransportAmount] = useState("");
  const [otherLabel, setOtherLabel] = useState("");
  const [otherAmount, setOtherAmount] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setIceAmount("");
    setTransportAmount("");
    setOtherLabel("");
    setOtherAmount("");
    setNotes("");
  };

  const getSourceLabel = () => {
    return sourceType === "CLIENT"
      ? "Client"
      : sourceType === "FORMER"
      ? "Farmer"
      : "Agent";
  };

  // ✅ Which endpoint to fetch loadings
  const loadingEndpoint =
    sourceType === "CLIENT"
      ? "/api/client-loading"
      : sourceType === "FORMER"
      ? "/api/former-loading"
      : "/api/agent-loading";

  /**
   * ✅ Loadings list:
   * We fetch loadings + we fetch dispatch charges used IDs to hide already-dispatched loadings
   *
   * IMPORTANT:
   * Your loadingEndpoint must return loadings INCLUDING "items" (for totalPrice calculation)
   */
  const { data: loadings = [], isLoading: loadingLoadings } = useQuery({
    queryKey: ["loadings", sourceType],
    queryFn: async () => {
      const allLoadings = await axios
        .get(loadingEndpoint)
        .then((res) => res.data?.data || []);

      const dispatchRes = await axios.get(
        `/api/payments/dispatch?sourceType=${sourceType}`
      );
      const dispatchData = dispatchRes.data?.data || [];
      const usedIds = new Set(dispatchData.map((d: any) => d.sourceRecordId));

      // Only show loadings with no dispatch charges yet (your requirement)
      return allLoadings.filter((l: any) => !usedIds.has(l.id));
    },
  });

  // Selected loading object
  const selectedLoading = useMemo(
    () => loadings.find((l: any) => l.id === sourceRecordId),
    [loadings, sourceRecordId]
  );

  // ✅ Fetch dispatch charges for selected loading
  const { data: dispatchCharges = [] } = useQuery({
    queryKey: ["dispatch-charges", sourceType, sourceRecordId],
    queryFn: () =>
      axios
        .get(
          `/api/payments/dispatch?sourceType=${sourceType}&sourceRecordId=${sourceRecordId}`
        )
        .then((res) => res.data?.data || []),
    enabled: !!sourceRecordId,
  });

  // ✅ Fetch packing amounts for selected loading
  const { data: packingAmounts = [] } = useQuery({
    queryKey: ["packing-amounts", sourceType, sourceRecordId],
    queryFn: () =>
      axios
        .get(
          `/api/payments/packing-amount?sourceType=${sourceType}&sourceRecordId=${sourceRecordId}`
        )
        .then((res) => res.data?.data || []),
    enabled: !!sourceRecordId,
  });

  // ✅ Correct totals
  const totalDispatchCharges = useMemo(() => {
    return dispatchCharges.reduce(
      (sum: number, c: any) => sum + safeNum(c.amount),
      0
    );
  }, [dispatchCharges]);

  const totalPacking = useMemo(() => {
    return packingAmounts.reduce(
      (sum: number, p: any) => sum + safeNum(p.totalAmount),
      0
    );
  }, [packingAmounts]);

  /**
   * ✅ BASE AMOUNT MUST BE totalPrice (fish value), NOT grandTotal.
   * Because grandTotal already includes dispatch + packing.
   *
   * If totalPrice is 0 in your API for farmer/agent, we fallback to items-sum.
   */
  const itemsTotalPrice = useMemo(() => {
    const items = selectedLoading?.items || [];
    return items.reduce((s: number, it: any) => s + safeNum(it.totalPrice), 0);
  }, [selectedLoading]);

  const baseAmount = useMemo(() => {
    const apiTotalPrice = safeNum(selectedLoading?.totalPrice);
    return apiTotalPrice > 0 ? apiTotalPrice : itemsTotalPrice;
  }, [selectedLoading, itemsTotalPrice]);

  // ✅ Net = fish total + dispatch + packing
  const netAmount = baseAmount + totalDispatchCharges + totalPacking;

  const netLabel =
    sourceType === "CLIENT"
      ? "Net Receivable from Client"
      : "Net Payable to Vendor";

  // ✅ Mutation: create a dispatch charge
  const mutation = useMutation({
    mutationFn: (payload: any) =>
      axios.post("/api/payments/dispatch", {
        sourceType,
        ...payload,
      }),
  });

  // ✅ Save All Charges (single button)
  const handleSaveAll = async () => {
    if (!sourceRecordId) return toast.error("Select a loading");

    const charges: any[] = [];

    if (iceAmount) {
      charges.push({
        type: "ICE_COOLING",
        amount: safeNum(iceAmount),
      });
    }

    if (transportAmount) {
      charges.push({
        type: "TRANSPORT",
        amount: safeNum(transportAmount),
      });
    }

    if (otherAmount || otherLabel.trim()) {
      if (!otherLabel.trim()) return toast.error("Other label required");
      if (!otherAmount) return toast.error("Other amount required");
      charges.push({
        type: "OTHER",
        label: otherLabel.trim(),
        amount: safeNum(otherAmount),
      });
    }

    if (charges.length === 0) return toast.error("Enter at least one charge");

    try {
      // ✅ create all charges (separate rows)
      await Promise.all(
        charges.map((c) =>
          mutation.mutateAsync({
            sourceRecordId,
            ...c,
            notes: notes.trim() || null,
          })
        )
      );

      toast.success(`${charges.length} charge(s) added!`);

      // ✅ refresh queries once
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["dispatch-charges", sourceType, sourceRecordId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["packing-amounts", sourceType, sourceRecordId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["loadings", sourceType],
        }),
      ]);

      resetForm();
      setSourceRecordId(""); // hide from list because now it has dispatch charge
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to add charge");
    }
  };

  // ✅ Dropdown amount display should be totalPrice (fallback items sum)
  const displayLoadingAmount = (l: any) => {
    const apiTotalPrice = safeNum(l.totalPrice);
    if (apiTotalPrice > 0) return apiTotalPrice;

    const items = l.items || [];
    const sumItems = items.reduce(
      (s: number, it: any) => s + safeNum(it.totalPrice),
      0
    );
    return sumItems;
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
        {/* Source Tabs */}
        <div className="flex flex-wrap gap-3 justify-center">
          {(["CLIENT", "FORMER", "AGENT"] as const).map((st) => (
            <button
              key={st}
              onClick={() => {
                setSourceType(st);
                setSourceRecordId("");
                resetForm();
              }}
              className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                sourceType === st
                  ? "bg-[#139BC3] text-white shadow-lg"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {st === "CLIENT"
                ? "Client"
                : st === "FORMER"
                ? "Farmer"
                : "Agent"}
            </button>
          ))}
        </div>

        {/* Loading Selector */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <Label className="text-lg font-medium text-slate-800">
            Select {getSourceLabel()} Loading
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
              {loadings.map((l: any) => (
                <SelectItem key={l.id} value={l.id}>
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium">
                      {l.clientName || l.FarmerName || l.agentName}
                    </span>
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
              <p className="text-sm text-indigo-700">Packing Amount</p>
              <p className="text-2xl font-bold text-indigo-600 mt-2">
                {currency(totalPacking)}
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 text-center">
              <p className="text-sm font-medium text-emerald-800">{netLabel}</p>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Ice */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Snowflake className="w-6 h-6 text-cyan-600" />
                  <Label className="text-lg font-medium">Ice / Cooling</Label>
                </div>
                <Input
                  type="text"
                  placeholder="Enter amount"
                  value={iceAmount}
                  onChange={(e) =>
                    /^\d*\.?\d*$/.test(e.target.value) &&
                    setIceAmount(e.target.value)
                  }
                  className="h-12 text-lg font-mono"
                />
              </div>

              {/* Transport */}
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
                    /^\d*\.?\d*$/.test(e.target.value) &&
                    setTransportAmount(e.target.value)
                  }
                  className="h-12 text-lg font-mono"
                />
              </div>

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
                    /^\d*\.?\d*$/.test(e.target.value) &&
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
                disabled={mutation.isPending}
                className="bg-[#139BC3] hover:bg-[#1088AA] text-lg px-8"
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
