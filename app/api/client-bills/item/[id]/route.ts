// app/api/client-bills/item/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const TRAY_KG = 35;

type Params = { id: string };

export async function PATCH(request: Request, { params }: { params: Params }) {
    const { id } = params;

    if (!id) return NextResponse.json({ message: "Item ID required" }, { status: 400 });

    try {
        const body = (await request.json()) as {
            pricePerKg?: number;
            totalPrice?: number;
            noTrays?: number;
            loose?: number;
            varietyCode?: string;
        };

        const existing = await prisma.clientItem.findUnique({
            where: { id },
            select: { id: true, clientLoadingId: true, noTrays: true, loose: true, varietyCode: true },
        });

        if (!existing) return NextResponse.json({ message: "Item not found" }, { status: 404 });

        const nextTrays =
            body.noTrays !== undefined ? Math.max(0, Number(body.noTrays) || 0) : existing.noTrays;

        const nextLoose =
            body.loose !== undefined ? Math.max(0, Number(body.loose) || 0) : Number(existing.loose);

        const trayKgs = nextTrays * TRAY_KG;
        const totalKgs = trayKgs + nextLoose;

        const updated = await prisma.clientItem.update({
            where: { id },
            data: {
                varietyCode: body.varietyCode ? String(body.varietyCode).trim() : undefined,
                noTrays: body.noTrays !== undefined ? nextTrays : undefined,
                loose: body.loose !== undefined ? nextLoose : undefined,
                trayKgs: body.noTrays !== undefined || body.loose !== undefined ? trayKgs : undefined,
                totalKgs: body.noTrays !== undefined || body.loose !== undefined ? totalKgs : undefined,

                pricePerKg: body.pricePerKg !== undefined ? Number(body.pricePerKg) : undefined,
                totalPrice: body.totalPrice !== undefined ? Number(body.totalPrice) : undefined,
            },
        });

        return NextResponse.json({ success: true, item: updated });
    } catch (error: any) {
        console.error("PATCH client item failed:", error);
        if (error.code === "P2025") return NextResponse.json({ message: "Item not found" }, { status: 404 });
        return NextResponse.json({ message: "Update failed" }, { status: 500 });
    }
}

// keep your DELETE as-is (it is fine)
export async function DELETE(request: Request, { params }: { params: Params }) {
    const { id } = params;
    if (!id) return NextResponse.json({ message: "Item ID required" }, { status: 400 });

    try {
        const result = await prisma.$transaction(async (tx) => {
            const item = await tx.clientItem.findUnique({
                where: { id },
                select: { id: true, clientLoadingId: true },
            });
            if (!item) return null;

            const loadingId = item.clientLoadingId;
            await tx.clientItem.delete({ where: { id } });

            const remaining = await tx.clientItem.count({ where: { clientLoadingId: loadingId } });

            if (remaining === 0) {
                await tx.packingAmount.updateMany({
                    where: { sourceRecordId: loadingId },
                    data: { sourceRecordId: null },
                });
                await tx.dispatchCharge.updateMany({
                    where: { sourceRecordId: loadingId },
                    data: { sourceRecordId: null },
                });
                await tx.clientLoading.delete({ where: { id: loadingId } });
                return { deletedBill: true, loadingId };
            }

            return { deletedBill: false, loadingId };
        });

        if (!result) return NextResponse.json({ message: "Item not found" }, { status: 404 });

        return NextResponse.json({
            success: true,
            message: result.deletedBill ? "Item deleted, bill removed (last item)" : "Item deleted",
            ...result,
        });
    } catch (error: any) {
        console.error("DELETE client item error:", error);
        return NextResponse.json({ message: "Delete failed", error: error.message }, { status: 500 });
    }
}
