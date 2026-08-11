import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const subscribeToLeads = (callback: (leads: any[]) => void) => {
  const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
};

export const subscribeToLeadEmails = (leadId: string, callback: (emails: any[]) => void) => {
  const q = query(collection(db, `leads/${leadId}/emails`), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
};

export const createLead = async (leadData: any, user: any) => {
  const { company, contactName, email, value } = leadData;
  await addDoc(collection(db, "leads"), {
    company,
    contactName,
    email,
    value: parseFloat(value) || 0,
    stage: "Lead",
    createdAt: serverTimestamp(),
    assignedTo: user?.displayName || "Unassigned"
  });
};

export const updateLeadStage = async (lead: any, newStage: string, user: any) => {
  await updateDoc(doc(db, "leads", lead.id), { stage: newStage });
  
  if (newStage === "Won" && lead.stage !== "Won") {
    // 1. Create Client
    const clientRef = await addDoc(collection(db, "clients"), {
      companyName: lead.company,
      contactPerson: lead.contactName,
      email: lead.email,
      status: "Active",
      createdAt: serverTimestamp()
    });
    
    // 2. Create Project
    await addDoc(collection(db, "projects"), {
      name: `${lead.company} Implementation`,
      clientId: clientRef.id,
      status: "pitch",
      budget: lead.value || 0,
      serviceType: "General",
      createdAt: serverTimestamp()
    });
    
    // 3. Create Deposit Invoice (50%)
    const depositAmount = (lead.value || 0) * 0.5;
    if (depositAmount > 0) {
      await addDoc(collection(db, "invoices"), {
        invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
        clientId: clientRef.id,
        clientName: lead.company,
        amount: depositAmount,
        status: "pending",
        issueDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: serverTimestamp()
      });
    }
    
    // 4. Create System Notification
    await addDoc(collection(db, "notifications"), {
      userId: "global",
      title: "New Client Won! 🎉",
      message: `${lead.company} has been moved to Won. Project and deposit invoice generated.`,
      read: false,
      createdAt: serverTimestamp()
    });
    
    // 5. Discord Webhook Notification
    fetch('/api/discord', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `🎉 **Deal Won!**\n**Client:** ${lead.company}\n**Value:** ${lead.value || 0} AED\n**Closed By:** ${user?.displayName || 'Team'}`
      })
    }).catch(err => console.error("Discord error:", err));
  }
};

export const deleteLead = async (id: string) => {
  await deleteDoc(doc(db, "leads", id));
};

export const logLeadEmail = async (leadId: string, text: string, user: any) => {
  await addDoc(collection(db, `leads/${leadId}/emails`), {
    text: text,
    sender: user?.displayName || "User",
    createdAt: serverTimestamp()
  });
};
