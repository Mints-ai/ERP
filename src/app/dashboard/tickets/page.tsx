"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { 
  Ticket, 
  TicketStatus, 
  TicketCategory, 
  TicketPriority 
} from "@/types/ticket";
import { 
  subscribeToTickets, 
  updateTicketStatus, 
  resolveTicket, 
  reopenTicket, 
  cancelTicketWithReason 
} from "@/lib/ticket-services";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import TicketColumn from "@/components/tickets/TicketColumn";
import TicketDetailModal from "@/components/tickets/TicketDetailModal";
import NewTicketDialog from "@/components/tickets/NewTicketDialog";
import { downloadCSV } from "@/lib/exportUtils";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertCircle, 
  Plus, 
  Download, 
  Clock, 
  Search, 
  Filter, 
  CheckCircle2, 
  ShieldAlert, 
  RotateCcw,
  LifeBuoy
} from "lucide-react";
import { cn } from "@/lib/utils";

const COLUMNS: { id: TicketStatus; title: string; badgeColor: string }[] = [
  { id: "open", title: "Open", badgeColor: "bg-rose-500/10 border-rose-500/30" },
  { id: "in_progress", title: "In Progress", badgeColor: "bg-primary/10 border-primary/30" },
  { id: "waiting", title: "Waiting on Requester", badgeColor: "bg-amber-500/10 border-amber-500/30" },
  { id: "resolved", title: "Resolved", badgeColor: "bg-emerald-500/10 border-emerald-500/30" },
];

