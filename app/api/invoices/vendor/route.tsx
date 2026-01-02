// app/api/invoices/vendor/route.tsx
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      paymentId,
      vendorId,
      vendorName,
      source, // "farmer" | "agent"
      invoiceNo,
      description,
      vendorAddress,
    } = body;

    // Required fields check (updated — no billTo/shipTo)
    if (!paymentId || !invoiceNo || !vendorId || !vendorName || !source) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Fetch the payment to get amount
    const payment = await prisma.vendorPayment.findUnique({
      where: { id: paymentId },
      select: { amount: true, date: true },
    });

    if (!payment) {
      return NextResponse.json(
        { message: "Payment not found" },
        { status: 404 }
      );
    }

    // Fixed values
    const hsn = "0303"; // Fish
    const gstPercent = 0; // 0% GST
    const taxableValue = payment.amount;
    const gstAmount = 0; // Since GST = 0%
    const totalAmount = taxableValue;

    // Upsert the invoice
    const invoice = await prisma.vendorInvoice.upsert({
      where: { paymentId },
      update: {
        vendorId,
        vendorName,
        source,
        invoiceNo,
        hsn,
        gstPercent,
        taxableValue,
        gstAmount,
        totalAmount,
        description: description?.trim() || null,
        vendorAddress: vendorAddress?.trim() || null,
        isFinalized: true,
      },
      create: {
        paymentId,
        vendorId,
        vendorName,
        source,
        invoiceNo,
        invoiceDate: payment.date || new Date(),
        hsn,
        gstPercent,
        taxableValue,
        gstAmount,
        totalAmount,
          description: description?.trim() || null,
          vendorAddress: vendorAddress?.trim() || null,
        isFinalized: true,
      },
    });

    return NextResponse.json({ success: true, invoice });
  } catch (err: any) {
    console.error("Vendor Invoice Save Error:", err);
    return NextResponse.json(
      { message: "Failed to save invoice", error: err.message },
      { status: 500 }
    );
  }
}

// Optional: GET by paymentId (used in modal and generate button)
export async function GET(req: NextRequest) {
  const paymentId = req.nextUrl.searchParams.get("paymentId");

  if (!paymentId) {
    return NextResponse.json({ message: "Missing paymentId" }, { status: 400 });
  }

  const invoice = await prisma.vendorInvoice.findUnique({
    where: { paymentId },
  });

  if (!invoice) {
    return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json({ invoice });
}
