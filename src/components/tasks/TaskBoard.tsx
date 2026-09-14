"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { 
  KanbanIcon, 
  Target, 
  Plus, 
  Download, 
  Clock, 
  AlertTriangle, 
  Users, 
  Crown, 
  ShieldAlert,
  Check,
  CheckSquare,
  ListChecks,
  StickyNote,
  Pause,
  Play,
  Send,
  LogOut,
  Trash2,
  Lock,
  Hourglass,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Task, TaskStatus, TaskPriority, FocusSession, FocusChecklistItem } from "@/types/task";
import { 
  subscribeToTasks, 
  updateTaskStatus, 
  createTask,
  deleteTaskWithCascade,
  submitTaskForReview,
  approveTask,
  recheckTask,
  getSessionElapsedSeconds,
  formatFocusDuration,
  formatFocusTimer,
  startFocusSession,
  resumeFocusSession,
  pauseFocusSession,
  completeFocusTask,
  exitFocusSession,
  updateFocusNotes,
  updateFocusChecklist
} from "@/lib/task-services";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import TaskColumn from "./TaskColumn";
import TaskDetailModal from "./TaskDetailModal";
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
  const [activeMobileCol, setActiveMobileCol] = useState<TaskStatus>("backlog");

  // Focus Mode State (from testerp)
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [selectedFocusTaskId, setSelectedFocusTaskId] = useState<string | null>(null);
  const [isStartFocusOpen, setIsStartFocusOpen] = useState(false);
  const [focusDurationChoice, setFocusDurationChoice] = useState<"25" | "50" | "none">("25");
  const [focusStartNotes, setFocusStartNotes] = useState("");
  const [isStartingFocus, setIsStartingFocus] = useState(false);
  const [focusWorkspaceTaskId, setFocusWorkspaceTaskId] = useState<string | null>(null);
  const [workspaceNotes, setWorkspaceNotes] = useState("");
  const [workspaceChecklist, setWorkspaceChecklist] = useState<FocusChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState("");
  const [exitFocusTarget, setExitFocusTarget] = useState<Task | null>(null);
  
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
        // Enforce RBAC (CC6.1 / Least Privilege): Non-managers (interns, junior employees) can ONLY assign tasks to themselves
        const assigneeId = isManagerOrAbove ? (newTask.assignedTo || user.uid) : user.uid;
        const assigneeEmp = employeesList.find(emp => emp.id === assigneeId);
        
        await createTask({
          title: newTask.title.trim(),
          description: newTask.description.trim() || "",
          projectId: "general",
          assignedTo: assigneeId,
          assignedToName: assigneeEmp?.fullName || user.fullName || "Self",
          assignedBy: user.uid,
          assignedByName: user.fullName || "Employee",
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

  const parseLocalDate = (dateString: string) => {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  };

  const isOverdue = (dateString?: string | null) => {
    if (!dateString) return false;
    return parseLocalDate(dateString) < new Date(new Date().setHours(0, 0, 0, 0));
  };

  const isToday = (dateString?: string | null) => {
    if (!dateString) return false;
    const date = parseLocalDate(dateString);
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const allTasksFlat = useMemo(() => Object.values(tasks).flat(), [tasks]);

  const focusWorkspaceTask = focusWorkspaceTaskId
    ? allTasksFlat.find(t => t.id === focusWorkspaceTaskId) || null
    : null;

  const myFocusSessionTask = useMemo(
    () => allTasksFlat.find(t => t.focusSession && (t.focusSession.startedBy === user?.uid || t.assignedTo === user?.uid)) || null,
    [allTasksFlat, user?.uid]
  );

  const focusTasks = useMemo(() => {
    const all = [
      ...tasks.backlog,
      ...tasks.in_progress,
      ...tasks.review
    ];
    return all.filter(t =>
      (isToday(t.dueDate) || isOverdue(t.dueDate) || t.priority === "Urgent" || t.priority === "High") &&
      (t.assignedTo === user?.uid || (t.isTeamTask && t.teamMembers?.includes(user?.uid || "")))
    ).sort((a, b) => {
      if (a.priority === "Urgent" && b.priority !== "Urgent") return -1;
      if (b.priority === "Urgent" && a.priority !== "Urgent") return 1;
      if (a.priority === "High" && b.priority !== "High") return -1;
      if (b.priority === "High" && a.priority !== "High") return 1;
      return 0;
    });
  }, [tasks, user?.uid]);

  useEffect(() => {
    const intervalMs = focusWorkspaceTaskId ? 1000 : 30000;
    const id = setInterval(() => setNowTick(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [focusWorkspaceTaskId]);

  useEffect(() => {
    setSelectedFocusTaskId(null);
  }, [focusMode]);

  useEffect(() => {
    if (focusWorkspaceTask?.focusSession) {
      setWorkspaceNotes(focusWorkspaceTask.focusSession.notes || "");
      setWorkspaceChecklist(focusWorkspaceTask.focusSession.checklist || []);
    }
  }, [focusWorkspaceTaskId]);

  useEffect(() => {
    if (!focusWorkspaceTask?.focusSession) return;
    if (workspaceNotes === focusWorkspaceTask.focusSession.notes) return;
    const timeoutId = setTimeout(() => {
      updateFocusNotes(focusWorkspaceTask.id, workspaceNotes);
    }, 700);
    return () => clearTimeout(timeoutId);
  }, [workspaceNotes, focusWorkspaceTaskId]);

  const openStartFocusDialog = (task: Task) => {
    const existing = task.focusSession;
    if (existing && (existing.startedBy === user?.uid || task.assignedTo === user?.uid)) {
      if (existing.status === "paused") {
        resumeFocusSession(task.id, existing).then(() => {
          setFocusWorkspaceTaskId(task.id);
        });
      } else {
        setFocusWorkspaceTaskId(task.id);
      }
      return;
    }
    if (myFocusSessionTask && myFocusSessionTask.id !== task.id) {
      alert(`You already have a focus session running on "${myFocusSessionTask.title}". Finish or exit it before starting a new one.`);
      return;
    }
    setSelectedFocusTaskId(task.id);
    setFocusDurationChoice("25");
    setFocusStartNotes("");
    setIsStartFocusOpen(true);
  };

  const handleConfirmStartFocus = async () => {
    const task = allTasksFlat.find(t => t.id === selectedFocusTaskId);
    if (!task || !user) return;
    setIsStartingFocus(true);
    try {
      const nowIso = new Date().toISOString();
      const session: FocusSession = {
        startedBy: user.uid,
        startedByName: user.fullName || "Team Member",
        startedAt: nowIso,
        resumedAt: nowIso,
        status: "running",
        elapsedSeconds: 0,
        checklist: [],
        notes: focusStartNotes.trim(),
        breakCount: 0,
        durationMinutes: focusDurationChoice === "none" ? null : parseInt(focusDurationChoice, 10),
      };
      await startFocusSession(task.id, session);
      setIsStartFocusOpen(false);
      setSelectedFocusTaskId(null);
      setFocusWorkspaceTaskId(task.id);
    } catch (err) {
      console.error("Error starting focus session:", err);
    } finally {
      setIsStartingFocus(false);
    }
  };

  const handleResumeFocusSession = async (task: Task) => {
    if (!task.focusSession) return;
    try {
      await resumeFocusSession(task.id, task.focusSession);
      setFocusWorkspaceTaskId(task.id);
    } catch (err) {
      console.error("Error resuming focus session:", err);
    }
  };

  const handlePauseFocusSession = async (task: Task) => {
    if (!task.focusSession) return;
    try {
      await pauseFocusSession(task.id, task.focusSession, workspaceNotes, workspaceChecklist, nowTick);
      setFocusWorkspaceTaskId(null);
      setFocusMode(false);
    } catch (err) {
      console.error("Error pausing focus session:", err);
    }
  };

  const handleCompleteFocusTask = async (task: Task) => {
    try {
      const skipsReview = !!task.parentTaskId && task.assignedBy === task.assignedTo;
      await completeFocusTask(task.id, skipsReview);
      setFocusWorkspaceTaskId(null);
    } catch (err) {
      console.error("Error completing focused task:", err);
    }
  };

  const handleExitFocusSession = async (task: Task) => {
    try {
      await exitFocusSession(task.id);
      setFocusWorkspaceTaskId(null);
      setExitFocusTarget(null);
    } catch (err) {
      console.error("Error exiting focus session:", err);
    }
  };

  const handleAddChecklistItem = async () => {
    if (!newChecklistText.trim() || !focusWorkspaceTask?.focusSession) return;
    const item: FocusChecklistItem = {
      id: Math.random().toString(36).substring(2, 9),
      text: newChecklistText.trim(),
      done: false,
    };
    const updated = [...workspaceChecklist, item];
    setWorkspaceChecklist(updated);
    setNewChecklistText("");
    await updateFocusChecklist(focusWorkspaceTask.id, updated);
  };

  const handleToggleChecklistItem = async (itemId: string) => {
    if (!focusWorkspaceTask?.focusSession) return;
    const updated = workspaceChecklist.map(i => (i.id === itemId ? { ...i, done: !i.done } : i));
    setWorkspaceChecklist(updated);
    await updateFocusChecklist(focusWorkspaceTask.id, updated);
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    if (!focusWorkspaceTask?.focusSession) return;
    const updated = workspaceChecklist.filter(i => i.id !== itemId);
    setWorkspaceChecklist(updated);
    await updateFocusChecklist(focusWorkspaceTask.id, updated);
  };

  const handleFocusAction = (action: "resume" | "complete" | "exit" | "start", task: Task) => {
    if (action === "resume") {
      handleResumeFocusSession(task);
    } else if (action === "complete") {
      handleCompleteFocusTask(task);
    } else if (action === "exit") {
      setExitFocusTarget(task);
    } else if (action === "start") {
      openStartFocusDialog(task);
    }
  };

  // SCREEN 3 — DEDICATED FOCUS WORKSPACE
  if (focusWorkspaceTask && focusWorkspaceTask.focusSession) {
    const session = focusWorkspaceTask.focusSession;
    const elapsedSeconds = getSessionElapsedSeconds(session, nowTick);
    const targetSeconds = session.durationMinutes ? session.durationMinutes * 60 : null;
    const checklistDone = workspaceChecklist.filter(i => i.done).length;
    const progressPct = targetSeconds
      ? Math.min(100, Math.round((elapsedSeconds / targetSeconds) * 100))
      : Math.min(100, Math.round((checklistDone / Math.max(1, workspaceChecklist.length)) * 100));

    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] text-foreground">
        <div className="flex-1 border border-border bg-card/60 rounded-2xl overflow-y-auto flex flex-col items-center p-6 sm:p-10">
          <div className="max-w-xl w-full">
            <div className="text-center mb-8">
              <span className="badge bg-primary/10 border border-primary/20 text-primary font-bold text-xs py-1 px-3 uppercase tracking-wider inline-flex items-center gap-1.5 rounded-full">
                <Target className="w-3.5 h-3.5 animate-pulse" /> Focus Mode
              </span>
              <h1 className="text-xl font-extrabold text-foreground mt-3 leading-snug">{focusWorkspaceTask.title}</h1>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-xs font-bold text-foreground/50">{focusWorkspaceTask.priority} Priority</span>
                <span className="text-xs uppercase font-bold px-2 py-0.5 rounded-md border border-border text-foreground/60">
                  {focusWorkspaceTask.status}
                </span>
              </div>
            </div>

            <div className="text-center mb-6">
              <div className="text-5xl sm:text-6xl font-extrabold text-foreground tabular-nums tracking-tight font-mono">
                {formatFocusTimer(elapsedSeconds)}
              </div>
              {session.durationMinutes && (
                <p className="text-xs text-foreground/50 mt-1 font-bold uppercase tracking-wider">
                  Goal: {session.durationMinutes} Minutes
                </p>
              )}
            </div>

            <div className="mb-8">
              <div className="flex justify-between items-center mb-1.5 text-xs font-bold uppercase tracking-wider text-foreground/50">
                <span>Today's Progress</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted/60 border border-border overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            <div className="mb-8 border border-border bg-background/50 rounded-xl p-4">
              <h3 className="text-xs font-bold text-foreground/70 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <ListChecks className="w-4 h-4 text-primary" /> Checklist ({checklistDone}/{workspaceChecklist.length})
              </h3>
              <div className="space-y-2 mb-3">
                {workspaceChecklist.length === 0 ? (
                  <p className="text-xs text-foreground/40 font-medium py-2">No checklist items yet — add one below.</p>
                ) : (
                  workspaceChecklist.map(item => (
                    <div
                      key={item.id}
                      className="w-full flex items-center justify-between gap-2.5 group py-1"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleChecklistItem(item.id)}
                        className="flex items-center gap-2.5 text-left cursor-pointer flex-1"
                      >
                        <span className={cn("w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                          item.done ? "bg-primary border-primary" : "border-border group-hover:border-primary/50"
                        )}>
                          {item.done && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                        </span>
                        <span className={cn("text-xs font-medium", item.done ? "text-foreground/40 line-through" : "text-foreground/90")}>
                          {item.text}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteChecklistItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-rose-400 hover:bg-rose-500/10 rounded cursor-pointer"
                        title="Delete item"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input
                  placeholder="Add a checklist item..."
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddChecklistItem(); } }}
                  className="flex-grow h-9 rounded-lg border border-border px-3 py-1 text-xs text-foreground placeholder:text-foreground/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary bg-background"
                />
                <button
                  type="button"
                  onClick={handleAddChecklistItem}
                  disabled={!newChecklistText.trim()}
                  className="px-3 h-9 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <StickyNote className="w-4 h-4 text-primary" /> Quick Notes
              </h3>
              <Textarea
                placeholder="Jot down notes, links, or ideas while you work (auto-saved)..."
                value={workspaceNotes}
                onChange={(e) => setWorkspaceNotes(e.target.value)}
                className="border-border text-foreground placeholder:text-foreground/30 min-h-[110px] text-xs bg-background/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handlePauseFocusSession(focusWorkspaceTask)}
                className="btn-ghost h-11 text-sm font-bold flex items-center justify-center gap-2 border border-border text-foreground/80 hover:text-foreground cursor-pointer rounded-xl bg-card"
              >
                <Pause className="w-4 h-4" /> Pause Session
              </button>
              <button
                type="button"
                onClick={() => handleCompleteFocusTask(focusWorkspaceTask)}
                className="btn-primary h-11 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950"
              >
                <Send className="w-4 h-4" /> Complete Task
              </button>
            </div>
            <button
              type="button"
              onClick={() => setExitFocusTarget(focusWorkspaceTask)}
              className="w-full mt-3 h-9 text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Exit Focus Mode
            </button>
          </div>
        </div>

        {/* EXIT CONFIRMATION MODAL */}
        <Dialog open={!!exitFocusTarget} onOpenChange={(o) => !o && setExitFocusTarget(null)}>
          <DialogContent className="bg-card border-border text-foreground sm:max-w-sm backdrop-blur-md shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Exit Focus Mode?
              </DialogTitle>
            </DialogHeader>
            <p className="text-xs text-foreground/60 mt-2 leading-relaxed">
              This session's progress will be discarded. The task will stay in In Progress, with no focus stats attached.
            </p>
            <DialogFooter className="mt-6 border-t-0 pt-2 flex gap-2">
              <button type="button" onClick={() => setExitFocusTarget(null)} className="px-4 py-2 text-xs font-bold text-foreground/70 hover:text-foreground transition-colors">Cancel</button>
              <button type="button" onClick={() => exitFocusTarget && handleExitFocusSession(exitFocusTarget)} className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5">
                <LogOut className="w-3.5 h-3.5" /> Exit Focus Mode
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0 bg-card p-3 rounded-2xl border border-border">
        <div className="flex items-center gap-2 flex-wrap">
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
            onClick={() => {
              setFocusMode(!focusMode);
              if (!focusMode && !myTasksOnly) setMyTasksOnly(true);
            }}
            className={cn("px-3.5 h-9 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-1.5 cursor-pointer border",
              focusMode
                ? "bg-primary border-primary text-primary-foreground shadow-sm"
                : "border-border text-foreground/60 hover:bg-muted/80 hover:text-foreground"
            )}
          >
            <Target className={cn("w-4 h-4", focusMode && "animate-pulse")} />
            {focusMode ? "Exit Focus" : "Focus Mode"}
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {!isCSuiteOrAdmin && (
            <span className="hidden md:flex text-[11px] text-foreground/40 italic items-center gap-1 mr-1">
              <ShieldAlert className="w-3.5 h-3.5 text-primary/70" /> Action-gated workflow
            </span>
          )}

          <button 
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none px-3.5 h-9 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer border border-border text-foreground/60 hover:bg-muted/80 hover:text-foreground"
          >
            <Download className="h-4 w-4 text-accent" /> Export CSV
          </button>

          <button 
            onClick={() => {
              setAddingToStatus("backlog");
              setIsAddOpen(true);
            }}
            className="flex-1 sm:flex-none btn-primary h-9 px-4 text-xs font-bold flex items-center justify-center cursor-pointer"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add Task
          </button>
        </div>
      </div>

      {/* Mobile Column Switcher (visible on mobile screens when not in Focus Mode) */}
      {!focusMode && (
        <div className="flex sm:hidden items-center gap-1.5 p-1 bg-card/60 border border-border rounded-xl overflow-x-auto scrollbar-hide shrink-0">
          {COLUMNS.map(col => {
            const count = (tasks[col.id] || []).length;
            const isActive = activeMobileCol === col.id;
            return (
              <button
                key={col.id}
                onClick={() => setActiveMobileCol(col.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground/50 hover:text-foreground"
                )}
              >
                <span>{col.title}</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
                  isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-foreground/60"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <Clock className="h-6 w-6 text-primary animate-spin" />
        </div>
      ) : focusMode ? (
        /* SCREEN 1 — YOUR FOCUS FOR TODAY */
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 border border-border rounded-2xl flex flex-col overflow-hidden bg-card/30"
        >
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
            <div className="max-w-2xl w-full">
              <div className="text-center mb-8">
                <h2 className="text-base font-bold text-foreground">Your Focus for Today</h2>
                <p className="text-xs text-foreground/40 mt-1">
                  Tick a task, then start a focus session for it. Complete these {focusTasks.length} priority items.
                </p>
              </div>

              <div className="space-y-3">
                <AnimatePresence>
                  {focusTasks.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 border border-border border-dashed rounded-2xl">
                      <CheckSquare className="h-10 w-10 text-foreground/20 mx-auto mb-3" />
                      <h3 className="text-sm font-bold text-foreground/50 uppercase tracking-wider">All caught up!</h3>
                      <p className="text-xs text-foreground/30 mt-1">You have no Urgent or due-today tasks.</p>
                    </motion.div>
                  ) : (
                    focusTasks.map((task) => {
                      const isTicked = selectedFocusTaskId === task.id;
                      return (
                        <motion.div key={task.id} layout initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                          <Card
                            onClick={() => setSelectedFocusTaskId(prev => (prev === task.id ? null : task.id))}
                            className={cn("bg-card border border-border shadow-sm rounded-xl overflow-hidden relative group cursor-pointer hover:border-primary/40 transition-all",
                              task.priority === "Urgent" ? "border-rose-500/30" : "",
                              task.blocked ? "opacity-60" : "",
                              isTicked && "border-primary/80 bg-primary/5 ring-1 ring-primary/20"
                            )}
                          >
                            {task.priority === "Urgent" && !task.blocked && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500 animate-pulse shadow-[0_0_6px_rgba(244,63,94,0.5)]" />
                            )}
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3.5">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setSelectedFocusTaskId(prev => (prev === task.id ? null : task.id)); }}
                                  aria-pressed={isTicked}
                                  className={cn("mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer",
                                    isTicked ? "bg-primary border-primary" : "border-border hover:border-primary/50"
                                  )}
                                >
                                  {isTicked && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Badge variant="outline" className="text-xs uppercase font-bold py-0 px-1.5 h-4 text-foreground/50 border-border">
                                        {task.projectId || "General"}
                                      </Badge>
                                      {task.priority === "Urgent" && (
                                        <Badge className="bg-rose-500/15 border-rose-500/30 text-rose-300 text-xs font-bold py-0.5 uppercase tracking-wider">
                                          Urgent
                                        </Badge>
                                      )}
                                      <span className="text-[11px] font-bold text-foreground/40 uppercase">
                                        {task.status}
                                      </span>
                                    </div>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); openDeleteModal(task); }} 
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-rose-500/20 text-rose-400 rounded cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                                    {task.title}
                                  </h3>
                                  {task.dueDate && (
                                    <div className="flex items-center gap-1 mt-2.5 text-xs text-foreground/50 font-bold uppercase">
                                      <Clock className="w-3 h-3 text-primary" />
                                      {isOverdue(task.dueDate) ? "Overdue" : isToday(task.dueDate) ? "Due Today" : new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-border p-4 flex justify-center bg-card/60">
            <button
              type="button"
              disabled={!selectedFocusTaskId}
              onClick={() => {
                const task = focusTasks.find(t => t.id === selectedFocusTaskId);
                if (task) openStartFocusDialog(task);
              }}
              className="btn-primary h-10 px-6 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed max-w-2xl w-full rounded-xl"
            >
              <Target className="w-4 h-4" /> Start Focus Mode
            </button>
          </div>
        </motion.div>
      ) : (
        /* STANDARD KANBAN BOARD */
        <div className="flex-1 pb-4">
          <DragDropContext onDragEnd={onDragEnd}>
            {/* Desktop & Tablet: Multi-column horizontal scroll */}
            <div className="hidden sm:flex h-full gap-6 min-w-max items-start overflow-x-auto pb-4">
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
                  nowTick={nowTick}
                  onFocusAction={handleFocusAction}
                />
              ))}
            </div>

            {/* Mobile: Active Column Single View */}
            <div className="sm:hidden w-full">
              {COLUMNS.filter(c => c.id === activeMobileCol).map(column => (
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
                  nowTick={nowTick}
                  onFocusAction={handleFocusAction}
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
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground/70 uppercase tracking-wider">Assign To</label>
                  {!isManagerOrAbove && (
                    <span className="text-[10px] text-primary/80 font-medium flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Self-assignment only (RBAC)
                    </span>
                  )}
                </div>
                {isManagerOrAbove ? (
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
                ) : (
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-muted/30 text-xs">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6 border border-border">
                        <AvatarFallback className="bg-primary/20 text-primary font-bold text-[10px]">
                          {(user?.fullName || "ME").substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-bold text-foreground">{user?.fullName || "Myself"} (Self)</span>
                    </div>
                    <span className="text-[10px] text-foreground/50 italic flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Delegation requires Manager role
                    </span>
                  </div>
                )}
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

      {/* START FOCUS DIALOG (Screen 2) */}
      <Dialog open={isStartFocusOpen} onOpenChange={setIsStartFocusOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-md backdrop-blur-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> Start Focus Mode
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground/70 uppercase tracking-wider">Selected Task</label>
              <div className="p-3 border border-border rounded-xl text-xs font-bold text-foreground bg-background/50">
                {allTasksFlat.find(t => t.id === selectedFocusTaskId)?.title || "—"}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground/70 uppercase tracking-wider">Choose Session Duration</label>
              <Select value={focusDurationChoice} onValueChange={(val) => setFocusDurationChoice(val as "25" | "50" | "none")}>
                <SelectTrigger className="w-full border-border text-foreground h-9 text-xs"><SelectValue placeholder="Duration" /></SelectTrigger>
                <SelectContent className="bg-background border-border text-foreground">
                  <SelectItem value="25">25 Minutes (Pomodoro)</SelectItem>
                  <SelectItem value="50">50 Minutes (Deep Work)</SelectItem>
                  <SelectItem value="none">No Time Limit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground/70 uppercase tracking-wider">Quick Notes (Optional)</label>
              <Textarea 
                placeholder="Seed your Quick Notes for this session..." 
                value={focusStartNotes} 
                onChange={(e) => setFocusStartNotes(e.target.value)} 
                className="border-border text-foreground placeholder:text-foreground/30 min-h-[75px] text-xs bg-background/50" 
              />
            </div>
          </div>
          <DialogFooter className="mt-4 border-t border-border pt-3">
            <button 
              type="button" 
              onClick={() => setIsStartFocusOpen(false)} 
              className="px-4 py-2 text-xs font-bold text-foreground/70 hover:text-foreground transition-colors" 
              disabled={isStartingFocus}
            >
              Cancel
            </button>
            <button 
              type="button" 
              onClick={handleConfirmStartFocus} 
              disabled={isStartingFocus || !selectedFocusTaskId} 
              className="btn-primary px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Target className="w-3.5 h-3.5" /> {isStartingFocus ? "Starting..." : "Start Focus"}
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
          nowTick={nowTick}
          onFocusAction={handleFocusAction}
        />
      )}
    </div>
  );
}
