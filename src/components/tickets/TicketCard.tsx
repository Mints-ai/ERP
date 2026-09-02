"use client";

import { Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, Trash2, CheckCircle2, AlertCircle, ShieldAlert, ArrowRight, RotateCcw } from "lucide-react";
import { Ticket, TicketPriority } from "@/types/ticket";
import { cn } from "@/lib/utils";

const PRIORITY_BADGES: Record<TicketPriority, { color: string; label: string }> = {
  Urgent: { color: "bg-rose-500/20 text-rose-400 border-rose-500/30", label: "Urgent" },
  High: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", label: "High" },
  Normal: { color: "bg-primary/20 text-primary border-primary/30", label: "Normal" },
  Low: { color: "bg-muted text-foreground/50 border-border", label: "Low" },
};

interface TicketCardProps {
  ticket: Ticket;
  index: number;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isDragDisabled?: boolean;
  currentUserId?: string;
  onQuickAction?: (action: "start" | "resolve" | "reopen", ticket: Ticket, e: React.MouseEvent) => void;
  canManage?: boolean;
}

export default function TicketCard({
  ticket,
  index,
  onClick,
  onDelete,
  isDragDisabled = false,
  currentUserId,
  onQuickAction,
  canManage = false
}: TicketCardProps) {
  const isAssignee = currentUserId && ticket.assignedTo === currentUserId;
  const isCreator = currentUserId && ticket.createdBy === currentUserId;

  return (
    <Draggable draggableId={ticket.id} index={index} isDragDisabled={isDragDisabled}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={cn(
            "group relative border border-border bg-card shadow-sm hover:border-primary/50 transition-all rounded-xl cursor-pointer select-none overflow-hidden",
            snapshot.isDragging ? "ring-2 ring-primary shadow-xl" : ""
          )}
        >
          {ticket.priority === "Urgent" && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
          )}

          <CardContent className="p-3 pl-4">
            <div className="flex justify-between items-start mb-1.5 gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] font-mono font-bold py-0 h-4 border-border text-foreground/50">
                  {ticket.ticketNumber || ticket.id.substring(0, 7)}
                </Badge>
                <Badge variant="outline" className={cn("text-[9px] font-bold uppercase py-0 h-4", PRIORITY_BADGES[ticket.priority]?.color)}>
                  {ticket.priority}
                </Badge>
                <Badge variant="outline" className="text-[10px] py-0 h-4 border-primary/20 text-primary/80 font-medium">
                  {ticket.category || "General"}
                </Badge>
              </div>

              {(canManage || isCreator) && (
                <button
                  onClick={onDelete}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-rose-500/20 text-rose-400 rounded cursor-pointer shrink-0"
                  title="Cancel Ticket"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>

            <p className="text-xs font-bold text-foreground mb-1 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {ticket.title}
            </p>

            {ticket.description && (
              <p className="text-[11px] text-foreground/50 line-clamp-2 mb-2 font-normal">
                {ticket.description}
              </p>
            )}

            {/* Quick Action Triggers */}
            {onQuickAction && (
              <div className="flex items-center gap-1.5 mb-2 mt-1" onClick={(e) => e.stopPropagation()}>
                {ticket.status === "open" && (canManage || isAssignee) && (
                  <button
                    onClick={(e) => onQuickAction("start", ticket, e)}
                    className="text-[10px] bg-primary/10 hover:bg-primary/20 text-primary font-bold py-0.5 px-2 rounded border border-primary/20 transition-all flex items-center gap-1"
                  >
                    <ArrowRight className="w-2.5 h-2.5" /> Start Work
                  </button>
                )}
                {ticket.status === "in_progress" && (canManage || isAssignee) && (
                  <button
                    onClick={(e) => onQuickAction("resolve", ticket, e)}
                    className="text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold py-0.5 px-2 rounded border border-emerald-500/20 transition-all flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-2.5 h-2.5" /> Resolve
                  </button>
                )}
                {ticket.status === "resolved" && (canManage || isCreator) && (
                  <button
                    onClick={(e) => onQuickAction("reopen", ticket, e)}
                    className="text-[10px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold py-0.5 px-2 rounded border border-amber-500/20 transition-all flex items-center gap-1"
                  >
                    <RotateCcw className="w-2.5 h-2.5" /> Reopen
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center justify-between mt-auto pt-2 border-t border-border text-[11px]">
              <span className="text-foreground/40 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3 text-primary/60" />
                {ticket.createdAt ? new Date(ticket.createdAt?.seconds ? ticket.createdAt.seconds * 1000 : ticket.createdAt).toLocaleDateString() : "Just now"}
              </span>

              <div className="flex items-center gap-1.5" title={ticket.assignedToName ? `Assigned to ${ticket.assignedToName}` : "Unassigned"}>
                <Avatar className="w-4 h-4 border border-border">
                  <AvatarFallback className="bg-primary/10 text-[9px] font-bold text-primary">
                    {(ticket.assignedToName || "UN").substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-foreground/60 text-[10px] max-w-[80px] truncate">
                  {ticket.assignedToName ? ticket.assignedToName.split(" ")[0] : "Unassigned"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
}
