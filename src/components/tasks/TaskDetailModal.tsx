import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Clock, Check, X } from "lucide-react";
import { Task, TaskPriority, TaskRemark } from "@/types/task";
import { useAuth } from "@/context/AuthContext";
import { addRemark, subscribeToRemarks, updateTaskStatus } from "@/lib/task-services";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  Urgent: "bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]",
  High: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]",
  Normal: "bg-primary shadow-[0_0_6px_rgba(59,130,246,0.6)]",
  Low: "",
};

interface TaskDetailModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  employeesList: any[];
}

export default function TaskDetailModal({ task, isOpen, onClose, employeesList }: TaskDetailModalProps) {
  const { user, role } = useAuth();
  const [remarks, setRemarks] = useState<TaskRemark[]>([]);
  const [newRemark, setNewRemark] = useState("");
  const [isSubmittingRemark, setIsSubmittingRemark] = useState(false);

  useEffect(() => {
    if (!isOpen || !task) return;
    
    // Subscribe to remarks subcollection
    const unsubscribe = subscribeToRemarks(task.id, (fetchedRemarks) => {
      setRemarks(fetchedRemarks);
    });

    return () => unsubscribe();
  }, [isOpen, task?.id]);

  const handleAddRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !task || !newRemark.trim()) return;

    setIsSubmittingRemark(true);
    try {
      await addRemark(task.id, newRemark.trim(), user.uid, user.fullName || user.email || "User");
      setNewRemark("");
    } catch (err) {
      console.error("Error adding remark:", err);
    } finally {
      setIsSubmittingRemark(false);
    }
  };

  const handleRecheck = async () => {
    if (!confirm("Send back for recheck?")) return;
    try {
      await updateTaskStatus(task.id, 'in_progress', true);
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async () => {
    try {
      await updateTaskStatus(task.id, 'done', false);
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  if (!task) return null;

  const isAssignerOrAdmin = user?.uid === task.assignedBy || ['founder', 'system_admin', 'c_suite', 'manager'].includes(role || '');
  const canReview = task.status === 'review' && isAssignerOrAdmin;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card border-border text-foreground sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs font-bold py-0.5 uppercase tracking-wider border-border text-foreground/50">
              {task.projectId || "General"}
            </Badge>
            <div className={`w-1.5 h-1.5 rounded-full ${PRIORITY_COLORS[task.priority]}`} />
            <span className="text-xs font-bold uppercase text-foreground/40">{task.priority} Priority</span>
            {task.isRecheck && <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-[10px]">Recheck</Badge>}
          </div>
          <DialogTitle className="text-base font-extrabold text-foreground leading-tight">
            {task.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-4 overflow-y-auto flex-1 pr-2 scrollbar-thin">
          {/* Action Bar for Reviews */}
          {canReview && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm font-bold text-primary">Task is pending review</span>
              <div className="flex gap-2">
                 <button onClick={handleRecheck} className="btn-ghost border border-amber-500/30 text-amber-500 hover:bg-amber-500/10 px-3 py-1 rounded text-xs font-bold flex items-center gap-1">
                   <X className="w-3 h-3" /> Recheck
                 </button>
                 <button onClick={handleApprove} className="btn-primary bg-primary text-primary-foreground px-3 py-1 rounded text-xs font-bold flex items-center gap-1">
                   <Check className="w-3 h-3" /> Approve
                 </button>
              </div>
            </div>
          )}

          {/* Task Meta Details */}
          <div className="grid grid-cols-2 gap-4 border border-border p-3 rounded-xl text-xs">
            <div>
              <span className="text-foreground/40 block mb-0.5">Assigned To:</span>
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Avatar className="w-4 h-4 border border-border">
                  <AvatarFallback className="bg-primary/20 text-xs font-bold text-primary/70">
                    {task.assignedToName?.substring(0, 2).toUpperCase() || "UN"}
                  </AvatarFallback>
                </Avatar>
                {task.assignedToName || "Unassigned"}
              </span>
            </div>
            <div>
              <span className="text-foreground/40 block mb-0.5">Due Date:</span>
              <span className="font-bold text-foreground flex items-center gap-1">
                <Clock className="w-3 h-3 text-primary" />
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No deadline set"}
              </span>
            </div>
          </div>

          {/* Remarks Log */}
          <div>
            <h3 className="text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-primary" /> Remarks & Progress Logs ({remarks.length})
            </h3>
            
            <div className="space-y-3">
              {remarks.length === 0 ? (
                <div className="text-center py-6 text-foreground/20 text-xs font-medium border border-border border-dashed rounded-xl">
                  No remarks logged yet.
                </div>
              ) : (
                remarks.map((remark) => (
                  <div key={remark.id} className="border border-border p-3 rounded-xl">
                    <div className="flex justify-between items-center mb-1 text-xs font-bold uppercase">
                      <span className="text-primary">{remark.createdByName}</span>
                      <span className="text-foreground/30">
                        {new Date(remark.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed font-medium">
                      {remark.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Add Remark Form */}
        <form onSubmit={handleAddRemark} className="shrink-0 space-y-2 border-t border-border pt-4 mt-2">
          <label className="text-xs font-bold text-foreground/40 uppercase tracking-wider block">Add Progress Remark</label>
          <div className="flex gap-2">
            <Input
              required
              placeholder={
                task.assignedTo === user?.uid 
                  ? "Describe your progress, blockers, or update..."
                  : "Write a manager note or remark..."
              }
              value={newRemark}
              onChange={(e) => setNewRemark(e.target.value)}
              className="flex-grow h-9 rounded-lg border border-border px-3 py-1 text-xs text-foreground placeholder:text-foreground/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            />
            <button
              type="submit"
              disabled={isSubmittingRemark || !newRemark.trim()}
              className="px-3 h-9 bg-primary hover:bg-primary disabled:opacity-50 text-foreground rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center"
            >
              {isSubmittingRemark ? "..." : "Log"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
