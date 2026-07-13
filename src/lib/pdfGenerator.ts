import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Firebase Storage Vault ────────────────────────────────────────────────────
// Every generated document is archived in Firebase Storage in addition to the
// local browser download. This enables audit retrieval without relying on the
// user's local filesystem.

/**
 * Uploads a jsPDF document blob to Firebase Storage and indexes the metadata
 * in the Firestore `pdfVaults` collection.
 *
 * @param doc       - The jsPDF instance (already fully rendered)
 * @param vaultPath - Storage path e.g. "vaults/invoices/INV-2026-1234.pdf"
 * @param meta      - Additional metadata to persist alongside the download URL
 * @returns         - The Firebase Storage download URL, or null if upload fails
 */
async function uploadToVault(
  doc: jsPDF,
  vaultPath: string,
  meta: Record<string, any>
): Promise<string | null> {
  try {
    // Import lazily so this only runs in the browser environment
    const { getStorage, ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
    const { getFirestore, collection, addDoc, serverTimestamp } = await import("firebase/firestore");

    const storage = getStorage();
    const storageRef = ref(storage, vaultPath);

    // Convert jsPDF output to a Uint8Array blob for upload
    const pdfBlob = new Blob([doc.output("arraybuffer")], { type: "application/pdf" });
    const uploadResult = await uploadBytes(storageRef, pdfBlob, {
      contentType: "application/pdf",
      customMetadata: {
        generatedAt: new Date().toISOString(),
        ...Object.fromEntries(Object.entries(meta).map(([k, v]) => [k, String(v)])),
      },
    });

    const downloadURL = await getDownloadURL(uploadResult.ref);

    // Index in Firestore for audit retrieval
    const db = getFirestore();
    await addDoc(collection(db, "pdfVaults"), {
      ...meta,
      storagePath: vaultPath,
      downloadURL,
      createdAt: serverTimestamp(),
    });

    console.info(`[pdfVault] Archived → ${vaultPath}`);
    return downloadURL;
  } catch (err) {
    // Non-fatal: vault upload failure should never block the local download
    console.warn("[pdfVault] Upload failed (non-fatal):", err);
    return null;
  }
}

// ─── End Vault Utilities ───────────────────────────────────────────────────────

export const generateInternCertificate = (internName: string, department: string, issueDate: string) => {
  const doc = new jsPDF("landscape", "pt", "a4");
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Draw background border
  doc.setDrawColor(79, 70, 229); // Indigo 600
  doc.setLineWidth(10);
  doc.rect(20, 20, width - 40, height - 40);
  
  doc.setDrawColor(129, 140, 248); // Indigo 400
  doc.setLineWidth(2);
  doc.rect(35, 35, width - 70, height - 70);

  // Logo / Header
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFontSize(40);
  doc.setFont("helvetica", "bold");
  doc.text("CERTIFICATE OF COMPLETION", width / 2, 140, { align: "center" });

  // Body
  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.text("This is to certify that", width / 2, 220, { align: "center" });

  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(79, 70, 229); // Indigo 600
  doc.text(internName, width / 2, 280, { align: "center" });

  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(
    `has successfully completed their internship program in the`,
    width / 2,
    340,
    { align: "center" }
  );

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(`${department} Department`, width / 2, 380, { align: "center" });

  // Date and Signatures
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text(`Date of Issue: ${issueDate}`, 100, 480);
  
  doc.line(width - 250, 470, width - 100, 470);
  doc.text("Authorized Signature", width - 175, 490, { align: "center" });
  
  doc.text("MINTS GLOBAL", width / 2, 530, { align: "center" });

  // Save the PDF
  doc.save(`Certificate_${internName.replace(/\s+/g, '_')}.pdf`);
};

// ─── Shared Brand Elements ────────────────────────────────────────────────────
function drawBrandHeader(doc: jsPDF, title: string, subtitle: string) {
  const width = doc.internal.pageSize.getWidth();
  
  // 1. Draw elegant glowing minimalist logo badge
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.roundedRect(40, 40, 36, 36, 8, 8, "F");

  doc.setFillColor(255, 255, 255);
  doc.circle(58, 58, 6, "F");

  doc.setTextColor(79, 70, 229);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("M", 51, 64);
  
  // 2. Title and Subtitle to the right of the logo
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFont("helvetica", "bold");
  doc.text("MINTS GLOBAL", 88, 58);

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text("Global Operations Command Center", 88, 72);

  // 3. Document Title (Right aligned)
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(79, 70, 229); // Indigo 600
  doc.text(title, width - 40, 60, { align: "right" });
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text(subtitle, width - 40, 75, { align: "right" });

  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(1);
  doc.line(40, 100, width - 40, 100);
}

// ─── Base Document Builders ───────────────────────────────────────────────────

function buildInvoiceDoc(
  invoiceData: { invoiceNumber: string; date: string; clientName: string; items: { description: string; amount: number }[]; total: number; status: string; }
): jsPDF {
  const doc = new jsPDF("portrait", "pt", "a4");
  const width = doc.internal.pageSize.getWidth();

  drawBrandHeader(doc, "TAX INVOICE", `Invoice # ${invoiceData.invoiceNumber}`);

  // Info Container
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(1);
  doc.roundedRect(40, 120, width - 80, 80, 6, 6, "FD");

  // Left column: Billed To
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "bold");
  doc.text("BILLED TO:", 60, 145);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.text(invoiceData.clientName, 60, 165);

  // Right column: Details
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("DATE OF ISSUE:", width - 240, 145);
  doc.text("PAYMENT STATUS:", width - 240, 165);
  
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "normal");
  doc.text(invoiceData.date, width - 120, 145);
  
  doc.setFont("helvetica", "bold");
  const isPaid = invoiceData.status.toLowerCase() === "paid";
  const statusColor = isPaid ? [16, 185, 129] : [239, 68, 68];
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(invoiceData.status.toUpperCase(), width - 120, 165);

  // Items Table
  const tableData = invoiceData.items.map(item => [item.description, `${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED`]);
  
  autoTable(doc, {
    startY: 230,
    head: [["Description of Services", "Amount (AED)"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 10, cellPadding: 8 },
    bodyStyles: { fontSize: 10, textColor: [15, 23, 42], cellPadding: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    margin: { left: 40, right: 40 }
  });

  // Summary Card
  const tableFinalY = (doc as any).lastAutoTable.finalY || 230;
  
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.roundedRect(width - 240, tableFinalY + 30, 200, 60, 6, 6, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Total Amount Due", width - 220, tableFinalY + 55);

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(129, 140, 248); // Indigo 300
  doc.text(`${invoiceData.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, width - 60, tableFinalY + 70, { align: "right" });

  // Footer
  const footerY = tableFinalY + 140;
  doc.setDrawColor(226, 232, 240);
  doc.line(40, footerY, width - 40, footerY);
  
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "normal");
  doc.text("Thank you for your business. Please process payment within 14 days.", width / 2, footerY + 20, { align: "center" });

  return doc;
}

function buildQuoteDoc(
  quoteData: { quoteNumber: string; date: string; clientName: string; contactName: string; items: { description: string; amount: number }[]; total: number; }
): jsPDF {
  const doc = new jsPDF("portrait", "pt", "a4");
  const width = doc.internal.pageSize.getWidth();

  drawBrandHeader(doc, "PROPOSAL & QUOTE", `Quote # ${quoteData.quoteNumber}`);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(1);
  doc.roundedRect(40, 120, width - 80, 80, 6, 6, "FD");

  doc.setFontSize(9); doc.setTextColor(100, 100, 100); doc.setFont("helvetica", "bold");
  doc.text("PREPARED FOR:", 60, 145);
  doc.text("ATTENTION:", 60, 165);
  doc.setTextColor(15, 23, 42); doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text(quoteData.clientName, 150, 145);
  doc.text(quoteData.contactName, 150, 165);

  doc.setFontSize(9); doc.setTextColor(100, 100, 100); doc.setFont("helvetica", "bold");
  doc.text("DATE OF ISSUE:", width - 240, 145);
  doc.text("VALID FOR:", width - 240, 165);
  doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "normal");
  doc.text(quoteData.date, width - 120, 145);
  doc.text("30 Days", width - 120, 165);

  const tableData = quoteData.items.map(item => [item.description, `${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED`]);
  
  autoTable(doc, {
    startY: 230,
    head: [["Service Description", "Investment (AED)"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 10, cellPadding: 8 },
    bodyStyles: { fontSize: 10, textColor: [15, 23, 42], cellPadding: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    margin: { left: 40, right: 40 }
  });

  const tableFinalY = (doc as any).lastAutoTable.finalY || 230;
  
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(width - 240, tableFinalY + 30, 200, 60, 6, 6, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Total Estimated Investment", width - 220, tableFinalY + 55);

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(129, 140, 248);
  doc.text(`${quoteData.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, width - 60, tableFinalY + 70, { align: "right" });

  const footerY = tableFinalY + 140;
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text("This quote is subject to our standard terms of service.", 40, footerY);
  doc.text("To accept this proposal, please sign and return this document.", 40, footerY + 15);
  
  doc.setDrawColor(200, 200, 200);
  doc.line(40, footerY + 70, 240, footerY + 70);
  doc.text("Authorized Client Signature", 140, footerY + 85, { align: "center" });

  doc.line(width - 240, footerY + 70, width - 40, footerY + 70);
  doc.text("Date", width - 140, footerY + 85, { align: "center" });

  return doc;
}

function buildPayslipDoc(
  payslipData: { payslipNumber: string; employeeName: string; role: string; period: string; baseSalary: number; deductions: number; netPay: number; unpaidLeaves: number; }
): jsPDF {
  const doc = new jsPDF("portrait", "pt", "a4");
  const width = doc.internal.pageSize.getWidth();

  drawBrandHeader(doc, "SALARY PAYSLIP", `Payslip # ${payslipData.payslipNumber}`);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(1);
  doc.roundedRect(40, 120, width - 80, 80, 6, 6, "FD");

  doc.setFontSize(9); doc.setTextColor(100, 100, 100); doc.setFont("helvetica", "bold");
  doc.text("EMPLOYEE NAME:", 60, 145);
  doc.text("DESIGNATION / ROLE:", 60, 165);
  doc.text("OFFICE LOCATION:", 60, 185);

  doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "normal");
  doc.text(payslipData.employeeName, 190, 145);
  doc.text(payslipData.role.toUpperCase(), 190, 165);
  doc.text("Mints Global HQ, UAE", 190, 185);

  doc.setFontSize(9); doc.setTextColor(100, 100, 100); doc.setFont("helvetica", "bold");
  doc.text("PAY PERIOD:", width - 240, 145);
  doc.text("DISPATCH STATUS:", width - 240, 165);

  doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "normal");
  doc.text(payslipData.period, width - 130, 145);
  
  doc.setTextColor(16, 185, 129); doc.setFont("helvetica", "bold");
  doc.text("RELEASED / PAID", width - 130, 165);

  autoTable(doc, {
    startY: 230,
    head: [["Earnings Item", "Amount (AED)", "Deductions Item", "Amount (AED)"]],
    body: [
      ["Basic Salary (60%)", `${(payslipData.baseSalary * 0.6).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED`, "Unpaid Leaves (LWP)", `-${payslipData.deductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED`],
      ["Housing Allowance (25%)", `${(payslipData.baseSalary * 0.25).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED`, `Deduction Days (${payslipData.unpaidLeaves} Days)`, ""],
      ["Transport & Utility (15%)", `${(payslipData.baseSalary * 0.15).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED`, "", ""]
    ],
    theme: "striped",
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9, cellPadding: 8 },
    bodyStyles: { fontSize: 9, textColor: [15, 23, 42], cellPadding: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 1: { halign: "right" }, 3: { halign: "right" } },
    margin: { left: 40, right: 40 }
  });

  const tableFinalY = (doc as any).lastAutoTable.finalY || 330;

  doc.setFillColor(15, 23, 42);
  doc.roundedRect(40, tableFinalY + 30, width - 80, 60, 6, 6, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("NET TAKE-HOME SALARY (AED)", 60, tableFinalY + 65);

  doc.setFontSize(20);
  doc.setTextColor(129, 140, 248);
  doc.text(`${payslipData.netPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED`, width - 60, tableFinalY + 68, { align: "right" });

  const cardFinalY = tableFinalY + 90;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "italic");
  doc.text("This is an official computer-generated document released by Mints Global Human Resources and requires no physical signature.", width / 2, cardFinalY + 50, { align: "center" });

  return doc;
}

// ─── Exported Sync Functions ──────────────────────────────────────────────────

export const generateInvoice = (invoiceData: Parameters<typeof buildInvoiceDoc>[0]) => {
  const doc = buildInvoiceDoc(invoiceData);
  doc.save(`Invoice_${invoiceData.invoiceNumber}.pdf`);
};

export const generateQuote = (quoteData: Parameters<typeof buildQuoteDoc>[0]) => {
  const doc = buildQuoteDoc(quoteData);
  doc.save(`Quote_${quoteData.quoteNumber}.pdf`);
};

export const generatePayslip = (payslipData: Parameters<typeof buildPayslipDoc>[0]) => {
  const doc = buildPayslipDoc(payslipData);
  doc.save(`Payslip_${payslipData.employeeName.replace(/\s+/g, '_')}_${payslipData.period.replace(/\s+/g, '')}.pdf`);

  uploadToVault(doc, `vaults/payslips/${payslipData.payslipNumber}.pdf`, {
    type: "payslip",
    payslipNumber: payslipData.payslipNumber,
    employeeName: payslipData.employeeName,
    period: payslipData.period,
    netPay: payslipData.netPay,
  }).then(url => {
    if (url) console.info("[pdfVault] Payslip archived:", url);
  });
};

// ─── Vault-Aware Async Wrappers ────────────────────────────────────────────────

/**
 * Generates an invoice PDF, saves it locally, AND archives it to Firebase Storage.
 * @returns Promise<string | null> - The Firebase Storage download URL, or null on failure
 */
export async function generateAndVaultInvoice(
  invoiceData: Parameters<typeof buildInvoiceDoc>[0]
): Promise<string | null> {
  const doc = buildInvoiceDoc(invoiceData);
  doc.save(`Invoice_${invoiceData.invoiceNumber}.pdf`);

  return uploadToVault(doc, `vaults/invoices/Invoice_${invoiceData.invoiceNumber}.pdf`, {
    type: "invoice",
    invoiceNumber: invoiceData.invoiceNumber,
    clientName: invoiceData.clientName,
    total: invoiceData.total,
    status: invoiceData.status,
    date: invoiceData.date,
  });
}

/**
 * Generates a quote PDF, saves it locally, AND archives it to Firebase Storage.
 * @returns Promise<string | null> - The Firebase Storage download URL, or null on failure
 */
export async function generateAndVaultQuote(
  quoteData: Parameters<typeof buildQuoteDoc>[0]
): Promise<string | null> {
  const doc = buildQuoteDoc(quoteData);
  doc.save(`Quote_${quoteData.quoteNumber}.pdf`);

  return uploadToVault(doc, `vaults/quotes/Quote_${quoteData.quoteNumber}.pdf`, {
    type: "quote",
    quoteNumber: quoteData.quoteNumber,
    clientName: quoteData.clientName,
    total: quoteData.total,
    date: quoteData.date,
  });
}
