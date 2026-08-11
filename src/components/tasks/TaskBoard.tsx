"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd";
import { KanbanIcon, Target, Plus, Download, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Task, TaskStatus, TaskPriority } from "@/types/task";
import { subscribeToTasks, updateTaskStatus, createTask } from "@/lib/task-services";
import { db } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import TaskColumn from "./TaskColumn";
import TaskDetailModal from "./TaskDetailModal";
import FocusModeOverlay from "./FocusModeOverlay";
import { downloadCSV } from "@/lib/exportUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: "backlog", title: "Backlog" },
  { id: "in_progress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" },
];

export default function TaskBoard() {
  const { user, role } = useAuth();
  const [tasks, setTasks] = useState<Record<TaskStatus, Task[]>>({
    backlog: [],
    in_progress: [],
    review: [],
    done: [],
  });
  const [loading, setLoading] = useState(true);
  const [myTasksOnly, setMyTasksOnly] = useState(role === "intern" || role === "employee");
  const [focusMode, setFocusMode] = useState(false);
  
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [employeesByDept, setEmployeesByDept] = useState<Record<string, any[]>>({});
  
  // Add Task State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addingToStatus, setAddingToStatus] = useState<TaskStatus>("backlog");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", priority: "normal" as TaskPriority, dueDate: "", assignedTo: "" });

  // Detail Modal State
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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
    
    // Subscribe using our new service
    const unsubscribe = subscribeToTasks(user.uid, role, (fetchedTasks) => {
      // Filter if 'myTasksOnly' is selected and user is admin/manager
      const filteredTasks = myTasksOnly 
        ? fetchedTasks.filter(t => t.assignedTo === user.uid)
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
      
      // Sort each column by date desc
      Object.keys(grouped).forEach(k => {
        grouped[k as TaskStatus].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      });
      
      setTasks(grouped);
      setLoading(false);
      
      // Update selected task if it's currently open
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

    const sourceStatus = source.droppableId as TaskStatus;
    const destStatus = destination.droppableId as TaskStatus;

    // Optimistic UI update
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
      // Optional: Revert on error
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTask.title.trim()) return;
    
    setIsSubmitting(true);
    try {
      const assigneeId = newTask.assignedTo || user.uid;
      const assigneeEmp = employeesList.find(emp => emp.id === assigneeId);
      
      await createTask({
        title: newTask.title.trim(),
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

      setIsAddOpen(false);
      setNewTask({ title: "", priority: "normal", dueDate: "", assignedTo: "" });
    } catch (error) {
      console.error("Error adding task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm("Are you sure you want to delete this task? This action cannot be undone.")) {
      try {
        await deleteDoc(doc(db, "tasks", taskId));
        if (selectedTask?.id === taskId) setIsDetailsOpen(false);
      } catch (err) {
        console.error("Error deleting task:", err);
      }
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

  if (focusMode) {
    // Collect urgent / due tasks
    const focusTasks = [
      ...tasks.backlog,
      ...tasks.in_progress,
      ...tasks.review
    ].filter(t => t.assignedTo === user?.uid)
     .sort((a, b) => (a.priority === "urgent" ? -1 : 1));

    return (
      <FocusModeOverlay 
        tasks={focusTasks} 
        onExit={() => setFocusMode(false)}
        employeesList={employeesList}
      />
    );
  }

  return (
    <div className="flex flex-col h-full text-foreground">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <KanbanIcon className="h-5 w-5 text-primary" /> Tasks
          </h1>
          <p className="text-xs text-foreground/40 mt-1">Manage tasks across active projects.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <button 
            onClick={() => setFocusMode(true)}
            className="px-4 h-9 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-1.5 cursor-pointer border border-border text-foreground/60 hover:bg-muted/80"
          >
            <Target className="h-4 w-4" /> Focus Mode
          </button>

          <div className="flex items-center space-x-2 px-3.5 h-9 rounded-xl border border-border text-xs">
            <span className={myTasksOnly ? "text-foreground/40 font-bold" : "font-bold text-foreground"}>Team</span>
            <button 
              className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer ${myTasksOnly ? 'bg-primary shadow-sm' : 'bg-muted/80'}`}
              onClick={() => {
                if (role !== "intern") setMyTasksOnly(!myTasksOnly);
              }}
              disabled={role === "intern" || role === "employee"}
            >
              <div className={`w-3.5 h-3.5 rounded-full bg-background absolute top-0.5 shadow-sm transition-all ${myTasksOnly ? 'left-5' : 'left-0.5'}`} />
            </button>
            <span className={myTasksOnly ? "font-bold text-foreground" : "text-foreground/40 font-bold"}>Mine</span>
          </div>

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
            className="btn-primary h-9 py-0 px-4 text-xs font-bold flex items-center justify-center cursor-pointer"
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
                  onDeleteTask={handleDeleteTask}
                />
              ))}
            </div>
          </DragDropContext>
        </div>
      )}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTask} className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/70 uppercase tracking-wider">Task Title</label>
              <Input
                required
                placeholder="What needs to be done?"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="border-border text-foreground placeholder:text-foreground/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/70 uppercase tracking-wider">Assign To</label>
              <Select 
                value={newTask.assignedTo || user?.uid || ""} 
                onValueChange={(val) => setNewTask({ ...newTask, assignedTo: val as string })}
              >
                <SelectTrigger className="w-full border-border text-foreground h-9">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground/70 uppercase tracking-wider">Priority</label>
                <Select 
                  value={newTask.priority} 
                  onValueChange={(val) => setNewTask({ ...newTask, priority: val as TaskPriority })}
                >
                  <SelectTrigger className="w-full border-border text-foreground h-9">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border text-foreground">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground/70 uppercase tracking-wider">Due Date</label>
                <Input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="border-border text-foreground placeholder:text-foreground/30"
                  style={{ colorScheme: "dark" }}
                />
              </div>
            </div>
            <DialogFooter className="mt-6 border-t-0 pt-4">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 text-sm font-bold text-foreground/70 hover:text-foreground transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-bold bg-primary hover:bg-primary text-foreground rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
              >
                {isSubmitting ? "Adding..." : "Add Task"}
              </button>
            </DialogFooter>
          </form>
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
        />
      )}
    </div>
  );
}
