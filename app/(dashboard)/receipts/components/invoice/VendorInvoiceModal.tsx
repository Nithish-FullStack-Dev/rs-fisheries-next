// app/(dashboard)/receipts/components/invoice/VendorInvoiceModal.tsx
"use client";

import { useEffect, useState } from "react";
import axios from "axios";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  onClose: () => void;
  vendorId: string;
  vendorName: string;
  source: "farmer" | "agent";
  onSaved: () => void;
  paymentId: string;
}

export function VendorInvoiceModal({
  open,
  onClose,
  vendorId,
  vendorName,
  source,
  paymentId,
  onSaved,
}: Props) {
  const [invoiceNo, setInvoiceNo] = useState("");
  const [hsn, setHsn] = useState("");
  const [gstPercent, setGstPercent] = useState(18);
  const [billTo, setBillTo] = useState("");
  const [shipTo, setShipTo] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const [existingInvoiceNo, setExistingInvoiceNo] = useState<string | null>(
    null
  ); // ✅ tells us if invoice already exists

  useEffect(() => {
    if (!open) return;

    // ✅ reset "existing" marker each open
    setExistingInvoiceNo(null);

    (async () => {
      try {
        // 1) check if invoice already exists for this paymentId
        const res = await axios.get(
          `/api/invoices/vendor/by-payment?paymentId=${paymentId}`
        );

        const inv = res.data.invoice;

        // ✅ load existing invoice values
        setInvoiceNo(inv.invoiceNo);
        setExistingInvoiceNo(inv.invoiceNo);

        setHsn(inv.hsn ?? "");
        setGstPercent(Number(inv.gstPercent ?? 0));
        setBillTo(inv.billTo ?? "");
        setShipTo(inv.shipTo ?? "");
        setDescription(inv.description ?? "");
      } catch (err: any) {
        // 2) if not found, show next preview invoice number
        if (err?.response?.status === 404) {
          try {
            const next = await axios.get("/api/invoices/next-number");
            setInvoiceNo(next.data.invoiceNumber);
          } catch {
            setInvoiceNo("");
          }

          // clear fields for new invoice
          setHsn("");
          setGstPercent(18);
          setBillTo("");
          setShipTo("");
          setDescription("");
        } else {
          console.error(err);
          setInvoiceNo("");
        }
      }
    })();
  }, [open, paymentId]);

  const saveInvoice = async () => {
    try {
      setSaving(true);

      let finalInvoiceNo = invoiceNo;

      // ✅ ONLY reserve a new number if invoice DOES NOT exist yet
      if (!existingInvoiceNo) {
        const reserve = await axios.post("/api/invoices/next-number");
        finalInvoiceNo = reserve.data.invoiceNumber;
      }

      await axios.post("/api/invoices/vendor", {
        paymentId,
        vendorId,
        vendorName,
        source,
        invoiceNo: finalInvoiceNo, // ✅ same invoice no if editing
        hsn,
        gstPercent,
        billTo,
        shipTo,
        description,
      });

      setInvoiceNo(finalInvoiceNo);
      setExistingInvoiceNo(finalInvoiceNo); // ✅ mark as existing after save

      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Vendor GST Invoice Details</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label>Invoice No</Label>
              <Input value={invoiceNo} disabled />
            </div>

            <div>
              <Label>Vendor Name</Label>
              <Input value={vendorName} disabled />
            </div>

            <div>
              <Label>Description (Goods/Service)</Label>
              <Textarea
                rows={3}
                placeholder="e.g. Fish purchase / Agent commission / Loading charges..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label>HSN / SAC</Label>
              <Input
                value={hsn}
                onChange={(e) => setHsn(e.target.value)}
                placeholder="e.g. 721710"
              />
            </div>

            <div>
              <Label>GST Rate (%)</Label>
              <Input
                type="number"
                value={gstPercent}
                onChange={(e) => setGstPercent(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Bill To (Buyer)</Label>
              <Textarea
                rows={6}
                placeholder="Company Name&#10;Address Line 1&#10;Address Line 2&#10;City, State - PIN&#10;GSTIN: XXAAAAA0000X0XX&#10;State: State Name, Code: XX"
                value={billTo}
                onChange={(e) => setBillTo(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label>Consignee (Ship To)</Label>
              <Textarea
                rows={6}
                placeholder="Same as Bill To or different shipping address"
                value={shipTo}
                onChange={(e) => setShipTo(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
          </div>
        </div>

        <Button
          onClick={saveInvoice}
          disabled={saving || !invoiceNo || !hsn || !billTo || !description}
          className="w-full mt-6"
        >
          {saving
            ? "Saving..."
            : existingInvoiceNo
            ? "Update Invoice"
            : "Save & Finalize Invoice"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
