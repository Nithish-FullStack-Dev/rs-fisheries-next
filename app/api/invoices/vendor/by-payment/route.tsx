import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const paymentId = new URL(req.url).searchParams.get("paymentId");

  if (!paymentId) {
    return NextResponse.json({ message: "Missing paymentId" }, { status: 400 });
  }

  const invoice = await prisma.vendorInvoice.findUnique({
    where: { paymentId },
  });

  if (!invoice) {
    return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
  }

  // ✅ VendorPayment fields as per your schema
  const payment = await prisma.vendorPayment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      amount: true,
      date: true,
      paymentMode: true,
      referenceNo: true,
      paymentRef: true,
      paymentdetails: true,
    },
  });

  return NextResponse.json({ invoice, payment });
}
