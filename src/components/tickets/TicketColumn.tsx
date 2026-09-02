"use client";

import { Droppable } from "@hello-pangea/dnd";
import { Ticket, TicketStatus } from "@/types/ticket";
import TicketCard from "./TicketCard";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketColumnProps {
  id: TicketStatus;
  title: string;
  badgeColor?: string;
  tickets: Ticket[];
  onAddClick?: () => void;
  onTicketClick: (ticket: Ticket) => void;
  onDeleteTicket: (ticket: Ticket) => void;
  isDragDisabled?: boolean;
  currentUserId?: string;
  onQuickAction?: (action: "start" | "resolve" | "reopen", ticket: Ticket, e: React.MouseEvent) => void;
  canManage?: boolean;
}

export default function TicketColumn({
  id,
  title,
  badgeColor = "border-border bg-card",
  tickets = [],
  onAddClick,
  onTicketClick,
  onDeleteTicket,
  isDragDisabled = false,
  currentUserId,
  onQuickAction,
  canManage = false
}: TicketColumnProps) {
  return (
    <div className="flex flex-col w-[300px] max-h-full rounded-2xl border border-border shadow-sm shrink-0 bg-card/40">
      {/* Column Header */}
      <div className={cn("flex items-center justify-between p-3 border-b border-border rounded-t-2xl", badgeColor)}>
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">{title}</h2>
          <span className="text-[10px] font-bold py-0.5 px-2 rounded-full bg-primary/10 text-primary border border-primary/20 font-mono">
            {tickets.length}
          </span>
        </div>

        {id === "open" && onAddClick && (
          <button
            onClick={onAddClick}
            className="p-1 hover:bg-muted/80 rounded-lg text-foreground/40 hover:text-foreground transition-colors cursor-pointer"
            title="Create Ticket"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 p-3 overflow-y-auto space-y-3 min-h-[480px] max-h-[calc(100vh-280px)] transition-colors rounded-b-2xl scrollbar-thin",
              snapshot.isDraggingOver ? "bg-primary/5" : "bg-transparent"
            )}
          >
            {tickets.map((ticket, index) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                index={index}
                onClick={() => onTicketClick(ticket)}
                onDelete={(e) => {
                  e.stopPropagation();
                  onDeleteTicket(ticket);
                }}
                isDragDisabled={isDragDisabled}
                currentUserId={currentUserId}
                onQuickAction={onQuickAction}
                canManage={canManage}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
