// lib/pdf/vendor-invoice.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ---------------- TYPES ---------------- */

export interface VendorInvoiceData {
    invoiceNo: string;
    invoiceDate: string;

    vendorName: string;
    vendorAddress?: string;
    vendorGSTIN?: string;
    vendorStateName?: string;
    vendorStateCode?: string;
    vendorEmail?: string;

    billTo: string;
    shipTo: string;
    description?: string;
    hsn: string;
    gstPercent: number;

    taxableValue: number;
    gstAmount: number;
    totalAmount: number;

    irn?: string;
    ackNo?: string;
    ackDate?: string;

    deliveryNote?: string;
    referenceNo?: string;
    buyersOrderNo?: string;
    dispatchDocNo?: string;
    destination?: string;
    dispatchedThrough?: string;
    motorVehicleNo?: string;
    termsOfDelivery?: string;

    companyPAN?: string;
    bankName?: string;
    bankAccNo?: string;
    bankIFSC?: string;
    bankBranch?: string;

    items?: any[];
    qrText?: string;
    qrDataUrl?: string;
}

type Doc = InstanceType<typeof jsPDF>;

/* ---------------- HELPERS ---------------- */

const money = (n?: number) =>
    (n ?? 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

function amountToWords(num: number): string {
    const a = [
        "",
        "One",
        "Two",
        "Three",
        "Four",
        "Five",
        "Six",
        "Seven",
        "Eight",
        "Nine",
        "Ten",
        "Eleven",
        "Twelve",
        "Thirteen",
        "Fourteen",
        "Fifteen",
        "Sixteen",
        "Seventeen",
        "Eighteen",
        "Nineteen",
    ];
    const b = [
        "",
        "",
        "Twenty",
        "Thirty",
        "Forty",
        "Fifty",
        "Sixty",
        "Seventy",
        "Eighty",
        "Ninety",
    ];
    if (!num || num === 0) return "INR Zero Only";

    const inWords = (n: number): string => {
        if (n < 20) return a[n];
        if (n < 100) return (b[Math.floor(n / 10)] + " " + a[n % 10]).trim();
        if (n < 1000)
            return (a[Math.floor(n / 100)] + " Hundred " + inWords(n % 100)).trim();
        if (n < 100000)
            return (
                inWords(Math.floor(n / 1000)) + " Thousand " + inWords(n % 1000)
            ).trim();
        if (n < 10000000)
            return (
                inWords(Math.floor(n / 100000)) + " Lakh " + inWords(n % 100000)
            ).trim();
        return (
            inWords(Math.floor(n / 10000000)) + " Crore " + inWords(n % 10000000)
        ).trim();
    };

    return `INR ${inWords(Math.floor(num))} Only`;
}

function setOuterLine(doc: Doc) {
    doc.setLineWidth(0.45);
}
function setInnerLine(doc: Doc) {
    doc.setLineWidth(0.25);
}
function rectOuter(doc: Doc, x: number, y: number, w: number, h: number) {
    setOuterLine(doc);
    doc.rect(x, y, w, h);
}
function lineInner(doc: Doc, x1: number, y1: number, x2: number, y2: number) {
    setInnerLine(doc);
    doc.line(x1, y1, x2, y2);
}

function fitOneLine(doc: Doc, text: string, maxWidth: number) {
    let t = text ?? "";
    const ell = "…";
    while (doc.getTextWidth(t) > maxWidth && t.length > 0) t = t.slice(0, -1);
    if (doc.getTextWidth(text) > maxWidth) {
        while (doc.getTextWidth(t + ell) > maxWidth && t.length > 0)
            t = t.slice(0, -1);
        return t + ell;
    }
    return t;
}

function textBox(
    doc: Doc,
    text: string,
    x: number,
    y: number,
    w: number,
    h: number,
    fontSize = 8,
    lineH = 3.8
) {
    const pad = 2.2;
    doc.setFontSize(fontSize);
    const maxW = w - pad * 2;
    const maxH = h - pad * 2;
    const maxLines = Math.max(1, Math.floor(maxH / lineH));
    const linesAll = doc.splitTextToSize((text || "").replace(/\r/g, ""), maxW) as string[];
    let lines = linesAll;

    if (lines.length > maxLines) {
        lines = lines.slice(0, maxLines);
        const last = lines[lines.length - 1] ?? "";
        const ell = "…";
        let t = last;
        while (doc.getTextWidth(t + ell) > maxW && t.length > 0) t = t.slice(0, -1);
        lines[lines.length - 1] = t + ell;
    }

    const startY = y + pad + fontSize * 0.35;
    for (let i = 0; i < lines.length; i++) {
        const yy = startY + i * lineH;
        if (yy > y + h - pad) break;
        doc.text(lines[i], x + pad, yy);
    }
}

function metaCell(
    doc: Doc,
    label: string,
    value: string,
    x: number,
    y: number,
    w: number,
    h: number
) {
    const pad = 2.2;
    const fontSize = 8;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(fontSize);

    const content = value ? `${label} : ${value}` : `${label} :`;
    const maxW = w - pad * 2;
    const maxH = h - pad * 2;
    const lineY = y + pad + Math.min(maxH, h / 2) + 1.0;
    const txt = fitOneLine(doc, content, maxW);

    doc.text(txt, x + pad, lineY);
}

/* ---------------- CORE RENDER ---------------- */

async function renderVendorInvoice(doc: Doc, data: VendorInvoiceData) {
    const L = 10;
    const R = 200;
    const W = R - L;
    const T = 10;
    const PAGE_BOTTOM = 287;

    // HEADER
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.text("INVOICE", 105, T + 6, { align: "center" });

    doc.setFont("Helvetica", "italic");
    doc.setFontSize(8);
    doc.text("(ORIGINAL FOR RECIPIENT)", 105, T + 10, { align: "center" });

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);

    // QR
    const qrBoxW = 42;
    const qrBoxH = 32;
    const qrX = R - qrBoxW;
    const qrY = T + 10;
    rectOuter(doc, qrX, qrY, qrBoxW, qrBoxH);

    try {
        // ✅ best: use pre-generated dataUrl from API route
        if (data.qrDataUrl) {
            doc.addImage(
                data.qrDataUrl,
                "PNG",
                qrX + 2,
                qrY + 2,
                qrBoxW - 4,
                qrBoxH - 4
            );
        } else {
            // fallback (if you ever call pdf builder somewhere else)
            const qrPayload = (data.qrText || data.irn || data.invoiceNo || "")
                .toString()
                .trim();

            if (qrPayload) {
                const mod: any = await import("qrcode");
                const QR = mod?.default ?? mod;

                const qrDataUrl = await QR.toDataURL(qrPayload, {
                    errorCorrectionLevel: "M",
                    margin: 0,
                    scale: 6,
                });

                doc.addImage(qrDataUrl, "PNG", qrX + 2, qrY + 2, qrBoxW - 4, qrBoxH - 4);
            }
        }
    } catch (e) {
        console.error("QR render failed:", e);
    }


    // IRN/Ack box
    const irnBoxX = L;
    const irnBoxY = T + 16;
    const irnBoxW = qrX - L - 6;
    const irnBoxH = 26;
    rectOuter(doc, irnBoxX, irnBoxY, irnBoxW, irnBoxH);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    const irnBlock = `IRN : ${data.irn ?? ""}\nAck No. : ${data.ackNo ?? ""}\nAck Date : ${data.ackDate ?? ""}`;
    textBox(doc, irnBlock, irnBoxX, irnBoxY, irnBoxW, irnBoxH, 8, 4);

    // MAIN BOX
    const mainBoxY = T + 48;
    const mainBoxH = 78;
    rectOuter(doc, L, mainBoxY, W, mainBoxH);

    const leftW = 110;
    const rightX = L + leftW;
    lineInner(doc, rightX, mainBoxY, rightX, mainBoxY + mainBoxH);

    const sellerH = 26;
    const shipH = 26;
    const billH = mainBoxH - sellerH - shipH;

    const sellerY = mainBoxY;
    const shipY = mainBoxY + sellerH;
    const billY = shipY + shipH;

    lineInner(doc, L, shipY, rightX, shipY);
    lineInner(doc, L, billY, rightX, billY);

    // Seller
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    const sellerLines: string[] = [];
    sellerLines.push((data.vendorName || "").toUpperCase());
    if (data.vendorAddress) sellerLines.push(data.vendorAddress);
    if (data.vendorGSTIN) sellerLines.push(`GSTIN/UIN : ${data.vendorGSTIN}`);
    if (data.vendorStateName || data.vendorStateCode) {
        sellerLines.push(
            `State Name : ${data.vendorStateName ?? ""}, Code : ${data.vendorStateCode ?? ""}`.trim()
        );
    }
    if (data.vendorEmail) sellerLines.push(`E-Mail : ${data.vendorEmail}`);
    textBox(doc, sellerLines.join("\n"), L, sellerY, leftW, sellerH, 9, 4);

    // Ship To / Bill To
    doc.setFont("Helvetica", "normal");
    textBox(doc, `Consignee (Ship to)\n${data.shipTo || ""}`, L, shipY, leftW, shipH, 7.8, 3.6);
    textBox(doc, `Buyer (Bill to)\n${data.billTo || ""}`, L, billY, leftW, billH, 7.8, 3.6);

    // RIGHT META GRID
    const metaX = rightX;
    const metaY = mainBoxY;
    const metaW = R - rightX;
    const metaH = mainBoxH;

    const midX = metaX + metaW * 0.56;
    lineInner(doc, midX, metaY, midX, metaY + metaH);

    const rows = 8;
    const rowH = metaH / rows;
    for (let i = 1; i < rows; i++) lineInner(doc, metaX, metaY + i * rowH, R, metaY + i * rowH);

    const fmtDate = data.invoiceDate ? new Date(data.invoiceDate).toLocaleDateString("en-IN") : "";

    const leftMeta: Array<[string, string]> = [
        ["Invoice No.", data.invoiceNo ?? ""],
        ["Delivery Note", data.deliveryNote ?? ""],
        ["Reference No. & Date.", data.referenceNo ?? ""],
        ["Buyer's Order No.", data.buyersOrderNo ?? ""],
        ["Dispatch Doc No.", data.dispatchDocNo ?? ""],
        ["Dispatched through", data.dispatchedThrough ?? ""],
        ["Bill of Lading/L-RR No.", ""],
        ["Terms of Delivery", data.termsOfDelivery ?? ""],
    ];

    const rightMeta: Array<[string, string]> = [
        ["Dated", fmtDate],
        ["Mode/Terms of Payment", ""],
        ["Other References", ""],
        ["Dated", ""],
        ["Delivery Note Date", ""],
        ["Destination", data.destination ?? ""],
        ["Motor Vehicle No.", data.motorVehicleNo ?? ""],
        ["", ""],
    ];

    for (let i = 0; i < rows; i++) {
        const cellY = metaY + i * rowH;
        metaCell(doc, leftMeta[i][0], leftMeta[i][1], metaX, cellY, midX - metaX, rowH);
        metaCell(doc, rightMeta[i][0], rightMeta[i][1], midX, cellY, R - midX, rowH);
    }

    // ITEMS TABLE
    const itemsStartY = mainBoxY + mainBoxH + 6;
    const normalizedItems = (data.items?.length ? data.items : []).map((it: any) => {
        const qty = Number(it.qty ?? it.totalKgs) || 0;
        const amount = Number(it.amount ?? it.totalPrice ?? 0) || 0;
        const rate = qty ? amount / qty : amount;

        const code = String(it.varietyCode ?? "").trim();
        const name = String(it.varietyName ?? "").trim();

        const bad = new Set(["farmer", "agent", "client"]);
        const safeCode = bad.has(code.toLowerCase()) ? "" : code;
        const safeName = bad.has(name.toLowerCase()) ? "" : name;

        const descFromItem = String(it.description ?? "").trim();

        const description =
            descFromItem
                ? descFromItem
                : safeName && safeCode
                    ? `${safeName} (${safeCode})`
                    : safeName
                        ? safeName
                        : safeCode
                            ? safeCode
                            : (data.description ?? "Goods / Service");

        return {
            description,
            hsn: String(it.hsn ?? data.hsn ?? ""),
            qty,
            uom: String(it.uom ?? "KGS"),
            rateInclTax: it.rateInclTax != null ? Number(it.rateInclTax) : undefined,
            rate,
            amount,
        };
    });

    const items =
        normalizedItems.length > 0
            ? normalizedItems
            : [{
                description: data.description ?? "Goods / Service",
                hsn: data.hsn,
                qty: 1,
                uom: "NOS",
                rateInclTax: undefined,
                rate: data.taxableValue,
                amount: data.taxableValue,
            }];

    autoTable(doc, {
        startY: itemsStartY,
        theme: "grid",
        styles: {
            fontSize: 8,
            cellPadding: 1.8,
            lineWidth: 0.35,
            textColor: 0,
            fillColor: 255,
            overflow: "linebreak",
        },
        headStyles: {
            fontStyle: "bold",
            halign: "center",
            lineWidth: 0.45,
            fillColor: 255,
            textColor: 0,
        },
        columnStyles: {
            0: { cellWidth: 10, halign: "center" },
            1: { cellWidth: 62, overflow: "linebreak" },
            2: { cellWidth: 22, halign: "center" },
            3: { cellWidth: 22, halign: "right" },
            4: { cellWidth: 22, halign: "right" },
            5: { cellWidth: 20, halign: "right" },
            6: { cellWidth: 10, halign: "center" },
            7: { cellWidth: 22, halign: "right" },
        },
        head: [[
            "Sl.\nNo.",
            "Description of Goods",
            "HSN/SAC",
            "Quantity",
            "Rate\n(Incl. of Tax)",
            "Rate",
            "per",
            "Amount",
        ]],
        body: items.map((it, idx) => ([
            String(idx + 1),
            it.description,
            it.hsn,
            `${it.qty} ${it.uom}`,
            it.rateInclTax != null ? money(it.rateInclTax) : "",
            money(it.rate),
            it.uom,
            money(it.amount),
        ])),
    });

    let y = (doc as any).lastAutoTable.finalY;

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Total", 120, y + 6);
    doc.text(`₹ ${money(data.totalAmount)}`, R - 2, y + 6, { align: "right" });
    y += 12;

    // Amount in words box
    const wordsBoxH = 14;
    rectOuter(doc, L, y, W, wordsBoxH);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    textBox(doc, `Amount Chargeable (in words)\n${amountToWords(data.totalAmount)}`, L, y, W, wordsBoxH, 8, 4);
    y += wordsBoxH + 6;

    // Tax summary table
    autoTable(doc, {
        startY: y,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 1.8, lineWidth: 0.35, textColor: 0, fillColor: 255 },
        headStyles: { fontStyle: "bold", halign: "center", lineWidth: 0.45, fillColor: 255, textColor: 0 },
        footStyles: { fontStyle: "bold", fillColor: 255, textColor: 0 },
        columnStyles: {
            0: { cellWidth: 35, halign: "center" },
            1: { cellWidth: 45, halign: "right" },
            2: { cellWidth: 22, halign: "center" },
            3: { cellWidth: 35, halign: "right" },
            4: { cellWidth: 35, halign: "right" },
        },
        head: [["HSN/SAC", "Taxable Value", "IGST Rate", "IGST Amount", "Total Tax Amount"]],
        body: [[data.hsn, money(data.taxableValue), `${data.gstPercent}%`, money(data.gstAmount), money(data.gstAmount)]],
        foot: [["Total", money(data.taxableValue), "", money(data.gstAmount), money(data.gstAmount)]],
    });

    y = (doc as any).lastAutoTable.finalY + 4;

    // Tax words
    const taxWordsH = 10;
    rectOuter(doc, L, y, W, taxWordsH);
    textBox(doc, `Tax Amount (in words):  ${amountToWords(data.gstAmount)}`, L, y, W, taxWordsH, 8, 4);
    y += taxWordsH + 6;

    // Bottom block
    const bottomBoxY = y;
    const bottomBoxH = PAGE_BOTTOM - bottomBoxY - 8;
    rectOuter(doc, L, bottomBoxY, W, bottomBoxH);

    const bSplitX = L + W * 0.58;
    lineInner(doc, bSplitX, bottomBoxY, bSplitX, bottomBoxY + bottomBoxH);

    textBox(
        doc,
        `Company's PAN : ${data.companyPAN ?? ""}\n\nDeclaration\nWe declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.\n\n\nCustomer's Seal and Signature`,
        L,
        bottomBoxY,
        bSplitX - L,
        bottomBoxH,
        8,
        3.8
    );

    textBox(
        doc,
        `Company's Bank Details\nBank Name : ${data.bankName ?? ""}\nA/c No. : ${data.bankAccNo ?? ""}\nBranch & IFS Code : ${(data.bankBranch ?? "").trim()} ${(data.bankIFSC ?? "").trim()}`.trim() +
        `\n\n\n\n\n\nAuthorised Signatory`,
        bSplitX,
        bottomBoxY,
        R - bSplitX,
        bottomBoxH,
        8,
        3.8
    );

    // Footer
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.text("This is a Computer Generated Invoice", 105, 292, { align: "center" });
}

/* ---------------- EXPORTS ---------------- */

// ✅ SERVER: use in API / QR scan
export async function buildVendorInvoicePDF(JsPDF: typeof jsPDF, data: VendorInvoiceData) {
    const doc: Doc = new JsPDF("p", "mm", "a4");
    doc.setTextColor(0);
    await renderVendorInvoice(doc, data);
    return doc.output("arraybuffer");
}

// ✅ CLIENT: use in button click
export async function generateVendorInvoicePDF(JsPDF: typeof jsPDF, data: VendorInvoiceData) {
    const buf = await buildVendorInvoicePDF(JsPDF, data);
    const blob = new Blob([buf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `Invoice_${data.invoiceNo}.pdf`;
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 3000);
}
