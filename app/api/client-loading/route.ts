// app/api/client-loading/route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Types
type ClientLoadingItem = {
  varietyCode: string;
  noTrays: number;
  loose: number;
};

type CreateClientLoadingInput = {
  clientName: string;
  billNo: string;
  date: string;
  vehicleNo?: string;
  village?: string;
  fishCode?: string;
  items: ClientLoadingItem[];
};

// POST - Create new client loading
export async function POST(req: Request) {
  try {
    const body: CreateClientLoadingInput = await req.json();

    const { clientName, billNo, date, vehicleNo, village, fishCode, items } = body;

    // Validation
    if (!clientName?.trim()) {
      return NextResponse.json(
        { success: false, message: "Client name is required" },
        { status: 400 }
      );
    }

    if (!billNo?.trim()) {
      return NextResponse.json(
        { success: false, message: "Bill number is required" },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { success: false, message: "Date is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "At least one item is required" },
        { status: 400 }
      );
    }

    // Calculate totals
    const totalTrays = items.reduce((sum, i) => sum + (Number(i.noTrays) || 0), 0);
    const totalTrayKgs = totalTrays * 35; // assuming 35kg per tray
    const totalLooseKgs = items.reduce((sum, i) => sum + (Number(i.loose) || 0), 0);
    const totalKgs = totalTrayKgs + totalLooseKgs;

    const saved = await prisma.clientLoading.create({
      data: {
        clientName: clientName.trim(),
        billNo: billNo.trim(),
        date: new Date(date),
        vehicleNo: vehicleNo?.trim() || "",
        village: village?.trim() || "",
        fishCode: fishCode?.trim() || "",
        totalTrays,
        totalTrayKgs,
        totalLooseKgs,
        totalKgs,
        totalPrice: 0,
        grandTotal: totalKgs,
        items: {
          create: items.map((item) => {
            const trayKgs = (Number(item.noTrays) || 0) * 35;
            const looseKgs = Number(item.loose) || 0;
            const itemTotalKgs = trayKgs + looseKgs;

            return {
              varietyCode: item.varietyCode || "",
              noTrays: Number(item.noTrays) || 0,
              trayKgs,
              loose: looseKgs,
              totalKgs: itemTotalKgs,
              pricePerKg: 0,
              totalPrice: 0,
            };
          }),
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (error: any) {
    console.error("ClientLoading POST error:", error);

    if (error.code === "P2002") {
      // Unique constraint violation (billNo)
      return NextResponse.json(
        {
          success: false,
          message: "Bill number already exists. Please use a different bill number.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to save loading" },
      { status: 500 }
    );
  }
}

// GET - All loadings (for list page)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const listOnly = searchParams.get("list") === "clients"; // new feature

    if (listOnly) {
      // Special endpoint: /api/client-loading?list=clients → returns unique client list
      const clients = await prisma.clientLoading.findMany({
        select: {
          id: true,
          clientName: true,
        },
        distinct: ["clientName"],
        orderBy: { clientName: "asc" },
      });

      return NextResponse.json({ success: true, clients });
    }

    // Default: return full loadings with items
    const loadings = await prisma.clientLoading.findMany({
      include: {
        items: {
          select: {
            id: true,
            varietyCode: true,
            noTrays: true,
            trayKgs: true,
            loose: true,
            totalKgs: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ success: true, data: loadings });
  } catch (error) {
    console.error("ClientLoading GET error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch data" }, { status: 500 });
  }
}