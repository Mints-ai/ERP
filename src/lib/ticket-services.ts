import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  Ticket, 
  TicketStatus, 
  TicketComment, 
  TicketResolutionDetails, 
  TicketCancellationDetails 
} from "@/types/ticket";

const TICKETS_COLLECTION = "tickets";

export const subscribeToTickets = (
  userId: string,
  role: string,
  callback: (tickets: Ticket[]) => void
) => {
  const normalizedRole = (role || "").toLowerCase();
  const isPrivileged = ["admin", "founder", "c_suite", "system_admin", "manager"].includes(normalizedRole);

  const q = query(
    collection(db, TICKETS_COLLECTION),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const rawTickets = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Ticket[];

    // Privileged roles see all tickets; standard users see tickets they requested or are assigned to
    const filteredTickets = isPrivileged 
      ? rawTickets 
      : rawTickets.filter(t => t.createdBy === userId || t.assignedTo === userId);

    callback(filteredTickets);
  }, (err) => {
    console.error("Error subscribing to tickets:", err);
  });
};

export const createTicket = async (ticketData: Partial<Ticket> & { title: string; description: string; createdBy: string }): Promise<string> => {
  const ticketNumber = `TICK-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  const docRef = await addDoc(collection(db, TICKETS_COLLECTION), {
    ticketNumber,
    title: ticketData.title.trim(),
    description: ticketData.description.trim(),
    category: ticketData.category || "IT Support",
    priority: ticketData.priority || "Normal",
    status: "open",
    createdBy: ticketData.createdBy,
    creatorName: ticketData.creatorName || "Employee",
    creatorEmail: ticketData.creatorEmail || "",
    assignedTo: ticketData.assignedTo || null,
    assignedToName: ticketData.assignedToName || null,
    attachments: ticketData.attachments || [],
    createdAt: now,
    updatedAt: now
  });

  return docRef.id;
};

export const updateTicketStatus = async (ticketId: string, newStatus: TicketStatus): Promise<void> => {
  const ticketRef = doc(db, TICKETS_COLLECTION, ticketId);
  await updateDoc(ticketRef, {
    status: newStatus,
    updatedAt: new Date().toISOString()
  });
};

export const assignTicket = async (
  ticketId: string, 
  agentId: string, 
  agentName: string, 
  agentEmail?: string
): Promise<void> => {
  const ticketRef = doc(db, TICKETS_COLLECTION, ticketId);
  await updateDoc(ticketRef, {
    assignedTo: agentId,
    assignedToName: agentName,
    assignedToEmail: agentEmail || null,
    updatedAt: new Date().toISOString()
  });
};

export const resolveTicket = async (
  ticketId: string,
  resolutionNotes: string,
  user: any
): Promise<void> => {
  if (!resolutionNotes.trim()) {
    throw new Error("Resolution explanation is mandatory to resolve a ticket.");
  }

  const resolutionDetails: TicketResolutionDetails = {
    resolutionNotes: resolutionNotes.trim(),
    resolvedBy: user?.uid || "staff",
    resolvedByName: user?.fullName || user?.displayName || "Support Staff",
    resolvedAt: new Date().toISOString()
  };

  const ticketRef = doc(db, TICKETS_COLLECTION, ticketId);
  await updateDoc(ticketRef, {
    status: "resolved",
    resolutionDetails,
    updatedAt: new Date().toISOString()
  });

  // Log in comments thread
  await addTicketComment(
    ticketId, 
    `✅ Ticket marked as Resolved:\n\n${resolutionNotes.trim()}`, 
    user, 
    false
  );
};

export const reopenTicket = async (
  ticketId: string,
  reason: string,
  user: any
): Promise<void> => {
  const ticketRef = doc(db, TICKETS_COLLECTION, ticketId);
  await updateDoc(ticketRef, {
    status: "in_progress",
    resolutionDetails: null,
    updatedAt: new Date().toISOString()
  });

  await addTicketComment(
    ticketId, 
    `🔄 Ticket Re-opened:\n\n${reason.trim() || "Requester or staff requested further investigation."}`, 
    user, 
    false
  );
};

export const cancelTicketWithReason = async (
  ticket: Ticket,
  reason: string,
  user: any,
  employeesList: any[] = []
): Promise<void> => {
  if (!reason.trim()) {
    throw new Error("A cancellation reason is required.");
  }

  // Notify requester if different from canceller
  if (ticket.createdBy && ticket.createdBy !== user?.uid) {
    const creatorEmp = employeesList.find(e => e.id === ticket.createdBy);
    try {
      await addDoc(collection(db, "internal_mails"), {
        senderId: user?.uid,
        senderName: user?.fullName || user?.displayName || "Helpdesk Support",
        senderEmail: user?.email || "helpdesk@mintsglobal.com",
        receiverId: ticket.createdBy,
        receiverName: creatorEmp?.fullName || ticket.creatorName || "Requester",
        receiverEmail: creatorEmp?.email || ticket.creatorEmail || "",
        subject: `❌ Helpdesk Ticket Cancelled: ${ticket.title}`,
        body: `Hello ${ticket.creatorName || "Team Member"},\n\nYour support ticket "${ticket.title}" (${ticket.ticketNumber || ticket.id}) was cancelled by ${user?.fullName || "Support Management"}.\n\nReason: ${reason.trim()}\n\nIf this was done in error or you still require assistance, please submit a new ticket.`,
        priority: ticket.priority === "Urgent" || ticket.priority === "High" ? "Urgent" : "Normal",
        isRead: false,
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, "notifications"), {
        userId: ticket.createdBy,
        title: "Ticket Cancelled",
        message: `Ticket "${ticket.title}" was cancelled: ${reason.trim()}`,
        type: "ticket_cancelled",
        read: false,
        createdAt: serverTimestamp(),
        link: `/dashboard/tickets`
      });
    } catch (err) {
      console.warn("Could not dispatch ticket cancellation notification:", err);
    }
  }

  // Delete ticket document
  await deleteDoc(doc(db, TICKETS_COLLECTION, ticket.id));
};

export const addTicketComment = async (
  ticketId: string,
  content: string,
  user: any,
  isInternal: boolean = false
): Promise<void> => {
  if (!content.trim()) return;

  await addDoc(collection(db, TICKETS_COLLECTION, ticketId, "comments"), {
    content: content.trim(),
    createdBy: user?.uid || "unknown",
    createdByName: user?.fullName || user?.displayName || "Support Staff",
    isInternal: !!isInternal,
    createdAt: new Date().toISOString()
  });

  // Update ticket timestamp
  await updateDoc(doc(db, TICKETS_COLLECTION, ticketId), {
    updatedAt: new Date().toISOString()
  });
};

export const subscribeToTicketComments = (
  ticketId: string,
  callback: (comments: TicketComment[]) => void
) => {
  const q = query(
    collection(db, TICKETS_COLLECTION, ticketId, "comments"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(q, (snapshot) => {
    const comments = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as TicketComment[];
    callback(comments);
  });
};

export const validateTicketAttachment = (file: File): { valid: boolean; error?: string; safeName: string } => {
  const allowedExtensions = [".pdf", ".docx", ".xlsx", ".png", ".jpg", ".jpeg"];
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  
  if (!allowedExtensions.includes(extension)) {
    return { valid: false, error: "Only PDF, Word, Excel, and PNG/JPG images are supported.", safeName: "" };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: "Attachments must be 10 MB or smaller.", safeName: "" };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return { valid: true, safeName };
};
