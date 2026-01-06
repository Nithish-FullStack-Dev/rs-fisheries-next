"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CardCustom } from "@/components/ui/card-custom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

type PaymentMode = "CASH" | "AC" | "UPI" | "CHEQUE";

interface ClientBill {
  id: string;
  billNo: string;
  clientName?: string;
}

const DEFAULT_ICE_PRICE = 200;

export default function PackingAmount() {
  const [bills, setBills] = useState<ClientBill[]>([]);
  const [loadingBills, setLoadingBills] = useState(true);

  const [selectedBillId, setSelectedBillId] = useState<string>("");

  const [iceBlocks, setIceBlocks] = useState<number>(0);
  const [icePrice, setIcePrice] = useState<number>(DEFAULT_ICE_PRICE);

  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH");
  const [reference, setReference] = useState<string>("");

  const [saving, setSaving] = useState(false);

  /* ---------------------- FETCH CLIENT LOADINGS ---------------------- */
  useEffect(() => {
    const loadBills = async () => {
      try {
        setLoadingBills(true);
        const res = await fetch("/api/client-loading?stage=PACKING_PENDING");

        const json = await res.json();
        setBills(json.data || []);
      } catch (e) {
        toast.error("Failed to load client bills");
        setBills([]);
      } finally {
        setLoadingBills(false);
      }
    };
    loadBills();
  }, []);

  /* ---------------------- AUTO TOTAL CALC ---------------------- */
  const totalAmount = useMemo(() => {
    if (iceBlocks <= 0 || icePrice <= 0) return 0;
    return iceBlocks * icePrice;
  }, [iceBlocks, icePrice]);

  /* ---------------------- SAVE ---------------------- */
  const handleSave = async () => {
    if (iceBlocks <= 0) {
      toast.error("Enter number of ice blocks");
      return;
    }
    if (icePrice <= 0) {
      toast.error("Ice block price must be greater than 0");
      return;
    }
    if (paymentMode !== "CASH" && !reference.trim()) {
      toast.error("Reference is required for non-cash payments");
      return;
    }
    if (!selectedBillId) {
      toast.error("Please select a client bill");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/payments/packing-amount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "loading",
          sourceType: selectedBillId ? "CLIENT" : null,
          sourceRecordId: selectedBillId || null,
          workers: iceBlocks, // reuse existing column safely
          temperature: icePrice, // store price per block
          totalAmount,
          paymentMode,
          reference: reference.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }

      toast.success("Ice blocks amount saved");

      // reset
      setSelectedBillId("");
      setIceBlocks(0);
      setIcePrice(DEFAULT_ICE_PRICE);
      setPaymentMode("CASH");
      setReference("");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  /* ---------------------- UI ---------------------- */
  return (
    <CardCustom title="Ice Blocks Amount">
      <div className="space-y-6">
        {/* MODE (ONLY LOADING) */}
        <div>
          <Badge className="bg-[#139BC3] text-white px-5 py-2 rounded-full">
            Loading
          </Badge>
        </div>

        {/* FORM */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* BILL */}
            <div>
              <Label>Client Bill (optional)</Label>
              {loadingBills ? (
                <div className="flex items-center gap-2 text-sm text-slate-600 mt-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : (
                <Select
                  value={selectedBillId}
                  onValueChange={setSelectedBillId}
                >
                  <SelectTrigger className="h-11 mt-2">
                    <SelectValue placeholder="Select bill (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {bills.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.billNo} — {b.clientName || "Client"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* ICE BLOCK COUNT */}
            <div>
              <Label>Number of Ice Blocks</Label>
              <Input
                type="number"
                min={0}
                value={iceBlocks}
                onChange={(e) =>
                  setIceBlocks(Math.max(0, Number(e.target.value) || 0))
                }
                placeholder="e.g. 10"
                className="h-11 mt-2"
              />
            </div>

            {/* PRICE PER BLOCK */}
            <div>
              <Label>Price per Ice Block (₹)</Label>
              <Input
                type="number"
                min={0}
                value={icePrice}
                onChange={(e) =>
                  setIcePrice(Math.max(0, Number(e.target.value) || 0))
                }
                placeholder="e.g. 200"
                className="h-11 mt-2"
              />
            </div>
          </div>

          {/* TOTAL */}
          <div>
            <Label>Total Ice Amount (₹)</Label>
            <Input
              value={totalAmount}
              readOnly
              className="h-14 mt-2 text-2xl font-bold bg-slate-50"
            />
          </div>

          {/* PAYMENT MODE */}
          <div className="space-y-3">
            <Label>Payment Mode</Label>
            <div className="flex flex-wrap gap-2">
              {(["CASH", "AC", "UPI", "CHEQUE"] as const).map((pm) => (
                <Badge
                  key={pm}
                  onClick={() => {
                    setPaymentMode(pm);
                    if (pm === "CASH") setReference("");
                  }}
                  className={[
                    "cursor-pointer px-4 py-2 rounded-full border transition",
                    paymentMode === pm
                      ? "bg-[#139BC3] text-white border-[#139BC3]"
                      : "bg-white text-slate-700 border-slate-200",
                  ].join(" ")}
                >
                  {pm === "CASH" && "Cash"}
                  {pm === "AC" && "A/C Transfer"}
                  {pm === "UPI" && "UPI / PhonePe"}
                  {pm === "CHEQUE" && "Cheque"}
                </Badge>
              ))}
            </div>
          </div>

          {/* REFERENCE */}
          {paymentMode !== "CASH" && (
            <div>
              <Label>Reference *</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Enter reference"
                className="h-11 mt-2"
              />
            </div>
          )}

          {/* ACTIONS */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#139BC3] hover:bg-[#1088AA]"
              size="lg"
            >
              <Save className="h-5 w-5 mr-2" />
              {saving ? "Saving..." : "Save Ice Amount"}
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setIceBlocks(0);
                setIcePrice(DEFAULT_ICE_PRICE);
                setSelectedBillId("");
                setPaymentMode("CASH");
                setReference("");
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </div>
    </CardCustom>
  );
}
