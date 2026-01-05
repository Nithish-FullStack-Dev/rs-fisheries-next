import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TRAY_KG = 35;
const PRICE_DEDUCTION_PERCENT = 5;

const toNum = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function calcTotalPrice(totalKgs: number, pricePerKg: number) {
    const gross = totalKgs * pricePerKg;
    return Math.round(gross * (1 - PRICE_DEDUCTION_PERCENT / 100));
}

export async function PATCH(
    req: Request,
    context: { params: Promise<{ id: string }> } // ✅ params is Promise in your Next setup
) {
    try {
        const { id: itemId } = await context.params; // ✅ FIX: await params

        if (!itemId) {
            return NextResponse.json(
                { success: false, message: "Missing item id" },
                { status: 400 }
            );
        }

        const body = await req.json();

        const trays =
            body.noTrays !== undefined
                ? Math.max(0, Math.floor(toNum(body.noTrays)))
                : undefined;

        const loose =
            body.loose !== undefined ? Math.max(0, toNum(body.loose)) : undefined;

        const pricePerKg =
            body.pricePerKg !== undefined
                ? Math.max(0, toNum(body.pricePerKg))
                : undefined;

        const computeFields = (
            finalNoTrays: number,
            finalLoose: number,
            finalPrice: number
        ) => {
            const trayKgs = finalNoTrays * TRAY_KG;
            const totalKgs = round2(trayKgs + finalLoose);
            const totalPrice = calcTotalPrice(totalKgs, finalPrice);
            return { trayKgs, totalKgs, totalPrice };
        };

        const result = await prisma.$transaction(async (tx) => {
            // ✅ 1) Farmer item update
            const fItem = await tx.formerItem.findUnique({
                where: { id: itemId },
            });

            if (fItem) {
                const finalNoTrays = trays ?? fItem.noTrays;
                const finalLoose = loose ?? fItem.loose;
                const finalPrice = pricePerKg ?? fItem.pricePerKg;

                const { trayKgs, totalKgs, totalPrice } = computeFields(
                    finalNoTrays,
                    finalLoose,
                    finalPrice
                );

                const updatedItem = await tx.formerItem.update({
                    where: { id: itemId },
                    data: {
                        noTrays: finalNoTrays,
                        loose: finalLoose,
                        pricePerKg: finalPrice,
                        trayKgs,
                        totalKgs,
                        totalPrice,
                    },
                });

                // ✅ Update parent loading totals
                const items = await tx.formerItem.findMany({
                    where: { formerLoadingId: updatedItem.formerLoadingId },
                });

                const totalTrays = items.reduce((s, i) => s + i.noTrays, 0);
                const totalLooseKgs = round2(items.reduce((s, i) => s + i.loose, 0));
                const totalTrayKgs = round2(items.reduce((s, i) => s + i.trayKgs, 0));
                const totalKgsAll = round2(items.reduce((s, i) => s + i.totalKgs, 0));
                const totalBillPrice = round2(items.reduce((s, i) => s + i.totalPrice, 0));

                await tx.formerLoading.update({
                    where: { id: updatedItem.formerLoadingId },
                    data: {
                        totalTrays,
                        totalLooseKgs,
                        totalTrayKgs,
                        totalKgs: totalKgsAll,
                        totalPrice: totalBillPrice,
                        grandTotal: totalBillPrice,
                    },
                });

                return { source: "farmer", item: updatedItem };
            }

            // ✅ 2) Agent item update
            const aItem = await tx.agentItem.findUnique({
                where: { id: itemId },
            });

            if (aItem) {
                const finalNoTrays = trays ?? aItem.noTrays;
                const finalLoose = loose ?? aItem.loose;
                const finalPrice = pricePerKg ?? aItem.pricePerKg;

                const { trayKgs, totalKgs, totalPrice } = computeFields(
                    finalNoTrays,
                    finalLoose,
                    finalPrice
                );

                const updatedItem = await tx.agentItem.update({
                    where: { id: itemId },
                    data: {
                        noTrays: finalNoTrays,
                        loose: finalLoose,
                        pricePerKg: finalPrice,
                        trayKgs,
                        totalKgs,
                        totalPrice,
                    },
                });

                // ✅ Update parent loading totals
                const items = await tx.agentItem.findMany({
                    where: { agentLoadingId: updatedItem.agentLoadingId },
                });

                const totalTrays = items.reduce((s, i) => s + i.noTrays, 0);
                const totalLooseKgs = round2(items.reduce((s, i) => s + i.loose, 0));
                const totalTrayKgs = round2(items.reduce((s, i) => s + i.trayKgs, 0));
                const totalKgsAll = round2(items.reduce((s, i) => s + i.totalKgs, 0));
                const totalBillPrice = round2(items.reduce((s, i) => s + i.totalPrice, 0));

                await tx.agentLoading.update({
                    where: { id: updatedItem.agentLoadingId },
                    data: {
                        totalTrays,
                        totalLooseKgs,
                        totalTrayKgs,
                        totalKgs: totalKgsAll,
                        totalPrice: totalBillPrice,
                        grandTotal: totalBillPrice,
                    },
                });

                return { source: "agent", item: updatedItem };
            }

            return null;
        });

        if (!result) {
            return NextResponse.json(
                { success: false, message: "Item not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, ...result });
    } catch (error: any) {
        console.error("PATCH ITEM ERROR:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Failed to update item" },
            { status: 500 }
        );
    }
}
