import jsPDF from "jspdf";

type CompanyInfo = {
  name: string;
  addressLines: string[];
  phone?: string;
  email?: string;
  website?: string;
};

export const generateJoiningFormPDF = () => {
  const doc = new jsPDF("p", "mm", "a4");

  // ===== PAGE CONSTANTS =====
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const marginL = 15;
  const marginR = 15;
  const contentW = pageW - marginL - marginR;

  const topMargin = 15;
  const bottomMargin = 15;

  let y = topMargin;

  // ===== COMPANY CONFIG =====
  const company: CompanyInfo = {
    name: "RS-FISHERIES",
    addressLines: [
      "D.No 26-2-1272, Shankaran Colony",
      "Near Ayyappa Temple, GNT Road",
      "Nellore - 524004 (Andhra Pradesh)",
    ],
    phone: "+91 98765 43210",
    email: "hr@rsfisheries.com",
    website: "www.rsfisheries.com",
  };

  // ===== STYLES =====
  const fontRegular = (size = 10) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
  };
  const fontBold = (size = 10) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
  };

  const setBody = () => fontRegular(10);
  const setLabel = () => fontBold(9);
  const setSmall = () => fontRegular(8);

  // ===== COLORS =====
  const ACCENT = { r: 0, g: 85, b: 128 };
  const SOFT_BG = { r: 240, g: 248, b: 255 };
  const BORDER = 200;

  // ===== LAYOUT CONSTANTS =====
  const LABEL_H = 4;
  const LABEL_TO_BOX_GAP = 1.5;
  const BOX_H = 9;
  const ROW_GAP = 4;
  const ROW_H = LABEL_H + LABEL_TO_BOX_GAP + BOX_H + ROW_GAP;

  // ===== FOOTER =====
  const addFooter = () => {
    const footerY = pageH - bottomMargin + 4;
    doc.setDrawColor(220);
    doc.line(marginL, footerY - 5, pageW - marginR, footerY - 5);

    setSmall();
    doc.setTextColor(120);
    doc.text("Confidential | Property of RS-Fisheries", marginL, footerY);
    doc.text(`Page ${doc.getNumberOfPages()}`, pageW - marginR, footerY, {
      align: "right",
    });
    doc.setTextColor(0);
  };

  // ===== HEADER =====
  const logoSize = 40;

  const drawHeader = () => {
    const logoX = marginL;
    const logoY = topMargin;

    // Logo
    try {
      doc.addImage(
        "/assets/favicon.jpg",
        "JPEG",
        logoX,
        logoY,
        logoSize,
        logoSize
      );
    } catch {
      doc.setDrawColor(ACCENT.r, ACCENT.g, ACCENT.b);
      doc.setFillColor(245, 250, 255);
      doc.roundedRect(logoX, logoY, logoSize, logoSize, 2, 2, "FD");

      fontBold(14);
      doc.setTextColor(ACCENT.r, ACCENT.g, ACCENT.b);
      doc.text("RS", logoX + logoSize / 2, logoY + logoSize / 2, {
        align: "center",
      });

      setSmall();
      doc.text("FISHERIES", logoX + logoSize / 2, logoY + logoSize / 2 + 5, {
        align: "center",
      });
      doc.setTextColor(0);
    }

    // Company Details (right)
    fontBold(16);
    doc.setTextColor(ACCENT.r, ACCENT.g, ACCENT.b);
    doc.text(company.name, pageW - marginR, logoY + 8, { align: "right" });

    doc.setTextColor(60);
    setSmall();
    let cy = logoY + 14;
    company.addressLines.forEach((line) => {
      doc.text(line, pageW - marginR, cy, { align: "right" });
      cy += 4;
    });
    doc.text(
      `Ph: ${company.phone ?? ""} | Email: ${company.email ?? ""}`,
      pageW - marginR,
      cy,
      { align: "right" }
    );

    // Title Strip
    y = logoY + logoSize + 6;
    doc.setFillColor(ACCENT.r, ACCENT.g, ACCENT.b);
    doc.rect(marginL, y, contentW, 12, "F");

    fontBold(12);
    doc.setTextColor(255, 255, 255);
    doc.text("EMPLOYEE JOINING & COMPLIANCE FORM", pageW / 2, y + 8, {
      align: "center",
    });
    doc.setTextColor(0);

    y += 18;
  };

  const drawHeaderCompact = () => {
    doc.setFillColor(ACCENT.r, ACCENT.g, ACCENT.b);
    doc.rect(marginL, topMargin, contentW, 2, "F");

    fontBold(9);
    doc.setTextColor(150);
    doc.text(`${company.name} - Joining Form`, pageW - marginR, topMargin + 6, {
      align: "right",
    });
    doc.setTextColor(0);

    y = topMargin + 10;
  };

  // ===== PAGE BREAK =====
  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - bottomMargin) {
      addFooter();
      doc.addPage();
      y = topMargin;
      drawHeaderCompact();
    }
  };

  // Force a new page (used to start BANK DETAILS on a fresh page)
  const newPage = () => {
    addFooter();
    doc.addPage();
    y = topMargin;
    drawHeaderCompact();
  };

  // ===== DRAW HELPERS =====
  const drawBox = (x: number, yy: number, w: number, h: number) => {
    doc.setDrawColor(BORDER);
    doc.setLineWidth(0.3);
    doc.rect(x, yy, w, h);
  };

  // IMPORTANT: if label is empty -> DO NOT draw a box
  const field = (x: number, w: number, label?: string, boxH = BOX_H) => {
    if (!label || !label.trim()) return;

    setLabel();
    doc.setTextColor(80);
    doc.text(label, x, y + LABEL_H);

    drawBox(x, y + LABEL_H + LABEL_TO_BOX_GAP, w, boxH);

    doc.setTextColor(0);
  };

  const row2 = (l1?: string, l2?: string) => {
    ensureSpace(ROW_H);
    const gap = 5;
    const w = (contentW - gap) / 2;

    field(marginL, w, l1);
    field(marginL + w + gap, w, l2);

    y += ROW_H;
  };

  const row3 = (l1?: string, l2?: string, l3?: string) => {
    ensureSpace(ROW_H);
    const gap = 4;
    const w = (contentW - gap * 2) / 3;

    field(marginL, w, l1);
    field(marginL + w + gap, w, l2);
    field(marginL + (w + gap) * 2, w, l3);

    y += ROW_H;
  };

  const fullWidth = (label: string, boxH = 14) => {
    const needed = LABEL_H + LABEL_TO_BOX_GAP + boxH + ROW_GAP;
    ensureSpace(needed);
    field(marginL, contentW, label, boxH);
    y += needed;
  };

  const sectionCard = (title: string) => {
    ensureSpace(18);

    doc.setFillColor(SOFT_BG.r, SOFT_BG.g, SOFT_BG.b);
    doc.rect(marginL, y, contentW, 9, "F");

    doc.setFillColor(ACCENT.r, ACCENT.g, ACCENT.b);
    doc.rect(marginL, y, 4, 9, "F");

    fontBold(10);
    doc.setTextColor(ACCENT.r, ACCENT.g, ACCENT.b);
    doc.text(title.toUpperCase(), marginL + 8, y + 6);
    doc.setTextColor(0);

    y += 13;
  };

  // ===== BUILD FORM =====
  drawHeader();

  // ✅ PERSONAL INFORMATION
  sectionCard("Personal Information");

  // Passport photo box
  const photoW = 40;
  const photoH = 50;
  const gapToPhoto = 6;

  ensureSpace(photoH + 8);

  const photoX = pageW - marginR - photoW;
  const photoY = y;

  drawBox(photoX, photoY, photoW, photoH);
  setSmall();
  doc.setTextColor(150);
  doc.text("Paste Passport", photoX + 10, photoY + 20);
  doc.text("Photo Here", photoX + 12, photoY + 25);
  doc.setTextColor(0);

  const leftW = contentW - photoW - gapToPhoto;

  field(marginL, leftW, "Full Name");
  y += ROW_H;

  field(marginL, leftW, "Father's Name");
  y += ROW_H;

  ensureSpace(ROW_H);
  const halfW = (leftW - 5) / 2;
  field(marginL, halfW, "Date of Birth (DOB)");
  field(marginL + halfW + 5, halfW, "Gender (Male/Female/Other)");
  y += ROW_H;

  // Push cursor below photo block if still inside it
  const photoBottomY = photoY + photoH + 8;
  if (y < photoBottomY) y = photoBottomY;

  row3("Aadhaar Number", "PAN Number", "Marital Status (Optional)");
  row3("Mobile", "Alternate Mobile (Optional)", "Email");

  // ✅ Nationality should be SINGLE field (no blank extra box)
  fullWidth("Nationality (Optional)", 9);

  fullWidth("Current Address", 14);
  fullWidth("Permanent Address", 14);

  // ✅ BANK DETAILS must start on NEW PAGE
  newPage();

  sectionCard("Bank Details");
  row2("Bank Name", "Branch Name");

  // ✅ Only 2 fields (no third blank box)
  row2("Account Number", "IFSC Code");

  // ✅ DECLARATION
  sectionCard("Declaration");
  ensureSpace(60);

  doc.setDrawColor(180);
  doc.rect(marginL, y, contentW, 30);

  setBody();
  doc.setTextColor(60);
  doc.text(
    "I hereby declare that the information provided is true and correct.",
    marginL + 5,
    y + 12
  );
  doc.setTextColor(0);

  y += 40;

  const sigW = 70;

  // Employee Signature
  doc.line(marginL, y, marginL + sigW, y);
  fontBold(10);
  doc.text("Employee Signature", marginL, y + 5);
  fontRegular(9);
  doc.text("Date:", marginL, y + 12);

  // HR Signature
  doc.line(pageW - marginR - sigW, y, pageW - marginR, y);
  fontBold(10);
  doc.text("HR Manager / Authorized Signatory", pageW - marginR, y + 5, {
    align: "right",
  });
  fontRegular(9);
  doc.text("Date:", pageW - marginR, y + 12, { align: "right" });

  addFooter();
  doc.save("RS-Fisheries_Joining_Form.pdf");
};
