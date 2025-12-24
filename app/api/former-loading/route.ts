// app\api\former-loading\route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const TRAY_KG = 35;
const MONEY_DEDUCTION_PERCENT = 5;

const num = (v: unknown): number =>
  Number.isFinite(Number(v)) ? Number(v) : 0;

export async function POST(req: Request) {
  try {
    const data: {
      fishCode?: string;
      billNo: string;
      FarmerName?: string;
      village?: string;
      date?: string;
      vehicleId?: string;
      vehicleNo?: string;
      items: {
        varietyCode: string;
        noTrays: number;
        loose: number;
        pricePerKg: number;
      }[];
    } = await req.json();

    if (!data.billNo?.trim()) {
      return NextResponse.json({ success: false, message: "Bill number required" }, { status: 400 });
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
      return NextResponse.json({ success: false, message: "Items required" }, { status: 400 });
    }

    const loadingDate = data.date ? new Date(data.date) : new Date();
    if (isNaN(loadingDate.getTime())) {
      return NextResponse.json({ success: false, message: "Invalid date" }, { status: 400 });
    }

    const items = data.items.map((item) => {
      const trays = num(item.noTrays);
      const loose = num(item.loose);
      const pricePerKg = num(item.pricePerKg);

      const trayKgs = trays * TRAY_KG;
      const totalKgs = trayKgs + loose;

      const gross = totalKgs * pricePerKg;
      const totalPrice = Number(
        (gross * (1 - MONEY_DEDUCTION_PERCENT / 100)).toFixed(2)
      );

      return {
        varietyCode: item.varietyCode,
        noTrays: trays,
        trayKgs,
        loose,
        totalKgs,
        pricePerKg,
        totalPrice,
      };
    });

    const totalTrays = items.reduce((s, i) => s + i.noTrays, 0);
    const totalLooseKgs = items.reduce((s, i) => s + i.loose, 0);
    const totalTrayKgs = items.reduce((s, i) => s + i.trayKgs, 0);
    const totalKgs = items.reduce((s, i) => s + i.totalKgs, 0);
    const totalPrice = Number(items.reduce((s, i) => s + i.totalPrice, 0).toFixed(2));

    const loading = await prisma.formerLoading.create({
      data: {
        fishCode: data.fishCode ?? "NA",
        billNo: data.billNo.trim(),
        FarmerName: data.FarmerName?.trim() ?? null,
        village: data.village?.trim() ?? "",
        date: loadingDate,

        vehicleId: data.vehicleId ?? null,
        vehicleNo: data.vehicleId ? null : data.vehicleNo ?? null,

        totalTrays,
        totalLooseKgs,
        totalTrayKgs,
        totalKgs,
        totalPrice,

        dispatchChargesTotal: 0,
        packingAmountTotal: 0,
        grandTotal: totalPrice,

        items: { create: items },
      },
      include: { items: true, vehicle: { select: { vehicleNumber: true } } },
    });

    return NextResponse.json({ success: true, data: loading });
  } catch (err) {
    console.error("Former POST error:", err);
    return NextResponse.json({ success: false, message: "Save failed" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const rows = await prisma.formerLoading.findMany({
      include: { items: true, vehicle: { select: { vehicleNumber: true } } },
      orderBy: { createdAt: "desc" },
    });

    const data = rows.map((l) => {
      const itemsTotal = l.items.reduce(
        (s: number, i) => s + num(i.totalPrice),
        0
      );

      const totalPrice = l.totalPrice > 0 ? l.totalPrice : itemsTotal;
      const grandTotal =
        totalPrice + num(l.dispatchChargesTotal) + num(l.packingAmountTotal);

      return {
        ...l,
        totalPrice,
        grandTotal,
        vehicleNo: l.vehicle?.vehicleNumber ?? l.vehicleNo ?? "",
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Former GET error:", err);
    return NextResponse.json({ success: false, message: "Fetch failed" }, { status: 500 });
  }
}
