// app/api/payments/vendor/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Body = {
  vendorId?: string;
  vendorName?: string;
  source?: string;
  date?: string;
  amount?: number | string;
  paymentMode?: string;
  referenceNo?: string | null;
  paymentRef?: string | null;
  accountNumber?: string | null;
  ifsc?: string | null;
  bankName?: string | null;
  bankAddress?: string | null;
  paymentdetails?: string | null;
  isInstallment?: boolean;
  installments?: number | null;
  installmentNumber?: number | null;
};

function normalizeString(v?: string | null) {
  if (v === null) return null;
  if (typeof v === "undefined") return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    // Debug - remove in production
    console.log("Received payload:", body);

    const vendorId = normalizeString(body.vendorId);
    const vendorName = normalizeString(body.vendorName) ?? "Unknown";
    const source = normalizeString(body.source) ?? "unknown";

    if (!vendorId) {
      return NextResponse.json(
        { message: "vendorId is required" },
        { status: 400 }
      );
    }

    const amt =
      typeof body.amount === "string" ? Number(body.amount) : body.amount ?? 0;
    if (!amt || Number.isNaN(Number(amt))) {
      return NextResponse.json(
        { message: "Valid amount is required" },
        { status: 400 }
      );
    }

    if (!body.date) {
      return NextResponse.json(
        { message: "date is required" },
        { status: 400 }
      );
    }
    const dateObj = new Date(body.date);
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json({ message: "Invalid date" }, { status: 400 });
    }

    const payment = await prisma.vendorPayment.create({
      data: {
        vendorId,
        vendorName,
        source,
        date: dateObj,
        amount: Number(amt),
        paymentMode: normalizeString(body.paymentMode) ?? "cash",
        // Use normalized values: if the client sent a meaningful string it will be saved; otherwise null
        referenceNo: body.hasOwnProperty("referenceNo")
          ? normalizeString(body.referenceNo)
          : null,
        paymentRef: body.hasOwnProperty("paymentRef")
          ? normalizeString(body.paymentRef)
          : null,
        accountNumber: body.hasOwnProperty("accountNumber")
          ? normalizeString(body.accountNumber)
          : null,
        ifsc: body.hasOwnProperty("ifsc")
          ? normalizeString(body.ifsc)?.toUpperCase()
          : null,
        bankName: body.hasOwnProperty("bankName")
          ? normalizeString(body.bankName)
          : null,
        bankAddress: body.hasOwnProperty("bankAddress")
          ? normalizeString(body.bankAddress)
          : null,
        paymentdetails: body.hasOwnProperty("paymentdetails")
          ? normalizeString(body.paymentdetails)
          : null,
        isInstallment: Boolean(body.isInstallment ?? false),
        installments:
          typeof body.installments === "number" ? body.installments : null,
        installmentNumber:
          typeof body.installmentNumber === "number"
            ? body.installmentNumber
            : null,
      },
    });

    return NextResponse.json(
      { message: "Saved!", data: payment },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Save error:", error);
    return NextResponse.json(
      { message: error?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const payments = await prisma.vendorPayment.findMany({
      orderBy: { date: "desc" },
    });
    return NextResponse.json({ data: payments });
  } catch (error: any) {
    console.error("Failed to fetch vendor payments:", error);
    return NextResponse.json(
      { message: "Failed to load payments", error: error?.message },
      { status: 500 }
    );
  }
}
