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
    const ms = startOfDay(a).getTime() - startOfDay(b).getTime();
    return Math.floor(ms / 86400000);
}
function dayLabel(d: Date) {
    return d.toLocaleDateString("en-US", { weekday: "short" });
}

export type DashboardMetrics = {
    today: {
        sales: number;
        purchase: number;
        pendingShipments: number;
        outstanding: number;
    };
    weekly: DayPoint[];
    movement: DayPoint[];
    topVarieties: VarietyPoint[];
    outstandingAgeing: AgeingPoint[];
    fishVarieties: Array<{ code: string; name: string }>;
};

export async function getDashboardMetrics(range?: {
    from: Date;
    to: Date;
}): Promise<DashboardMetrics> {
    // ✅ default last 7 days
    const now = new Date();
    const from = range?.from ? startOfDay(range.from) : startOfDay(addDays(now, -6));
    const to = range?.to ? endOfDay(range.to) : endOfDay(now);

    // ====== SALES & PURCHASE (FILTERED RANGE) ======
    const [salesAgg, formerAgg, agentAgg] = await Promise.all([
        prisma.clientLoading.aggregate({
            where: { date: { gte: from, lte: to } },
            _sum: { grandTotal: true },
            _count: { _all: true },
        }),
        prisma.formerLoading.aggregate({
            where: { date: { gte: from, lte: to } },
            _sum: { grandTotal: true },
        }),
        prisma.agentLoading.aggregate({
            where: { date: { gte: from, lte: to } },
            _sum: { grandTotal: true },
        }),
    ]);

    const salesInRange = salesAgg._sum.grandTotal ?? 0;
    const purchaseInRange = (formerAgg._sum.grandTotal ?? 0) + (agentAgg._sum.grandTotal ?? 0);
    const pendingShipments = salesAgg._count._all ?? 0;

    // ====== OUTSTANDING (FILTERED RANGE) ======
    // Range outstanding = sales in range - payments in range
    const [paymentsAgg] = await Promise.all([
        prisma.clientPayment.aggregate({
            where: { date: { gte: from, lte: to } },
            _sum: { amount: true },
        }),
    ]);
    const paidInRange = paymentsAgg._sum.amount ?? 0;
    const outstandingInRange = Math.max(0, salesInRange - paidInRange);

    // ====== SERIES (DAILY POINTS within selected range) ======
    const daysCount = Math.max(1, diffDays(to, from) + 1);

    // protect UI if user selects too huge range
    const maxPoints = 60;
    const pointsCount = Math.min(daysCount, maxPoints);

    // build points from the END backwards
    const seriesStart = startOfDay(addDays(to, -(pointsCount - 1)));

    const [salesRows, formerRows, agentRows] = await Promise.all([
        prisma.clientLoading.findMany({
            where: { date: { gte: seriesStart, lte: to } },
            select: { date: true, grandTotal: true },
        }),
        prisma.formerLoading.findMany({
            where: { date: { gte: seriesStart, lte: to } },
            select: { date: true, grandTotal: true },
        }),
        prisma.agentLoading.findMany({
            where: { date: { gte: seriesStart, lte: to } },
            select: { date: true, grandTotal: true },
        }),
    ]);

    const weekly: DayPoint[] = [];
    for (let i = 0; i < pointsCount; i++) {
        const d = startOfDay(addDays(seriesStart, i));
        const dEnd = endOfDay(d);

        const sales = salesRows
            .filter((x) => x.date >= d && x.date <= dEnd)
            .reduce((s, x) => s + (x.grandTotal ?? 0), 0);

        const purchaseFormer = formerRows
            .filter((x) => x.date >= d && x.date <= dEnd)
            .reduce((s, x) => s + (x.grandTotal ?? 0), 0);

        const purchaseAgent = agentRows
            .filter((x) => x.date >= d && x.date <= dEnd)
            .reduce((s, x) => s + (x.grandTotal ?? 0), 0);

        weekly.push({
            label: dayLabel(d),
            sales,
            purchase: purchaseFormer + purchaseAgent,
        });
    }

    // ====== TOP VARIETIES BY QTY (FILTERED RANGE) ======
    const items = await prisma.clientItem.findMany({
        where: {
            loading: { date: { gte: from, lte: to } },
        },
        select: { varietyCode: true, totalKgs: true },
    });

    const varietyMap = new Map<string, number>();
    for (const it of items) {
        const code = String(it.varietyCode || "").trim();
        if (!code) continue;
        varietyMap.set(code, (varietyMap.get(code) ?? 0) + (it.totalKgs ?? 0));
    }

    const topVarieties: VarietyPoint[] = Array.from(varietyMap.entries())
        .map(([code, kgs]) => ({ code, kgs: Math.round(kgs * 10) / 10 }))
        .sort((a, b) => b.kgs - a.kgs)
        .slice(0, 6);

    // ====== OUTSTANDING AGEING (FILTERED RANGE LOADINGS) ======
    // Remaining per loading = grandTotal - payments where clientId=loading.id (payments also filtered to range)
    const loadings = await prisma.clientLoading.findMany({
        where: { date: { gte: from, lte: to } },
        select: { id: true, date: true, grandTotal: true },
    });

    const payments = await prisma.clientPayment.findMany({
        where: { date: { gte: from, lte: to } },
        select: { clientId: true, amount: true },
    });

    const paidByClientId = new Map<string, number>();
    for (const p of payments) {
        if (!p.clientId) continue;
        paidByClientId.set(p.clientId, (paidByClientId.get(p.clientId) ?? 0) + (p.amount ?? 0));
    }

    const buckets = {
        "0-7 days": 0,
        "8-15 days": 0,
        "16-30 days": 0,
        "> 30 days": 0,
    };

    for (const l of loadings) {
        const paid = paidByClientId.get(l.id) ?? 0;
        const remaining = Math.max(0, (l.grandTotal ?? 0) - paid);
        if (remaining <= 0) continue;

        const age = diffDays(now, l.date);
        if (age <= 7) buckets["0-7 days"] += remaining;
        else if (age <= 15) buckets["8-15 days"] += remaining;
        else if (age <= 30) buckets["16-30 days"] += remaining;
        else buckets["> 30 days"] += remaining;
    }

    const outstandingAgeing: AgeingPoint[] = Object.entries(buckets).map(
        ([bucket, amount]) => ({ bucket, amount })
    );

    // ====== FISH VARIETIES ======
    const fishVarieties = await prisma.fishVariety.findMany({
        select: { code: true, name: true },
        orderBy: { code: "asc" },
    });

    return {
        today: {
            sales: salesInRange,
            purchase: purchaseInRange,
            pendingShipments,
            outstanding: outstandingInRange,
        },
        weekly,
        movement: weekly,
        topVarieties,
        outstandingAgeing,
        fishVarieties,
    };
}
