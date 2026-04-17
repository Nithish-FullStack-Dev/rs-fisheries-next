"use client";

import React, { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import {
  ArrowLeft,
  Info,
  MapPin,
  Phone,
  TrendingUp,
  Calendar,
  Truck,
  Package,
  History,
  FileText,
  Download,
} from "lucide-react";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Agent } from "../types/type";

// --- Page Component ---
const AgentViewPage = () => {
  const { id } = useParams();
  const router = useRouter();

  const { data, isLoading, isError, error } = useQuery<Agent, AxiosError>({
    queryKey: ["agent", id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/agent/${id}`);
      return data.data; // Includes agentLoadings with items/vehicle
    },
    enabled: !!id,
  });

  const agentLoadings = data?.agentLoadings || [];

  // Formatting helpers
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(val);

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const ledgerRows = useMemo(() => {
    const rows = new Map<
      string,
      {
        date: string;
        billAmount: number;
        paymentAmount: number;
        balance: number;
        loads: number;
        payments: number;
      }
    >();

    agentLoadings.forEach((loading: any) => {
      const dateKey = formatDate(loading.date);
      const billAmount = Number(loading.grandTotal || 0);
      const existing = rows.get(dateKey);

      if (existing) {
        existing.billAmount += billAmount;
        existing.balance += billAmount;
        existing.loads += 1;
      } else {
        rows.set(dateKey, {
          date: dateKey,
          billAmount,
          paymentAmount: 0,
          balance: billAmount,
          loads: 1,
          payments: 0,
        });
      }
    });

    return Array.from(rows.values());
  }, [agentLoadings]);

  const totalLedgerBillAmount = ledgerRows.reduce(
    (sum, row) => sum + row.billAmount,
    0,
  );
  const totalLedgerPaymentAmount = ledgerRows.reduce(
    (sum, row) => sum + row.paymentAmount,
    0,
  );
  const totalLedgerPending = Math.max(
    0,
    totalLedgerBillAmount - totalLedgerPaymentAmount,
  );

  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <ErrorState error={error} />;

  const agent = data!;
  const totalLoadings = agent.agentLoadings?.length || 0;
  const lastLoadingDate = totalLoadings > 0 ? agentLoadings[0].date : null;

  const handleDownloadLedger = () => {
    const sheetData = ledgerRows.map((row) => ({
      Date: row.date,
      "Bill Amount": row.billAmount,
      "Payment Amount": row.paymentAmount,
      Balance: row.balance,
      Loads: row.loads,
      Payments: row.payments,
    }));

    const ws = XLSX.utils.json_to_sheet(sheetData);
    const summaryRow = {
      Date: "TOTAL",
      "Bill Amount": totalLedgerBillAmount,
      "Payment Amount": totalLedgerPaymentAmount,
      Balance: totalLedgerPending,
      Loads: ledgerRows.reduce((sum, row) => sum + row.loads, 0),
      Payments: ledgerRows.reduce((sum, row) => sum + row.payments, 0),
    };

    XLSX.utils.sheet_add_json(ws, [summaryRow], {
      origin: -1,
      skipHeader: true,
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Agent Ledger");

    const safeName = agent.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    XLSX.writeFile(
      wb,
      `agent_ledger_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">
                {agent.name}
              </h1>
              <Badge variant={agent.isActive ? "default" : "secondary"}>
                {agent.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-muted-foreground">Agent Registry Information</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/agent/${id}/edit`)}
          >
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Loadings"
          value={String(totalLoadings)}
          subText="Recorded counts"
          icon={<TrendingUp className="text-green-500" />}
        />
        <StatCard
          title="Last Loading"
          value={lastLoadingDate ? formatDate(lastLoadingDate) : "No activity"}
          subText="Most recent shipment"
          icon={<Calendar className="text-blue-500" />}
        />
        <StatCard
          title="Status"
          value={agent.isActive ? "Active" : "Inactive"}
          subText="Current availability"
          icon={<Info className="text-purple-500" />}
        />
        <StatCard
          title="Contact"
          value={agent.phone}
          subText="Direct phone line"
          icon={<Phone className="text-orange-500" />}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full md:w-[300px] grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {/* <TabsTrigger value="ledger">Ledger</TabsTrigger> */}
          <TabsTrigger value="loadings">Loadings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Info className="h-5 w-5" /> Agent Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-y-6">
                <DetailItem
                  label="Full Address / Location"
                  value={agent.address}
                  fullWidth
                  icon={<MapPin className="h-4 w-4" />}
                />
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <DetailItem label="Phone" value={agent.phone} />
                  <DetailItem
                    label="Registered At"
                    value={formatDate(agent.createdAt)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-primary flex items-center gap-2">
                  <FileText className="h-5 w-5" /> Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <p className="text-sm font-medium">Activity Snapshot</p>
                  <p className="text-xs text-muted-foreground">
                    This agent has handled {totalLoadings} loadings to date.
                    They are currently marked as{" "}
                    {agent.isActive ? "Active" : "Inactive"}.
                  </p>
                </div>
                <div className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>Last Profile Update</span>
                  <span>
                    {agent.updatedAt ? formatDate(agent.updatedAt) : "N/A"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Ledger Tab */}
        <TabsContent value="ledger" className="space-y-4">
          <div className="grid gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <History className="h-5 w-5" /> Ledger
                </h2>
                <p className="text-sm text-muted-foreground">
                  Date-wise bill totals, payments and pending balances.
                </p>
              </div>
              <Button className="self-start" onClick={handleDownloadLedger}>
                <Download className="w-4 h-4 mr-2" /> Download Ledger
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent>
                  <p className="text-xs uppercase text-muted-foreground">
                    Grand Total
                  </p>
                  <p className="text-2xl font-semibold mt-3">
                    {formatCurrency(totalLedgerBillAmount)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="text-xs uppercase text-muted-foreground">
                    Paid
                  </p>
                  <p className="text-2xl font-semibold text-emerald-600 mt-3">
                    {formatCurrency(totalLedgerPaymentAmount)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="text-xs uppercase text-muted-foreground">
                    Pending
                  </p>
                  <p className="text-2xl font-semibold text-red-600 mt-3">
                    {formatCurrency(totalLedgerPending)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="overflow-x-auto rounded-xl border bg-background">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Bill Amount</th>
                    <th className="px-4 py-3 text-right">Payments</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3 text-right">Loads</th>
                    <th className="px-4 py-3 text-right">Payments</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ledgerRows.length > 0 ? (
                    ledgerRows.map((row) => (
                      <tr key={row.date} className="hover:bg-muted/10">
                        <td className="px-4 py-3 font-medium">{row.date}</td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(row.billAmount)}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-600">
                          {formatCurrency(row.paymentAmount)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(row.balance)}
                        </td>
                        <td className="px-4 py-3 text-right">{row.loads}</td>
                        <td className="px-4 py-3 text-right">{row.payments}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-6 text-center text-sm text-muted-foreground"
                      >
                        No ledger entries available for this agent yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Loadings Tab */}
        <TabsContent value="loadings" className="space-y-4">
          {agent.agentLoadings && agent.agentLoadings.length > 0 ? (
            agent.agentLoadings.map((loading: any) => (
              <Card
                key={loading.id}
                className="overflow-hidden border-l-4 border-l-primary"
              >
                <div className="bg-muted/30 p-4 border-b flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">
                        Bill #{loading.billNo}
                      </span>
                      <Badge variant="outline" className="bg-background">
                        {loading.tripStatus}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />{" "}
                        {formatDate(loading.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Truck className="h-3 w-3" />{" "}
                        {loading.vehicle?.vehicleNumber ||
                          loading.vehicleNo ||
                          "Vehicle not assigned"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Grand Total</p>
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(loading.grandTotal)}
                    </p>
                  </div>
                </div>

                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 font-medium">Variety</th>
                          <th className="px-4 py-3 font-medium text-right">
                            Trays
                          </th>
                          <th className="px-4 py-3 font-medium text-right">
                            Loose
                          </th>
                          <th className="px-4 py-3 font-medium text-right">
                            Total Weight
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {loading.items.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-muted/10">
                            <td className="px-4 py-3 font-medium">
                              {item.varietyCode}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {item.noTrays}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {item.loose}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {item.totalKgs}kg
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>

                <CardFooter className="bg-muted/5 p-3 flex justify-between items-center text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span>
                      Total Trays: <strong>{loading.totalTrays}</strong>
                    </span>
                    <span>
                      Total Weight: <strong>{loading.totalKgs}kg</strong>
                    </span>
                  </div>
                </CardFooter>
              </Card>
            ))
          ) : (
            <EmptyState
              icon={<Package className="h-10 w-10" />}
              title="No Loadings Found"
              desc="This agent has no associated loading records yet."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// --- Sub-components ---

function StatCard({
  title,
  value,
  subText,
  icon,
}: {
  title: string;
  value: string;
  subText: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium">{title}</p>
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <p className="text-xs text-muted-foreground uppercase mt-1">
            {subText}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailItem({
  label,
  value,
  fullWidth = false,
  icon,
}: {
  label: string;
  value: string | null | undefined;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className={`${fullWidth ? "col-span-2" : "col-span-1"} space-y-1`}>
      <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
        {icon} {label}
      </p>
      <p className="text-sm font-medium leading-relaxed">{value || "—"}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Skeleton className="h-12 w-1/3" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}

function ErrorState({ error }: { error: any }) {
  return (
    <div className="h-screen flex flex-col items-center justify-center space-y-4 text-center">
      <h2 className="text-xl font-bold">
        {axios.isAxiosError(error)
          ? error.response?.data?.message || "Agent not found"
          : error.message || "Something went wrong"}
      </h2>
      <Button onClick={() => window.history.back()}>Go Back</Button>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
      <div className="bg-muted p-3 rounded-full mb-4">{icon}</div>
      <h3 className="text-lg font-medium text-foreground">{title}</h3>
      <p className="text-sm max-w-xs">{desc}</p>
    </div>
  );
}

export default AgentViewPage;
