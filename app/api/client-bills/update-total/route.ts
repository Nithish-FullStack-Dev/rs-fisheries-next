// app/api/client-bills/update-total/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const TRAY_KG = 35;
const DEDUCTION_PERCENT = 5;

export async function POST(request: Request) {
    try {
        const { loadingId } = (await request.json()) as { loadingId?: string };

        if (!loadingId) {
            return NextResponse.json({ error: "loadingId required" }, { status: 400 });
        }

        const loading = await prisma.clientLoading.findUnique({
            where: { id: loadingId },
            select: { id: true, vehicleId: true, vehicleNo: true },
        });

        if (!loading) {
            return NextResponse.json({ error: "Loading not found" }, { status: 404 });
        }

        const items = await prisma.clientItem.findMany({
            where: { clientLoadingId: loadingId },
            select: { noTrays: true, loose: true, totalKgs: true, totalPrice: true },
        });

        const totalTrays = items.reduce((sum, i) => sum + (i.noTrays ?? 0), 0);
        const totalLooseKgs = items.reduce((sum, i) => sum + Number(i.loose ?? 0), 0);
        const totalTrayKgs = totalTrays * TRAY_KG;
        const totalKgs = items.reduce((sum, i) => sum + Number(i.totalKgs ?? 0), 0);

        const hasVehicle = Boolean(loading.vehicleId) || Boolean((loading.vehicleNo || "").trim());
        const grandTotal = hasVehicle
            ? Number(totalKgs.toFixed(2))
            : Number((totalKgs * (1 - DEDUCTION_PERCENT / 100)).toFixed(2));

        const totalPrice = items.reduce((sum, i) => sum + Number(i.totalPrice ?? 0), 0);

        await prisma.clientLoading.update({
            where: { id: loadingId },
            data: {
                totalTrays,
                totalLooseKgs,
                totalTrayKgs,
                totalKgs,
                grandTotal,
                totalPrice,
            },
        });

        return NextResponse.json({ success: true, totalPrice, totalKgs, grandTotal });
    } catch (error) {
        console.error("Update total failed:", error);
        return NextResponse.json({ error: "Failed to update total" }, { status: 500 });
    }
}
