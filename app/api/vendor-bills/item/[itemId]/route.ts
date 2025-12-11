// app/api/vendor-bills/item/[itemId]/route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// PATCH — Update price
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ itemId: string }> }
) {
    const { itemId } = await params;

    if (!itemId) {
        return NextResponse.json({ message: "Item ID required" }, { status: 400 });
    }

    try {
        const body = await request.json();
        const { pricePerKg, totalPrice } = body;

        // Try FormerItem first
        const former = await prisma.formerItem.findUnique({ where: { id: itemId } });
        if (former) {
            const updated = await prisma.formerItem.update({
                where: { id: itemId },
                data: {
                    pricePerKg: pricePerKg !== undefined ? Number(pricePerKg) : undefined,
                    totalPrice: totalPrice !== undefined ? Number(totalPrice) : undefined,
                },
            });
            return NextResponse.json({ success: true, item: updated });
        }

        // Then AgentItem
        const updated = await prisma.agentItem.update({
            where: { id: itemId },
            data: {
                pricePerKg: pricePerKg !== undefined ? Number(pricePerKg) : undefined,
                totalPrice: totalPrice !== undefined ? Number(totalPrice) : undefined,
            },
        });

        return NextResponse.json({ success: true, item: updated });
    } catch (error: any) {
        console.error("PATCH error:", error);
        return NextResponse.json({ message: "Update failed", error: error.message }, { status: 500 });
    }
}

// DELETE — Permanently delete the item
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ itemId: string }> }
) {
    const { itemId } = await params;

    if (!itemId) {
        return NextResponse.json({ message: "Item ID required" }, { status: 400 });
    }

    try {
        // Try FormerItem first
        const former = await prisma.formerItem.findUnique({ where: { id: itemId } });
        if (former) {
            await prisma.formerItem.delete({ where: { id: itemId } });
            return NextResponse.json({ success: true, message: "Item deleted" });
        }

        // Then AgentItem
        const agent = await prisma.agentItem.findUnique({ where: { id: itemId } });
        if (!agent) {
            return NextResponse.json({ message: "Item not found" }, { status: 404 });
        }

        await prisma.agentItem.delete({ where: { id: itemId } });

        return NextResponse.json({ success: true, message: "Item deleted" });
    } catch (error: any) {
        console.error("DELETE error:", error);
        return NextResponse.json({ message: "Delete failed", error: error.message }, { status: 500 });
    }
}