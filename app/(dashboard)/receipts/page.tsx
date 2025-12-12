"use client";

import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import { CardCustom } from "@/components/ui/card-custom";
import { Button } from "@/components/ui/button";
import {
  IndianRupee,
  Calendar,
  User,
  Package,
  FileText,
  Download,
  Printer,
} from "lucide-react";
import { toast } from "sonner";

type Tab = "vendor" | "client" | "employee" | "packing";

interface BaseReceipt {
  id: string;
  date: string | Date;
  amount: number;
  totalAmount?: number;
  paymentMode?: string;
  reference?: string | null;
  createdAt?: string;
  imageUrl?: string; // for client
}

interface VendorReceipt extends BaseReceipt {
  vendorName: string;
  source: string;
}

interface ClientReceipt extends BaseReceipt {
  clientName: string;
}

interface EmployeeReceipt extends BaseReceipt {
  employeeName: string;
  user?: { name: string };
}

interface PackingReceipt extends BaseReceipt {
  mode: string;
  workers: number;
  temperature: number;
  createdBy?: { name: string | null } | null;
}

type Receipt = VendorReceipt | ClientReceipt | EmployeeReceipt | PackingReceipt;

const formatCurrency = (amt: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amt);

const formatDate = (
  date: string | Date,
  format: "short" | "long" = "short"
) => {
  const d = new Date(date);
  if (format === "short") {
    return d.toLocaleDateString("en-IN");
  }
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "long",
  }).format(d);
};

