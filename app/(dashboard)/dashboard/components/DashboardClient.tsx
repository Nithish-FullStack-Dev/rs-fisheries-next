"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardMetrics } from "@/lib/dashboard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

function money(n: number) {
  // ₹ format (simple)
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
}

export default function DashboardClient({ data }: { data: DashboardMetrics }) {
  const weeklyData = data.weekly.map((d) => ({
    day: d.label,
    purchase: d.purchase,
    sales: d.sales,
  }));

  const pieData = data.topVarieties.map((v) => ({
    name: v.code,
    value: Math.round(v.kgs * 10) / 10,
  }));

  const ageingData = data.outstandingAgeing.map((a) => ({
    bucket: a.bucket,
    amount: a.amount,
  }));

  return (
    <div className="space-y-6">
      {/* Today at a glance */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Today at a Glance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi title="Sales (Today)" value={money(data.today.sales)} />
            <Kpi title="Purchase (Today)" value={money(data.today.purchase)} />
            <Kpi
              title="Pending Shipments"
              value={`${data.today.pendingShipments}`}
            />
            <Kpi title="Outstanding" value={money(data.today.outstanding)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Overview (Bar) */}
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader>
            <CardTitle>Weekly Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="purchase" />
                <Bar dataKey="sales" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Varieties Pie */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Top Varieties by Qty (This week)</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={95}
                  label
                />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sales vs Stock Movement (Line) */}
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales vs Stock Movement</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line dataKey="sales" dot={false} />
                <Line dataKey="purchase" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Outstanding Ageing */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Outstanding Ageing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ageingData.map((a) => (
              <div key={a.bucket} className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">{a.bucket}</div>
                <div className="font-medium">{money(a.amount)}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Fish varieties chips */}
        <Card className="rounded-2xl lg:col-span-3">
          <CardHeader>
            <CardTitle>Fish Varieties</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {data.fishVarieties.map((v) => (
              <span
                key={v.code}
                className="px-3 py-1 rounded-full border text-sm"
                title={v.name}
              >
                {v.code}
              </span>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
    