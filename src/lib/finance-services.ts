import { collection, query, where, orderBy, onSnapshot, doc, getDocs, addDoc, serverTimestamp, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Evaluates expense workflows based on amount
 */
export const evaluateExpenseWorkflows = async (expenseAmount: number) => {
  try {
    const q = query(collection(db, "workflows"), where("isActive", "==", true), where("triggerType", "==", "Expense"));
    const snap = await getDocs(q);
    
    // Find the first matching workflow
    for (const docSnap of snap.docs) {
      const wf = docSnap.data();
      let match = true;
      for (const cond of (wf.conditions || [])) {
        if (cond.field === "amount") {
          const val = Number(cond.value);
          if (cond.operator === ">=" && !(expenseAmount >= val)) match = false;
          if (cond.operator === "<=" && !(expenseAmount <= val)) match = false;
          if (cond.operator === ">" && !(expenseAmount > val)) match = false;
          if (cond.operator === "<" && !(expenseAmount < val)) match = false;
          if (cond.operator === "==" && !(expenseAmount === val)) match = false;
        }
      }
      if (match && wf.approvalChain && wf.approvalChain.length > 0) {
        return {
          workflowId: docSnap.id,
          requiredApprovals: wf.approvalChain,
          currentApprovalStep: 0,
        };
      }
    }
  } catch (err) {
    console.error("Error evaluating workflows", err);
  }
  return { requiredApprovals: [], currentApprovalStep: 0 };
};

/**
 * Save a new invoice
 */
export const saveInvoice = async (invoiceData: any, userId: string | undefined, compCurrency: string) => {
  const { invoiceNumber, invoiceClientName, invoiceItems, invoiceTax, invoiceDiscount, invoiceDueDate, finalTotal, subtotal } = invoiceData;
  
  await addDoc(collection(db, "invoices"), {
    invoiceNumber: invoiceNumber.trim(),
    clientId: invoiceClientName,
    clientName: invoiceClientName,
    items: invoiceItems.map((item: any) => ({ description: item.description, amount: Number(item.amount) })),
    subtotal,
    taxRate: Number(invoiceTax),
    discountRate: Number(invoiceDiscount),
    total: finalTotal,
    currency: compCurrency,
    dueDate: invoiceDueDate,
    status: "pending",
    createdAt: serverTimestamp()
  });

  await addDoc(collection(db, "auditLog"), {
    actorId: userId,
    action: "CREATE_INVOICE",
    targetCollection: "invoices",
    details: `Created invoice ${invoiceNumber.trim()} for ${invoiceClientName} of amount ${finalTotal} ${compCurrency}.`,
    createdAt: serverTimestamp()
  });
};

/**
 * Save manual expense
 */
export const saveManualExpense = async (expenseData: any, user: any, compCurrency: string) => {
  const { manualVendor, manualCategory, manualAmount, manualDate } = expenseData;
  const amount = Number(manualAmount);
  const wfResult = await evaluateExpenseWorkflows(amount);

  await addDoc(collection(db, "expenses"), {
    submittedBy: user?.displayName || "Mints Team Member",
    submittedById: user?.uid || "",
    vendor: manualVendor.trim(),
    category: manualCategory,
    amount: amount,
    currency: compCurrency,
    status: wfResult.requiredApprovals.length > 0 ? "pending_approval" : "pending",
    date: manualDate,
    createdAt: serverTimestamp(),
    workflowId: wfResult.workflowId || null,
    requiredApprovals: wfResult.requiredApprovals,
    currentApprovalStep: wfResult.currentApprovalStep
  });
};

/**
 * Save OCR expense
 */
export const saveOcrExpense = async (ocrData: any, user: any, compCurrency: string) => {
  const { ocrVendor, ocrAmount, ocrDate } = ocrData;
  const amount = Number(ocrAmount);
  const wfResult = await evaluateExpenseWorkflows(amount);

  await addDoc(collection(db, "expenses"), {
    submittedBy: user?.displayName || "Mints Team Member",
    submittedById: user?.uid || "",
    vendor: ocrVendor.trim(),
    category: "Software", 
    amount: amount,
    currency: compCurrency,
    status: wfResult.requiredApprovals.length > 0 ? "pending_approval" : "pending",
    date: ocrDate,
    createdAt: serverTimestamp(),
    workflowId: wfResult.workflowId || null,
    requiredApprovals: wfResult.requiredApprovals,
    currentApprovalStep: wfResult.currentApprovalStep
  });
};

/**
 * Update expense status
 */
export const updateExpenseStatus = async (id: string, newStatus: "approved" | "rejected", userName: string | undefined) => {
  await updateDoc(doc(db, "expenses", id), {
    status: newStatus,
    reviewedBy: userName || "Finance Manager",
    updatedAt: new Date().toISOString()
  });
};

/**
 * Subscriptions
 */
export const subscribeToCompanySettings = (callback: (currency: string) => void) => {
  return onSnapshot(doc(db, "settings", "company"), (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data().currency || "USD");
    }
  });
};

export const subscribeToClients = (callback: (clients: any[]) => void) => {
  return onSnapshot(collection(db, "clients"), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

export const subscribeToEmployees = (callback: (employees: any[]) => void) => {
  return onSnapshot(collection(db, "employees"), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

export const subscribeToInvoices = (callback: (invoices: any[]) => void) => {
  const q = query(collection(db, "invoices"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
};

export const subscribeToExpenses = (callback: (expenses: any[]) => void) => {
  const q = query(collection(db, "expenses"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
};

export const deleteInvoiceData = async (invoiceId: string) => {
    await deleteDoc(doc(db, "invoices", invoiceId));
};

export const deleteExpenseData = async (expenseId: string) => {
    await deleteDoc(doc(db, "expenses", expenseId));
};

export const logPayslipGeneration = async (userId: string | undefined, employeeId: string, employeeName: string, period: string, netAmount: number) => {
    await addDoc(collection(db, "auditLog"), {
        actorId: userId,
        action: "GENERATE_PAYSLIP",
        targetCollection: "employees",
        targetId: employeeId,
        details: `Generated salary payslip for ${employeeName} for period ${period} (Net: ${netAmount} AED).`,
        createdAt: serverTimestamp()
      });
};
