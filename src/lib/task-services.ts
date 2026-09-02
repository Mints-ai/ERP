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

// --- ENTERPRISE WORKFLOW & SECURITY OPERATIONS (from testerp) ---

export const submitTaskForReview = async (
  taskId: string,
  skipsReview: boolean = false
): Promise<void> => {
  const newStatus: TaskStatus = skipsReview ? "done" : "review";
  const submittedAt = new Date().toISOString();
  
  const taskRef = doc(db, TASKS_COLLECTION, taskId);
  await updateDoc(taskRef, {
    status: newStatus,
    submittedAt,
    ...(skipsReview ? { feedback: null, isRecheck: false } : {}),
    updatedAt: submittedAt
  });

  fetch("/api/tasks/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "status_changed", taskId, newStatus, isRecheck: false }),
  }).catch(console.error);
};

export const approveTask = async (taskId: string): Promise<void> => {
  const taskRef = doc(db, TASKS_COLLECTION, taskId);
  await updateDoc(taskRef, {
    status: "done",
    feedback: null,
    isRecheck: false,
    updatedAt: new Date().toISOString()
  });

  fetch("/api/tasks/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "status_changed", taskId, newStatus: "done", isRecheck: false }),
  }).catch(console.error);
};

export const recheckTask = async (
  taskId: string,
  feedback: string,
  user: any
): Promise<void> => {
  if (!feedback.trim()) {
    throw new Error("Recheck feedback is mandatory.");
  }

  const now = new Date().toISOString();
  const taskRef = doc(db, TASKS_COLLECTION, taskId);
  
  // Log into remarks subcollection for permanent audit trail
  await addRemark(
    taskId,
    `⚠️ Recheck requested: ${feedback.trim()}`,
    user?.uid || "admin",
    user?.fullName || user?.displayName || "Reviewer"
  );

  await updateDoc(taskRef, {
    status: "in_progress",
    feedback: feedback.trim(),
    isRecheck: true,
    updatedAt: now
  });

  fetch("/api/tasks/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "status_changed", taskId, newStatus: "in_progress", isRecheck: true }),
  }).catch(console.error);
};

export const deleteTaskWithCascade = async (
  task: Task,
  deleteReason: string,
  user: any,
  employeesList: any[] = []
): Promise<void> => {
  if (!deleteReason.trim()) {
    throw new Error("A reason is mandatory to delete or cancel a task.");
  }

  const recipientIds = new Set<string>();
  let subtaskDocs: { id: string; assignedTo: string; title: string }[] = [];

  if (task.isTeamTask) {
    (task.teamMembers || []).forEach(id => recipientIds.add(id));
    (task.teamHeads || []).forEach(id => recipientIds.add(id));
    if (task.teamLeaderId) recipientIds.add(task.teamLeaderId);

    // Pull every subtask under this team task so they can be deleted too
    const subtaskSnapshot = await getDocs(
      query(collection(db, TASKS_COLLECTION), where("parentTaskId", "==", task.id))
    );
    subtaskDocs = subtaskSnapshot.docs.map(d => ({
      id: d.id,
      assignedTo: (d.data() as any).assignedTo,
      title: (d.data() as any).title,
    }));
    subtaskDocs.forEach(st => { if (st.assignedTo) recipientIds.add(st.assignedTo); });
  } else if (task.parentTaskId) {
    recipientIds.add(task.assignedTo);
    (task.teamHeads || []).forEach(id => recipientIds.add(id));
    if (task.teamLeaderId) recipientIds.add(task.teamLeaderId);
  } else {
    recipientIds.add(task.assignedTo);
  }
  
  if (user?.uid) {
    recipientIds.delete(user.uid);
  }

  // Notify all affected assignees & team members with the reason
  for (const recipientId of recipientIds) {
    const recipientEmp = employeesList.find(emp => emp.id === recipientId);
    const mySubtask = subtaskDocs.find(st => st.assignedTo === recipientId);
    const subtaskLine = mySubtask ? `\nYour Subtask: ${mySubtask.title} (also removed)\n` : "";

    try {
      await addDoc(collection(db, "internal_mails"), {
        senderId: user?.uid,
        senderName: user?.fullName || user?.displayName || "Mints Task Manager",
        senderEmail: user?.email || "system@mintsglobal.com",
        receiverId: recipientId,
        receiverName: recipientEmp?.fullName || "Employee",
        receiverEmail: recipientEmp?.email || "",
        subject: `❌ Task Cancelled: ${task.title}`,
        body: `Hello ${recipientEmp?.fullName || "Team Member"},\n\nThe following task has been cancelled/deleted by ${user?.fullName || user?.displayName || "Admin"}:\n\nTask: ${task.title}\nReason: ${deleteReason.trim()}\n${subtaskLine}\nPlease reach out to management if you have any questions.\n\nBest regards,\n${user?.fullName || user?.displayName || "Mints Project Management"}`,
        priority: task.priority === "Urgent" || task.priority === "High" ? "Urgent" : "Normal",
        isRead: false,
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, "notifications"), {
        userId: recipientId,
        title: "Task Cancelled",
        message: `${task.title} was cancelled by ${user?.fullName || user?.displayName || "Admin"}: ${deleteReason.trim()}`,
        type: "task_cancelled",
        read: false,
        createdAt: serverTimestamp(),
        link: `/dashboard/tasks`
      });
    } catch (notifErr) {
      console.warn("Notification dispatch warning during task delete:", notifErr);
    }
  }

  // Delete all child subtasks first
  for (const st of subtaskDocs) {
    await deleteDoc(doc(db, TASKS_COLLECTION, st.id));
  }

  // Delete main task
  await deleteDoc(doc(db, TASKS_COLLECTION, task.id));
};

export const validateAttachmentFile = (file: File): { valid: boolean; error?: string; safeName: string } => {
  const allowedExtensions = [".pdf", ".docx", ".xlsx"];
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  
  if (!allowedExtensions.includes(extension)) {
    return { valid: false, error: "Only PDF, DOCX, and XLSX files can be attached.", safeName: "" };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: "Attachments must be 10 MB or smaller.", safeName: "" };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return { valid: true, safeName };
};

