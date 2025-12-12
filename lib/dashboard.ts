// lib/dashboard.ts
import { prisma } from "@/lib/prisma";

type DayPoint = { label: string; sales: number; purchase: number };
type VarietyPoint = { code: string; kgs: number };
type AgeingPoint = { bucket: string; amount: number };

function startOfDay(d = new Date()) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}
function endOfDay(d = new Date()) {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
}
function addDays(d: Date, n: number) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
}
function diffDays(a: Date, b: Date) {
    // a - b in whole days
    const ms = startOfDay(a).getTime() - startOfDay(b).getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
}
function dayLabel(d: Date) {
    return d.toLocaleDateString("en-US", { weekday: "short" }); // Mon, Tue...
}

export type DashboardMetrics = {
    today: {
        sales: number; // ₹
        purchase: number; // ₹
        pendingShipments: number; // count (proxy with todays client loadings)
        outstanding: number; // ₹ (overall receivable)
    };
    weekly: DayPoint[]; // last 7 days
    movement: DayPoint[]; // same as weekly (keep separate if you want different logic)
    topVarieties: VarietyPoint[]; // last 7 days
    outstandingAgeing: AgeingPoint[]; // buckets
    fishVarieties: { code: string; name: string }[];
};

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    // ====== TODAY (Sales & Purchase) ======
    // Sales = sum(ClientLoading.grandTotal) today
    const todaySalesAgg = await prisma.clientLoading.aggregate({
        where: { date: { gte: todayStart, lte: todayEnd } },
        _sum: { grandTotal: true },
        _count: { _all: true },
    });

    // Purchase = sum(FormerLoading.grandTotal + AgentLoading.grandTotal) today
    const [todayFormerAgg, todayAgentAgg] = await Promise.all([
        prisma.formerLoading.aggregate({
            where: { date: { gte: todayStart, lte: todayEnd } },
            _sum: { grandTotal: true },
        }),
        prisma.agentLoading.aggregate({
            where: { date: { gte: todayStart, lte: todayEnd } },
            _sum: { grandTotal: true },
        }),
    ]);

    // Pending Shipments (you don't have "status" yet)
    // Using today's ClientLoading count as a practical proxy.
    const pendingShipments = todaySalesAgg._count._all ?? 0;

    // ====== OUTSTANDING (overall receivables) ======
    // Outstanding = total Sales (all time) - total ClientPayment (all time)
    const [allSalesAgg, allPaymentsAgg] = await Promise.all([
        prisma.clientLoading.aggregate({
            _sum: { grandTotal: true },
        }),
        prisma.clientPayment.aggregate({
            _sum: { amount: true },
        }),
    ]);

    const totalSalesAll = allSalesAgg._sum.grandTotal ?? 0;
    const totalPaidAll = allPaymentsAgg._sum.amount ?? 0;
    const outstanding = Math.max(0, totalSalesAll - totalPaidAll);

    // ====== WEEKLY (last 7 days) ======
    const rangeStart = startOfDay(addDays(now, -6)); // include today = 7 points
    const rangeEnd = todayEnd;

    const [weeklySales, weeklyFormer, weeklyAgent] = await Promise.all([
        prisma.clientLoading.findMany({
            where: { date: { gte: rangeStart, lte: rangeEnd } },
            select: { date: true, grandTotal: true },
        }),
        prisma.formerLoading.findMany({
            where: { date: { gte: rangeStart, lte: rangeEnd } },
            select: { date: true, grandTotal: true },
        }),
        prisma.agentLoading.findMany({
            where: { date: { gte: rangeStart, lte: rangeEnd } },
            select: { date: true, grandTotal: true },
        }),
    ]);

    const points: DayPoint[] = [];
    for (let i = 0; i < 7; i++) {
        const d = startOfDay(addDays(rangeStart, i));
        const dEnd = endOfDay(d);

        const sales = weeklySales
            .filter((x) => x.date >= d && x.date <= dEnd)
            .reduce((s, x) => s + (x.grandTotal ?? 0), 0);

        const purchaseFormer = weeklyFormer
            .filter((x) => x.date >= d && x.date <= dEnd)
            .reduce((s, x) => s + (x.grandTotal ?? 0), 0);

        const purchaseAgent = weeklyAgent
            .filter((x) => x.date >= d && x.date <= dEnd)
            .reduce((s, x) => s + (x.grandTotal ?? 0), 0);

        points.push({
            label: dayLabel(d),
            sales,
            purchase: purchaseFormer + purchaseAgent,
        });
    }

    // ====== TOP VARIETIES BY QTY (last 7 days) ======
    // ClientItem.totalKgs grouped by varietyCode, only items whose parent ClientLoading.date in range
    const items = await prisma.clientItem.findMany({
        where: {
            loading: { date: { gte: rangeStart, lte: rangeEnd } },
        },
        select: { varietyCode: true, totalKgs: true },
    });

    const varietyMap = new Map<string, number>();
    for (const it of items) {
        varietyMap.set(it.varietyCode, (varietyMap.get(it.varietyCode) ?? 0) + (it.totalKgs ?? 0));
    }

    const topVarieties: VarietyPoint[] = Array.from(varietyMap.entries())
        .map(([code, kgs]) => ({ code, kgs }))
        .sort((a, b) => b.kgs - a.kgs)
        .slice(0, 6);

    // ====== OUTSTANDING AGEING ======
    // Remaining per ClientLoading = grandTotal - sum(payments where clientId = loading.id)
    const loadingsAll = await prisma.clientLoading.findMany({
        select: { id: true, date: true, grandTotal: true },
    });

    const paymentsAll = await prisma.clientPayment.findMany({
        select: { clientId: true, amount: true },
    });

    const paidByClientId = new Map<string, number>();
    for (const p of paymentsAll) {
        if (!p.clientId) continue;
        paidByClientId.set(p.clientId, (paidByClientId.get(p.clientId) ?? 0) + (p.amount ?? 0));
    }

    const buckets = {
        "0-7 days": 0,
        "8-15 days": 0,
        "16-30 days": 0,
        "> 30 days": 0,
    };

    for (const l of loadingsAll) {
        const paid = paidByClientId.get(l.id) ?? 0;
        const remaining = Math.max(0, (l.grandTotal ?? 0) - paid);
        if (remaining <= 0) continue;

        const age = diffDays(now, l.date);
        if (age <= 7) buckets["0-7 days"] += remaining;
        else if (age <= 15) buckets["8-15 days"] += remaining;
        else if (age <= 30) buckets["16-30 days"] += remaining;
        else buckets["> 30 days"] += remaining;
    }

    const outstandingAgeing: AgeingPoint[] = Object.entries(buckets).map(([bucket, amount]) => ({
        bucket,
        amount,
    }));

    // ====== FISH VARIETIES (chips list) ======
    const fishVarieties = await prisma.fishVariety.findMany({
        select: { code: true, name: true },
        orderBy: { code: "asc" },
    });

    return {
        today: {
            sales: todaySalesAgg._sum.grandTotal ?? 0,
            purchase: (todayFormerAgg._sum.grandTotal ?? 0) + (todayAgentAgg._sum.grandTotal ?? 0),
            pendingShipments,
            outstanding,
        },
        weekly: points,
        movement: points,
        topVarieties,
        outstandingAgeing,
        fishVarieties,
    };
}
