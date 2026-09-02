import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Clock, Check, X, Paperclip, Plus, AlertCircle, FileText, Download, ShieldCheck, Users } from "lucide-react";
import { Task, TaskPriority, TaskRemark, TaskAttachment } from "@/types/task";
import { useAuth } from "@/context/AuthContext";
import { 
  addRemark, 
  subscribeToRemarks, 
  approveTask, 
  createTask, 
  validateAttachmentFile,
  updateTask
} from "@/lib/task-services";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  onRecheckTrigger?: (task: Task) => void;
}

export default function TaskDetailModal({ 
  task, 
  isOpen, 
  onClose, 
  employeesList,
  onRecheckTrigger 
}: TaskDetailModalProps) {
  const { user, role } = useAuth();
  const userRole = (role || "").toLowerCase();
  const isCSuiteOrAdmin = ["admin", "founder", "c_suite", "system_admin"].includes(userRole);
  const isManager = userRole === "manager";
  const isManagerOrAbove = isCSuiteOrAdmin || isManager;

  const [remarks, setRemarks] = useState<TaskRemark[]>([]);
  const [newRemark, setNewRemark] = useState("");
  const [isSubmittingRemark, setIsSubmittingRemark] = useState(false);

  // Subtasks State (for Team Tasks)
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [isAddSubtaskOpen, setIsAddSubtaskOpen] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [subtaskDescription, setSubtaskDescription] = useState("");
  const [subtaskAssignee, setSubtaskAssignee] = useState("");
  const [subtaskPriority, setSubtaskPriority] = useState<TaskPriority>("Normal");
  const [subtaskDueDate, setSubtaskDueDate] = useState("");
  const [subtaskDateError, setSubtaskDateError] = useState("");
  const [isSubmittingSubtask, setIsSubmittingSubtask] = useState(false);

  // Attachment Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const isAssignee = user?.uid === task?.assignedTo;
  const isTeamLeader = task?.isTeamTask && task.teamLeaderId === user?.uid;
  const isTeamCoLeader = task?.isTeamTask && task.teamHeads?.includes(user?.uid || "");
  const canManageSubtasks = isCSuiteOrAdmin || isTeamLeader || isTeamCoLeader;

  // Real-time subcollection remarks listener
  useEffect(() => {
    if (!isOpen || !task) return;
    
    const unsubscribe = subscribeToRemarks(task.id, (fetchedRemarks) => {
      setRemarks(fetchedRemarks);
    });

    return () => unsubscribe();
  }, [isOpen, task?.id]);

  // Real-time child subtasks listener (if team task)
  useEffect(() => {
    if (!isOpen || !task?.isTeamTask) {
      setSubtasks([]);
      return;
    }

    const q = query(collection(db, "tasks"), where("parentTaskId", "==", task.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Task[];
      setSubtasks(docs);
    });

    return () => unsubscribe();
  }, [isOpen, task?.id, task?.isTeamTask]);

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

  const handleApprove = async () => {
    try {
      await approveTask(task.id);
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  // Secure File Upload Handler (PDF, DOCX, XLSX <= 10MB)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !task) return;

    const validation = validateAttachmentFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || "Invalid file.");
      event.target.value = "";
      return;
    }

    setUploadError("");
    setIsUploading(true);
    try {
      if (!storage) throw new Error("Firebase storage is not configured.");
      
      const storageRef = ref(storage, `task_attachments/${task.id}/${Date.now()}-${validation.safeName}`);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const downloadUrl = await getDownloadURL(storageRef);

      const newAttachment: TaskAttachment = {
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        url: downloadUrl,
        size: file.size,
        type: file.type,
        uploadedBy: user.uid,
        uploadedByName: user.fullName || "User",
        uploadedAt: new Date().toISOString()
      };

      const existingAttachments = task.attachments || [];
      await updateTask(task.id, {
        attachments: [...existingAttachments, newAttachment]
      });
    } catch (err: any) {
      console.error("Error uploading attachment:", err);
      setUploadError(err?.message || "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  // Subtask Addition with strict boundary checks
  const handleCreateSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !task || !subtaskTitle.trim() || !subtaskAssignee) return;

    const todayStr = new Date().toISOString().split("T")[0];
    if (subtaskDueDate && subtaskDueDate < todayStr) {
      setSubtaskDateError("Subtask due date cannot be in the past.");
      return;
    }

    if (subtaskDueDate && task.dueDate && subtaskDueDate > task.dueDate) {
      setSubtaskDateError(`Subtask due date cannot exceed main task deadline (${task.dueDate}).`);
      return;
    }

    setSubtaskDateError("");
    setIsSubmittingSubtask(true);
    try {
      const assigneeEmp = employeesList.find(e => e.id === subtaskAssignee);
      await createTask({
        title: subtaskTitle.trim(),
        description: subtaskDescription.trim() || "",
        projectId: task.projectId || "general",
        status: "backlog",
        priority: subtaskPriority,
        dueDate: subtaskDueDate || null,
        assignedTo: subtaskAssignee,
        assignedToName: assigneeEmp?.fullName || "Employee",
        assignedBy: user.uid,
        assignedByName: user.fullName || "Team Leader",
        parentTaskId: task.id,
        parentTaskTitle: task.title,
        isTeamTask: false,
        teamMembers: task.teamMembers || [],
        teamHeads: task.teamHeads || [],
        teamLeaderId: task.teamLeaderId,
        monitorManagerIds: task.monitorManagerIds || []
      });

      setIsAddSubtaskOpen(false);
      setSubtaskTitle("");
      setSubtaskDescription("");
      setSubtaskAssignee("");
      setSubtaskDueDate("");
      setSubtaskDateError("");
    } catch (err) {
      console.error("Error creating subtask:", err);
    } finally {
      setIsSubmittingSubtask(false);
    }
  };

  if (!task) return null;

  const isAssignerOrAdmin = user?.uid === task.assignedBy || isManagerOrAbove;
  const canReview = task.status === 'review' && isAssignerOrAdmin;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card border-border text-foreground sm:max-w-xl max-h-[88vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="outline" className="text-xs font-bold py-0.5 uppercase tracking-wider border-border text-foreground/50">
              {task.projectId || "General"}
            </Badge>
            <div className={`w-1.5 h-1.5 rounded-full ${PRIORITY_COLORS[task.priority]}`} />
            <span className="text-xs font-bold uppercase text-foreground/40">{task.priority} Priority</span>
            {task.isTeamTask && <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">Team Task</Badge>}
            {task.parentTaskId && <Badge variant="outline" className="border-accent/30 text-accent text-[10px]">Subtask</Badge>}
            {task.isRecheck && <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-[10px]">Recheck</Badge>}
          </div>
          <DialogTitle className="text-base font-extrabold text-foreground leading-tight">
            {task.title}
          </DialogTitle>
          {task.parentTaskTitle && (
            <p className="text-xs text-foreground/50 mt-0.5">
              Subtask of: <span className="font-semibold text-foreground">{task.parentTaskTitle}</span>
            </p>
          )}
        </DialogHeader>

        <div className="space-y-5 mt-3 overflow-y-auto flex-1 pr-2 scrollbar-thin">
          {/* Action Bar for Reviews */}
          {canReview && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-primary" /> Task pending review
              </span>
              <div className="flex gap-2">
                 <button 
                   onClick={() => onRecheckTrigger && onRecheckTrigger(task)} 
                   className="btn-ghost border border-amber-500/30 text-amber-500 hover:bg-amber-500/10 px-3 py-1 rounded text-xs font-bold flex items-center gap-1 cursor-pointer"
                 >
                   <X className="w-3 h-3" /> Recheck
                 </button>
                 <button 
                   onClick={handleApprove} 
                   className="btn-primary bg-primary text-primary-foreground px-3 py-1 rounded text-xs font-bold flex items-center gap-1 cursor-pointer"
                 >
                   <Check className="w-3 h-3" /> Approve
                 </button>
              </div>
            </div>
          )}

          {/* Description */}
          {task.description && (
            <div className="p-3 bg-muted/20 border border-border rounded-xl">
              <span className="text-[11px] font-bold uppercase text-foreground/40 block mb-1">Description</span>
              <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Task Meta Details */}
          <div className="grid grid-cols-2 gap-4 border border-border p-3 rounded-xl text-xs">
            <div>
              <span className="text-foreground/40 block mb-0.5">Assigned To:</span>
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Avatar className="w-4 h-4 border border-border">
                  <AvatarFallback className="bg-primary/20 text-xs font-bold text-primary/70">
                    {(task.assignedToName || employeesList?.find(e => e.id === task.assignedTo)?.fullName || "UN").substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {task.assignedToName || employeesList?.find(e => e.id === task.assignedTo)?.fullName || "Unassigned"}
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

          {/* Team Task Subtasks Section */}
          {task.isTeamTask && (
            <div className="border border-border p-3 rounded-xl">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-bold text-foreground/70 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-primary" /> Delegated Subtasks ({subtasks.length})
                </h3>
                {canManageSubtasks && (
                  <button
                    onClick={() => setIsAddSubtaskOpen(true)}
                    className="text-[11px] text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Subtask
                  </button>
                )}
              </div>

              {subtasks.length === 0 ? (
                <p className="text-xs text-foreground/30 italic text-center py-2">No subtasks assigned under this team task yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {subtasks.map(st => (
                    <div key={st.id} className="flex items-center justify-between p-2 rounded-lg bg-card border border-border text-xs">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", st.status === "done" ? "bg-emerald-500" : "bg-primary")} />
                        <span className="font-bold">{st.title}</span>
                        <span className="text-foreground/40 text-[10px]">({st.assignedToName || "Assignee"})</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-4">
                        {st.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Attachments Section */}
          <div className="border border-border p-3 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-foreground/70 uppercase tracking-wider flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-primary" /> Attachments ({task.attachments?.length || 0})
              </h3>
              {isAssignee && task.status === "in_progress" && (
                <label className="text-[11px] text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer">
                  <Plus className="w-3 h-3" /> Attach File (.pdf, .docx, .xlsx)
                  <input
                    type="file"
                    accept=".pdf,.docx,.xlsx"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              )}
            </div>

            {isUploading && <p className="text-xs text-primary animate-pulse">Uploading file securely...</p>}
            {uploadError && <p className="text-xs text-rose-400 font-bold mb-2">{uploadError}</p>}

            {(!task.attachments || task.attachments.length === 0) ? (
              <p className="text-xs text-foreground/30 italic text-center py-2">No attachments uploaded.</p>
            ) : (
              <div className="space-y-1.5">
                {task.attachments.map((att: any, idx: number) => (
                  <div key={att.id || idx} className="flex items-center justify-between p-2 rounded-lg bg-card border border-border text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate font-medium">{att.name}</span>
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
        <form onSubmit={handleAddRemark} className="shrink-0 space-y-2 border-t border-border pt-3 mt-2">
          <label className="text-xs font-bold text-foreground/40 uppercase tracking-wider block">Add Progress Remark</label>
          <div className="flex gap-2">
            <Input
              required
              placeholder={
                task.assignedTo === user?.uid 
                  ? "Describe your progress, blockers, or update..."
                  : "Write a supervisor note or remark..."
              }
              value={newRemark}
              onChange={(e) => setNewRemark(e.target.value)}
              className="flex-grow h-9 rounded-lg border border-border px-3 py-1 text-xs text-foreground placeholder:text-foreground/30"
            />
            <button
              type="submit"
              disabled={isSubmittingRemark || !newRemark.trim()}
              className="px-4 h-9 bg-primary hover:bg-primary disabled:opacity-50 text-primary-foreground rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center"
            >
              {isSubmittingRemark ? "..." : "Log"}
            </button>
          </div>
        </form>
      </DialogContent>

      {/* Add Subtask Dialog */}
      <Dialog open={isAddSubtaskOpen} onOpenChange={setIsAddSubtaskOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" /> Add Delegated Subtask
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubtask} className="space-y-3 mt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-foreground/60">Subtask Title</label>
              <Input
                required
                placeholder="Subtask name..."
                value={subtaskTitle}
                onChange={(e) => setSubtaskTitle(e.target.value)}
                className="text-xs h-9 border-border"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-foreground/60">Assign To (Team Member)</label>
              <Select value={subtaskAssignee} onValueChange={(val) => setSubtaskAssignee(val || "")}>
                <SelectTrigger className="w-full text-xs h-9 border-border">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border text-foreground max-h-52 overflow-y-auto">
                  {(task.teamMembers || []).map((mId: string) => {
                    const emp = employeesList.find(e => e.id === mId);
                    return (
                      <SelectItem key={mId} value={mId}>
                        {emp?.fullName || mId}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-foreground/60">Priority</label>
                <Select value={subtaskPriority} onValueChange={(val) => setSubtaskPriority(val as TaskPriority)}>
                  <SelectTrigger className="w-full text-xs h-9 border-border">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border text-foreground">
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-foreground/60">Due Date</label>
                <Input
                  type="date"
                  value={subtaskDueDate}
                  onChange={(e) => {
                    setSubtaskDueDate(e.target.value);
                    if (subtaskDateError) setSubtaskDateError("");
                  }}
                  className="text-xs h-9 border-border"
                  style={{ colorScheme: "dark" }}
                />
              </div>
            </div>
            {subtaskDateError && (
              <p className="text-[11px] text-rose-400 font-bold">{subtaskDateError}</p>
            )}
            <DialogFooter className="pt-2 border-t border-border mt-3">
              <button
                type="button"
                onClick={() => setIsAddSubtaskOpen(false)}
                className="px-3 py-1.5 text-xs font-bold text-foreground/70 hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingSubtask || !subtaskTitle.trim() || !subtaskAssignee}
                className="btn-primary px-4 py-1.5 text-xs font-bold rounded-lg disabled:opacity-50"
              >
                {isSubmittingSubtask ? "Creating..." : "Add Subtask"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
