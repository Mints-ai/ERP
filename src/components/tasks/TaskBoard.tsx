"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { KanbanIcon, Target, Plus, Download, Clock, AlertTriangle, Users, Crown, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Task, TaskStatus, TaskPriority } from "@/types/task";
import { 
  subscribeToTasks, 
  updateTaskStatus, 
  createTask,
  deleteTaskWithCascade,
  submitTaskForReview,
  approveTask,
  recheckTask
} from "@/lib/task-services";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import TaskColumn from "./TaskColumn";
import TaskDetailModal from "./TaskDetailModal";
import FocusModeOverlay from "./FocusModeOverlay";
import { downloadCSV } from "@/lib/exportUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: "backlog", title: "Backlog" },
  { id: "in_progress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" },
];

export default function TaskBoard() {
  const { user, role } = useAuth();
  const userRole = (role || "").toLowerCase();
  const isCSuiteOrAdmin = ["admin", "founder", "c_suite", "system_admin"].includes(userRole);
  const isManager = userRole === "manager";
  const isManagerOrAbove = isCSuiteOrAdmin || isManager;

  const [tasks, setTasks] = useState<Record<TaskStatus, Task[]>>({
    backlog: [],
    in_progress: [],
    review: [],
    done: [],
  });
  const [loading, setLoading] = useState(true);
  const [myTasksOnly, setMyTasksOnly] = useState(!isManagerOrAbove);
  const [focusMode, setFocusMode] = useState(false);
  
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [employeesByDept, setEmployeesByDept] = useState<Record<string, any[]>>({});
  
  // Add Task State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addingToStatus, setAddingToStatus] = useState<TaskStatus>("backlog");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTask, setNewTask] = useState({ 
    title: "", 
    description: "", 
    priority: "Normal" as TaskPriority, 
    dueDate: "", 
    assignedTo: "" 
  });

  // Team Task Creation State
  const [assignMode, setAssignMode] = useState<"individual" | "team">("individual");
  const [teamLeaderId, setTeamLeaderId] = useState<string>("");
  const [teamHeadIds, setTeamHeadIds] = useState<string[]>([]);
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);
  const [monitorManagerIds, setMonitorManagerIds] = useState<string[]>([]);

  // Detail Modal State
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Mandatory Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // Mandatory Recheck Modal State
  const [recheckTarget, setRecheckTarget] = useState<Task | null>(null);
  const [recheckFeedback, setRecheckFeedback] = useState("");
  const [recheckError, setRecheckError] = useState("");
  const [isSubmittingRecheck, setIsSubmittingRecheck] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      const snapshot = await getDocs(collection(db, "employees"));
      const emps = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setEmployeesList(emps);
      const grouped = emps.reduce((acc, emp: any) => {
        const depts = emp.departments || (emp.department ? [emp.department] : ["Unassigned"]);
        depts.forEach((dept: string) => {
          if (!acc[dept]) acc[dept] = [];
          if (!acc[dept].find((e: any) => e.id === emp.id)) acc[dept].push(emp);
        });
        return acc;
      }, {} as Record<string, any[]>);
      setEmployeesByDept(grouped);
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (!user || !role) return;
    
    const unsubscribe = subscribeToTasks(user.uid, role, (fetchedTasks) => {
      const filteredTasks = myTasksOnly 
        ? fetchedTasks.filter(t => t.assignedTo === user.uid || (t.isTeamTask && t.teamMembers?.includes(user.uid)))
        : fetchedTasks;
        
      const grouped: Record<TaskStatus, Task[]> = {
        backlog: [],
        in_progress: [],
        review: [],
        done: [],
      };
      
      filteredTasks.forEach(t => {
        if (grouped[t.status]) {
          grouped[t.status].push(t);
        }
      });
      
      Object.keys(grouped).forEach(k => {
        grouped[k as TaskStatus].sort((a, b) => {
          const bTime = b.createdAt ? new Date(b.createdAt?.seconds ? b.createdAt.seconds * 1000 : b.createdAt).getTime() : 0;
          const aTime = a.createdAt ? new Date(a.createdAt?.seconds ? a.createdAt.seconds * 1000 : a.createdAt).getTime() : 0;
          return bTime - aTime;
        });
      });
      
      setTasks(grouped);
      setLoading(false);
      
      if (selectedTask) {
        const updated = filteredTasks.find(t => t.id === selectedTask.id);
        if (updated) setSelectedTask(updated);
      }
    });

    return () => unsubscribe();
  }, [user, role, myTasksOnly, selectedTask?.id]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (!isCSuiteOrAdmin) {
      alert("Only C-Suite Executives and System Administrators can drag-and-drop tasks between workflow columns. Please use the operational action buttons (Start, Submit for Review, Approve) to advance your task.");
      return;
    }

    const sourceStatus = source.droppableId as TaskStatus;
    const destStatus = destination.droppableId as TaskStatus;

    const sourceTasks = Array.from(tasks[sourceStatus]);
    const destTasks = sourceStatus === destStatus ? sourceTasks : Array.from(tasks[destStatus]);
    const [movedTask] = sourceTasks.splice(source.index, 1);
    
    movedTask.status = destStatus;
    destTasks.splice(destination.index, 0, movedTask);

    setTasks(prev => ({
      ...prev,
      [sourceStatus]: sourceTasks,
      [destStatus]: destTasks
    }));

    try {
      await updateTaskStatus(draggableId, destStatus, false);
    } catch (err) {
      console.error("Error updating task status:", err);
    }
  };

  const handleQuickAction = async (action: "start" | "submit" | "approve" | "recheck", task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (action === "start") {
        await updateTaskStatus(task.id, "in_progress");
      } else if (action === "submit") {
        const skipsReview = !!task.parentTaskId && task.assignedBy === task.assignedTo;
        await submitTaskForReview(task.id, skipsReview);
      } else if (action === "approve") {
        await approveTask(task.id);
      } else if (action === "recheck") {
        setRecheckTarget(task);
        setRecheckFeedback("");
        setRecheckError("");
      }
    } catch (err) {
      console.error(`Error performing quick action ${action}:`, err);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTask.title.trim()) return;
    
    setIsSubmitting(true);
    try {
      if (assignMode === "team" && isCSuiteOrAdmin) {
        if (!teamLeaderId) {
          alert("Please select a designated Team Leader for this Team Task.");
          setIsSubmitting(false);
          return;
        }
        if (teamMemberIds.length === 0) {
          alert("Please select at least one team member.");
          setIsSubmitting(false);
          return;
        }

        const leaderEmp = employeesList.find(e => e.id === teamLeaderId);
        await createTask({
          title: newTask.title.trim(),
          description: newTask.description.trim() || "",
          projectId: "general",
          status: "backlog",
          priority: newTask.priority,
          dueDate: newTask.dueDate || null,
          isTeamTask: true,
          assignedTo: teamLeaderId,
          assignedToName: leaderEmp?.fullName || "Team Leader",
          assignedBy: user.uid,
          assignedByName: user.fullName || "Admin",
          teamLeaderId: teamLeaderId,
          teamHeads: Array.from(new Set([teamLeaderId, ...teamHeadIds])),
          teamMembers: Array.from(new Set([teamLeaderId, ...teamMemberIds])),
          monitorManagerIds: monitorManagerIds
        });
      } else {
        const assigneeId = newTask.assignedTo || user.uid;
        const assigneeEmp = employeesList.find(emp => emp.id === assigneeId);
        
        await createTask({
          title: newTask.title.trim(),
          description: newTask.description.trim() || "",
          projectId: "general",
          assignedTo: assigneeId,
          assignedToName: assigneeEmp?.fullName || "Employee",
          assignedBy: user.uid,
          assignedByName: user.fullName || "Manager",
          status: addingToStatus,
          priority: newTask.priority,
          dueDate: newTask.dueDate || null,
          isTeamTask: false
        });
      }

      setIsAddOpen(false);
      setNewTask({ title: "", description: "", priority: "Normal", dueDate: "", assignedTo: "" });
      setAssignMode("individual");
      setTeamLeaderId("");
      setTeamHeadIds([]);
      setTeamMemberIds([]);
      setMonitorManagerIds([]);
    } catch (error) {
      console.error("Error adding task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteModal = (task: Task) => {
    setDeleteTarget(task);
    setDeleteReason("");
    setDeleteError("");
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !user) return;
    if (!deleteReason.trim()) {
      setDeleteError("A written cancellation reason is mandatory to delete this task.");
      return;
    }

    setIsSubmittingDelete(true);
    try {
      await deleteTaskWithCascade(deleteTarget, deleteReason, user, employeesList);
      if (selectedTask?.id === deleteTarget.id) setIsDetailsOpen(false);
      setDeleteTarget(null);
      setDeleteReason("");
      setDeleteError("");
    } catch (err: any) {
      console.error("Error deleting task:", err);
      setDeleteError(err?.message || "Failed to delete task.");
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const handleConfirmRecheck = async () => {
    if (!recheckTarget || !user) return;
    if (!recheckFeedback.trim()) {
      setRecheckError("Please provide specific feedback explaining what needs to be improved.");
      return;
    }

    setIsSubmittingRecheck(true);
    try {
      await recheckTask(recheckTarget.id, recheckFeedback, user);
      if (selectedTask?.id === recheckTarget.id) {
        setIsDetailsOpen(false);
      }
      setRecheckTarget(null);
      setRecheckFeedback("");
      setRecheckError("");
    } catch (err: any) {
      console.error("Error submitting recheck:", err);
      setRecheckError(err?.message || "Failed to submit recheck.");
    } finally {
      setIsSubmittingRecheck(false);
    }
  };

  const handleExportCSV = () => {
    const flatList = Object.values(tasks).flat();
    const formatted = flatList.map(t => ({
      ...t,
      assigneeName: employeesList.find(e => e.id === t.assignedTo)?.fullName || "Unassigned"
    }));
    downloadCSV(
      formatted,
      ["Task Title", "Project Name", "Assignee Name", "Priority", "Status", "Due Date"],
      ["title", "projectId", "assigneeName", "priority", "status", "dueDate"],
      "Mints_Global_Tasks_Kanban.csv"
    );
  };

  const handleStartFocusMode = () => {
    setFocusMode(true);
  };

  if (focusMode) {
    const focusTasks = [
      ...tasks.backlog,
      ...tasks.in_progress,
      ...tasks.review
    ].filter(t => t.assignedTo === user?.uid || (t.isTeamTask && t.teamMembers?.includes(user?.uid || "")))
     .sort((a, b) => (a.priority === "Urgent" ? -1 : 1));

    return (
      <FocusModeOverlay 
        tasks={focusTasks}
        onExit={() => setFocusMode(false)}
        employeesList={employeesList}
      />
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 bg-card p-3 rounded-2xl border border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-muted/40 p-1 rounded-xl border border-border">
            <button 
              onClick={() => setMyTasksOnly(true)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", 
                myTasksOnly ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/50 hover:text-foreground"
              )}
            >
              My Tasks
            </button>
            <button 
              onClick={() => setMyTasksOnly(false)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", 
                !myTasksOnly ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/50 hover:text-foreground"
              )}
            >
              All Team Tasks
            </button>
          </div>

          <button 
            onClick={handleStartFocusMode}
            className="btn-ghost text-primary border border-primary/20 hover:bg-primary/10 h-9 px-3 text-xs font-bold flex items-center gap-1.5 rounded-xl cursor-pointer"
          >
            <Target className="w-4 h-4 text-primary" /> Focus Mode
          </button>
        </div>

        <div className="flex items-center gap-2">
          {!isCSuiteOrAdmin && (
            <span className="text-[11px] text-foreground/40 italic flex items-center gap-1 mr-1">
              <ShieldAlert className="w-3.5 h-3.5 text-primary/70" /> Action-gated workflow
            </span>
          )}

          <button 
            onClick={handleExportCSV}
            className="px-4 h-9 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-1.5 cursor-pointer border border-border text-foreground/60 hover:bg-muted/80 hover:text-foreground"
          >
            <Download className="h-4 w-4 text-accent" /> Export CSV
          </button>

          <button 
            onClick={() => {
              setAddingToStatus("backlog");
              setIsAddOpen(true);
            }}
            className="btn-primary h-9 px-4 text-xs font-bold flex items-center cursor-pointer"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add Task
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <Clock className="h-6 w-6 text-primary animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto pb-4">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex h-full gap-6 min-w-max items-start">
              {COLUMNS.map(column => (
                <TaskColumn 
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  tasks={tasks[column.id]}
                  employeesList={employeesList}
                  onAddClick={() => {
                    setAddingToStatus(column.id);
                    setIsAddOpen(true);
                  }}
                  onTaskClick={(task) => {
                    setSelectedTask(task);
                    setIsDetailsOpen(true);
                  }}
                  onDeleteTask={openDeleteModal}
                  isDragDisabled={!isCSuiteOrAdmin}
                  currentUserId={user?.uid}
                  onQuickAction={handleQuickAction}
                  canApprove={isManagerOrAbove}
                />
              ))}
            </div>
          </DragDropContext>
        </div>
      )}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> Create Task
            </DialogTitle>
            <DialogDescription className="text-xs text-foreground/50">
              Assign work with clear milestones, deadlines, and ownership.
            </DialogDescription>
          </DialogHeader>

          {isCSuiteOrAdmin && (
            <div className="flex bg-muted/40 p-1 rounded-xl border border-border mt-2">
              <button
                type="button"
                onClick={() => setAssignMode("individual")}
                className={cn("flex-1 py-1 text-xs font-bold rounded-lg transition-all", 
                  assignMode === "individual" ? "bg-primary text-primary-foreground shadow" : "text-foreground/50 hover:text-foreground"
                )}
              >
                Individual Task
              </button>
              <button
                type="button"
                onClick={() => setAssignMode("team")}
                className={cn("flex-1 py-1 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5", 
                  assignMode === "team" ? "bg-primary text-primary-foreground shadow" : "text-foreground/50 hover:text-foreground"
                )}
              >
                <Users className="w-3.5 h-3.5" /> Team Task (Delegated)
              </button>
            </div>
          )}

          <form onSubmit={handleAddTask} className="space-y-4 mt-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground/70 uppercase tracking-wider">Task Title</label>
              <Input
                required
                placeholder="What needs to be accomplished?"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="border-border text-foreground placeholder:text-foreground/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground/70 uppercase tracking-wider">Description / Scope</label>
              <Textarea
                placeholder="Provide detailed instructions, acceptance criteria, or context..."
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                className="border-border text-foreground placeholder:text-foreground/30 text-xs min-h-[70px]"
              />
            </div>

            {assignMode === "individual" ? (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground/70 uppercase tracking-wider">Assign To</label>
                <Select 
                  value={newTask.assignedTo || user?.uid || ""} 
                  onValueChange={(val) => setNewTask({ ...newTask, assignedTo: val as string })}
                >
                  <SelectTrigger className="w-full border-border text-foreground h-9 text-xs">
                    <SelectValue placeholder="Assign task" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border text-foreground max-h-60 overflow-y-auto">
                    <SelectItem value={user?.uid || ""}>Assign to me</SelectItem>
                    {Object.entries(employeesByDept).map(([dept, emps]) => (
                      <SelectGroup key={dept}>
                        <SelectLabel className="font-bold text-primary">{dept}</SelectLabel>
                        {emps.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.fullName} {emp.jobTitle ? `- ${emp.jobTitle}` : ""}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-3 p-3 rounded-xl border border-primary/20 bg-primary/5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-primary flex items-center gap-1 uppercase tracking-wider">
                    <Crown className="w-3.5 h-3.5 text-amber-400" /> Team Leader (Accountable Lead)
                  </label>
                  <Select 
                    value={teamLeaderId} 
                    onValueChange={(val) => setTeamLeaderId(val || "")}
                  >
                    <SelectTrigger className="w-full border-border text-foreground h-9 text-xs bg-card">
                      <SelectValue placeholder="Select designated Team Leader" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border text-foreground max-h-60 overflow-y-auto">
                      {employeesList.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.fullName} ({emp.role || emp.jobTitle || "Member"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground/70 uppercase tracking-wider">Team Members (Assignees)</label>
                  <div className="max-h-36 overflow-y-auto p-2 border border-border rounded-lg bg-card space-y-1 text-xs">
                    {employeesList.map(emp => (
                      <label key={emp.id} className="flex items-center gap-2 hover:bg-muted/40 p-1 rounded cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={teamMemberIds.includes(emp.id)}
                          onChange={(e) => {
                            if (e.target.checked) setTeamMemberIds(prev => [...prev, emp.id]);
                            else setTeamMemberIds(prev => prev.filter(id => id !== emp.id));
                          }}
                          className="rounded border-border accent-primary"
                        />
                        <span>{emp.fullName}</span>
                        <span className="text-foreground/40 text-[10px]">({emp.jobTitle || emp.role})</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground/70 uppercase tracking-wider">Priority</label>
                <Select 
                  value={newTask.priority} 
                  onValueChange={(val) => setNewTask({ ...newTask, priority: val as TaskPriority })}
                >
                  <SelectTrigger className="w-full border-border text-foreground h-9 text-xs">
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
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground/70 uppercase tracking-wider">Due Date</label>
                <Input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="border-border text-foreground placeholder:text-foreground/30 text-xs"
                  style={{ colorScheme: "dark" }}
                />
              </div>
            </div>

            <DialogFooter className="mt-6 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 text-xs font-bold text-foreground/70 hover:text-foreground transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary px-4 py-2 text-xs font-bold flex items-center justify-center disabled:opacity-50"
              >
                {isSubmitting ? "Creating..." : "Create Task"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="bg-card border-rose-500/20 text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-500">
              <AlertTriangle className="w-5 h-5 text-rose-500" /> Cancel & Delete Task
            </DialogTitle>
            <DialogDescription className="text-xs text-foreground/60">
              To delete <span className="font-bold text-foreground">"{deleteTarget?.title}"</span>, you must document a formal cancellation reason. All affected assignees will be notified and child subtasks will be cascaded.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                Cancellation Reason (Mandatory)
              </label>
              <Textarea
                required
                placeholder="Explain why this task is being cancelled or deleted..."
                value={deleteReason}
                onChange={(e) => {
                  setDeleteReason(e.target.value);
                  if (deleteError) setDeleteError("");
                }}
                className="border-border text-foreground text-xs min-h-[90px]"
              />
              {deleteError && (
                <p className="text-[11px] text-rose-400 font-bold">{deleteError}</p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 text-xs font-bold text-foreground/70 hover:text-foreground"
              disabled={isSubmittingDelete}
            >
              Abort
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isSubmittingDelete || !deleteReason.trim()}
              className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {isSubmittingDelete ? "Cancelling..." : "Confirm & Notify Team"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!recheckTarget} onOpenChange={(open) => !open && setRecheckTarget(null)}>
        <DialogContent className="bg-card border-amber-500/20 text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Send Task Back for Recheck
            </DialogTitle>
            <DialogDescription className="text-xs text-foreground/60">
              Task <span className="font-bold text-foreground">"{recheckTarget?.title}"</span> will revert to In Progress. Please provide specific feedback on what requires adjustment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Review Feedback (Mandatory)
              </label>
              <Textarea
                required
                placeholder="Describe what needs to be fixed, completed, or verified..."
                value={recheckFeedback}
                onChange={(e) => {
                  setRecheckFeedback(e.target.value);
                  if (recheckError) setRecheckError("");
                }}
                className="border-border text-foreground text-xs min-h-[90px]"
              />
              {recheckError && (
                <p className="text-[11px] text-rose-400 font-bold">{recheckError}</p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setRecheckTarget(null)}
              className="px-4 py-2 text-xs font-bold text-foreground/70 hover:text-foreground"
              disabled={isSubmittingRecheck}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmRecheck}
              disabled={isSubmittingRecheck || !recheckFeedback.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {isSubmittingRecheck ? "Submitting..." : "Send Back for Recheck"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedTask && (
        <TaskDetailModal 
          task={selectedTask} 
          isOpen={isDetailsOpen} 
          onClose={() => {
            setIsDetailsOpen(false);
            setTimeout(() => setSelectedTask(null), 300);
          }}
          employeesList={employeesList}
          onRecheckTrigger={(task) => {
            setRecheckTarget(task);
            setRecheckFeedback("");
            setRecheckError("");
          }}
        />
      )}
    </div>
  );
}
