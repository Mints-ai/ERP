import { db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  onSnapshot
} from "firebase/firestore";
import { Task, TaskStatus, TaskRemark, FocusSession } from "@/types/task";

const TASKS_COLLECTION = "tasks";

export const createTask = async (taskData: Partial<Task>): Promise<string> => {
  try {
    const newTask = {
      ...taskData,
      status: taskData.status || 'backlog',
      attachments: [],
      focusSession: {
        isActive: false,
        startTime: null,
        elapsedSeconds: 0,
        notes: "",
        checklists: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const docRef = await addDoc(collection(db, TASKS_COLLECTION), newTask);
    
    // Trigger notification backend route
    fetch("/api/tasks/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        action: "created", 
        taskId: docRef.id, 
        taskData: newTask 
      }),
    }).catch(console.error);

    return docRef.id;
  } catch (error) {
    console.error("Error creating task:", error);
    throw error;
  }
};

export const updateTaskStatus = async (
  taskId: string, 
  newStatus: TaskStatus, 
  isRecheck: boolean = false
): Promise<void> => {
  try {
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    await updateDoc(taskRef, {
      status: newStatus,
      isRecheck,
      updatedAt: new Date().toISOString()
    });
    
    // Notify if moved to review or done
    if (newStatus === 'review' || newStatus === 'done' || isRecheck) {
      fetch("/api/tasks/notify", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ action: "status_changed", taskId, newStatus, isRecheck }),
      }).catch(console.error);
    }
  } catch (error) {
    console.error("Error updating task status:", error);
    throw error;
  }
};

export const updateTask = async (taskId: string, updates: Partial<Task>): Promise<void> => {
  try {
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    await updateDoc(taskRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error updating task:", error);
    throw error;
  }
};

export const subscribeToTasks = (
  userId: string, 
  role: string, 
  callback: (tasks: Task[]) => void
) => {
  // If manager or admin, might want to see all tasks (or filter later).
  // For now, let's pull tasks assigned TO or BY the user, or if admin pull all (simplified for now).
  let q;
  if (['founder', 'system_admin', 'c_suite', 'manager'].includes(role)) {
     // Admin sees everything (could be heavy, might need pagination in real prod)
     q = query(collection(db, TASKS_COLLECTION), orderBy('createdAt', 'desc'));
  } else {
     // Regular employee sees tasks assigned to them
     q = query(
       collection(db, TASKS_COLLECTION), 
       where("assignedTo", "==", userId)
     );
  }

  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Task[];
    callback(tasks);
  }, (error) => {
    console.error("Error listening to tasks:", error);
  });
};

// --- REMARKS (Subcollection) ---

export const addRemark = async (
  taskId: string, 
  content: string, 
  userId: string, 
  userName: string
): Promise<void> => {
  try {
    const remarksRef = collection(db, `${TASKS_COLLECTION}/${taskId}/remarks`);
    await addDoc(remarksRef, {
      taskId,
      content,
      createdBy: userId,
      createdByName: userName,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error adding remark:", error);
    throw error;
  }
};

export const subscribeToRemarks = (taskId: string, callback: (remarks: TaskRemark[]) => void) => {
  const q = query(
    collection(db, `${TASKS_COLLECTION}/${taskId}/remarks`), 
    orderBy("createdAt", "asc")
  );
  
  return onSnapshot(q, (snapshot) => {
    const remarks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TaskRemark[];
    callback(remarks);
  });
};

// --- FOCUS SESSION ---

export const saveFocusSession = async (
  taskId: string, 
  focusSession: FocusSession
): Promise<void> => {
  try {
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    await updateDoc(taskRef, {
      focusSession: {
        ...focusSession,
        lastAutoSaveAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error saving focus session:", error);
    throw error;
  }
};
