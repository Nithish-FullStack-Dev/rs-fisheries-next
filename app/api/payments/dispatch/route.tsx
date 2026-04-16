// app/api/payments/dispatch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DispatchChargeType } from "@prisma/client";

export const runtime = "nodejs";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asPositiveNumber(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

async function computeBaseTotalPrice(
  sourceRecordId: string,
  sourceType: "CLIENT" | "AGENT" | "FORMER",
): Promise<number> {
  let loading: any;

  if (sourceType === "CLIENT") {
    loading = await prisma.clientLoading.findUnique({
      where: { id: sourceRecordId },
      select: {
        totalPrice: true,
        items: { select: { totalPrice: true } },
      },
    });
  } else if (sourceType === "AGENT") {
    loading = await prisma.agentLoading.findUnique({
      where: { id: sourceRecordId },
      select: {
        totalPrice: true,
        items: { select: { totalPrice: true } },
      },
    });
  } else if (sourceType === "FORMER") {
    loading = await prisma.formerLoading.findUnique({
      where: { id: sourceRecordId },
      select: {
        totalPrice: true,
        items: { select: { totalPrice: true } },
      },
    });
  }

  if (!loading) return 0;

  const apiTotal = Number(loading.totalPrice || 0);
  if (apiTotal > 0) return apiTotal;

  const itemsSum = (loading.items || []).reduce(
    (s: number, it: any) => s + Number(it.totalPrice || 0),
    0,
  );

  return Number.isFinite(itemsSum) ? itemsSum : 0;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const sourceRecordId = asString(body.sourceRecordId);
    const sourceTypeRaw = asString(body.sourceType) || "CLIENT";
    const typeRaw = body.type;
    const label = asString(body.label) || null;
    const notes = asString(body.notes) || null;
    const amount = asPositiveNumber(body.amount);

    if (!sourceRecordId) {
      return NextResponse.json(
        { error: "sourceRecordId is required" },
        { status: 400 },
      );
    }

    if (
      !["CLIENT", "AGENT", "FORMER"].includes(sourceTypeRaw)
    ) {
      return NextResponse.json({ error: "Invalid sourceType" }, { status: 400 });
    }
    const sourceType = sourceTypeRaw as "CLIENT" | "AGENT" | "FORMER";

    if (
      !typeRaw ||
      !Object.values(DispatchChargeType).includes(typeRaw as any)
    ) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    const type = typeRaw as DispatchChargeType;

    if (amount === null) {
      return NextResponse.json(
        { error: "Valid positive amount required" },
        { status: 400 },
      );
    }

    if (type === "OTHER" && !label) {
      return NextResponse.json(
        { error: "Label required for OTHER" },
        { status: 400 },
      );
    }

    //  Verify loading exists
    let loadingExists: any;
    if (sourceType === "CLIENT") {
      loadingExists = await prisma.clientLoading.findUnique({
        where: { id: sourceRecordId },
        select: { id: true, vehicleId: true, vehicleNo: true },
      });
    } else if (sourceType === "AGENT") {
      loadingExists = await prisma.agentLoading.findUnique({
        where: { id: sourceRecordId },
        select: { id: true, vehicleId: true, vehicleNo: true },
      });
    } else if (sourceType === "FORMER") {
      loadingExists = await prisma.formerLoading.findUnique({
        where: { id: sourceRecordId },
        select: { id: true, vehicleId: true, vehicleNo: true },
      });
    }

    if (!loadingExists) {
      return NextResponse.json(
        { error: "Loading record not found" },
        { status: 404 },
      );
    }

    //  Enforce: TRANSPORT allowed only if vehicle exists
    if (type === "TRANSPORT") {
      const hasVehicle = Boolean(
        (loadingExists.vehicleId && loadingExists.vehicleId.trim()) ||
        (loadingExists.vehicleNo && loadingExists.vehicleNo.trim()),
      );
      if (!hasVehicle) {
        return NextResponse.json(
          { error: "Transport charge not allowed: vehicle not assigned" },
          { status: 400 },
        );
      }
    }

    //  Create DispatchCharge
    const dispatchCharge = await prisma.dispatchCharge.create({
      data: {
        sourceRecordId,
        type,
        label,
        amount,
        notes,
        clientLoadingId: sourceType === "CLIENT" ? sourceRecordId : null,
        agentLoadingId: sourceType === "AGENT" ? sourceRecordId : null,
        formerLoadingId: sourceType === "FORMER" ? sourceRecordId : null,
      },
    });

    //  Recalculate totals
    const [dispatchSum, packingSum, baseTotalPrice] = await Promise.all([
      prisma.dispatchCharge.aggregate({
        where: {
          clientLoadingId: sourceType === "CLIENT" ? sourceRecordId : null,
          agentLoadingId: sourceType === "AGENT" ? sourceRecordId : null,
          formerLoadingId: sourceType === "FORMER" ? sourceRecordId : null,
        },
        _sum: { amount: true },
      }),
      prisma.packingAmount.aggregate({
        where: {
          clientLoadingId: sourceType === "CLIENT" ? sourceRecordId : null,
          agentLoadingId: sourceType === "AGENT" ? sourceRecordId : null,
          formerLoadingId: sourceType === "FORMER" ? sourceRecordId : null,
        },
        _sum: { totalAmount: true },
      }),
      computeBaseTotalPrice(sourceRecordId, sourceType),
    ]);

    const newDispatchTotal = dispatchSum._sum.amount || 0;
    const newPackingTotal = packingSum._sum.totalAmount || 0;
    const newGrandTotal = baseTotalPrice + newDispatchTotal + newPackingTotal;

    //  Update parent
    if (sourceType === "CLIENT") {
      await prisma.clientLoading.update({
        where: { id: sourceRecordId },
        data: {
          dispatchChargesTotal: newDispatchTotal,
          packingAmountTotal: newPackingTotal,
          grandTotal: newGrandTotal,
        },
      });
    } else if (sourceType === "AGENT") {
      await prisma.agentLoading.update({
        where: { id: sourceRecordId },
        data: {
          dispatchChargesTotal: newDispatchTotal,
          packingAmountTotal: newPackingTotal,
          grandTotal: newGrandTotal,
        },
      });
    } else if (sourceType === "FORMER") {
      await prisma.formerLoading.update({
        where: { id: sourceRecordId },
        data: {
          dispatchChargesTotal: newDispatchTotal,
          packingAmountTotal: newPackingTotal,
          grandTotal: newGrandTotal,
        },
      });
    }

    return NextResponse.json(
      { success: true, data: dispatchCharge },
      { status: 201 },
    );

  } catch (error: any) {
    console.error("DispatchCharge POST error:", error);
    return NextResponse.json(
      { error: "Failed to save dispatch charge", details: error.message },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sourceRecordId = searchParams.get("sourceRecordId")?.trim() || "";

    const where: any = {};
    if (sourceRecordId) where.sourceRecordId = sourceRecordId;

    // Require at least sourceRecordId (or return all charges)
    const dispatchCharges = await prisma.dispatchCharge.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        label: true,
        amount: true,
        notes: true,
        createdAt: true,
        sourceRecordId: true,
      },
    });

    return NextResponse.json(
      { success: true, data: dispatchCharges },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("DispatchCharge GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dispatch charges", details: error.message },
      { status: 500 },
    );
  }
}
