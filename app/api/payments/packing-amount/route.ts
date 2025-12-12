// app/api/packing-amount/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const {
            mode,
            sourceRecordId,
            workers,
            temperature,
            totalAmount,
        } = body;

        if (!mode || workers == null || temperature == null || totalAmount == null) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        if (!["loading", "unloading"].includes(mode)) {
            return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
        }

        const packing = await prisma.packingAmount.create({
            data: {
                mode,
                sourceRecordId: sourceRecordId || null,
                workers: Number(workers),
                temperature: Number(temperature),
                totalAmount: Number(totalAmount),
            },
        });

        return NextResponse.json(
            { success: true, message: "Packing amount saved", data: packing },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("Packing amount error:", error);
        return NextResponse.json(
            { error: "Failed to save", details: error.message },
            { status: 500 }
        );
    }
}

// GET all packing records (for history)
export async function GET() {
    try {
        const records = await prisma.packingAmount.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                createdBy: {
                    select: { id: true, name: true },
                },
            },
        });

        return NextResponse.json({ success: true, records });
    } catch (error: any) {
        console.error("Fetch packing amounts error:", error);
        return NextResponse.json(
            { error: "Failed to fetch records" },
            { status: 500 }
        );
    }
}