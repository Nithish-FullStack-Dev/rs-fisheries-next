// app/(dashboard)/vendor-bills/page.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Check, X, Trash } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface VendorItem {
  id: string;
  varietyCode?: string;
  noTrays?: number;
  trayKgs?: number;
  loose?: number;
  totalKgs?: number;
  pricePerKg?: number;
  totalPrice?: number;
  loadingId?: string;
  source?: "farmer" | "agent";
  billNo?: string;
  name?: string;
}

interface LoadingRecord {
  id: string;
  billNo?: string;
  date?: string;
  items: VendorItem[];
  source?: "farmer" | "agent";
  createdAt?: string;
  FarmerName?: string;
  agentName?: string;
  vehicleNo?: string;
  village?: string;
  totalPrice?: number;
  grandTotal?: number;
}

const fetchFarmerLoadings = async () => {
  const res = await axios.get("/api/former-loading");
  return res.data?.data ?? [];
};

const fetchAgentLoadings = async () => {
  const res = await axios.get("/api/agent-loading");
  return res.data?.data ?? [];
};

const patchItemPrice = async (itemId: string, body: Partial<VendorItem>) => {
  const res = await axios.patch(`/api/vendor-bills/item/${itemId}`, body);
  return res.data;
};

export default function VendorBillsPage() {
  const [activeTab, setActiveTab] = useState<"farmer" | "agent">("farmer");
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<LoadingRecord[]>([]);
  const [editing, setEditing] = useState<Record<string, Partial<VendorItem>>>(
    {}
  );
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});

  // Track which tabs have been visited (to clear badge)
  const [visitedTabs, setVisitedTabs] = useState<{
    farmer: boolean;
    agent: boolean;
  }>({
    farmer: true,
    agent: false,
  });

  // Load data
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([fetchFarmerLoadings(), fetchAgentLoadings()])
      .then(([farmers, agents]) => {
        if (!mounted) return;

        const tagged: LoadingRecord[] = [
          ...farmers.map((r: any) => ({ ...r, source: "farmer" as const })),
          ...agents.map((r: any) => ({ ...r, source: "agent" as const })),
        ];

        setRecords(tagged);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load vendor bills");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Filtered items based on active tab
  const items = useMemo(() => {
    return records
      .filter((rec) =>
        activeTab === "farmer"
          ? rec.source === "farmer"
          : rec.source === "agent"
      )
      .flatMap((rec) =>
        rec.items.map((it) => ({
          ...it,
          loadingId: rec.id,
          source: rec.source,
          billNo: rec.billNo,
          name: rec.source === "farmer" ? rec.FarmerName : rec.agentName,
        }))
      )
      .sort((a, b) =>
        a.loadingId === b.loadingId
          ? (a.varietyCode || "").localeCompare(b.varietyCode || "")
          : (a.loadingId || "").localeCompare(b.loadingId || "")
      );
  }, [records, activeTab]);

  // Count unvisited records
  const farmerCount = records.filter((r) => r.source === "farmer").length;
  const agentCount = records.filter((r) => r.source === "agent").length;

  const farmerBadge = visitedTabs.farmer ? 0 : farmerCount;
  const agentBadge = visitedTabs.agent ? 0 : agentCount;

  // Tab click → mark as visited
  const handleTabClick = (tab: "farmer" | "agent") => {
    setActiveTab(tab);
    setVisitedTabs((prev) => ({ ...prev, [tab]: true }));
  };

  const startEdit = useCallback((item: VendorItem) => {
    setEditing((prev) => ({
      ...prev,
      [item.id]: { pricePerKg: item.pricePerKg, totalPrice: item.totalPrice },
    }));
  }, []);

  const cancelEdit = useCallback((itemId: string) => {
    setEditing((prev) => {
      const copy = { ...prev };
      delete copy[itemId];
      return copy;
    });
  }, []);

  const onChangeField = useCallback(
    (itemId: string, field: "pricePerKg" | "totalPrice", value: string) => {
      setEditing((prev) => {
        const current = prev[itemId] || {};
        const num = value === "" ? undefined : Number(value);

        const item = items.find((i) => i.id === itemId);
        if (!item?.totalKgs) return prev;

        let updates: Partial<VendorItem> = { ...current };

        if (field === "pricePerKg" && num !== undefined) {
          updates.pricePerKg = num;
          const netKgs = item.totalKgs * 0.95;
          updates.totalPrice = Number((netKgs * num).toFixed(2));
        } else {
          updates[field] = num;
        }

        return { ...prev, [itemId]: updates };
      });
    },
    [items]
  );

  const saveRow = async (item: VendorItem) => {
    const edits = editing[item.id];
    if (!edits || savingIds[item.id]) return;

    setSavingIds((prev) => ({ ...prev, [item.id]: true }));

    const payload: any = {};
    if (edits.pricePerKg !== undefined) payload.pricePerKg = edits.pricePerKg;
    if (edits.totalPrice !== undefined) payload.totalPrice = edits.totalPrice;

    // Optimistic update
    setRecords((prevRecords) =>
      prevRecords.map((record) => ({
        ...record,
        items: record.items.map((it) =>
          it.id === item.id ? { ...it, ...edits } : it
        ),
      }))
    );

    try {
      await patchItemPrice(item.id, payload);

      // Update parent loading total
      if (item.loadingId && item.source) {
        await axios.post("/api/vendor-bills/update-loading-total", {
          loadingId: item.loadingId,
          source: item.source,
        });
      }

      // Refresh data
      const [farmers, agents] = await Promise.all([
        fetchFarmerLoadings(),
        fetchAgentLoadings(),
      ]);
      setRecords([
        ...farmers.map((r: any) => ({ ...r, source: "farmer" as const })),
        ...agents.map((r: any) => ({ ...r, source: "agent" as const })),
      ]);

      toast.success("Price saved successfully!");
      cancelEdit(item.id);
    } catch (err) {
      toast.error("Failed to save price");
      // Revert optimistic update
      setRecords((prevRecords) =>
        prevRecords.map((record) => ({
          ...record,
          items: record.items.map((it) =>
            it.id === item.id
              ? {
                  ...it,
                  pricePerKg: item.pricePerKg,
                  totalPrice: item.totalPrice,
                }
              : it
          ),
        }))
      );
    } finally {
      setSavingIds((prev) => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
    }
  };

  const handleDeleteItem = async (
    itemId: string,
    source: "farmer" | "agent"
  ) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      await axios.delete(`/api/vendor-bills/item/${itemId}`);

      // Refresh data
      const [farmers, agents] = await Promise.all([
        fetchFarmerLoadings(),
        fetchAgentLoadings(),
      ]);
      setRecords([
        ...farmers.map((r: any) => ({ ...r, source: "farmer" as const })),
        ...agents.map((r: any) => ({ ...r, source: "agent" as const })),
      ]);

      toast.success("Item deleted successfully!");
    } catch (err) {
      toast.error("Failed to delete item");
    }
  };

  const exportData = (type: "farmer" | "agent") => {
    const filteredRecords = records.filter((r) => r.source === type);
    const exportData = filteredRecords.flatMap((rec) =>
      rec.items.map((it) => ({
        BillNo: rec.billNo,
        Name: type === "farmer" ? rec.FarmerName : rec.agentName,
        Date: rec.date,
        VehicleNo: rec.vehicleNo,
        village: rec.village,
        VarietyCode: it.varietyCode,
        NoTrays: it.noTrays,
        TrayKgs: it.trayKgs,
        Loose: it.loose,
        TotalKgs: it.totalKgs,
        PricePerKg: it.pricePerKg,
        TotalPrice: it.totalPrice,
      }))
    );

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      ws,
      type.charAt(0).toUpperCase() + type.slice(1)
    );
    XLSX.writeFile(wb, `${type}-bills.xlsx`);
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <Card className="p-6 rounded-2xl shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold">Vendor Bills</h2>

            {/* Tab Switcher with Badges */}
            <div className="bg-gray-100 rounded-full p-1 flex items-center gap-1">
              <button
                onClick={() => handleTabClick("farmer")}
                className={`relative px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                  activeTab === "farmer"
                    ? "bg-white shadow-md text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Farmer
                {farmerBadge > 0 && (
                  <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold animate-pulse">
                    {farmerBadge}
                  </span>
                )}
              </button>

              <button
                onClick={() => handleTabClick("agent")}
                className={`relative px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                  activeTab === "agent"
                    ? "bg-white shadow-md text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Agent
                {agentBadge > 0 && (
                  <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold animate-pulse">
                    {agentBadge}
                  </span>
                )}
              </button>
            </div>

            {/* Export Buttons */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => exportData("farmer")}>
                Export Farmers
              </Button>
              <Button variant="outline" onClick={() => exportData("agent")}>
                Export Agents
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">
              Loading vendor bills...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No records found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] table-auto">
                <thead className="bg-gray-50 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Bill No / Name</th>
                    <th className="p-4">Variety</th>
                    <th className="p-4 text-right">Trays</th>
                    <th className="p-4 text-right">Tray Kgs</th>
                    <th className="p-4 text-right">Loose</th>
                    <th className="p-4 text-right">Total Kgs</th>
                    <th className="p-4 text-right">Price/Kg</th>
                    <th className="p-4 text-right">Total Price</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((it) => {
                    const edit = editing[it.id];
                    const isEditing = !!edit;
                    const isSaving = !!savingIds[it.id];

                    return (
                      <tr key={it.id} className="hover:bg-gray-50">
                        <td className="p-4 font-medium">
                          {it.billNo} / {it.name}
                        </td>
                        <td className="p-4">{it.varietyCode}</td>
                        <td className="p-4 text-right">{it.noTrays ?? "-"}</td>
                        <td className="p-4 text-right">{it.trayKgs ?? "-"}</td>
                        <td className="p-4 text-right">{it.loose ?? "-"}</td>
                        <td className="p-4 text-right font-semibold">
                          {it.totalKgs ?? "-"}
                        </td>
                        <td className="p-4 text-right">
                          {isEditing ? (
                            <Input
                              value={edit.pricePerKg ?? ""}
                              onChange={(e) =>
                                onChangeField(
                                  it.id,
                                  "pricePerKg",
                                  e.target.value
                                )
                              }
                              className="w-28 text-right"
                              type="number"
                              step="0.01"
                              min="0"
                            />
                          ) : (
                            <span>{(it.pricePerKg ?? 0).toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-4 text-right font-semibold text-green-600">
                          {isEditing ? (
                            <Input
                              value={edit.totalPrice ?? ""}
                              readOnly
                              className="w-32 text-right bg-green-50"
                            />
                          ) : (
                            (it.totalPrice ?? 0).toFixed(2)
                          )}
                        </td>
                        <td className="p-4 text-center flex justify-center gap-2">
                          {!isEditing ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEdit(it)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-800"
                                onClick={() =>
                                  handleDeleteItem(it.id, it.source!)
                                }
                              >
                                <Trash className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <div className="flex gap-2 justify-center">
                              <Button
                                size="sm"
                                onClick={() => saveRow(it)}
                                disabled={isSaving}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {isSaving ? (
                                  "Saving..."
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => cancelEdit(it.id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
