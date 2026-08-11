import { Droppable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Task, TaskStatus } from "@/types/task";
import TaskCard from "./TaskCard";

interface TaskColumnProps {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  employeesList: any[];
  onAddClick: () => void;
  onTaskClick: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export default function TaskColumn({ 
  id, 
  title, 
  tasks, 
  employeesList, 
  onAddClick, 
  onTaskClick,
  onDeleteTask 
}: TaskColumnProps) {
  return (
    <div className="flex flex-col w-[300px] max-h-full rounded-2xl border border-border shadow-sm shrink-0">
      <div className="p-3 border-b border-border rounded-t-2xl flex justify-between items-center shrink-0">
        <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">{title}</h3>
        <Badge className="border border-border text-foreground/60 font-mono text-xs">
          {tasks.length}
        </Badge>
      </div>
      
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div 
            {...provided.droppableProps} 
            ref={provided.innerRef}
            className={cn("flex-1 p-3 overflow-y-auto min-h-[400px] transition-colors rounded-b-2xl max-h-[500px]", 
              snapshot.isDraggingOver ? "bg-primary/5 ring-1 ring-primary/10" : ""
            )}
          >
            {tasks.map((task, index) => (
              <TaskCard 
                key={task.id} 
                task={task} 
                index={index} 
                employeesList={employeesList}
                onClick={() => onTaskClick(task)}
                onDelete={(e) => {
                  e.stopPropagation();
                  onDeleteTask(task.id);
                }}
              />
            ))}
            {provided.placeholder}
            
            <button 
              onClick={onAddClick}
              className="w-full text-foreground/30 hover:text-foreground justify-start h-8 px-2 text-xs mt-1 hover: rounded-xl transition-all font-bold border border-dashed border-border/30 hover:border-border flex items-center cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add a task
            </button>
          </div>
        )}
      </Droppable>
    </div>
  );
}
