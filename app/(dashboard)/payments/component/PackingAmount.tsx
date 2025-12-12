"use client";

import React, { useEffect, useState } from "react";
import { CardCustom } from "@/components/ui/card-custom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/helpers/Field";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Mode = "loading" | "unloading";

interface Bill {
  id: string;
  billNo: string;
  clientName?: string;
  FarmerName?: string;
  agentName?: string;
  vehicleNo?: string;
}

export function PackingAmount() {
  const [mode, setMode] = useState<Mode>("loading");
  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedBillId, setSelectedBillId] = useState<string>("");
  const [workers, setWorkers] = useState<string>("");
  const [temperature, setTemperature] = useState<string>("");
  const [total, setTotal] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch bills based on mode
  useEffect(() => {
    async function loadBills() {
      setIsLoading(true);
      try {
        let data: Bill[] = [];

        if (mode === "loading") {
          const res = await fetch("/api/client-loading");
          const json = await res.json();
          data = json.data || [];
        } else {
          const [formerRes, agentRes] = await Promise.all([
            fetch("/api/former-loading"),
            fetch("/api/agent-loading"),
          ]);
          const f = await formerRes.json();
          const a = await agentRes.json();
          data = [...(f.data || []), ...(a.data || [])];
        }

        setBills(data);
      } catch (err) {
        toast.error("Failed to load bills");
      } finally {
        setIsLoading(false);
      }
    }
    loadBills();
  }, [mode]);

  const handleSave = async () => {
    const workersNum = parseInt(workers);
    const tempNum = parseFloat(temperature);
    const totalNum = parseFloat(total);

    if (workersNum <= 0) {
      toast.error("Please enter number of workers");
      return;
    }
    if (isNaN(tempNum)) {
      toast.error("Please enter valid temperature");
      return;
    }
    if (totalNum <= 0) {
      toast.error("Please enter total amount");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/payments/packing-amount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          sourceRecordId: selectedBillId || null,
          workers: workersNum,
          temperature: tempNum,
          totalAmount: totalNum,
        }),
      });

      if (!res.ok) throw new Error("Save failed");

      toast.success("Packing amount saved successfully!");

      // Reset form
      setWorkers("");
      setTemperature("");
      setTotal("0");
      setSelectedBillId("");
    } catch (err) {
      toast.error("Failed to save packing amount");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <CardCustom title="Packing Amount">
      <div className="space-y-6">
        {/* Mode Toggle */}
        <div className="flex gap-4">
          <Button
            variant={mode === "loading" ? "default" : "outline"}
            onClick={() => setMode("loading")}
            size="sm"
          >
            Loading
          </Button>
          <Button
            variant={mode === "unloading" ? "default" : "outline"}
            onClick={() => setMode("unloading")}
            size="sm"
          >
            Unloading
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Bill Selector */}
          <Field label={mode === "loading" ? "Client Bill" : "Vendor Bill"}>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="animate-spin h-4 w-4" />
                Loading bills...
              </div>
            ) : (
              <Select value={selectedBillId} onValueChange={setSelectedBillId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bill (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {bills.length === 0 ? (
                    <div className="px-4 py-2 text-sm text-muted-foreground">
                      No bills found
                    </div>
                  ) : (
                    bills.map((bill) => (
                      <SelectItem key={bill.id} value={bill.id}>
                        {bill.billNo} —{" "}
                        {bill.clientName ||
                          bill.FarmerName ||
                          bill.agentName ||
                          "Unknown"}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </Field>

          {/* Workers */}
          <Field label="Number of Workers">
            <Input
              type="number"
              value={workers}
              onChange={(e) => setWorkers(e.target.value)}
              placeholder="e.g. 8"
              min="1"
            />
          </Field>

          {/* Temperature */}
          <Field label="Temperature (°C)">
            <Input
              type="number"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              placeholder="e.g. 24.5"
            />
          </Field>
        </div>

        {/* Total Amount */}
        <Field label="Total Packing Amount (₹)">
          <Input
            type="number"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="Enter total amount"
            className="text-2xl font-bold"
            min="0"
            step="100"
          />
        </Field>

        {/* Save & Reset */}
        <div className="flex gap-4 pt-4">
          <Button
            onClick={handleSave}
            disabled={isSaving || !workers || !temperature || !total}
            size="lg"
          >
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                Save Packing Amount
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setWorkers("");
              setTemperature("");
              setTotal("0");
              setSelectedBillId("");
            }}
          >
            Reset
          </Button>
        </div>
      </div>
    </CardCustom>
  );
}