export default function ReceiptsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("vendor");
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  const tabs = [
    { id: "vendor", label: "Vendor Receipt", icon: User },
    { id: "client", label: "Client Receipt", icon: User },
    { id: "employee", label: "Employee Receipt", icon: User },
    { id: "packing", label: "Packing Receipt", icon: Package },
  ] as const;

  const apiMap: Record<Tab, string> = {
    vendor: "/api/payments/vendor",
    client: "/api/payments/client",
    employee: "/api/payments/employee",
    packing: "/api/payments/packing-amount",
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(apiMap[activeTab]);
        if (!res.ok) throw new Error("Failed to load");

        const json = await res.json();

        let data: Receipt[] = json.payments || json.records || json.data || [];

        setReceipts(data);
      } catch (err) {
        console.error(err);
        setReceipts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [activeTab]);

  // Generate and download PDF
  const generatePDF = async (receipt: Receipt, type: Tab) => {
    try {
      // Fetch next invoice number
      const numRes = await fetch(`/api/invoice-number?type=${type}`);
      const numJson = await numRes.json();
      const invoiceNumber = numJson.invoiceNumber;

      const doc = new jsPDF("p", "mm", "a4");

      // Common Header
      doc.setFontSize(18);
      doc.text("RS Fisheries", 105, 20, { align: "center" });
      doc.setFontSize(12);
      doc.text(invoiceNumber, 105, 30, { align: "center" });
      doc.text(`Date: ${formatDate(new Date())}`, 105, 40, {
        align: "center",
      });

      // Type-specific content
      if (type === "vendor") {
        // Vendor Invoice (based on img 1 design)
        doc.setFontSize(14);
        doc.text("INVOICE", 105, 55, { align: "center" });

        doc.setFontSize(10);
        doc.text("Supplier: RS Fisheries", 20, 70);
        doc.text("Buyer: " + (receipt as VendorReceipt).vendorName, 20, 80);

        doc.text("Item: Fish Delivery", 20, 100);
        doc.text("Amount: " + formatCurrency(receipt.amount), 20, 110);
        doc.text("Payment Mode: " + receipt.paymentMode, 20, 120);
        doc.text("Reference: " + (receipt.reference || "N/A"), 20, 130);

        doc.text("Total: " + formatCurrency(receipt.amount), 20, 150);

        doc.text("Thank you for your business!", 105, 200, { align: "center" });
      } else if (type === "client") {
        // Client Receipt (simple with image if available)
        doc.setFontSize(14);
        doc.text("RECEIPT", 105, 55, { align: "center" });

        doc.setFontSize(10);
        doc.text("From: RS Fisheries", 20, 70);
        doc.text("To: " + (receipt as ClientReceipt).clientName, 20, 80);

        doc.text("Amount Received: " + formatCurrency(receipt.amount), 20, 100);
        doc.text("Payment Mode: " + receipt.paymentMode, 20, 110);
        doc.text("Reference: " + (receipt.reference || "N/A"), 20, 120);

        if (receipt.imageUrl) {
          doc.addImage(receipt.imageUrl, "JPEG", 20, 140, 170, 100); // Adjust size
        }
      } else if (type === "employee" || type === "packing") {
        // Payslip (based on img 2 design)
        doc.setFontSize(14);
        doc.text("PAYSLIP / RECEIPT", 105, 55, { align: "center" });

        doc.setFontSize(10);
        doc.text(
          "Employee: " + (receipt as EmployeeReceipt).employeeName,
          20,
          70
        );
        doc.text("Date: " + formatDate(receipt.date, "long"), 20, 80);

        doc.text("Amount Paid: " + formatCurrency(receipt.amount), 20, 100);
        doc.text("Payment Mode: " + receipt.paymentMode, 20, 110);
        doc.text("Reference: " + (receipt.reference || "N/A"), 20, 120);

        doc.text("Net Amount: " + formatCurrency(receipt.amount), 20, 140);

        doc.text("Thank you!", 105, 200, { align: "center" });
      }

      // Download
      doc.save(`${type}-receipt-${invoiceNumber}.pdf`);

      // Print (opens print dialog)
      doc.autoPrint();
      window.open(doc.output("bloburl"), "_blank");
    } catch (err) {
      toast.error("Failed to generate receipt");
    }
  };

  const getTitle = () => {
    const map = {
      vendor: "Vendor Payment Receipts",
      client: "Client Payment Receipts",
      employee: "Employee Salary Receipts",
      packing: "Packing Amount Receipts",
    };
    return map[activeTab];
  };

  const total = receipts.reduce(
    (sum, r) => sum + (r.amount || r.totalAmount || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold">Receipts</h1>

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "outline"}
                onClick={() => setActiveTab(tab.id)}
                className="gap-2"
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      <CardCustom title={getTitle()}>
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">
            Loading receipts...
          </div>
        ) : receipts.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No receipts found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 px-4 font-medium">Date</th>
                  <th className="pb-3 px-4 font-medium">Party</th>
                  <th className="pb-3 px-4 font-medium">Details</th>
                  <th className="pb-3 px-4 text-right font-medium">Amount</th>
                  <th className="pb-3 px-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b hover:bg-muted/50 transition"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {formatDate(
                          r.date || (r as any).createdAt || Date.now()
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium">
                        {(r as any).clientName ||
                          (r as any).vendorName ||
                          (r as any).employeeName ||
                          (r as any).createdBy?.name ||
                          "—"}
                      </div>
                      {(r as any).mode && (
                        <div className="text-xs text-muted-foreground capitalize">
                          {(r as any).mode}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm">
                        {(r as any).paymentMode || "—"}
                      </div>
                      {(r as any).reference && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Ref: {(r as any).reference}
                        </div>
                      )}
                      {activeTab === "packing" &&
                        (r as any).workers !== undefined && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Workers: {(r as any).workers} | Temp:{" "}
                            {(r as any).temperature}°C
                          </div>
                        )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 text-lg font-bold text-green-600">
                        <IndianRupee className="w-5 h-5" />
                        {formatCurrency(r.amount || r.totalAmount || 0)}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => generatePDF(r, activeTab)}
                      >
                        <FileText className="w-4 h-4" />
                        Generate Receipt
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-8 pt-6 border-t">
              <div className="flex justify-between items-center">
                <p className="text-lg font-semibold">
                  Total ({receipts.length} receipts)
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(total)}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardCustom>
    </div>
  );
}
