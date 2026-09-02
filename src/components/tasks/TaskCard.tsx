import { Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Lock, Trash2, CheckSquare, MessageSquare, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Task, TaskPriority } from "@/types/task";
import React from "react";

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  Urgent: "bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]",
  High: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]",
  Normal: "bg-primary shadow-[0_0_6px_rgba(59,130,246,0.6)]",
  Low: "",
};

interface TaskCardProps {
  task: Task;
  index: number;
  employeesList: any[];
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isDragDisabled?: boolean;
  currentUserId?: string;
  onQuickAction?: (action: "start" | "submit" | "approve" | "recheck", task: Task, e: React.MouseEvent) => void;
  canApprove?: boolean;
}

export default function TaskCard({ 
  task, 
  index, 
  employeesList, 
  onClick, 
  onDelete,
  isDragDisabled = false,
  currentUserId,
  onQuickAction,
  canApprove = false
}: TaskCardProps) {
  const isOverdue = (dateString?: string | null) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date(new Date().setHours(0,0,0,0));
  };

  const isToday = (dateString?: string | null) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  const isAssignee = currentUserId && task.assignedTo === currentUserId;

  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={isDragDisabled}>
      {(provided, snapshot) => (
        <Card 
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={cn("mb-3 cursor-pointer border-border bg-card/80 hover:bg-card transition-all relative overflow-hidden group hover:border-primary/30", 
            snapshot.isDragging ? 'shadow-xl ring-1 ring-primary/30 rotate-1 bg-blue-950/90' : 'shadow-sm',
            task.priority === "Urgent" && "border-rose-500/20",
            task.isRecheck && "border-amber-500/50"
          )}
        >
          {task.priority === "Urgent" && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
          )}
          {task.isRecheck && (
             <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" title={`Sent back for recheck: ${task.feedback || ""}`} />
          )}
          <CardContent className="p-3 pl-4">
            <div className="flex justify-between items-start mb-2 gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${PRIORITY_COLORS[task.priority]}`} title={`${task.priority} priority`} />
                <Badge variant="outline" className="text-xs uppercase font-bold py-0 px-1.5 h-4 text-foreground/50 border-border">
                  {task.projectId || "General"}
                </Badge>
                {task.isTeamTask && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 border-primary/30 text-primary font-bold">
                    Team
                  </Badge>
                )}
                {task.parentTaskId && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 border-accent/30 text-accent font-bold">
                    Subtask
                  </Badge>
                )}
                {task.isRecheck && (
                  <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] py-0 px-1.5 h-4 uppercase font-bold">
                    Recheck
                  </Badge>
                )}
              </div>
              <button 
                onClick={onDelete} 
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-rose-500/20 text-rose-400 rounded cursor-pointer shrink-0"
                title="Cancel / Delete Task"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            
            <p className="text-xs font-bold text-foreground mb-1 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {task.title}
            </p>

            {task.isRecheck && task.feedback && (
              <p className="text-[11px] text-amber-400/90 italic line-clamp-1 mb-2 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                "{task.feedback}"
              </p>
            )}

            {/* Workflow Quick Action Buttons */}
            {onQuickAction && (
              <div className="flex items-center gap-1 mb-2 mt-2" onClick={(e) => e.stopPropagation()}>
                {task.status === "backlog" && isAssignee && (
                  <button
                    onClick={(e) => onQuickAction("start", task, e)}
                    className="text-[10px] bg-primary/10 hover:bg-primary/20 text-primary font-bold py-0.5 px-2 rounded border border-primary/20 transition-all"
                  >
                    Start Task
                  </button>
                )}
                {task.status === "in_progress" && isAssignee && (
                  <button
                    onClick={(e) => onQuickAction("submit", task, e)}
                    className="text-[10px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold py-0.5 px-2 rounded border border-amber-500/20 transition-all"
                  >
                    Submit for Review
                  </button>
                )}
                {task.status === "review" && canApprove && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => onQuickAction("approve", task, e)}
                      className="text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold py-0.5 px-2 rounded border border-emerald-500/20 transition-all"
                    >
                      Approve
                    </button>
                    <button
                      onClick={(e) => onQuickAction("recheck", task, e)}
                      className="text-[10px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold py-0.5 px-2 rounded border border-rose-500/20 transition-all"
                    >
                      Recheck
                    </button>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
              <div className="flex gap-2 text-foreground/40 text-xs font-bold">
                <div className="flex items-center gap-1 hover:text-foreground/70 transition-colors">
                  <CheckSquare className="w-3 h-3 text-primary" /> {task.status === "done" ? "1/1" : "0/1"}
                </div>
                <div className="flex items-center gap-1 hover:text-foreground/70 transition-colors" title="Remarks">
                  <MessageSquare className="w-3 h-3 text-primary" />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {task.dueDate && (
                  <div className={cn("flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-bold uppercase", 
                    isOverdue(task.dueDate) ? 'bg-rose-950/40 border border-rose-500/20 text-rose-300' : 
                    isToday(task.dueDate) ? 'bg-amber-950/40 border border-amber-500/20 text-amber-300' : 
                    ' text-foreground/50 border border-border'
                  )}>
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                )}
                <Avatar className="w-5 h-5 border border-border shadow-sm" title={employeesList.find(e => e.id === task.assignedTo)?.fullName || "Unassigned"}>
                  <AvatarFallback className="bg-primary/20 text-xs font-bold text-primary/70">
                    {(() => {
                      const emp = employeesList.find(e => e.id === task.assignedTo);
                      if (!emp?.fullName) return "?";
                      return emp.fullName.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
                    })()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
}
