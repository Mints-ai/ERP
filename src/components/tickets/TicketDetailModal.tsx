"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Ticket, 
  TicketStatus, 
  TicketPriority, 
  TicketComment, 
  TicketAttachment 
} from "@/types/ticket";
import { 
  subscribeToTicketComments, 
  addTicketComment, 
  assignTicket, 
  validateTicketAttachment 
} from "@/lib/ticket-services";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare, 
  Paperclip, 
  Plus, 
  FileText, 
  Download, 
  ShieldCheck, 
  RotateCcw, 
  UserCheck, 
  Trash2,
  Lock
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketDetailModalProps {
  ticket: Ticket;
  isOpen: boolean;
  onClose: () => void;
  employeesList: any[];
  user: any;
  role: string;
  onResolveTrigger: (ticket: Ticket) => void;
  onCancelTrigger: (ticket: Ticket) => void;
  onReopenTrigger: (ticket: Ticket) => void;
}

export default function TicketDetailModal({
  ticket,
  isOpen,
  onClose,
  employeesList,
  user,
  role,
  onResolveTrigger,
  onCancelTrigger,
  onReopenTrigger
}: TicketDetailModalProps) {
  const userRole = (role || "").toLowerCase();
  const isManagerOrAdmin = ["admin", "founder", "c_suite", "system_admin", "manager"].includes(userRole);
  const isAssignee = user?.uid === ticket.assignedTo;
  const isCreator = user?.uid === ticket.createdBy;
  const canManage = isManagerOrAdmin || isAssignee;

  // Comments
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Attachments
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    if (!isOpen || !ticket) return;
    const unsub = subscribeToTicketComments(ticket.id, (fetched) => {
      // Filter internal notes if user is only the basic creator and not a staff/manager
      const visible = canManage 
        ? fetched 
        : fetched.filter(c => !c.isInternal);
      setComments(visible);
    });
    return () => unsub();
  }, [isOpen, ticket?.id, canManage]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !ticket) return;

    setIsSubmittingComment(true);
    try {
      await addTicketComment(ticket.id, newComment, user, isInternalNote);
      setNewComment("");
      setIsInternalNote(false);
    } catch (err) {
      console.error("Error adding comment:", err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleAssignToMe = async () => {
    if (!user || !ticket) return;
    try {
      await assignTicket(ticket.id, user.uid, user.fullName || "Support Agent", user.email);
    } catch (err) {
      console.error("Error assigning ticket:", err);
    }
  };

  const handleAssignChange = async (agentId: string) => {
    if (!agentId || !ticket) return;
    const emp = employeesList.find(e => e.id === agentId);
    try {
      await assignTicket(ticket.id, agentId, emp?.fullName || "Agent", emp?.email);
    } catch (err) {
      console.error("Error changing assignee:", err);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !ticket) return;

    const validation = validateTicketAttachment(file);
    if (!validation.valid) {
      setUploadError(validation.error || "Invalid file.");
      event.target.value = "";
      return;
    }

    setUploadError("");
    setIsUploading(true);
    try {
      if (!storage) throw new Error("Firebase storage is not configured.");
      const storageRef = ref(storage, `ticket_attachments/${ticket.id}/${Date.now()}-${validation.safeName}`);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const downloadUrl = await getDownloadURL(storageRef);

      const newAttachment: TicketAttachment = {
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        url: downloadUrl,
        size: file.size,
        type: file.type,
        uploadedBy: user.uid,
        uploadedByName: user.fullName || "User",
        uploadedAt: new Date().toISOString()
      };

      const existing = ticket.attachments || [];
      const ticketRef = doc(db, "tickets", ticket.id);
      await updateDoc(ticketRef, {
        attachments: [...existing, newAttachment]
      });
    } catch (err: any) {
      console.error("Error uploading attachment:", err);
      setUploadError(err?.message || "Upload failed.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  if (!ticket) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card border-border text-foreground sm:max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="shrink-0 border-b border-border pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs font-bold text-foreground/60 border-border">
                {ticket.ticketNumber || ticket.id.substring(0, 7)}
              </Badge>
              <Badge variant="outline" className="text-xs font-bold text-primary border-primary/20">
                {ticket.category}
              </Badge>
              <Badge variant="outline" className="text-xs font-bold uppercase text-foreground/40 border-border">
                {ticket.priority} Priority
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Badge className={cn("text-xs font-bold uppercase py-0.5", 
                ticket.status === "resolved" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                ticket.status === "in_progress" ? "bg-primary/20 text-primary border border-primary/30" :
                "bg-rose-500/20 text-rose-400 border border-rose-500/30"
              )}>
                {ticket.status.replace("_", " ")}
              </Badge>
            </div>
          </div>

          <DialogTitle className="text-base font-extrabold text-foreground leading-snug">
            {ticket.title}
          </DialogTitle>
          <div className="flex items-center gap-3 text-xs text-foreground/50 mt-1">
            <span>Requested by <strong className="text-foreground">{ticket.creatorName || "Employee"}</strong></span>
            <span>•</span>
            <span className="font-mono">{ticket.createdAt ? new Date(ticket.createdAt?.seconds ? ticket.createdAt.seconds * 1000 : ticket.createdAt).toLocaleString() : ""}</span>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="space-y-4 mt-3 overflow-y-auto flex-1 pr-2 scrollbar-thin">
          {/* Action Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-muted/20 border border-border rounded-xl">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-foreground/50 font-bold uppercase text-[10px]">Assigned Agent:</span>
              {canManage ? (
                <Select value={ticket.assignedTo || ""} onValueChange={(agentId) => handleAssignChange(agentId || "")}>
                  <SelectTrigger className="h-7 text-xs border-border min-w-[140px] bg-card">
                    <SelectValue placeholder="Assign agent..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border text-foreground max-h-52 overflow-y-auto">
                    {employeesList.map(emp => (
                      <SelectItem key={emp.id} value={emp.id} className="text-xs">
                        {emp.fullName} ({emp.jobTitle || emp.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="font-bold text-foreground">{ticket.assignedToName || "Unassigned"}</span>
              )}

              {!ticket.assignedTo && canManage && (
                <button
                  onClick={handleAssignToMe}
                  className="text-[11px] text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" /> Claim Ticket
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {ticket.status !== "resolved" && canManage && (
                <button
                  onClick={() => onResolveTrigger(ticket)}
                  className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Resolve Ticket
                </button>
              )}

              {ticket.status === "resolved" && (canManage || isCreator) && (
                <button
                  onClick={() => onReopenTrigger(ticket)}
                  className="btn-ghost border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reopen Ticket
                </button>
              )}

              {(canManage || isCreator) && (
                <button
                  onClick={() => onCancelTrigger(ticket)}
                  className="p-1 hover:bg-rose-500/20 text-rose-400 rounded cursor-pointer"
                  title="Cancel / Delete Ticket"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Issue Description */}
          <div className="p-3 bg-card border border-border rounded-xl">
            <span className="text-[10px] font-bold uppercase text-foreground/40 block mb-1">Issue Description</span>
            <p className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">
              {ticket.description}
            </p>
          </div>

          {/* Resolution Details Card if Resolved */}
          {ticket.status === "resolved" && ticket.resolutionDetails && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-emerald-400 text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Resolved by {ticket.resolutionDetails.resolvedByName}
                </span>
                <span className="font-mono text-[10px]">
                  {new Date(ticket.resolutionDetails.resolvedAt).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-foreground/80 mt-1 whitespace-pre-wrap">
                {ticket.resolutionDetails.resolutionNotes}
              </p>
            </div>
          )}

          {/* Attachments Section */}
          <div className="border border-border p-3 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-foreground/70 uppercase tracking-wider flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-primary" /> Attachments ({ticket.attachments?.length || 0})
              </h3>
              {(canManage || isCreator) && (
                <label className="text-[11px] text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer">
                  <Plus className="w-3 h-3" /> Attach File (.pdf, .docx, .xlsx, image)
                  <input
                    type="file"
                    accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              )}
            </div>

            {isUploading && <p className="text-xs text-primary animate-pulse">Uploading file securely...</p>}
            {uploadError && <p className="text-xs text-rose-400 font-bold mb-2">{uploadError}</p>}

            {(!ticket.attachments || ticket.attachments.length === 0) ? (
              <p className="text-xs text-foreground/30 italic text-center py-2">No files attached.</p>
            ) : (
              <div className="space-y-1.5">
                {ticket.attachments.map((att) => (
                  <div key={att.id} className="flex items-center justify-between p-2 rounded-lg bg-card border border-border text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate font-medium">{att.name}</span>
                      <span className="text-[10px] text-foreground/40 font-mono">({Math.round(att.size / 1024)} KB)</span>
                    </div>
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-muted text-primary rounded shrink-0"
                      title="Download file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Conversation / Audit Remarks */}
          <div>
            <h3 className="text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-primary" /> Conversation & Activity Thread ({comments.length})
            </h3>

            <div className="space-y-2.5">
              {comments.length === 0 ? (
                <div className="text-center py-6 text-foreground/20 text-xs font-medium border border-border border-dashed rounded-xl">
                  No replies or remarks yet.
                </div>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={cn(
                      "border p-3 rounded-xl text-xs space-y-1",
                      comment.isInternal 
                        ? "border-amber-500/30 bg-amber-500/5" 
                        : "border-border bg-card"
                    )}
                  >
                    <div className="flex justify-between items-center text-[11px] font-bold">
                      <div className="flex items-center gap-1.5">
                        <span className={comment.isInternal ? "text-amber-400" : "text-primary"}>
                          {comment.createdByName}
                        </span>
                        {comment.isInternal && (
                          <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] py-0 h-4 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Staff Internal Note
                          </Badge>
                        )}
                      </div>
                      <span className="text-foreground/30 font-mono text-[10px]">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-foreground/80 whitespace-pre-wrap leading-relaxed">
                      {comment.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Add Comment Footer */}
        <form onSubmit={handleAddComment} className="shrink-0 space-y-2 border-t border-border pt-3 mt-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/50">
              Post Reply or Update
            </label>
            {canManage && (
              <label className="flex items-center gap-1.5 text-xs text-amber-400 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInternalNote}
                  onChange={(e) => setIsInternalNote(e.target.checked)}
                  className="rounded border-border accent-amber-500"
                />
                <Lock className="w-3 h-3" /> Private Staff Note (Hidden from Requester)
              </label>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              required
              placeholder={isInternalNote ? "Write an internal diagnostic note for support staff..." : "Write a reply to the requester..."}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-grow h-9 rounded-lg border border-border px-3 py-1 text-xs text-foreground placeholder:text-foreground/30"
            />
            <button
              type="submit"
              disabled={isSubmittingComment || !newComment.trim()}
              className="btn-primary px-4 h-9 text-xs font-bold disabled:opacity-50"
            >
              {isSubmittingComment ? "..." : "Post"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
