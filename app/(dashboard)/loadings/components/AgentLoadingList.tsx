"use client";

import { useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LoadingItem {
  id: string;
  varietyCode: string;
  noTrays: number;
  loose: number;
}
interface AgentLoading {
  id: string;
  billNo: string;
  agentName: string;
  date: string;
  totalTrays: number;
  totalKgs: number;
  items: LoadingItem[];
}

interface Props {
  onEdit: (loading: AgentLoading) => void;
}

export default function AgentLoadingList({ onEdit }: Props) {
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data: loadings = [], isLoading } = useQuery<AgentLoading[]>({
    queryKey: ["agent-loadings", search, fromDate, toDate],
    queryFn: async () => {
      const res = await axios.get("/api/agent-loading", {
        params: {
          search,
          fromDate,
          toDate,
        },
      });

      return res.data.data ?? [];
    },
  });

  const clearFilters = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
  };

  return (
    <Card className="p-6 mt-6 rounded-2xl border border-[#139BC3]/15 bg-white shadow-sm space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Search Bill No / Agent"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-[220px]"
        />

        <Input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="w-[170px]"
        />

        <Input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="w-[170px]"
        />

        <Button variant="outline" onClick={clearFilters}>
          X
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[750px]">
          <thead className="bg-[#139BC3]/10">
            <tr>
              <th className="px-4 py-3 text-left">Bill No</th>
              <th className="px-4 py-3 text-left">Agent</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Varieties</th>
              <th className="px-4 py-3 text-left">Trays</th>
              <th className="px-4 py-3 text-left">Loose</th>
              <th className="px-4 py-3 text-left">Total Kgs</th>
            </tr>
          </thead>

          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="text-center py-6">
                  Loading...
                </td>
              </tr>
            )}

            {loadings.map((loading) => {
              const varieties = loading.items
                .map((i) => i.varietyCode)
                .join(",");

              const looseTotal = loading.items.reduce(
                (sum, i) => sum + (i.loose || 0),
                0,
              );

              return (
                <tr
                  key={loading.id}
                  onClick={() => onEdit(loading)}
                  className="border-t hover:bg-[#139BC3]/5 cursor-pointer"
                >
                  <td className="px-4 py-3 font-semibold">{loading.billNo}</td>

                  <td className="px-4 py-3">{loading.agentName}</td>
                  <td className="px-4 py-3">
                    {new Date(loading.date).toISOString().slice(0, 10)}
                  </td>

                  <td className="px-4 py-3">{varieties}</td>

                  <td className="px-4 py-3">{loading.totalTrays}</td>

                  <td className="px-4 py-3">{looseTotal}</td>

                  <td className="px-4 py-3 font-semibold">
                    {loading.totalKgs}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
