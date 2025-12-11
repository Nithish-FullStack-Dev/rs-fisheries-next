// app/api/former-loading/route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const loading = await prisma.formerLoading.create({
      data: {
        fishCode: data.fishCode || "NA",
        billNo: data.billNo,                    // ← comes from frontend
        FarmerName: data.FarmerName,
        village: data.village,
        date: new Date(data.date),
        vehicleNo: data.vehicleNo,
        totalTrays: data.totalTrays,
        totalLooseKgs: data.totalLooseKgs,
        totalTrayKgs: data.totalTrayKgs,
        totalKgs: data.totalKgs,
        grandTotal: data.grandTotal || data.totalKgs,
        items: {
          create: data.items.map((item: any) => ({
            varietyCode: item.varietyCode,
            noTrays: item.noTrays,
            trayKgs: item.noTrays * 35,
            loose: item.loose,
            totalKgs: item.noTrays * 35 + item.loose,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ success: true, loading });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { success: false, message: "Bill number already exists. Please refresh." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Save failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const loadings = await prisma.formerLoading.findMany({
      include: {
        items: {
          select: {
            id: true,
            varietyCode: true,
            noTrays: true,
            trayKgs: true,
            loose: true,
            totalKgs: true,
            pricePerKg: true,
            totalPrice: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: loadings });
  } catch (error) {
    console.error("Error fetching agent loadings:", error);
    return NextResponse.json(
      { message: "Failed to fetch agent loadings" },
      { status: 500 }
    );
  }
}