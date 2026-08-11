import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Subscribes to the list of active employees.
 */
export function subscribeToEmployees(callback: (employees: any[]) => void) {
  const q = query(
    collection(db, "employees"),
    where("isActive", "==", true),
    orderBy("fullName")
  );

  return onSnapshot(q, (snapshot) => {
    const emps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(emps);
  }, (error) => {
    console.error("Error fetching employees:", error);
  });
}

/**
 * Subscribes to the leave balance of a specific employee for the current year.
 */
export function subscribeToLeaveBalance(employeeId: string, currentYear: number, callback: (balance: any) => void) {
  return onSnapshot(doc(db, "leaveBalances", `${employeeId}_${currentYear}`), (docSnap: any) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    } else {
      callback({ totalAnnual: 30, usedAnnual: 0, usedSick: 0 }); // default fallback
    }
  }, (error) => {
    console.error("Error fetching leave balance:", error);
  });
}

/**
 * Subscribes to the active projects of a specific employee.
 */
export function subscribeToEmployeeProjects(employeeId: string, callback: (projects: any[]) => void) {
  const qProjects = query(
    collection(db, "projects"),
    where("memberIds", "array-contains", employeeId),
    where("status", "==", "active")
  );
  
  return onSnapshot(qProjects, (snap) => {
    const projects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(projects);
  }, (error) => {
    console.error("Error fetching employee projects:", error);
  });
}

/**
 * Deprovisions an employee profile (soft delete).
 */
export async function deprovisionEmployee(employeeId: string) {
  try {
    await updateDoc(doc(db, "employees", employeeId), {
      isActive: false,
      isArchived: true,
      role: "employee", // Downgrade system role for security
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error deprovisioning employee:", error);
    throw error;
  }
}
