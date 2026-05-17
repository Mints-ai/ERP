"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { canAccess } from "@/lib/permissions";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, MessageSquare, CheckSquare, Target, Lock, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Types
type TaskStatus = "backlog" | "in_progress" | "review" | "done";
type TaskPriority = "low" | "normal" | "high" | "urgent";

interface Task {
  id: string;
  title: string;
  projectId: string;
  projectName?: string;
  assignedTo: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  createdAt: any;
  blocked?: boolean;
}

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: "backlog", title: "Backlog" },
  { id: "in_progress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" },
];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  normal: "bg-olive-500",
  low: "bg-olive-300",
};

export default function TaskBoard() {
  const { user, role } = useAuth();
  const [tasks, setTasks] = useState<Record<TaskStatus, Task[]>>({
    backlog: [],
    in_progress: [],
    review: [],
    done: [],
  });
  const [loading, setLoading] = useState(true);
  const [myTasksOnly, setMyTasksOnly] = useState(role === "intern");
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsubscribes: any[] = [];

    COLUMNS.forEach(col => {
      let q;
      if (myTasksOnly) {
        q = query(
          collection(db, "tasks"),
          where("status", "==", col.id),
          where("assignedTo", "==", user.uid)
        );
      } else {
        q = query(
          collection(db, "tasks"),
          where("status", "==", col.id)
        );
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const columnTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Task[];
        
        columnTasks.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });

        setTasks(prev => ({
          ...prev,
          [col.id]: columnTasks
        }));
        
        setLoading(false);
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user, myTasksOnly]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

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
      await updateDoc(doc(db, "tasks", draggableId), {
        status: destStatus
      });
    } catch (err) {
      console.error("Error updating task status:", err);
    }
  };

  const isOverdue = (dateString?: string) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date(new Date().setHours(0,0,0,0));
  };

  const isToday = (dateString?: string) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  // Get tasks due today or overdue for focus mode
  const focusTasks = [
    ...tasks.backlog,
    ...tasks.in_progress,
    ...tasks.review
  ].filter(t => (isToday(t.dueDate) || isOverdue(t.dueDate) || t.priority === "urgent") && t.assignedTo === user?.uid)
   .sort((a, b) => {
     if (a.priority === "urgent" && b.priority !== "urgent") return -1;
     if (b.priority === "urgent" && a.priority !== "urgent") return 1;
     return 0;
   });

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-olive-900">Task Board</h1>
          <p className="text-olive-600 mt-1">Manage tasks across all active projects.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <Button 
            onClick={() => {
              setFocusMode(!focusMode);
              if (!focusMode && !myTasksOnly) setMyTasksOnly(true);
            }}
            variant={focusMode ? "default" : "outline"}
            className={cn("shadow-sm transition-all duration-300", focusMode ? "bg-olive-800 hover:bg-olive-900 text-white border-transparent" : "bg-white border-olive-200 text-olive-700 hover:bg-olive-50")}
          >
            <Target className={cn("mr-2 h-4 w-4", focusMode && "animate-pulse text-olive-300")} />
            {focusMode ? "Exit Focus Mode" : "My Focus"}
          </Button>

          {!focusMode && (
            <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-full border border-olive-200 shadow-sm text-sm">
              <span className={myTasksOnly ? "text-olive-400" : "font-semibold text-olive-900"}>Team</span>
              <button 
                className={`w-10 h-5 rounded-full relative transition-colors ${myTasksOnly ? 'bg-olive-500' : 'bg-olive-200'}`}
                onClick={() => {
                  if (role !== "intern") setMyTasksOnly(!myTasksOnly);
                }}
                disabled={role === "intern"}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow-sm transition-transform ${myTasksOnly ? 'left-5.5 right-0.5 translate-x-[18px]' : 'left-0.5'}`} />
              </button>
              <span className={myTasksOnly ? "font-semibold text-olive-900" : "text-olive-400"}>Mine</span>
            </div>
          )}

          <Button className="bg-olive-600 hover:bg-olive-700 text-white shadow-md">
            <Plus className="mr-2 h-4 w-4" /> Add Task
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600"></div>
        </div>
      ) : focusMode ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 bg-olive-50/50 rounded-2xl border border-olive-200 p-8 flex flex-col items-center overflow-y-auto"
        >
          <div className="max-w-2xl w-full">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-olive-900">Your Focus for Today</h2>
              <p className="text-olive-600 mt-2">Distraction-free mode. Complete these {focusTasks.length} high-priority tasks.</p>
            </div>

            <div className="space-y-4">
              <AnimatePresence>
                {focusTasks.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 bg-white rounded-xl border border-olive-200 border-dashed">
                    <CheckSquare className="h-12 w-12 text-olive-300 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-olive-900">All caught up!</h3>
                    <p className="text-olive-500">You have no urgent tasks due today.</p>
                  </motion.div>
                ) : (
                  focusTasks.map((task) => (
                    <motion.div 
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <Card className={cn("overflow-hidden hover:shadow-md transition-shadow group relative", 
                        task.priority === "urgent" ? "border-red-300" : "border-olive-200",
                        task.blocked ? "opacity-75 bg-slate-50" : "bg-white"
                      )}>
                        {task.priority === "urgent" && !task.blocked && (
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500 animate-pulse" />
                        )}
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <button className="mt-1 w-6 h-6 rounded border-2 border-olive-300 flex items-center justify-center hover:border-olive-500 hover:bg-olive-50 transition-colors shrink-0">
                            </button>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-[10px] uppercase bg-olive-50 text-olive-600 border-olive-200">{task.projectName || "Project"}</Badge>
                                {task.priority === "urgent" && <Badge className="bg-red-100 text-red-700 hover:bg-red-200 shadow-none border-0 text-[10px] uppercase tracking-wider">Urgent</Badge>}
                                {task.blocked && <Badge className="bg-slate-200 text-slate-700 shadow-none border-0 text-[10px] uppercase tracking-wider flex items-center gap-1"><Lock className="w-3 h-3" /> Blocked</Badge>}
                              </div>
                              <h3 className="text-lg font-bold text-olive-900 group-hover:text-olive-700 transition-colors">{task.title}</h3>
                              
                              <div className="flex items-center gap-4 mt-4 text-xs font-medium">
                                {task.dueDate && (
                                  <div className={cn("flex items-center gap-1 px-2 py-1 rounded-md", isOverdue(task.dueDate) ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700")}>
                                    <Clock className="w-3.5 h-3.5" />
                                    {isOverdue(task.dueDate) ? "Overdue" : "Due Today"}
                                  </div>
                                )}
                                <div className="flex items-center gap-1 text-olive-500">
                                  <CheckSquare className="w-3.5 h-3.5" /> 2/5 Subtasks
                                </div>
                                <button className="ml-auto text-olive-600 hover:text-olive-900 flex items-center gap-1 bg-olive-50 px-3 py-1.5 rounded-full transition-colors border border-olive-200 group-hover:bg-olive-100">
                                  <Play className="w-3 h-3 fill-current" /> Start Timer
                                </button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      ) : (
        /* Standard Kanban Board */
        <div className="flex-1 overflow-x-auto pb-4">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex h-full gap-6 min-w-max items-start">
              {COLUMNS.map(column => (
                <div key={column.id} className="flex flex-col w-[320px] max-h-full bg-olive-50/50 rounded-xl border border-olive-100 shadow-sm shrink-0">
                  <div className="p-3 border-b border-olive-200 bg-white/50 rounded-t-xl flex justify-between items-center backdrop-blur-sm">
                    <h3 className="font-bold text-sm text-olive-900 uppercase tracking-wider">{column.title}</h3>
                    <Badge variant="secondary" className="bg-white text-olive-700 shadow-sm">{tasks[column.id].length}</Badge>
                  </div>
                  
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div 
                        {...provided.droppableProps} 
                        ref={provided.innerRef}
                        className={cn("flex-1 p-3 overflow-y-auto min-h-[150px] transition-colors rounded-b-xl", snapshot.isDraggingOver ? "bg-olive-100/50 ring-2 ring-olive-300 ring-inset" : "")}
                      >
                        {tasks[column.id].map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <Card 
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  "mb-3 cursor-grab active:cursor-grabbing border-olive-200 hover:border-olive-300 transition-all relative overflow-hidden group", 
                                  snapshot.isDragging ? 'shadow-lg ring-2 ring-olive-400 rotate-2' : 'shadow-sm',
                                  task.priority === "urgent" && "border-red-300"
                                )}
                              >
                                {task.priority === "urgent" && (
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 animate-pulse" />
                                )}
                                <CardContent className="p-3 pl-4">
                                  <div className="flex justify-between items-start mb-2 gap-2">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[task.priority]}`} title={`${task.priority} priority`} />
                                      <Badge variant="outline" className="text-[9px] uppercase font-bold py-0 px-1.5 h-4 bg-olive-50 text-olive-600 border-olive-200">
                                        {task.projectName || "Project"}
                                      </Badge>
                                      {task.blocked && <span title="Blocked"><Lock className="w-3 h-3 text-slate-400" /></span>}
                                    </div>
                                  </div>
                                  
                                  <p className="text-sm font-bold text-olive-900 mb-3 leading-snug line-clamp-2 group-hover:text-olive-700 transition-colors">
                                    {task.title}
                                  </p>
                                  
                                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-olive-100">
                                    <div className="flex gap-2 text-olive-500 text-xs font-medium">
                                      <div className="flex items-center gap-1 hover:text-olive-700 transition-colors">
                                        <CheckSquare className="w-3.5 h-3.5" /> 0/3
                                      </div>
                                      <div className="flex items-center gap-1 hover:text-olive-700 transition-colors">
                                        <MessageSquare className="w-3.5 h-3.5" /> 2
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      {task.dueDate && (
                                        <div className={cn("flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-bold", 
                                          isOverdue(task.dueDate) ? 'bg-red-100 text-red-700' : 
                                          isToday(task.dueDate) ? 'bg-orange-100 text-orange-700' : 
                                          'bg-olive-100 text-olive-600'
                                        )}>
                                          <Clock className="w-3 h-3" />
                                          {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </div>
                                      )}
                                      <Avatar className="w-6 h-6 border border-white shadow-sm">
                                        <AvatarFallback className="bg-olive-100 text-[10px] font-bold text-olive-700">
                                          {task.assignedTo ? "JD" : "?"}
                                        </AvatarFallback>
                                      </Avatar>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        
                        <Button variant="ghost" className="w-full text-olive-500 justify-start h-8 px-2 text-sm mt-1 hover:bg-olive-200 hover:text-olive-800 font-medium border border-dashed border-transparent hover:border-olive-300">
                          <Plus className="w-4 h-4 mr-2" /> Add a task
                        </Button>
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        </div>
      )}
    </div>
  );
}
