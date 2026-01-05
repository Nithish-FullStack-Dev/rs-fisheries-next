// app/api/client-bills/add-item/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const TRAY_KG = 35;

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as {
            loadingId?: string;
            varietyCode?: string;
            noTrays?: number;
            loose?: number;
        };

        const loadingId = body.loadingId?.trim() || "";
        const varietyCode = body.varietyCode?.trim() || "";

        if (!loadingId) return NextResponse.json({ success: false, message: "loadingId required" }, { status: 400 });
        if (!varietyCode) return NextResponse.json({ success: false, message: "varietyCode required" }, { status: 400 });

        const trays = Math.max(0, Number(body.noTrays) || 0);
        const loose = Math.max(0, Number(body.loose) || 0);

        if (trays === 0 && loose === 0) {
            return NextResponse.json({ success: false, message: "Enter trays or loose" }, { status: 400 });
        }

        const trayKgs = trays * TRAY_KG;
        const totalKgs = trayKgs + loose;

        const item = await prisma.clientItem.create({
            data: {
                clientLoadingId: loadingId,
                varietyCode,
                noTrays: trays,
                trayKgs,
                loose,
                totalKgs,
                pricePerKg: 0,
                totalPrice: 0,
            },
        });

        return NextResponse.json({ success: true, item }, { status: 201 });
    } catch (e) {
        console.error("Add client item error:", e);
        return NextResponse.json({ success: false, message: "Failed to add item" }, { status: 500 });
    }
}