export default function TicketsPage() {
  const { user, role } = useAuth();
  const userRole = (role || "").toLowerCase();
  const isCSuiteOrAdmin = ["admin", "founder", "c_suite", "system_admin"].includes(userRole);
  const isManager = userRole === "manager";
  const isManagerOrAbove = isCSuiteOrAdmin || isManager;

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeesList, setEmployeesList] = useState<any[]>([]);

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [myTicketsOnly, setMyTicketsOnly] = useState(!isManagerOrAbove);

  // Modals State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Mandatory Resolution Modal State
  const [resolveTarget, setResolveTarget] = useState<Ticket | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolveError, setResolveError] = useState("");
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);

  // Mandatory Cancellation / Deletion Modal State
  const [cancelTarget, setCancelTarget] = useState<Ticket | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Fetch employees list for assignee displays & notifications
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const snap = await getDocs(collection(db, "employees"));
        setEmployeesList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error fetching employees for tickets:", err);
      }
    };
    fetchEmployees();
  }, []);

  // Real-time tickets subscription
  useEffect(() => {
    if (!user || !role) return;

    const unsub = subscribeToTickets(user.uid, role, (fetched) => {
      setTickets(fetched);
      setLoading(false);

      // Keep detail modal ticket synchronized
      if (selectedTicket) {
        const updated = fetched.find(t => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    });

    return () => unsub();
  }, [user, role, selectedTicket?.id]);

  // Filtered tickets logic
  const filteredTickets = tickets.filter(ticket => {
    if (myTicketsOnly && ticket.createdBy !== user?.uid && ticket.assignedTo !== user?.uid) {
      return false;
    }
    if (filterCategory !== "all" && ticket.category !== filterCategory) {
      return false;
    }
    if (filterPriority !== "all" && ticket.priority !== filterPriority) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = ticket.title.toLowerCase().includes(q);
      const matchNumber = ticket.ticketNumber?.toLowerCase().includes(q);
      const matchDesc = ticket.description?.toLowerCase().includes(q);
      const matchCreator = ticket.creatorName?.toLowerCase().includes(q);
      if (!matchTitle && !matchNumber && !matchDesc && !matchCreator) return false;
    }
    return true;
  });

  // Group into Kanban columns
  const groupedTickets: Record<TicketStatus, Ticket[]> = {
    open: [],
    in_progress: [],
    waiting: [],
    resolved: [],
    closed: []
  };

  filteredTickets.forEach(ticket => {
    const statusKey = (ticket.status || "open") as TicketStatus;
    if (groupedTickets[statusKey]) {
      groupedTickets[statusKey].push(ticket);
    } else {
      groupedTickets.open.push(ticket);
    }
  });

  // Role-Gated Drag-and-Drop
  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const targetTicket = tickets.find(t => t.id === draggableId);
    if (!targetTicket) return;

    const isAssignee = user?.uid === targetTicket.assignedTo;
    const canMove = isManagerOrAbove || isAssignee;

    if (!canMove) {
      alert("Only assigned support agents or managers can advance tickets between status columns.");
      return;
    }

    const destStatus = destination.droppableId as TicketStatus;

    // Security Guard: Moving to Resolved strictly requires resolution explanation!
    if (destStatus === "resolved") {
      setResolveTarget(targetTicket);
      setResolutionNotes("");
      setResolveError("");
      return;
    }

    try {
      await updateTicketStatus(draggableId, destStatus);
    } catch (err) {
      console.error("Error updating ticket status:", err);
    }
  };

  // Quick Action Handler
  const handleQuickAction = async (action: "start" | "resolve" | "reopen", ticket: Ticket, e: React.MouseEvent) => {
    e.stopPropagation();
    if (action === "start") {
      await updateTicketStatus(ticket.id, "in_progress");
    } else if (action === "resolve") {
      setResolveTarget(ticket);
      setResolutionNotes("");
      setResolveError("");
    } else if (action === "reopen") {
      await reopenTicket(ticket.id, "Reopened by user from Kanban quick action.", user);
    }
  };

  // Confirm Mandatory Resolution
  const handleConfirmResolve = async () => {
    if (!resolveTarget || !user) return;
    if (!resolutionNotes.trim()) {
      setResolveError("Resolution explanation is strictly required to resolve this ticket.");
      return;
    }

    setIsSubmittingResolve(true);
    try {
      await resolveTicket(resolveTarget.id, resolutionNotes, user);
      if (selectedTicket?.id === resolveTarget.id) setIsDetailOpen(false);
      setResolveTarget(null);
      setResolutionNotes("");
      setResolveError("");
    } catch (err: any) {
      setResolveError(err?.message || "Failed to resolve ticket.");
    } finally {
      setIsSubmittingResolve(false);
    }
  };

  // Confirm Mandatory Cancellation
  const handleConfirmCancel = async () => {
    if (!cancelTarget || !user) return;
    if (!cancellationReason.trim()) {
      setCancelError("A reason is mandatory to cancel this ticket.");
      return;
    }

    setIsSubmittingCancel(true);
    try {
      await cancelTicketWithReason(cancelTarget, cancellationReason, user, employeesList);
      if (selectedTicket?.id === cancelTarget.id) setIsDetailOpen(false);
      setCancelTarget(null);
      setCancellationReason("");
      setCancelError("");
    } catch (err: any) {
      setCancelError(err?.message || "Failed to cancel ticket.");
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const formatted = filteredTickets.map(t => ({
      ticketNumber: t.ticketNumber || t.id.substring(0, 7),
      title: t.title,
      category: t.category,
      priority: t.priority,
      status: t.status,
      creatorName: t.creatorName || "Employee",
      assignedToName: t.assignedToName || "Unassigned",
      createdAt: t.createdAt ? new Date(t.createdAt?.seconds ? t.createdAt.seconds * 1000 : t.createdAt).toLocaleDateString() : ""
    }));

    downloadCSV(
      formatted,
      ["Ticket #", "Title", "Category", "Priority", "Status", "Requester", "Assignee", "Created Date"],
      ["ticketNumber", "title", "category", "priority", "status", "creatorName", "assignedToName", "createdAt"],
      "Mints_Global_Helpdesk_Tickets.csv"
    );
  };

  return (
    <div className="flex flex-col h-full space-y-4 pb-8">
      {/* Top Header & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 bg-card p-3 rounded-2xl border border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-foreground flex items-center gap-2">
              Helpdesk & Support Tickets
            </h1>
            <p className="text-xs text-foreground/40">Enterprise IT, HR, and Operations service desk.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isManagerOrAbove && (
            <span className="text-[11px] text-foreground/40 italic flex items-center gap-1 mr-1">
              <ShieldAlert className="w-3.5 h-3.5 text-primary/70" /> Audited workflow
            </span>
          )}

          <button
            onClick={handleExportCSV}
            className="px-4 h-9 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-1.5 cursor-pointer border border-border text-foreground/60 hover:bg-muted/80 hover:text-foreground"
          >
            <Download className="h-4 w-4 text-accent" /> Export CSV
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="btn-primary h-9 px-4 text-xs font-bold flex items-center cursor-pointer"
          >
            <Plus className="mr-1.5 h-4 w-4" /> New Ticket
          </button>
        </div>
      </div>

      {/* Filter & Scope Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-card/60 border border-border rounded-xl">
        <div className="flex items-center gap-2 flex-grow max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-foreground/40" />
            <Input
              placeholder="Search by title, ticket #, or requester..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs border-border bg-card"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* My vs Team Toggle */}
          <div className="flex items-center bg-muted/40 p-1 rounded-lg border border-border">
            <button
              onClick={() => setMyTicketsOnly(true)}
              className={cn("px-2.5 py-1 rounded text-xs font-bold transition-all",
                myTicketsOnly ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/50 hover:text-foreground"
              )}
            >
              My Tickets
            </button>
            <button
              onClick={() => setMyTicketsOnly(false)}
              className={cn("px-2.5 py-1 rounded text-xs font-bold transition-all",
                !myTicketsOnly ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/50 hover:text-foreground"
              )}
            >
              All Tickets
            </button>
          </div>

          {/* Category Filter */}
          <Select value={filterCategory} onValueChange={(val) => setFilterCategory(val || "all")}>
            <SelectTrigger className="h-8 text-xs border-border min-w-[120px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border text-foreground">
              <SelectItem value="all" className="text-xs">All Categories</SelectItem>
              <SelectItem value="IT Support" className="text-xs">IT Support</SelectItem>
              <SelectItem value="HR & Workplace" className="text-xs">HR & Workplace</SelectItem>
              <SelectItem value="Finance & Invoicing" className="text-xs">Finance & Invoicing</SelectItem>
              <SelectItem value="Access & Security" className="text-xs">Access & Security</SelectItem>
              <SelectItem value="General Operations" className="text-xs">General Operations</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select value={filterPriority} onValueChange={(val) => setFilterPriority(val || "all")}>
            <SelectTrigger className="h-8 text-xs border-border min-w-[110px]">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border text-foreground">
              <SelectItem value="all" className="text-xs">All Priorities</SelectItem>
              <SelectItem value="Urgent" className="text-xs">Urgent</SelectItem>
              <SelectItem value="High" className="text-xs">High</SelectItem>
              <SelectItem value="Normal" className="text-xs">Normal</SelectItem>
              <SelectItem value="Low" className="text-xs">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Kanban Columns */}
      {loading ? (
        <div className="flex-1 flex justify-center items-center py-20">
          <Clock className="h-6 w-6 text-primary animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto pb-4">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex h-full gap-6 min-w-max items-start">
              {COLUMNS.map(column => (
                <TicketColumn
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  badgeColor={column.badgeColor}
                  tickets={groupedTickets[column.id] || []}
                  onAddClick={() => setIsAddOpen(true)}
                  onTicketClick={(ticket) => {
                    setSelectedTicket(ticket);
                    setIsDetailOpen(true);
                  }}
                  onDeleteTicket={(ticket) => {
                    setCancelTarget(ticket);
                    setCancellationReason("");
                    setCancelError("");
                  }}
                  isDragDisabled={!isManagerOrAbove}
                  currentUserId={user?.uid}
                  onQuickAction={handleQuickAction}
                  canManage={isManagerOrAbove}
                />
              ))}
            </div>
          </DragDropContext>
        </div>
      )}

      {/* New Ticket Dialog */}
      <NewTicketDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        user={user}
      />

      {/* Detail Modal */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setTimeout(() => setSelectedTicket(null), 300);
          }}
          employeesList={employeesList}
          user={user}
          role={role || ""}
          onResolveTrigger={(ticket) => {
            setResolveTarget(ticket);
            setResolutionNotes("");
            setResolveError("");
          }}
          onCancelTrigger={(ticket) => {
            setCancelTarget(ticket);
            setCancellationReason("");
            setCancelError("");
          }}
          onReopenTrigger={async (ticket) => {
            await reopenTicket(ticket.id, "Reopened by user from ticket details.", user);
          }}
        />
      )}

      {/* MANDATORY RESOLUTION MODAL */}
      <Dialog open={!!resolveTarget} onOpenChange={(open) => !open && setResolveTarget(null)}>
        <DialogContent className="bg-card border-emerald-500/30 text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Resolve Ticket
            </DialogTitle>
            <DialogDescription className="text-xs text-foreground/60">
              To resolve <span className="font-bold text-foreground">"{resolveTarget?.title}"</span>, please provide a detailed explanation of the fix, solution, or root-cause remedy applied.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Resolution Notes (Mandatory)
              </label>
              <Textarea
                required
                placeholder="Explain the solution applied, steps taken, or reference links..."
                value={resolutionNotes}
                onChange={(e) => {
                  setResolutionNotes(e.target.value);
                  if (resolveError) setResolveError("");
                }}
                className="border-border text-foreground text-xs min-h-[95px]"
              />
              {resolveError && (
                <p className="text-[11px] text-rose-400 font-bold">{resolveError}</p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setResolveTarget(null)}
              className="px-4 py-2 text-xs font-bold text-foreground/70 hover:text-foreground"
              disabled={isSubmittingResolve}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmResolve}
              disabled={isSubmittingResolve || !resolutionNotes.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {isSubmittingResolve ? "Resolving..." : "Confirm & Mark Resolved"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MANDATORY CANCELLATION MODAL */}
      <Dialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent className="bg-card border-rose-500/30 text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-500">
              <AlertCircle className="w-5 h-5 text-rose-500" /> Cancel & Delete Ticket
            </DialogTitle>
            <DialogDescription className="text-xs text-foreground/60">
              To cancel <span className="font-bold text-foreground">"{cancelTarget?.title}"</span>, you must document a formal cancellation reason. The ticket requester will be notified.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                Cancellation Reason (Mandatory)
              </label>
              <Textarea
                required
                placeholder="Explain why this ticket is being cancelled or closed..."
                value={cancellationReason}
                onChange={(e) => {
                  setCancellationReason(e.target.value);
                  if (cancelError) setCancelError("");
                }}
                className="border-border text-foreground text-xs min-h-[90px]"
              />
              {cancelError && (
                <p className="text-[11px] text-rose-400 font-bold">{cancelError}</p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setCancelTarget(null)}
              className="px-4 py-2 text-xs font-bold text-foreground/70 hover:text-foreground"
              disabled={isSubmittingCancel}
            >
              Abort
            </button>
            <button
              type="button"
              onClick={handleConfirmCancel}
              disabled={isSubmittingCancel || !cancellationReason.trim()}
              className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {isSubmittingCancel ? "Cancelling..." : "Confirm & Notify Requester"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
